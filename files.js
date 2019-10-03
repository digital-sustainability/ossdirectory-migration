const neo4jclient = require('./neo4j-module');
const { Subject } = require('rxjs');
const backstream = require('./backstream');
const ftpclient = require('./ftp-module');
const logger = require('./log-module');

const vendor = require('./model/vendor');
const client = require('./model/client');
const job = require('./model/job');
const news = require('./model/news');
const success_story = require('./model/success_story');
const product = require('./model/product');
const product_category = require('./model/product_category');

const files = module.exports = {
  migrations : [
    //  product,
    vendor,
    //  client,
    // job,
    // news,
    //  success_story,
    // product_category,
  ],
  subject : new Subject(),
  done : new Subject(),
  start : () => {
      logger.log("started file migration")
    neo4jclient.setup();
    ftpclient.connect();
    files.subject.next(files.migrations.pop());
    
    files.done.subscribe(() => console.log("done"));
  }
}

files.done.subscribe(() => {
  neo4jclient.end();
  ftpclient.end();
})

files.subject.subscribe(
  (migration) => 
  {
    const done = migration.files();
  }
);
