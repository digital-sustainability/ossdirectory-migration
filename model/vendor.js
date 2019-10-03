const mysqlclient = require('../mysql-module');
const neo4jclient = require('../neo4j-module');
const { Subject, combineLatest } = require('rxjs');
const backstream = require('../backstream');

const ftpclient = require('../ftp-module');

const vendor = module.exports = {};

vendor.query = `SELECT * FROM tx_ossdirectory_firm`;

vendor.vendor = `CREATE (node:Vendor {
  uid : toInt($uid),
  imageUrl : $imageUrl,
  url : $url,
  deleted : toInt($deleted)
}) RETURN node`

vendor.address = `CREATE (node:Address {
  address : $address,
  address2 : $address2,
  zip : toInt($zip),
  city : $city,
  country : $country
}) RETURN node`

vendor.de = `CREATE (node:OrganisationTranslation {
  title : $title,
  description : $description
}) RETURN node`

vendor.fr = `CREATE (node:OrganisationTranslation {
  title : $title_fr,
  description : $description_fr
}) RETURN node`

vendor.en = `CREATE (node:OrganisationTranslation {
  title : $title_en,
  description : $description_en
}) RETURN node`

vendor.connect = `
MATCH (vendor) WHERE ID(vendor) = $vendor_id
MATCH (address) WHERE ID(address) = $address_id
MATCH (de) WHERE ID(de) = $de_id
MATCH (fr) WHERE ID(fr) = $fr_id
MATCH (en) WHERE ID(en) = $en_id

MATCH (lang_de:Language) WHERE lang_de.short = "de"
MATCH (lang_fr:Language) WHERE lang_fr.short = "fr"
MATCH (lang_en:Language) WHERE lang_en.short = "en"

MERGE (de)-[:LANGUAGE]->(lang_de)
MERGE (fr)-[:LANGUAGE]->(lang_fr)
MERGE (en)-[:LANGUAGE]->(lang_en)

MERGE (vendor)-[:VENDOR_TRANSLATION]->(de)
MERGE (vendor)-[:VENDOR_TRANSLATION]->(fr)
MERGE (vendor)-[:VENDOR_TRANSLATION]->(en)
MERGE (vendor)-[:ADDRESS]->(address)
`

vendor.migrate = function() {
  mysqlclient.query(vendor.query, (err, rows) => {
    if (err) console.log(err);

    const session = neo4jclient.session;

    rows.forEach(el => {
            
      const vendor_sub = new Subject();
      const create_vendor = session.run(vendor.vendor, { 
        uid : el.uid,
        deleted : el.deleted,
        url : el.url,
        imageUrl : el.logo
      }).then(result => vendor_sub.next({result, type : "neo4j"}), rejected => console.log(rejected));
      backstream.register(vendor_sub);

      const address_sub = new Subject();
      const create_address = session.run(vendor.address, {
        address : el.address,
        address2 : el.address2,
        zip : el.zip,
        city : el.city,
        country : el.country
      }).then(result => address_sub.next({result, type : "neo4j"}), rejected => console.log(rejected));
      backstream.register(address_sub);

      const de_sub = new Subject();
      const create_de = session.run(vendor.de, {
        title : el.title,
        description : el.description,
      }).then(result => de_sub.next({result, type : "neo4j"}), rejected => console.log(rejected));
      backstream.register(de_sub);

      const fr_sub = new Subject();
      const create_fr = session.run(vendor.de, {
        title : el.title_fr,
        description : el.description_fr,
      }).then(result => fr_sub.next({result, type : "neo4j"}), rejected => console.log(rejected));
      backstream.register(fr_sub);

      const en_sub = new Subject();
      const create_en = session.run(vendor.de, {
        title : el.title_en,
        description : el.description_en,
      }).then(result => en_sub.next({result, type : "neo4j"}), rejected => console.log(rejected));
      backstream.register(en_sub);

      combineLatest(vendor_sub, address_sub, de_sub, fr_sub, en_sub).subscribe(
        ([ven, address, de, fr, en]) => {
          const ven_id = ven.result.records[0].get(0).identity;
          const address_id = address.result.records[0].get(0).identity;
          const de_id = de.result.records[0].get(0).identity;
          const fr_id = fr.result.records[0].get(0).identity;
          const en_id = en.result.records[0].get(0).identity;

          const connect_sub = new Subject()
          const connect = session.run(vendor.connect, {
            vendor_id : ven_id,
            address_id,
            de_id,
            fr_id,
            en_id,
          }).then(result => {
            connect_sub.next({result, type : "neo4j"});
          }, 
            rejected => console.log(rejected));
          backstream.register(connect_sub); //register such that the backstream can close if all are done
        }
      );
    });
  });
}

vendor.product_relations = `
MATCH (vendor:Vendor) WHERE vendor.uid = $uid
WITH vendor, $products AS products
UNWIND products AS product_uid
MATCH (product:Product) WHERE product.uid = toInt(product_uid)
MERGE (vendor)-[:PROVIDES]->(product) 
`

vendor.relationships = function () {
  mysqlclient.query(vendor.query, (err, rows) => {
    if (err) console.log(err);

    const session = neo4jclient.session;

    rows.forEach(el => {

      const product = new Subject();
      session.run(vendor.product_relations, {
        uid : el.uid,
        products : el.products ? el.products.split(',') : []
      }).then(result => product.next({result, type : "neo4j"}));
      backstream.register(product);
    });
  });
}



vendor.getVendor = `
MATCH (vendor:Vendor) RETURN vendor
`

vendor.updateImage = `
MATCH (vendor:Vendor) WHERE vendor.sequence = $sequence
SET vendor.imageUrl = $imageUrl
`
const re = /(?:\.([^.]+))?$/;
vendor.files = function () {

    ftpclient.list.subscribe(
        (list) => {
            if (list.length <= 0) return;

            const vendors = neo4jclient.cypher(vendor.getVendor, {});
            vendors.subscribe(
                (record) => {
                    const vendor_record = record.get(0);
                    const vendor_uid = vendor_record.properties.uid;
                    const vendor_imageUrl = vendor_record.properties.imageUrl;
                    const sequence = vendor_record.properties.sequence;

                    const found_uid = list.find((file) => file.name.includes(vendor_uid));
                    const found_imageUrl = list.find((file) => file.name.includes(vendor_imageUrl));

                    if (found_uid) {

                        backstream.filesMatched+=1;
                        
                        const ending = re.exec(found_uid.name)[1];
                        const new_filename = `vendor_${sequence}.${ending}`
                        ftpclient.requests.next({old_filename : found_uid.name, new_filename });

                    } else if (found_imageUrl) {

                        backstream.filesMatched+=1;

                        const ending = re.exec(found_imageUrl.name)[1];
                        const new_filename = `vendor_${sequence}.${ending}`
                        ftpclient.requests.next({old_filename : found_imageUrl.name, new_filename });

                    } else {

                        backstream.filesNotMatched+=1;

                    }
            });
    });
}

