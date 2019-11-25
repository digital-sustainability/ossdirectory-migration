const mysqlclient = require('../mysql-module');
const neo4jclient = require('../neo4j-module');
const { Subject, combineLatest } = require('rxjs');
const backstream = require('../backstream');
const ftpclient = require('../ftp-module');

const topNewsQuery = `SELECT * FROM tx_koressources_entries`;
const topNewsCypher = `Create (node:TopNews {
    uid: toInt($uid),
    timestamp: $timestamp,
    createdAt: $createdAt,
    createdBy: $createdBy,
    title: $title,
    imageUrl: $imageUrl,
    keywords: $keywords,
    releasedate: $releasedate,
    author: $author,
    html: $html,
    type: $type,
    file: $file,
    medium: $medium,
    deleted: toInt($deleted)
}) RETURN node`;

const topNewsMap = (row) => ({
    uid: row.uid,
    timestamp: row.timestamp,
    createdAt: row.crdate,
    createdBy: row.cruser_id,
    title: row.title,
    imageUrl: row.image,
    keywords: row.keywords,
    releasedate: row.releasedate,
    author: row.author,
    type: row.type,
    medium: row.medium,
    file: row.file,
    html: row.html,
    deleted: row.deleted,
});

const topNewsTranslationCypher = `
    MERGE (lang:Language { short: $lang })
    MERGE (node:TopNewsTranslation :Translation {
        uid: toInt($uid),
        title: $title,
        description: $descriptions
    })-[:LANGUAGE]->(lang) RETURN node
`;

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

const re = /(?:\.([^.]+))?$/;
topnews.files = function () {

    ftpclient.list.subscribe(
        (list) => {
            if (list.length <= 0) return;

            const topnewss = neo4jclient.cypher(topnews.getTopNews, {});
            topnewss.subscribe(
                (record) => {
                    const topnews_record = record.get(0);
                    const topnews_uid = topnews_record.properties.uid;
                    const topnews_imageUrl = topnews_record.properties.imageUrl;
                    const sequence = topnews_record.properties.sequence;

                    const found_uid = list.find((file) => file.name.includes(topnews_uid));
                    const found_imageUrl = list.find((file) => file.name.includes(topnews_imageUrl));

                    if (found_imageUrl) {

                        backstream.filesMatched+=1;

                        const ending = re.exec(found_imageUrl.name)[1];
                        const new_filename = `topnews_${sequence}.${ending}`
                        ftpclient.requests.next({old_filename : found_imageUrl.name, new_filename });

                    } else {

                        backstream.filesNotMatched+=1;
                        //not found
                    }
            });
    });
}