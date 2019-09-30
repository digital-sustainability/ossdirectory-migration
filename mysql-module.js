
const mysql = require('mysql');

require('dotenv').config();

const mysqlclient = module.exports = {}

mysqlclient.setup = () => {
  mysqlclient.connection = mysql.createConnection({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE
  });
}

mysqlclient.connect = () => {
  mysqlclient.connection.connect((err) => {
    if (err) console.log("Error connecting do DB");
    else console.log("Connection established");
  });
}

mysqlclient.close = () => {
  mysqlclient.connection.end();
}

mysqlclient.query = (query, fn) => {
  // TODO: check if connection is established


  mysqlclient.connection.query(query, (err, rows, fields) => {
    fn(err, rows);

    //do something here if error
  })
}