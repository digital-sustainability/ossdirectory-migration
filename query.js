
const mysql = require('mysql');

require('dotenv').config();

const mysqlClient = module.exports = {

    connection : 
        mysql.createConnection({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE}),

    connect : () => mysqlClient.connection.connect(),

}