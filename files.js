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

const migrations = [
  //vendor,
  client,
  // job,
  // news,
  // success_story,
  // product,
  // product_category,
];

const files = module.exports = {
  migrations : [
    vendor,
    client,
    // job,
    // news,
    success_story,
    product,
    // product_category,
  ],
  subject : new Subject(),
  done : new Subject(),
  start : () => {

    mysqlclient.connect();
    neo4jclient.session = neo4jclient.driver.session();
    ftpclient.connect();

    files.subject.next(files.migrations.pop());

  }
}


files.subject.subscribe(
  (migration) => 
  {
    migration.files();

    const sub = backstream.done.subscribe(
      () => {
        sub.unsubscribe();
        if (files.migrations.length > 0) {
          files.subject.next(files.migrations.pop());
        }
        else {
          neo4jclient.session.close();
          neo4jclient.driver.close(); 
          mysqlclient.end();
          ftpclient.end();
          files.done.next("done");
        }
      }
    );
  }
);
