const mysqlclient = require('../mysql-module');
const neo4jclient = require('../neo4j-module');
const {
  Subject,
  combineLatest
} = require('rxjs');
const backstream = require('../backstream');

const product_category = module.exports = {};

product_category.query = `SELECT * FROM tx_ossdirectory_product_category`;

product_category.product_category = `CREATE (node:ProductCategory {
  uid : toInt($uid),
  deleted : toInt($deleted),
  group : $group
}) RETURN node`

product_category.de = `CREATE (node:ProductCategoryTranslation {
  title : $title
}) RETURN node`

product_category.connect = `
MATCH (product_category) WHERE ID(product_category) = $product_category_id
MATCH (de) WHERE ID(de) = $de_id
  
MATCH (lang_de:Language) WHERE lang_de.short = "de"

MERGE (de)-[:LANGUAGE]->(lang_de)

MERGE (product_category)-[:PRODUCT_CATEGORY_TRANSLATION]->(de)
`

product_category.migrate = function () {
  mysqlclient.query(product_category.query, (err, rows) => {
    if (err) console.log(err);

    console.log("Product_categorys: ", rows.length);

    const session = neo4jclient.session;

    rows.forEach(el => {

      const product_category_sub = new Subject();
      const create_product_category = session.run(product_category.product_category, {
        uid: el.uid,
        deleted: el.deleted,
        group: el.grp,
      }).then(result => product_category_sub.next({result, type : "neo4j"}))
      .catch((reason) => console.log(reason));
      backstream.register(product_category_sub);

      const de_sub = new Subject();
      const create_de = session.run(product_category.de, {
        title: el.title,
      }).then(result => de_sub.next({result, type : "neo4j"}))
      .catch((reason) => console.log(reason));
      backstream.register(de_sub);

      combineLatest(product_category_sub, de_sub).subscribe(
        ([ven, de]) => {
          const ven_id = ven.result.records[0].get(0).identity;
          const de_id = de.result.records[0].get(0).identity;
       
          const connect_sub = new Subject()
          const connect = session.run(product_category.connect, {
            product_category_id: ven_id,
            de_id,
          }).then(result => connect_sub.next({result, type : "neo4j"}))
          .catch((reason) => console.log(reason));
          backstream.register(connect_sub);
        }
      );
    });
  });
}