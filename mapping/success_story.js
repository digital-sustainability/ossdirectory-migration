
const { migrate, onComplete, migrateFile } = require('../execute');

const sucQuery = `SELECT * FROM tx_ossdirectory_reference`;

const sucCypher = `CREATE (node:SuccessStory {
    uid : toInt($uid),
    createdAt: $createdAt,
    title: $title,
    logo: $logo,
    createdBy: $createdBy,
    industry: $industry,
    deleted : toInt($deleted)
}) RETURN node`

const sucMap = (row) => ({
    uid : row.uid,
    createdAt: row.crdate,
    title: row.title,
    deleted: row.deleted,
    industry: row.business,
    logo: row.logo,
    createdBy: row.feuser_uid,
}); 

const sucTranslationCypher = `
MERGE (lang:Language { short : $lang })
MERGE (suc:SuccessStoryTranslation :Translation {
    uid: toInt($uid),
    title: $title,
    description: $description
})-[:LANGUAGE]->(lang)
`;

const sucTranslationMapDE = (row) => ({
    uid: row.uid,
    title: row.title || '',
    description: row.description || '',
    lang : 'de',
}); 

const sucTranslationMapFR = (row) => ({
    uid: row.uid,
    title: row.title_fr || '',
    description: row.description_fr || '',
    lang : 'fr',
}); 

const sucTranslationMapEN = (row) => ({
    uid: row.uid,
    title: row.title_en || '',
    description: row.description_en || '',
    lang : 'en',
}); 


const connectSucTranslationCypher = `
    MATCH (suc:SuccessStory { uid: toInt($uid)})
    MATCH (translation:SuccessStoryTranslation { uid: toInt($uid)})
    MERGE (suc)-[:TRANSLATION]->(translation)
`

const uidMap = (row) => ({
    uid : row.uid,
    vendor : row.firm,
    client: row.client_uid,
})

const connectSucProductsCypher = `
    MATCH (suc:SuccessStory { uid: toInt($uid)})
    UNWIND $productUids as productuid
    MATCH (product:Product) WHERE product.uid = toInt(productuid)
    MERGE (suc)-[:REALISED_WITH]->(product)
`;

const connectSucProductMap = (row) => ({
    productUids: row.products ? row.products.split(',') : [],
    uid: row.uid
});

const connectSucVendor = `
MATCH (suc:SuccessStory { uid: toInt($uid)})
MATCH (vendor:Vendor { uid: toInt($vendor)})
MERGE (vendor)-[:REALISED]->(suc)
`;

const connectSucClient = `
MATCH (suc:SuccessStory { uid: toInt($uid)})
MATCH (client:Client { uid: toInt($client)})
MERGE (client)-[:COMMISSIONED]->(suc)
`;

const logoMatcher = (row, files) => {

    const element = files.find((element) => {
        const name = element.name;

        let  found;

        found = found ? found : name.includes(row.logo);
        found = found ? found : name.includes(`reference_${row.uid}_`);
        

        return found;
    });

    if (element) {
        return element.name;
    } else {
        return element;
    }
}

const sucFileName = (row) => {
    const ext = row.logo ? row.logo.split('.').pop() : '';
    return `successstory_${row.uid}.${ext}`;
}

function sucSetup() {

    const obs = [];

    obs.push(migrate(sucQuery, sucCypher, sucMap));
    obs.push(migrate(sucQuery, sucTranslationCypher, sucTranslationMapDE));
    obs.push(migrate(sucQuery, sucTranslationCypher, sucTranslationMapEN));
    obs.push(migrate(sucQuery, sucTranslationCypher, sucTranslationMapFR));

    return obs;

}

function sucConnect() {

    const obs = [];

    obs.push(migrate(sucQuery, connectSucTranslationCypher, uidMap));
    obs.push(migrate(sucQuery, connectSucProductsCypher, connectSucProductMap));
    obs.push(migrate(sucQuery, connectSucVendor, uidMap));
    obs.push(migrate(sucQuery, connectSucClient, uidMap));

    return obs;
}


function sucFiles(files) {

    const obs = [];

    obs.push(migrateFile(sucQuery, logoMatcher, sucFileName, files))

    return obs;
}

 
module.exports = { setup : sucSetup, connect : sucConnect, files: sucFiles }