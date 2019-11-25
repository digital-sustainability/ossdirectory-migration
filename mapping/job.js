const { migrate, onComplete } = require('../execute');

const jobQuery = `SELECT * FROM tx_koossjobs_jobs`;

const jobCypher = `CREATE (node:Job {
    uid : toInt($uid),
    createdAt: $createdAt,
    createdBy: toInt($createdBy),
    location : $location,
    starttime : $starttime,
    endtime : $endtime,
    url : $url,
    date : $date,
    title : $title,
    contact: $contact,
    email: $email, 
    sponsor: $sponsor,
    deleted : toInt($deleted),
    vendorId: $vendorId,
    productId: $productId,
    successStoryId: $successStoryId
  }) RETURN node`;

const jobMap = (row) => ({
    uid : row.uid,
    createdAt: row.crdate,
    createdBy: row.feuser_uid,
    contact: row.contact,
    email: row.contact_email,
    sponsor: row.sponsor,
    location: row.location,
    starttime: row.starttime,
    title: row.title,
    endtime: row.endtime,
    date: row.date,
    deleted: row.deleted,
    url: row.url,
    vendorId: row.tx_ossdirectory_reffirm,
    productId: row.tx_ossdirectory_refproduct,
    successStoryId: row.tx_ossdirectory_refreference
});

function jobSetup() {

    const obs = [];

    obs.push(migrate(jobQuery, jobCypher, jobMap));

    return obs;

}

function jobConnect() {

    const obs = [];

    return obs;

}

 
module.exports = { setup : jobSetup, connect : jobConnect }



