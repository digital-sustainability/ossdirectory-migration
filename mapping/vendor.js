
const { migrate, onComplete, migrateFile } = require('../execute');

const vendorQuery = `SELECT * FROM tx_ossdirectory_firm`;

const vendorCypher = `CREATE (node:Vendor :Organisation {
  uid : toInt($uid),
  createdAt: $createdAt,
  deleted: $deleted,
  title: $title,
  url: $url,
  employees: $employees,
  logo: $logo,
  status: $status,
  createdBy: $createdBy
}) RETURN node`

const vendorMap = (row) => ({
    uid: row.uid,
    createdAt: row.crdate,
    deleted: row.deleted,
    title: row.title,
    url: row.url,
    employees: row.employees,
    logo: row.logo,
    status: row.status,
    createdBy: row.feuser_uid,
});

const vendorAddressCypher = `CREATE (node:Address {
    uid : toInt($uid),
    address : $address,
    address2 : $address2,
    zip : toInt($zip),
    city : $city,
    country : $country
}) RETURN node`

const vendorAddressMap = (row) => ({
    uid: row.uid,
    address: row.address,
    address2 : row.address2,
    zip: row.zip,
    city: row.city,
    country: row.country,
});

const vendorTranslationCypher = `
    MERGE (lang:Language {short : $lang })
    MERGE (node: OrganisationTranslation :VendorTranslation :Translation {
        uid: toInt($uid),
        title: $title,
        description: $description
    })-[:LANGUAGE]->(lang) RETURN node
`;

const vendorTranslationMapDE = (row) => ({
    uid: row.uid,
    title: row.title || '',
    description: row.description || '',
    lang : 'de',
});

const vendorTranslationMapFR = (row) => ({
    uid: row.uid,
    title: row.title_fr || '',
    description: row.description_fr || '',
    lang : 'fr',
});

const vendorTranslationMapEN = (row) => ({
    uid: row.uid,
    title: row.title_en || '',
    description: row.description_en || '',
    lang : 'en',
});

const connectVendorAddressCypher = `
    MATCH (vendor:Vendor { uid : toInt($uid)})
    MATCH (address:Address { uid: toInt($uid)})
    CREATE (vendor)-[:ADDRESS]->(address)
`;

const connectVendorTranslationCypher = `
    MATCH (vendor:Vendor { uid : toInt($uid)})
    MATCH (translation:VendorTranslation {uid : toInt($uid)})
    MERGE (vendor)-[:TRANSLATION]->(translation)
`;

const uidMap = (row) => ({
    uid : row.uid
});

const connectVendorProductsCypher = `
    MATCH (vendor:Vendor { uid: toInt($uid)})
    UNWIND $productUids as productuid
    MATCH (product:Product) WHERE product.uid = toInt(productuid)
    MERGE (vendor)-[:PROVIDES]->(product)
`;

const connectVendorProductMap = (row) => ({
    productUids: row.products ? row.products.split(',') : [],
    uid: row.uid
});


const logoMatcher = (row, files) => {

    const element = files.find((element) => {
        const name = element.name;

        let  found;

        found = found ? found : name.includes(row.logo);
        found = found ? found : name.includes(`firm_${row.uid}_`);
        

        return found;
    });

    if (element) {
        return element.name;
    } else {
        return element;
    }
}

const vendorFileName = (row) => {
    const ext = row.logo ? row.logo.split('.').pop() : '';
    return `vendor_${row.uid}.${ext}`;
}


function vendorSetup() {

    const obs = [];

    obs.push(migrate(vendorQuery, vendorCypher, vendorMap));
    obs.push(migrate(vendorQuery, vendorAddressCypher, vendorAddressMap));
    obs.push(migrate(vendorQuery, vendorTranslationCypher, vendorTranslationMapDE));
    obs.push(migrate(vendorQuery, vendorTranslationCypher, vendorTranslationMapFR));
    obs.push(migrate(vendorQuery, vendorTranslationCypher, vendorTranslationMapEN));

    return obs;
}


function vendorConnect() {

    const obs =[];

    obs.push(migrate(vendorQuery, connectVendorAddressCypher, uidMap));
    obs.push(migrate(vendorQuery, connectVendorTranslationCypher, uidMap));
    obs.push(migrate(vendorQuery, connectVendorProductsCypher, connectVendorProductMap));

    return obs;
}


function vendorFiles(files) {

    const obs = [];

    obs.push(migrateFile(vendorQuery, logoMatcher, vendorFileName, files))

    return obs;
}

module.exports = { setup: vendorSetup, connect: vendorConnect, files: vendorFiles }