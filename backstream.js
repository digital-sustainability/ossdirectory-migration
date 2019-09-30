const { Subject } = require('rxjs');
const neo4jclient = require('./neo4j-module');
const mysqlclient = require('./mysql-module');

const backstream = module.exports = {
  subject : new Subject(),
  active : [],
  register : (observable) => {
    backstream.active.push(observable);
    observable.subscribe(({result, type}) => {
      const index = backstream.active.indexOf(observable);
      backstream.active.splice(index,1);

      if (backstream.active.length <= 0) { //if there are no more requests we can end process
        backstream.done.next("done");
      }
      
      if (type === "neo4j"){
        try {
          const stats = result.summary.updateStatistics._stats;

          backstream.stats.nodesCreated+= stats.nodesCreated;
          backstream.stats.relationshipsCreated+= stats.relationshipsCreated;
          backstream.stats.propertiesSet+= stats.propertiesSet;
          backstream.stats.labelsAdded+= stats.labelsAdded;
          
        } catch (error) {
          
        }
      }

    })
  },
  stats : {
    nodesCreated : 0,
    relationshipsCreated : 0,
    propertiesSet : 0,
    labelsAdded: 0,
    filesUploaded : 0,
    filesNotMatched : 0,
  },
  done : new Subject(),
  files : new Subject(),
  logs : [],
  log : (log) => backstream.logs.push(log),
}



