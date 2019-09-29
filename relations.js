const mysqlclient = require('./mysql-module');
const neo4jclient = require('./neo4j-module');
const { Subject } = require('rxjs');
const backstream = require('./backstream');

const vendor = require('./model/vendor');
const client = require('./model/client');
const job = require('./model/job');
const news = require('./model/news');
const success_story = require('./model/success_story');
const product = require('./model/product');
const product_category = require('./model/product_category');

const relations = module.exports = {
  migrations : [
  
    news,
    product,
    success_story,
    vendor
  
  ],
  start : () => {
    relations.starttime = new Date();
    mysqlclient.connect();
    neo4jclient.session = neo4jclient.driver.session();
    relations.subject.next(relations.migrations.pop());
  },
  subject : new Subject(),
  done : new Subject(),
}

relations.done.subscribe(() => {
  relations.endtime = new Date();
})


relations.subject.subscribe(
  (migration) => 
  {
    migration.relationships();

    const sub = backstream.done.subscribe(
      () => {
        sub.unsubscribe();
        if (relations.migrations.length > 0) {
          relations.subject.next(relations.migrations.pop());
        }
        else {
          neo4jclient.session.close();
          neo4jclient.driver.close(); 
          mysqlclient.end();
          relations.done.next("done");
        }
      }
    );
  }
);
