const mysqlclient = require('../mysql-module');
const neo4jclient = require('../neo4j-module');
const { Subject, combineLatest } = require('rxjs');
const backstream = require('../backstream');

const ftpclient = require('../ftp-module');

const successstory = module.exports = {};

successstory.query = `SELECT * FROM tx_ossdirectory_reference`;

successstory.successstory = `CREATE (node:SuccessStory {
  uid : toInt($uid),
  imageUrl : $imageUrl,
  deleted : toInt($deleted)
}) RETURN node`

successstory.de = `CREATE (node:SuccessStoryTranslation {
  title : $title,
  description : $description
}) RETURN node`

successstory.fr = `CREATE (node:SuccessStoryTranslation {
  title : $title_fr,
  description : $description_fr
}) RETURN node`

successstory.en = `CREATE (node:SuccessStoryTranslation {
  title : $title_en,
  description : $description_en
}) RETURN node`

successstory.connect = `
MATCH (successstory) WHERE ID(successstory) = $successstory_id
MATCH (de) WHERE ID(de) = $de_id
MATCH (fr) WHERE ID(fr) = $fr_id
MATCH (en) WHERE ID(en) = $en_id
 
MATCH (lang_de:Language) WHERE lang_de.short = "de"
MATCH (lang_fr:Language) WHERE lang_fr.short = "fr"
MATCH (lang_en:Language) WHERE lang_en.short = "en"

MERGE (de)-[:LANGUAGE]->(lang_de)
MERGE (fr)-[:LANGUAGE]->(lang_fr)
MERGE (en)-[:LANGUAGE]->(lang_en)

MERGE (successstory)-[:SUCCESS_STORY_TRANSLATION]->(de)
MERGE (successstory)-[:SUCCESS_STORY_TRANSLATION]->(fr)
MERGE (successstory)-[:SUCCESS_STORY_TRANSLATION]->(en)
`

successstory.migrate = function() {
  mysqlclient.query(successstory.query, (err, rows) => {
    if (err) console.log(err);

    console.log("SuccessStory: ", rows.length);

    const session = neo4jclient.session;

    rows.forEach(el => {
      
      const successstory_sub = new Subject();
      const create_successstory = session.run(successstory.successstory, { 
        uid : el.uid,
        deleted : el.deleted,
        imageUrl : el.logo
      }).then(result => successstory_sub.next({result, type : "neo4j"}));
      backstream.register(successstory_sub);

      const de_sub = new Subject();
      const create_de = session.run(successstory.de, {
        title : el.title,
        description : el.description,
      }).then(result => de_sub.next({result, type : "neo4j"}));
      backstream.register(de_sub);

      const fr_sub = new Subject();
      const create_fr = session.run(successstory.de, {
        title : el.title_fr,
        description : el.description_fr,
      }).then(result => fr_sub.next({result, type : "neo4j"}));
      backstream.register(fr_sub);

      const en_sub = new Subject();
      const create_en = session.run(successstory.de, {
        title : el.title_en,
        description : el.description_en,
      }).then(result => en_sub.next({result, type : "neo4j"}));
      backstream.register(en_sub);

      combineLatest(successstory_sub, de_sub, fr_sub, en_sub).subscribe(
        ([ven, de, fr, en]) => {
          const ven_id = ven.result.records[0].get(0).identity;
          const de_id = de.result.records[0].get(0).identity;
          const fr_id = fr.result.records[0].get(0).identity;
          const en_id = en.result.records[0].get(0).identity;

          const connect_sub = new Subject();
          const connect = session.run(successstory.connect, {
            successstory_id : ven_id,
            de_id,
            fr_id,
            en_id,
          }).then(result => connect_sub.next({result, type : "neo4j"}));
          backstream.register(connect_sub);
        }
      );
    });
  });
}

successstory.vendor_relations = `
MATCH (successstory:SuccessStory) WHERE successstory.uid = $uid
MATCH (vendor:Vendor) WHERE vendor.uid = $vendor_uid
MERGE (vendor)-[:REALISED]->(successstory)
`

successstory.product_relations = `
MATCH (successstory:SuccessStory) WHERE successstory.uid = $uid
WITH successstory, $products AS products
UNWIND products AS product_uid
MATCH (product:Product) WHERE product.uid = toInt(product_uid)
MERGE (successstory)-[:REALISED_WITH]->(product)
`

successstory.client_relations = `
MATCH (successstory:SuccessStory) WHERE successstory.uid = $uid
MATCH (client:Client) WHERE client.uid = $client_uid
MERGE (client)-[:COMMISSIONED]->(successstory)
`

successstory.industry_relations = `
MATCH (successstory:SuccessStory) WHERE successstory.uid = $uid
MATCH (industry:Industry) WHERE industry.title = $industry_title
MERGE (successstory)-[:FOR_INDUSTRY]->(industry)
`

successstory.relationships = function () {
  mysqlclient.query(successstory.query, (err, rows) => {
    if (err) console.log(err);

    const session = neo4jclient.session;

    rows.forEach(el => {

      const vendor = new Subject();
      session.run(successstory.vendor_relations, {
        uid : el.uid,
        vendor_uid : el.firm
      }).then(result => vendor.next({result, type : "neo4j"}));
      backstream.register(vendor);

      const products = new Subject();
      session.run(successstory.product_relations, {
        uid : el.uid,
        products : el.products
      }).then(result => products.next({result, type : "neo4j"}));
      backstream.register(products);

      const client = new Subject();
      session.run(successstory.client_relations, {
        uid : el.uid,
        client_uid : el.client_uid
      }).then(result => client.next({result, type : "neo4j"}));
      backstream.register(client);

      const industry = new Subject();
      session.run(successstory.industry_relations, {
        uid : el.uid,
        industry_title : el.business
      }).then(result => industry.next({result, type : "neo4j"}));
      backstream.register(industry);
    });
  });
}


successstory.getSuccessStory = `
MATCH (successstory:SuccessStory) RETURN successstory
`

successstory.updateImage = `
MATCH (successstory:SuccessStory) WHERE successstory.sequence = $sequence
SET successstory.imageUrl = $imageUrl
`

successstory.files = function () {

  const session = neo4jsuccessstory.session;

  const successstorys = new Subject()
  session.run(successstory.getSuccessStory, {}).then(result => successstorys.next(result));
  successstorys.subscribe(
    (result) => {
      ftpclient.ready.subscribe((ready) => {
        if (ready) {
          result.records.forEach((record) => {

            const sequence = record.get('successstory').properties.sequence 
            const imageUrl = record.get('successstory').properties.imageUrl
            const uid = record.get('successstory').properties.uid
            const sub = new Subject();
            ftpclient.request.next({ filename : imageUrl, type : "successstory", uid : uid, sequence : sequence, subject : sub});

            const up = new Subject();
            sub.subscribe((promise) => {
              promise.then(result => {
                session.run(successstory.updateImage, {
                  sequence : sequence,
                  imageUrl : result
                }).then(res => up.next(res));
              });
            });
            backstream.register(up);
          })
        }
      })
    }
  )
}