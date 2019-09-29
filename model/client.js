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
MERGE (node)-[:TRANSLATION]->(node_trans)
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
  
  mysqlclient.query(client.query, (err, rows) => {
    if (err) console.log(err);

    console.log("Clients: ", rows.length);

    const session = neo4jclient.session;
    
    rows.forEach(el => {
      
      const client_sub = new Subject();
      const create_client = session.run(client.client, {
        uid: el.uid,
        url: el.url,
        deleted: el.deleted,
        imageUrl: el.logo
      }).then(result => client_sub.next({result, type : "neo4j"}), rejected => console.log(rejected))
      .catch((reason) => console.log(reason));
      backstream.register(client_sub);

      const address_sub = new Subject();
      const create_address = session.run(client.address, {
        address: el.address,
        address2: el.address2,
        zip: el.zip,
        city: el.city,
        country: el.country
      }).then(result => address_sub.next({result, type : "neo4j" }), rejected => console.log(rejected))
      .catch((reason) => console.log(reason));
      backstream.register(address_sub);

      const industry_sub = new Subject();
      const create_industry = session.run(client.industry, {
        title : el.business
      }).then(result => industry_sub.next({result, type : "neo4j" }), rejected => console.log(rejected))
      .catch((reason) => console.log(reason));
      backstream.register(industry_sub);

      const de_sub = new Subject();
      const create_de = session.run(client.de, {
        title: el.title,
        description: el.description,
      }).then(result => de_sub.next({result, type : "neo4j" }), rejected => console.log(rejected))
      .catch((reason) => console.log(reason));
      backstream.register(de_sub);

      const fr_sub = new Subject();
      const create_fr = session.run(client.de, {
        title: el.title_fr,
        description: el.description_fr,
      }).then(result => fr_sub.next({result, type : "neo4j" }), rejected => console.log(rejected))
      .catch((reason) => console.log(reason));
      backstream.register(fr_sub);

      const en_sub = new Subject();
      const create_en = session.run(client.de, {
        title: el.title_en,
        description: el.description_en,
      }).then(result => en_sub.next({result, type : "neo4j"}), rejected => console.log(rejected))
      .catch((reason) => console.log(reason));
      backstream.register(en_sub);

      combineLatest(client_sub, address_sub, industry_sub, de_sub, fr_sub, en_sub).subscribe(
        ([ven, address, industry, de, fr, en]) => {
          const ven_id = ven.result.records[0].get(0).identity;
          const address_id = address.result.records[0].get(0).identity;
          const de_id = de.result.records[0].get(0).identity;
          const fr_id = fr.result.records[0].get(0).identity;
          const en_id = en.result.records[0].get(0).identity;
          const industry_id = industry.result.records[0].get(0).identity;

          const connect_sub = new Subject()
          const connect = session.run(client.connect, {
            client_id: ven_id,
            address_id,
            de_id,
            fr_id,
            en_id,
            industry_id
          }).then(result => {connect_sub.next({result, type : "neo4j"})}, rejected => console.log(rejected))
          .catch((reason) => console.log(reason));
          backstream.register(connect_sub);
        }
      );
    });
  });
}

client.getClient = `
MATCH (client:Client) RETURN client
`

client.updateImage = `
MATCH (client:Client) WHERE client.sequence = $sequence
SET client.imageUrl = $imageUrl
`

client.files = function () {

  const session = neo4jclient.session;

  const clients = new Subject()
  session.run(client.getClient, {}).then(result => clients.next({result, type : ""}))
  .catch((reason) => console.log(reason));
  clients.subscribe(
    (result) => {
      ftpclient.ready.subscribe((ready) => {
        if (ready) {
          result.records.forEach((record) => {

            const sequence = record.get('client').properties.sequence 
            const imageUrl = record.get('client').properties.imageUrl
            const uid = record.get('client').properties.uid
            const sub = new Subject();
            ftpclient.request.next({ filename : imageUrl, type : "client", uid : uid, sequence : sequence, subject : sub});

            const up = new Subject();
            sub.subscribe((promise) => {
              promise.then(result => {
                session.run(client.updateImage, {
                  sequence : sequence,
                  imageUrl : result
                }).then(res => up.next({res, type : "update" }));
              });
            });
            backstream.register(up);
          })
        }
      })
    }
  )
}