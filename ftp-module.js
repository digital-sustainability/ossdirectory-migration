const ftp = require('ftp');
const minioclient = require('./minio-module');
const { Subject, BehaviorSubject } = require('rxjs');
const logger = require('./log-module');

require('dotenv').config();

const ftpclient = module.exports = {

  client : new ftp(),
  connect : () => ftpclient.client.connect(ftpclient.config),
  config : {
    host : process.env.FTP_HOST,
    user : process.env.FTP_USER,
    password : process.env.FTP_PASSWORD,
  },
  ready : new BehaviorSubject(false),
  request : ({filename, type, uid, sequence}) => {
    ftpclient.request_sub.next({filename, type, uid, sequence});
    return ftpclient.result_sub;
  },
  request_sub : new Subject(),
  result_sub : new Subject(),
  end : () => ftpclient.client.end(),
  active : [],
}

ftpclient.client.on("ready", () => {
  ftpclient.client.cwd("tx_ossdirectory", () => {
    ftpclient.client.list((err, list) => {
      ftpclient.request_sub.subscribe(
        ({filename, type, uid, sequence}) => {

          //ftpclient.active.push(sequence);


          const found = list.find((file) => file.name.includes(filename));
          if (found) {
            uploadToMinio(type, sequence, found);
          } else {
            const found2 = list.find((file) => file.name.includes(`${type}_${uid}`));
            if (found2) {
              uploadToMinio(type, sequence, found2);
            }
          }
        }
      )
      ftpclient.ready.next(true);
    })
  });
})

const uploadToMinio = function(type, sequence, found) {
  var re = /(?:\.([^.]+))?$/;
  const ending = re.exec(found.name)[1];
  const new_filename = `${type}_${sequence}.${ending}`;
  ftpclient.client.get(found.name, (err, stream) => {
    if (err) {console.log(err); return}
    const prom = new Promise((resolve, reject) => {
      minioclient.client.putObject(process.env.MINIO_BUCKET, new_filename, stream, function(error) {
        if (error) {
          console.log("error", error)
          reject();
        }
        logger.log(`uploaded: ${new_filename}`);
        ftpclient.result_sub.next({new_filename, sequence, status : "pending"})
        resolve();
      })
    });
    prom.then().catch();
    ftpclient.result_sub.next({new_filename, sequence, status : "finished"})
  });
}

