const { migrate, onComplete, migrateFile } = require('../execute');

const clientQuery = `SELECT * FROM tx_ossdirectory_client`;

const clientCypher = `CREATE (node:Client :Organisation {
    uid : toInt($uid),
    timestamp: $timestamp,
    createdAt: $createdAt,
    createdBy: toInt($createdBy),
    title: $title,
    url : $url,
    deleted : toInt($deleted),
    logo : $logo,
    counter: $counter
  }) RETURN node`;

const clientMap = (row) => ({
    uid : row.uid,
    timestamp : row.tstamp,
    createdAt : row.crdate,
    createdBy : row.feuser_uid,
    title: row.title,
    url: row.url,
    deleted: row.deleted,
    logo: row.logo,
    counter: row.counter
});

const clientAddressCypher = `CREATE (node:Address {
    uid : toInt($uid),
    address : $address,
    address2 : $address2,
    zip : toInt($zip),
    city : $city,
    country : $country
  }) RETURN node`;

const clientAddressMap = (row) => ({
    uid: row.uid,
    address: row.address,
    address2 : row.address2,
    zip: row.zip,
    city: row.city,
    country: row.country,
})

const industryCypher = `
MERGE (lang:Language { short : 'en' })
MERGE (node_trans:IndustryTranslation :Translation { title : $title })
    MERGE (node:Industry { title : $title })
    MERGE (node)-[:TRANSLATION]->(node_trans)
    MERGE (node_trans)-[:LANGUAGE]->(lang)
    RETURN node;
    `;

const industryMap = (row) => ({
    uid: row.uid,
    title: row.business,
});

const clientTranslationCypher = `
MERGE (lang:Language { short : $lang })
MERGE (node:OrganisationTranslation :ClientTranslation :Translation {
    uid: toInt($uid),
    title : $title,
    description : $description
  })-[:LANGUAGE]->(lang) RETURN node`;

const clientTranslationMapDE = (row) => ({
    uid: row.uid,
    title: row.title || '',
    description: row.description || '',
    lang : 'de',
});
const clientTranslationMapFR = (row) => ({
    uid: row.uid,
    title: row.title_fr || '',
    description: row.description_fr || '',
    lang : 'fr',
});
const clientTranslationMapEN = (row) => ({
    uid: row.uid,
    title : row.title_en || '',
    description: row.description_en || '',
    lang : 'en',
});

const connectClientAddressCypher = `
    MATCH (client:Client { uid : toInt($uid)})
    MATCH (address:Address { uid : toInt($uid)})
    CREATE (client)-[:ADDRESS]->(address)
`;

const connectClientTranslationCypher = `
    MATCH (client:Client { uid : toInt($uid)})
    MATCH (translation:ClientTranslation { uid : toInt($uid)})
    MERGE (client)-[:TRANSLATION]->(translation)
`;

const connectClientIndustryCypher = `
    MATCH (client:Client { uid : toInt($uid)})
    MATCH (industry:Industry { title : $title })
    MERGE (client)-[:INDUSTRY]->(industry)
`;

const uidMap = (row) => ({
    uid : row.uid
});

const logoMatcher = (row, files) => {

    const element = files.find((element) => {
        const name = element.name;

        let  found;

        found = found ? found : name.includes(row.logo);
        found = found ? found : name.includes(`client_${row.uid}_`);
        

        return found;
    });

    if (element) {
        return element.name;
    } else {
        return element;
    }
}

const clientFileName = (row) => {
    const ext = row.logo ? row.logo.split('.').pop() : '';
    return `client_${row.uid}.${ext}`;
}

function clientSetup() {

    const obs = [];

    obs.push(migrate(clientQuery, clientCypher, clientMap));
    obs.push(migrate(clientQuery, clientAddressCypher, clientAddressMap));
    obs.push(migrate(clientQuery, industryCypher, industryMap));
    obs.push(migrate(clientQuery, clientTranslationCypher, clientTranslationMapDE));
    obs.push(migrate(clientQuery, clientTranslationCypher, clientTranslationMapFR));
    obs.push(migrate(clientQuery, clientTranslationCypher, clientTranslationMapEN));

    return obs;

}

function clientConnect() {

    const obs = [];

    obs.push(migrate(clientQuery, connectClientAddressCypher, uidMap));
    obs.push(migrate(clientQuery, connectClientTranslationCypher, uidMap));
    obs.push(migrate(clientQuery, connectClientIndustryCypher, industryMap));

    return obs;
}

function clientFiles(files) {

    const obs = [];

    obs.push(migrateFile(clientQuery, logoMatcher, clientFileName, files))

    return obs;
}
 
module.exports = { setup : clientSetup, connect : clientConnect, files : clientFiles }

