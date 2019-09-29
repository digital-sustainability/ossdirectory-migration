const mysqlclient = require('../mysql-module');
const neo4jclient = require('../neo4j-module');
const { Subject, combineLatest } = require('rxjs');
const backstream = require('../backstream');

const topnews = module.exports = {};

topnews.query = `SELECT * FROM tx_koressources_entries`;

topnews.topnews = `CREATE (node:TopNews {
  uid : toInt($uid),
  imageUrl : $imageUrl,
  keywords : $keywords,
  html : $html,
  type : $type,
  file : $file,
  deleted : toInt($deleted)
}) RETURN node`

topnews.de = `CREATE (node:TopNewsTranslation {
  title : $title,
  description : $description
}) RETURN node`

topnews.connect = `
MATCH (topnews) WHERE ID(topnews) = $topnews_id
MATCH (de) WHERE ID(de) = $de_id

MATCH (lang_de:Language) WHERE lang_de.short = "de"

MERGE (de)-[:LANGUAGE]->(lang_de)

MERGE (topnews)-[:NEWS_TRANSLATION]->(de)
`

topnews.migrate = function() {
  mysqlclient.query(topnews.query, (err, rows) => {
    if (err) console.log(err);

    console.log("TopNews: ", rows.length);

    const session = neo4jclient.session;

    rows.forEach(el => {
      
      const topnews_sub = new Subject();
      const create_topnews = session.run(topnews.topnews, { 
        uid : el.uid,
        deleted : el.deleted,
        keywords: el.keywords,
        html : el.html,
        file: el.file,
        type: el.type,
        imageUrl : el.image
      }).then(result => topnews_sub.next({result, type : "neo4j"}))
      .catch((reason) => console.log(reason));
      backstream.register(topnews_sub);

      const de_sub = new Subject();
      const create_de = session.run(topnews.de, {
        title : el.title,
        description : el.leadtext,
      }).then(result => de_sub.next({result, type : "neo4j"}))
      .catch((reason) => console.log(reason));
      backstream.register(de_sub);

      combineLatest(topnews_sub, de_sub).subscribe(
        ([ven, de]) => {
          const ven_id = ven.result.records[0].get(0).identity;
          const de_id = de.result.records[0].get(0).identity;

          const connect_sub = new Subject()
          const connect = session.run(topnews.connect, {
            topnews_id : ven_id,
            de_id,
          }).then(result => connect_sub.next({result, type : "neo4j"}))
          .catch((reason) => console.log(reason));
          backstream.register(connect_sub); //register such that the backstream can close if all are done
        }
      );
    });
  });
}

topnews.vendor_relations = `
MATCH (topnews:TopNews) WHERE topnews.uid = $uid
WITH topnews, $vendors AS vendors
UNWIND vendors AS vendor_uid
MATCH (vendor:Vendor) WHERE vendor.uid = toInt(vendor_uid)
MERGE (topnews)-[a:ABOUT_VENDOR]->(vendor)
RETURN topnews,a,vendor
`

topnews.success_story_relations = `
MATCH (topnews:TopNews) WHERE topnews.uid = $uid
WITH topnews, $success_stories AS success_stories
UNWIND success_stories as success_story_uid
MATCH (success_story:SuccessStory) WHERE success_story.uid = toInt(success_story_uid)
MERGE (topnews)-[:ABOUT_SUCCESS_STORY]->(success_story)
`

topnews.product_relations = `
MATCH (topnews:TopNews) WHERE topnews.uid = $uid
WITH topnews, $products AS products
UNWIND products as product_uid
MATCH (product:Product) WHERE product.uid = toInt(product_uid)
MERGE (topnews)-[:ABOUT_PRODUCT]->(product)
`

topnews.relationships = function () {
  mysqlclient.query(topnews.query, (err, rows) => {
    if (err) console.log(err);

    const session = neo4jclient.session;

    rows.forEach(el => {

      const vendor = new Subject();
      session.run(topnews.vendor_relations, {
        uid : el.uid,
        vendors : el.tx_ossdirectory_reffirm ? el.tx_ossdirectory_reffirm.split(',') : []
      }).then(result => vendor.next(result));
      backstream.register(vendor);
      
      const success_stories = new Subject();
      session.run(topnews.success_story_relations, {
        uid : el.uid,
        success_stories : el.tx_ossdirectory_refreference ? el.tx_ossdirectory_refreference.split(',') : []
      }).then(result => success_stories.next(result));
      backstream.register(success_stories);

      const product = new Subject();
      session.run(topnews.product_relations, {
        uid : el.uid,
        products : el.tx_ossdirectory_refproduct ? el.tx_ossdirectory_refproduct.split(',') : []
      }).then(result => product.next(result));
      backstream.register(product);
    });
  });
}


topnews.getTopNews = `
MATCH (topnews:TopNews) RETURN topnews
`

topnews.updateImage = `
MATCH (topnews:TopNews) WHERE topnews.sequence = $sequence
SET topnews.imageUrl = $imageUrl
`

topnews.files = function () {

  const session = neo4jtopnews.session;

  const topnewss = new Subject()
  session.run(topnews.getTopNews, {}).then(result => topnewss.next(result));
  topnewss.subscribe(
    (result) => {
      ftptopnews.ready.subscribe((ready) => {
        if (ready) {
          result.records.forEach((record) => {

            const sequence = record.get('topnews').properties.sequence 
            const imageUrl = record.get('topnews').properties.imageUrl
            const uid = record.get('topnews').properties.uid
            const sub = new Subject();
            ftptopnews.request.next({ filename : imageUrl, type : "topnews", uid : uid, sequence : sequence, subject : sub});

            const up = new Subject();
            sub.subscribe((promise) => {
              promise.then(result => {
                session.run(topnews.updateImage, {
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