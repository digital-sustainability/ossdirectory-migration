const mysqlclient = require('./mysql-module');
mysqlclient.connect();

const overview = module.exports = {}

overview.tables = () => {
  mysqlclient.query(`SHOW TABLES`, (err, rows) => {
    const filter = rows.filter(el => {
      if (process.argv[2]) return el.Tables_in_chopen_typo3.includes(process.argv[2]);
      return true;
    });
    filter.forEach(el => console.log(el.Tables_in_chopen_typo3));
    mysqlclient.end();
  });
}

overview.tables();