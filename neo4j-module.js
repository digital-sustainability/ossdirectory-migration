

const neo4j = require('neo4j-driver').v1;
require('dotenv').config();

const neo4jclient = module.exports = {

  active : [],
  driver : neo4j.driver(process.env.NEO4J_HOST, neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD)),
  register : (observable) => {
    neo4jclient.active.push(observable);
    const index = active.indexOf(observable);
    observable.subscribe(result => {
      neo4jclient.active.splice(index, 1);
      if (neo4jclient.active.length === 0) {
        neo4jclient.close();
      }
    })
  },
  close : () => {
    neo4jclient.session.close();
    neo4jclient.driver.close();
  }
}



