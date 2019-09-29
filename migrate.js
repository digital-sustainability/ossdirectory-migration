const mysqlclient = require('./mysql-module');
const neo4jclient = require('./neo4j-module');
const { Subject } = require('rxjs');
const backstream = require('./backstream');
const ftpclient = require('./ftp-module');

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
    migrate.starttime = new Date();
    mysqlclient.connect();
    neo4jclient.session = neo4jclient.driver.session();
    migrate.subject.next(migrate.migrations.pop())
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
    product_category,
  
    setup, //needs to be called first
  ],
}

migrate.done.subscribe(() => {
  migrate.endtime = new Date();
})

migrate.subject.subscribe(
  (migration) => 
  {
    migration.migrate();

    const sub = backstream.done.subscribe(
      () => {
        sub.unsubscribe();
        if (migrate.migrations.length > 0) {
          migrate.subject.next(migrate.migrations.pop());
        }
        else {
          neo4jclient.session.close();
          neo4jclient.driver.close(); 
          mysqlclient.end();
          migrate.done.next("done");
        }
      }
    );
  }
);



