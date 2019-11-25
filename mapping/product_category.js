const { migrate, onComplete } = require('../execute');

const productCategoryQuery = `SELECT * FROM tx_ossdirectory_product_category`;

const productCategoryCypher = `
    CREATE (node:ProductCategory {
        uid: toInt($uid),
        createdBy: $createdBy,
        createdAt: $createdAt,
        deleted: $deleted,
        title: $title,
        group: $group
    }) RETURN node
`;

const productCategoryMap = (row) => ({
    uid: row.uid,
    createdAt: row.tstamp,
    createdBy: row.cruser_id,
    deleted: row.deleted,
    title: row.title,
    group: row.grp,
});

const productCategoryTranslationCypher = `
    MERGE (lang:Language { short : 'en' })
    MERGE (trans:ProductCategoryTranslation {
        uid: toInt($uid),
        title: $title,
        group: $group
    })-[:LANGUAGE]->(lang) RETURN trans
`;

const productCategoryTranslationMapEN = (row) => ({
    uid: row.uid,
    title: row.title,
    group: row.grp,
});

const connectProductCategoryTranslationCypher = `
    MATCH (category:ProductCategory { uid: toInt($uid) })
    MATCH (trans:ProductCategoryTranslation { uid: toInt($uid )})
    MERGE (category)-[:TRANSLATION]->(trans)
`;


const uidMap = (row) => ({
    uid : row.uid
})

function categorySetup() {

    const obs = [];

    obs.push(migrate(productCategoryQuery, productCategoryCypher, productCategoryMap));
    obs.push(migrate(productCategoryQuery, productCategoryTranslationCypher, productCategoryTranslationMapEN));
    
    return obs;
}

function categoryConnect() {

    const obs = [];

    obs.push(migrate(productCategoryQuery, connectProductCategoryTranslationCypher, uidMap));

    return obs;
}

module.exports = { setup : categorySetup, connect: categoryConnect }
