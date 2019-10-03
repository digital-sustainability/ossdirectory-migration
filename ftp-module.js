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
  end : () => ftpclient.client.end(),

  
  requests : new Subject(),

  list: new Subject(),
}


ftpclient.client.on("ready", () => {
    ftpclient.client.cwd("tx_ossdirectory", () => {
        ftpclient.client.list((err, list) => {
            ftpclient.list.next(list);
        });
    });
});

ftpclient.requests.subscribe(
    ({old_filename, new_filename}) => {

        console.log(`old_filename : ${old_filename}, new_filename : ${new_filename}`);

        ftpclient.client.get(old_filename, 
            (error, stream) => {
                if (error) console.log(error);
                else {
                    minioclient.upload(new_filename, stream);
                }
        });
    }
);