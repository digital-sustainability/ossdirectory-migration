const { Subject, combineLatest } = require('rxjs');
const neo4j = require('neo4j-driver').v1;
const logger = require('./log-module');
require('dotenv').config();

const neo4jclient = module.exports = {
  setup : () => neo4jclient.driver = neo4j.driver(process.env.NEO4J_HOST, neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD)),
  connect : () => neo4jclient.session = neo4jclient.driver.session(), 
  close : () => neo4jclient.session.close(),
  end : () => neo4jclient.driver.close(),
  requests : [],
  cypher : (query, attributes) => {
  //TODO: check if driver is active

    if (neo4jclient.requests.length <= 0){
      neo4jclient.connect(); //start session
    }

    const observable = neo4jclient.session.run(query, attributes)
    neo4jclient.requests.push(observable);

    const subject = new Subject();

    observable.then( result => {
      const records = result.records;

      for (let record of records) {
        subject.next(record);
      }
      if (neo4jclient.requests.length <= 0){
        neo4jclient.close();
      }
      const index = neo4jclient.requests.indexOf(observable);
      neo4jclient.requests.splice(index, 1);
      subject.complete();
    }).catch( (reason) => {
        logger.log(reason);
    });

    // observable.subscribe({
    //   next: function(record) {
    //     subject.next(record)
    //   },
      
    //   completed: function(result) {
    //     //TODO: Track results

    //     //remove request
    //     const index = neo4jclient.requests.indexOf(observable);
    //     neo4jclient.requests.splice(index, 1);

    //     //if all requests completed close session
    //     if (neo4jclient.requests.length <= 0) {
    //       neo4jclient.close();
    //     }
    //     subject.complete();
    //   },
    //   error: function(error) {
    //     //TODO: Do something on error
    //   }
    // });
    
    return subject;
  }
}



