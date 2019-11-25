require('dotenv').config();

const { migrate, onComplete } = require('./execute');
const neo4jClient = require('./cypher');
const mysqlClient = require('./query');
const ftpClient = require('./ftp');

const { setup : clientSetup, connect : clientConnect, files : clientFiles } = require('./mapping/client');
const { setup : sucSetup, connect : sucConnect, files: sucFiles } = require('./mapping/success_story');
const { setup : vendorSetup, connect : vendorConnect, files: vendorFiles } = require('./mapping/vendor');
const { setup : jobSetup, connect : jobConnect } = require('./mapping/job');
const { setup : productSetup, connect : productConnect, files: productFiles } = require('./mapping/product');
const { setup : categorySetup, connect : categoryConnect } = require('./mapping/product_category');

mysqlClient.connect();
ftpClient.connect();

const setupActions = [
    clientSetup,
    sucSetup,
    vendorSetup,
    jobSetup,
    productSetup,
    categorySetup,
];

const connectActions = [
    clientConnect,
    sucConnect,
    vendorConnect,
    jobConnect,
    productConnect,
    categoryConnect,
];

const fileActions = [
  sucFiles,
  // clientFiles,
  // vendorFiles,
    
    // productFiles,
];

const actions = setupActions.concat(connectActions);
const length = actions.length;

function migrateData() {
    if (actions.length > 0) {

        const percentage = 1 - (actions.length / length);
        const round = Math.round(percentage * 100)
        console.log(`${round} %`);

        const action = actions.shift();

        const obs = action();
        if (obs.length <= 0) {
            setup();
            return;
        }

        const fork = onComplete(obs);

        fork.subscribe((res) => {
            setup();
        });

    } else {
        console.log(`100 %`)
        console.log("completed");

        neo4jClient.driver.close();
        mysqlClient.connection.end();
    }
}

function migrateFiles() {

    ftpClient.ready.subscribe((list) => {

        console.log(list.length);

        file(list);


    });
}

function file(list) {

    if (fileActions.length > 0 ) {
        const action = fileActions.pop();

        onComplete(action(list)).subscribe((res) => { console.log("next file"); file(list)});
    } else {

        console.log("files completed");
    }

}

//migrateData();
migrateFiles();