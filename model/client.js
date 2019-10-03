const mysqlclient = require('../mysql-module');
const neo4jclient = require('../neo4j-module');
const ftpclient = require('../ftp-module');
const {
  Subject,
  combineLatest
} = require('rxjs');
const backstream = require('../backstream');

const client = module.exports = {};

client.query = `SELECT * FROM tx_ossdirectory_client`;

client.client = `CREATE (node:Client {
  uid : toInt($uid),
  imageUrl : $imageUrl,
  url : $url,
  deleted : toInt($deleted)
}) RETURN node`

client.address = `CREATE (node:Address {
  address : $address,
  address2 : $address2,
  zip : toInt($zip),
  city : $city,
  country : $country
}) RETURN node`

client.industry = `
MERGE (node_trans:IndustryTranslation { title : $title })
MERGE (node:Industry { title : $title })
MERGE (node)-[:INDUSTRY_TRANSLATION]->(node_trans)
RETURN node;
`

client.de = `CREATE (node:OrganisationTranslation {
  title : $title,
  description : $description
}) RETURN node`

client.fr = `CREATE (node:OrganisationTranslation {
  title : $title_fr,
  description : $description_fr
}) RETURN node`

client.en = `CREATE (node:OrganisationTranslation {
  title : $title_en,
  description : $description_en
}) RETURN node`

client.connect = `
MATCH (client) WHERE ID(client) = $client_id
MATCH (address) WHERE ID(address) = $address_id
MATCH (de) WHERE ID(de) = $de_id
MATCH (fr) WHERE ID(fr) = $fr_id
MATCH (en) WHERE ID(en) = $en_id
MATCH (industry) WHERE ID(industry) = $industry_id
  
MATCH (lang_de:Language) WHERE lang_de.short = "de"
MATCH (lang_fr:Language) WHERE lang_fr.short = "fr"
MATCH (lang_en:Language) WHERE lang_en.short = "en"

MERGE (de)-[a:LANGUAGE]->(lang_de)
MERGE (fr)-[b:LANGUAGE]->(lang_fr)
MERGE (en)-[c:LANGUAGE]->(lang_en)

MERGE (client)-[d:CLIENT_TRANSLATION]->(de)
MERGE (client)-[e:CLIENT_TRANSLATION]->(fr)
MERGE (client)-[f:CLIENT_TRANSLATION]->(en)
MERGE (client)-[g:ADDRESS]->(address)

CREATE (client)-[h:WORKS_IN]->(industry)

RETURN a,b,c,d,e,f,g,h
`

client.migrate = function () {

  const requests = []; //track requests
  const subject = new Subject(); //complete subject if all requests are done
  
  mysqlclient.query(client.query, (err, rows) => {
    if (err) console.log(err);

    console.log("Clients: ", rows.length);
    
    rows.forEach(el => {

      const object = {}; //create object
      requests.push(object); //indexOf will search for object instances and not values!
      
      const create_client = neo4jclient.cypher(client.client, {
        uid: el.uid,
        url: el.url,
        deleted: el.deleted,
        imageUrl: el.logo
      });

      const create_address = neo4jclient.cypher(client.address, {
        address: el.address,
        address2: el.address2,
        zip: el.zip,
        city: el.city,
        country: el.country
      });

      const create_industry = neo4jclient.cypher(client.industry, {
        title : el.business
      });

      const create_de = neo4jclient.cypher(client.de, {
        title: el.title,
        description: el.description,
      });

      const create_fr = neo4jclient.cypher(client.de, {
        title: el.title_fr,
        description: el.description_fr,
      });

      const create_en = neo4jclient.cypher(client.de, {
        title: el.title_en,
        description: el.description_en,
      });

      const after = combineLatest(
        create_client,
        create_address,
        create_industry,
        create_de,
        create_fr,
        create_en);

      after.subscribe(
        ([ven, address, industry, de, fr, en]) => {
          const ven_id = ven.get(0).identity;
          const address_id = address.get(0).identity;
          const de_id = de.get(0).identity;
          const fr_id = fr.get(0).identity;
          const en_id = en.get(0).identity;
          const industry_id = industry.get(0).identity;

          neo4jclient.cypher(client.connect, {
            client_id: ven_id,
            address_id,
            de_id,
            fr_id,
            en_id,
            industry_id
          });

          //for each row this is the last result
          const index = requests.indexOf(object);
          requests.splice(index, 1);
          if (requests.length <= 0) { //if all are done send complete
            subject.next("done");
            subject.complete();
          }
        }
      );
    });
  });
  return subject;
}

client.getClient = `
MATCH (client:Client) RETURN client
`

client.updateImage = `
MATCH (client:Client) WHERE client.sequence = $sequence
SET client.imageUrl = $imageUrl
`

client.files = function () {

  const done = new Subject();

  ftpclient.ready.subscribe((ready) => {
    if (ready) {

      const requests = [];

      const clients = neo4jclient.cypher(client.getClient, {});

      clients.subscribe(
        
          (record) => {
            const client = record.get(0);
            const sequence = client.properties.sequence;
            const imageUrl = client.properties.imageUrl;
    
            const request = {
              filename : imageUrl,
              type : "client",
              sequence : sequence,
            };

            requests.push(request);
            const results = ftpclient.request(request);
            results.subscribe(({ filename, result_sequence }) => {
              
              if (result_sequence === sequence) {
                neo4jclient.cypher(client.updateImage, {
                  sequence,
                  imageUrl : filename
                })


                const index = requests.indexOf(request);
                requests.splice(index, 1);
                results.unsubscribe();
                if (requests.length <= 0) {
                  done.next("done");
                  done.complete();
                }
              }
            })
          }
        )
    }
  });

  return done;
}