const ftp = require('ftp');
const minioClient = require('./minio');
const { BehaviorSubject, Subject } = require('rxjs');

const ftpClient = module.exports = {

  client : new ftp(),
  connect : () => ftpClient.client.connect(ftpClient.config),
  config : {
    host : process.env.FTP_HOST,
    user : process.env.FTP_USER,
    password : process.env.FTP_PASSWORD,
  },
  ready : new Subject(),
}

ftpClient.client.on("ready", () => {
    ftpClient.client.cwd("tx_ossdirectory", () => {
        ftpClient.client.list((err, list) => {
            ftpClient.ready.next(list);
            ftpClient.ready.complete();
        });
    });

    ftpClient.client.on("error", (err) => console.log(err));
});