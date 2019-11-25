const { migrate, onComplete, migrateFile } = require('../execute');

const productQuery = `SELECT * FROM tx_ossdirectory_product`;

const productCypher = `CREATE (node:Product {
    uid: toInt($uid),
    createdAt: $createdAt,
    deleted: $deleted,
    title: $title,
    key: $key,
    logo: $logo,
    links: $links,
    createdBy: $createdBy,
    url: $url,
    version: $version,
    license: $license
}) RETURN node`

const productMap = (row) => ({
    uid: row.uid,
    createdAt: row.crdate,
    deleted: row.deleted,
    title: row.title,
    key: row.oldkey,
    logo: row.logo,
    links: row.links ? row.links.split(',') : [],
    createdBy: row.feuser_uid,
    url: row.download_url,
    version: row.version,
    license: row.license
});

const productTranslationCypher = `
MERGE (lang:Language { short : $lang })
MERGE (node:ProductTranslation :Translation {
    uid: toInt($uid),
    title: $title,
    description: $description
})-[:LANGUAGE]->(lang)
`

const productTranslationMapDE = (row) => ({
    uid: row.uid,
    title: row.title || '',
    description: row.description || '',
    lang : 'de',
});

const productTranslationMapFR = (row) => ({
    uid: row.uid,
    title: row.title_fr || '',
    description: row.description_fr || '',
    lang : 'fr',
});

const productTranslationMapEN = (row) => ({
    uid: row.uid,
    title: row.title_en || '',
    description: row.description_en || '',
    lang : 'en',
});

const connectProductTranslationCypher = `
    MATCH (product:Product {uid : toInt($uid)})
    MATCH (translation:ProductTranslation { uid: toInt($uid)})
    MERGE (product)-[:TRANSLATION]->(translation)
`;

const connectProductCategoryCypher = `
    MATCH (product:Product {uid : toInt($uid)})
    MATCH (category:ProductCategory { uid : toInt($category )})
    MERGE (product)-[:CATEGORY]->(category)
`

const connectProductCategoryMap = (row) => ({
    uid: row.uid,
    category: row.category_uid
});

const uidMap = (row) => ({
    uid : row.uid
});


const logoMatcher = (row, files) => {

    const element = files.find((element) => {
        const name = element.name;

        let  found;

        found = found ? found : name.includes(row.logo);
        found = found ? found : name.includes(`product_${row.uid}_`);
        

        return found;
    });

    if (element) {
        return element.name;
    } else {
        return element;
    }
}

const productFileName = (row) => {
    const ext = row.logo ? row.logo.split('.').pop() : '';
    return `product_${row.uid}.${ext}`;
}


function productSetup() {

    const obs = [];

    obs.push(migrate(productQuery, productCypher, productMap))
    obs.push(migrate(productQuery, productTranslationCypher, productTranslationMapEN));
    obs.push(migrate(productQuery, productTranslationCypher, productTranslationMapFR));
    obs.push(migrate(productQuery, productTranslationCypher, productTranslationMapDE));

    return obs;
}

function productConnect() {

    const obs = [];

    obs.push(migrate(productQuery, connectProductTranslationCypher, uidMap));
    obs.push(migrate(productQuery, connectProductCategoryCypher, connectProductCategoryMap));

    return obs;
}

function productFiles(files) {

    const obs = [];

    obs.push(migrateFile(productQuery, logoMatcher, productFileName, files))

    return obs;
}
 
module.exports = { setup : productSetup, connect : productConnect, files: productFiles }