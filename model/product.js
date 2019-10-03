const mysqlclient = require('../mysql-module');
const neo4jclient = require('../neo4j-module');
const ftpclient = require('../ftp-module');
const {
  Subject,
  combineLatest
} = require('rxjs');
const backstream = require('../backstream');

const product = module.exports = {};

product.query = `SELECT * FROM tx_ossdirectory_product`;

product.product = `CREATE (node:Product {
  uid : toInt($uid),
  imageUrl : $imageUrl,
  url : $url,
  links : $links,
  deleted : toInt($deleted)
}) RETURN node`

product.de = `CREATE (node:ProductTranslation {
  title : $title,
  description : $description
}) RETURN node`

product.fr = `CREATE (node:ProductTranslation {
  title : $title_fr,
  description : $description_fr
}) RETURN node`

product.en = `CREATE (node:ProductTranslation {
  title : $title_en,
  description : $description_en
}) RETURN node`

product.connect = `
MATCH (product) WHERE ID(product) = $product_id
MATCH (de) WHERE ID(de) = $de_id
MATCH (fr) WHERE ID(fr) = $fr_id
MATCH (en) WHERE ID(en) = $en_id
  
MATCH (lang_de:Language) WHERE lang_de.short = "de"
MATCH (lang_fr:Language) WHERE lang_fr.short = "fr"
MATCH (lang_en:Language) WHERE lang_en.short = "en"

MERGE (de)-[a:LANGUAGE]->(lang_de)
MERGE (fr)-[b:LANGUAGE]->(lang_fr)
MERGE (en)-[c:LANGUAGE]->(lang_en)

MERGE (product)-[d:PRODUCT_TRANSLATION]->(de)
MERGE (product)-[e:PRODUCT_TRANSLATION]->(fr)
MERGE (product)-[f:PRODUCT_TRANSLATION]->(en)

RETURN a,b,c,d,e,f

`

product.migrate = function () {
  mysqlclient.query(product.query, (err, rows) => {
    if (err) console.log(err);

    console.log("Products: ", rows.length);

    const session = neo4jclient.session;

    rows.forEach(el => {

      const product_sub = new Subject();
      const create_product = session.run(product.product, {
        uid: el.uid,
        url: el.download_url,
        deleted: el.deleted,
        links : el.links ? el.links.split(',') : '',
        imageUrl: el.logo
      }).then(result => product_sub.next({result, type : "neo4j"}))
      .catch((reason) => console.log(reason));
      backstream.register(product_sub);

      const de_sub = new Subject();
      const create_de = session.run(product.de, {
        title: el.title,
        description: el.description,
      }).then(result => de_sub.next({result, type : "neo4j"}))
      .catch((reason) => console.log(reason));
      backstream.register(de_sub);

      const fr_sub = new Subject();
      const create_fr = session.run(product.de, {
        title: el.title_fr,
        description: el.description_fr,
      }).then(result => fr_sub.next({result, type : "neo4j"}))
      .catch((reason) => console.log(reason));
      backstream.register(fr_sub);

      const en_sub = new Subject();
      const create_en = session.run(product.de, {
        title: el.title_en,
        description: el.description_en,
      }).then(result => en_sub.next({result, type : "neo4j"}))
      .catch((reason) => console.log(reason));
      backstream.register(en_sub);

      combineLatest(product_sub, de_sub, fr_sub, en_sub).subscribe(
        ([ven, de, fr, en]) => {
          const ven_id = ven.result.records[0].get(0).identity;
          const de_id = de.result.records[0].get(0).identity;
          const fr_id = fr.result.records[0].get(0).identity;
          const en_id = en.result.records[0].get(0).identity;

          const connect_sub = new Subject()
          const connect = session.run(product.connect, {
            product_id: ven_id,
            de_id,
            fr_id,
            en_id,
          }).then(result => connect_sub.next({result, type : "neo4j"}))
          .catch((reason) => console.log(reason));
          backstream.register(connect_sub);
        }
      );
    });
  });
}

product.category_relation = `
MATCH (product:Product) WHERE product.uid = $uid
MATCH (category:ProductCategory) WHERE category.uid = $category_uid
MERGE (product)-[:IN_CATEGORY]->(category)
`

product.relationships = function () {
  mysqlclient.query(product.query, (err, rows) => {
    if (err) console.log(err);

    const session = neo4jclient.session;

    rows.forEach(el => {

      const category = new Subject();
      session.run(product.category_relation, {
        uid : el.uid,
        category_uid : el.category_uid
      }).then(result => category.next({result, type : "neo4j"}))
      .catch((reason) => console.log(reason));
      backstream.register(category);
    });
  });
}


product.getProduct = `
MATCH (product:Product) RETURN product
`

product.updateImage = `
MATCH (product:Product) WHERE product.sequence = $sequence
SET product.imageUrl = $imageUrl
`
const re = /(?:\.([^.]+))?$/;
product.files = function () {

    ftpclient.list.subscribe(
        (list) => {
            if (list.length <= 0) return;

            const products = neo4jclient.cypher(product.getProduct, {});
            products.subscribe(
                (record) => {
                    const product_record = record.get(0);
                    const product_uid = product_record.properties.uid;
                    const product_imageUrl = product_record.properties.imageUrl;
                    const sequence = product_record.properties.sequence;

                    const found_uid = list.find((file) => file.name.includes(product_uid));
                    const found_imageUrl = list.find((file) => file.name.includes(product_imageUrl));

                    if (found_uid) {
                        
                        const ending = re.exec(found_uid.name)[1];
                        const new_filename = `product_${sequence}.${ending}`
                        ftpclient.requests.next({old_filename : found_uid.name, new_filename });

                    } else if (found_imageUrl) {

                        const ending = re.exec(found_imageUrl.name)[1];
                        const new_filename = `product_${sequence}.${ending}`
                        ftpclient.requests.next({old_filename : found_imageUrl.name, new_filename });

                    } else {
                        //not found
                    }
            });
    });
}