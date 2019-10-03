const minio = require('minio');

require('dotenv').config();

const minioclient = module.exports = {

    client: new minio.Client({
        endPoint: process.env.MINIO_ENDPOINT,
        port: parseInt(process.env.MINIO_PORT),
        useSSL: process.env.MINIO_USE_SSL === "true" ? true : false,
        accessKey: process.env.MINIO_ACCESS_KEY,
        secretKey: process.env.MINIO_SECRET_KEY,
    }),

    upload : async (filename, stream) => {
        minioclient.client.putObject(process.env.MINIO_BUCKET, filename, stream, function(error, key) {
            if (error) {
            } else {
                console.log(`uploaded ${filename}`);
            }
        });
    }
}