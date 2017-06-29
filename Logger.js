'use strict';
const winston = require('winston');

const logger = new (winston.Logger)({
    transports: [
        new (winston.transports.Console)({
            timestamp: () => {
                return new Date().toLocaleString();
            },
            colorize: true,
            level: 'info'
        }),
        new (winston.transports.File)({
            filename: 'asriel.log',
        }),
    ],
});

module.exports = logger;