const neo4jClient = require('./cypher');
const mysqlClient = require('./query');
const ftpClient = require('./ftp');
const minioClient = require('./minio');

const { BehaviorSubject, Subject } = require('rxjs');
const { Observable, forkJoin } = require('rxjs');

function migrate (mysqlQuery, cypherQuery, mapping, name) {

    const subject = new Subject();
    subject.name = name;

    if (!mysqlQuery) {
        subject.complete();
        return subject;
    }

    const session = neo4jClient.session();

    mysqlClient.connection.query(mysqlQuery, (err, rows, fields) => {

        if (err) {
            subject.next(err);
        }

        if (!cypherQuery) {
            subject.complete();
        }

        let counter = 0;

        rows.forEach(row => {

            let variables = {}
            if (mapping) variables = mapping(row);

            counter++;

            session.run(cypherQuery, variables)
                .then((result) => { subject.next(result) })
                .catch((reason) => { subject.error(reason) })
                .finally(() => {
                    counter--;
                    if (counter == 0) {
                        subject.complete();
                        session.close();
                    }
                });
        });
    });

    return subject;
}

function migrateFile(mysqlQuery, matcher, nameGen, files) {

    const subject = new Subject();

    if (!mysqlQuery) {
        subject.complete();
        return subject;
    }

    mysqlClient.connection.query(mysqlQuery, (err, rows, fields) => {

        if (err) {
            subject.next(err);
        }

        let counter = 0;

        rows.forEach(row => {

            const newFileName = nameGen(row);
            let fileName;
            if (matcher) fileName = matcher(row, files);

            if (fileName) {

                counter++;

                ftpClient.client.get(fileName,
                    (error, stream) => {
                        if (error) {
                            console.log(error);
                            //subject.error(error);
                        } else {
                            minioClient.upload(newFileName, stream, subject);
                        }
                        counter--;
                        if (counter == 0) {
                            subject.complete();
                        }
                });
            }
        });
    });

    return subject;
}

function onComplete(obs) {

    return forkJoin(...obs);

}

module.exports = { migrate, onComplete, migrateFile }