const { Subject, combineLatest } = require('rxjs');
const neo4j = require('neo4j-driver').v1;
require('dotenv').config();

const neo4jClient = module.exports = {

    driver : neo4j.driver(
        process.env.NEO4J_HOST, 
        neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD)),
    session : () => neo4jClient.driver.session(),
    
}



