const neo4jclient = require('../neo4j-module');
const { Subject } = require('rxjs');
const backstream = require('../backstream');

const setup = module.exports = {};

setup.language = `
CREATE (:Language { short : "de"})
CREATE (:Language { short : "fr" })
CREATE (:Language { short : "en" })
`

setup.migrate = function() {
  const session = neo4jclient.session;
  const language = new Subject();
  session.run(setup.language, {}).then(
    (result) => {
      language.next({result, type : "neo4j"});
    }
  );
  backstream.register(language);
}