const mysqlclient = require('./mysql-module');
const neo4jclient = require('./neo4j-module');
const { Subject } = require('rxjs');
const backstream = require('./backstream');
const relations = require('./relations');

const vendor = require('./model/vendor');
const client = require('./model/client');
const job = require('./model/job');
const news = require('./model/news');
const success_story = require('./model/success_story');
const product = require('./model/product');
const product_category = require('./model/product_category');
const setup = require('./model/setup');

const migrate = module.exports = {
  start : () => {
    migrate.starttime = new Date(); //track time
    mysqlclient.connect();
    neo4jclient.setup(); //initialize driver
    migrate.subject.next(setup); //send first migration object
  },
  subject : new Subject(),
  done: new Subject(),

  migrations : [
    vendor,
    client,
    job,
    news,
    success_story,
    product,
    product_category
  ],
}

migrate.done.subscribe(() => {
  relations.start(); //if first migration is done we can start adding relationships
})

relations.done.subscribe(() => {
  migrate.endtime = new Date(); //track end time
  
  //close connections
  neo4jclient.end();
  mysqlclient.end();
})

migrate.subject.subscribe(
  (migration) => 
  {
    const sub = migration.migrate();
    sub.subscribe(() => {
      if (migrate.migrations.length > 0) {
        migrate.subject.next(migrate.migrations.pop());
      } else {
        migrate.done.next("done");
      }
    });
  }
);