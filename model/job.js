const mysqlclient = require('../mysql-module');
const neo4jclient = require('../neo4j-module');
const { Subject, combineLatest } = require('rxjs');
const backstream = require('../backstream');

const job = module.exports = {};

job.query = `SELECT * FROM tx_koossjobs_jobs`;

job.job = `CREATE (node:Job {
  uid : toInt($uid),
  location : $location,
  starttime : $starttime,
  endtime : $endtime,
  url : $url,
  date : $date,
  deleted : toInt($deleted)
}) RETURN node`

job.migrate = function() {
  mysqlclient.query(job.query, (err, rows) => {
    if (err) console.log(err);

    console.log("Jobs: ", rows.length);

    const session = neo4jclient.session;

    rows.forEach(el => {
      
      const job_sub = new Subject();
      const create_job = session.run(job.job, { 
        uid : el.uid,
        location: el.location,
        starttime: el.starttime,
        endtime : el.endtime,
        date : el.date,
        deleted : el.deleted,
        url : el.url,
      }).then(result => job_sub.next({result, type : "neo4j"}))
      .catch((reason) => console.log(reason));
      backstream.register(job_sub);
    });
  });
}