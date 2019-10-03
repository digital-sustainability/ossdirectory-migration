const { Subject } = require('rxjs');
const neo4jclient = require('./neo4j-module');
const mysqlclient = require('./mysql-module');

const backstream = module.exports = {


    filesNotMatched : 0,
    filesMatched : 0,

    filesUploaded : 0,

}



