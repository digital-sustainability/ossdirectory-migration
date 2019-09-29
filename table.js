const mysqlclient = require('./mysql-module');
mysqlclient.connect();

const overview = module.exports = {}

overview.table = (table_name) => {
  mysqlclient.query(`SELECT * FROM ${table_name} LIMIT 10`, (err, rows) => {
    console.log(err, rows);
    mysqlclient.end();
  });
}

overview.table(process.argv[2]);