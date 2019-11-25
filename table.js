const mysqlClient = require('./query');

const overview = module.exports = {}

mysqlClient.connect();

overview.table = (table_name) => {
  mysqlClient.connection.query(`SELECT * FROM ${table_name} LIMIT 10`, (err, rows) => {
    console.log(err, rows);
    mysqlClient.connection.end();
  });
}

overview.table(process.argv[2]);