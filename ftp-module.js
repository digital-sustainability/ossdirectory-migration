const ftp = require('ftp');
const minioclient = require('./minio-module');
const { Subject, BehaviorSubject } = require('rxjs');
const backstream = require('./backstream');

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
  request : new Subject(),
  end : () => ftpclient.client.end(),
}

ftpclient.client.on("ready", () => {
  ftpclient.client.cwd("tx_ossdirectory", () => {
    ftpclient.client.list((err, list) => {
      ftpclient.request.subscribe(
        ({filename, type, uid, sequence, subject}) => {
          const found = list.find((file) => file.name.includes(filename));
          if (found) {
            uploadToMinio(type, sequence, found, subject);
          } else {
            const found2 = list.find((file) => file.name.includes(`${type}_${uid}`));
            if (found2) {
              uploadToMinio(type, sequence, found2, subject);
            }
            else backstream.stats.filesNotMatched += 1
          }
        }
      )
      ftpclient.ready.next(true);
    })
  });
})

const uploadToMinio = function(type, sequence, found, subject) {
  var re = /(?:\.([^.]+))?$/;
  const ending = re.exec(found.name)[1];
  const new_filename = `${type}_${sequence}.${ending}`;
  ftpclient.client.get(found.name, (err, stream) => {
    if (err) {console.log(err); return}
    subject.next(new Promise((resolve, reject) => {
      minioclient.client.putObject(process.env.MINIO_BUCKET, new_filename, stream, function(error) {
        if (error) {
          console.log("error", error)
          reject();
        }

        backstream.stats.filesUploaded += 1
        console.log(`uploaded: ${new_filename}`);
        resolve(new_filename);
      })
    }));
  });
}

