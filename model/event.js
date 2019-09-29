const mysqlclient = require('../mysql-module');
const neo4jclient = require('../neo4j-module');
const { Subject, combineLatest } = require('rxjs');
const backstream = require('../backstream');

const vendor = module.exports = {};

vendor.query = `SELECT * FROM tx_ossdirectory_firm LIMIT 1`;

vendor.vendor = `CREATE (node:Vendor {
  uid : toInt($uid),
  imageUrl : $imageUrl,
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

CREATE (vendor)-[:TRANSLATION]->(de)
CREATE (vendor)-[:TRANSLATION]->(fr)
CREATE (vendor)-[:TRANSLATION]->(en)
CREATE (vendor)-[:ADDRESS]->(address)
`

vendor.migrate = function() {
  mysqlclient.connect();
  mysqlclient.query(vendor.query, (err, rows) => {
    if (err) console.log(err);

    rows.forEach(el => {
      const session = neo4jclient.session();
      
      const vendor_sub = new Subject();
      const create_vendor = session.run(vendor.vendor, { 
        uid : el.uid,
        deleted : el.deleted,
        imageUrl : el.logo
      }).then(result => vendor_sub.next(result));

      const address_sub = new Subject();
      const create_address = session.run(vendor.address, {
        address : el.address,
        address2 : el.address2,
        zip : el.zip,
        city : el.city,
        country : el.country
      }).then(result => address_sub.next(result));

      const de_sub = new Subject();
      const create_de = session.run(vendor.de, {
        title : el.title,
        description : el.description,
      }).then(result => de_sub.next(result));

      const fr_sub = new Subject();
      const create_fr = session.run(vendor.de, {
        title : el.title_fr,
        description : el.description_fr,
      }).then(result => fr_sub.next(result));

      const en_sub = new Subject();
      const create_en = session.run(vendor.de, {
        title : el.title_en,
        description : el.description_en,
      }).then(result => en_sub.next(result));

      combineLatest(vendor_sub, address_sub, de_sub, fr_sub, en_sub).subscribe(
        ([ven, address, de, fr, en]) => {
          const ven_id = ven.records[0].get(0).identity;
          const address_id = address.records[0].get(0).identity;
          const de_id = de.records[0].get(0).identity;
          const fr_id = fr.records[0].get(0).identity;
          const en_id = en.records[0].get(0).identity;

          const connect_sub = new Subject()
          const connect = session.run(vendor.connect, {
            vendor_id : ven_id,
            address_id,
            de_id,
            fr_id,
            en_id,
          }).then(result => connect_sub.next(result));
          backstream.register(connect_sub);
          backstream.subject.next("vendor");
        }
      );
    });
  });
  mysqlclient.end();
}