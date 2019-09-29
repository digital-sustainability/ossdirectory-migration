require('dotenv').config();

const migrate = require('./migrate');
const relations = require('./relations');
const files = require('./files');
const axiosclient = require('./axios-module');
const backstream = require('./backstream');




let interval;

//migrate.start();
//axiosclient.request(axiosclient.send,"I have started the Data Migration! :ghost: \n");
//axiosclient.start();
migrate.done.subscribe(() => {
  relations.start();
});

relations.done.subscribe(() => {
  const start = migrate.starttime
  const end = relations.endtime

  const time = end - start;
  const minutes = time / (1000 * 60 * 30);

  axiosclient.request(axiosclient.send,`Finished Data Migration in ${minutes} min \n :smile: Here are some stats: `);
  axiosclient.request(axiosclient.stats);
  axiosclient.start()
  //files.start();

  // let uploads = 0;

  // interval = setInterval(() => {
    
  //   axiosclient.request(axiosclient.send, `
  //   Uploaded ${backstream.stats.filesUploaded - uploads} Files`);

  //   axiosclient.start();

  //   uploads = backstream.stats.filesUploaded;
  // }, (1000 * 60 * 10));

  // axiosclient.request(axiosclient.send,"Now I am transfering files to Minio");
  // axiosclient.start()
});

files.done.subscribe(() => {

  clearInterval(interval);

  const start = files.starttime;
  const end = files.endtime 

  const time = end - start;
  const hours = time / (1000 * 60 * 60);

  axiosclient.request(axiosclient.send,`File Transfer Completed within ${hours} hours :see_no_evil:`)
  axiosclient.request(axiosclient.send,`Final Stats: `);
  axiosclient.request(axiosclient.stats());
  axiosclient.request(axiosclient.send,`Have a nice day \n Bye!`)
});

