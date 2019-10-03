const dateFormat = require('dateformat');

const logger = module.exports = {
    logs : [],
    log : (log) => {
        const size = logger.logs.length;
        if (size > 300) {
            logger.clear();
        }
        const date = new Date();
        const formated = dateFormat(date, "dddd, mmmm dS, yyyy, h:MM:ss TT");
        logger.logs.push(`${formated}:${log}`);
    },
    clear : () => logger.logs = [],
}