
const mysql = require('mysql');

require('dotenv').config();

const mysqlclient = module.exports = {}

// First you need to create a connection to the db
mysqlclient.setup = () => mysql.createConnection({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE
});

mysqlclient.connect = () => { 
  mysqlclient.con = mysqlclient.setup();
  mysqlclient.con.connect((err) => {
  if(err){
    console.log('Error connecting to Db');
    return;
  }
  console.log('Connection established');
})};

mysqlclient.end = () => mysqlclient.con.end((err) => {
  // The connection is terminated gracefully
  // Ensures all previously enqueued queries are still
  // before sending a COM_QUIT packet to the MySQL server.
});

mysqlclient.query = (query, fn) => mysqlclient.con.query(query, fn);