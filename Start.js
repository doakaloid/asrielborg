'use strict';
const fs = require('fs');

const Config = require('./Config');
const AsrielBorg = require('./AsrielBorg');
const logger = require('./Logger');

const lines = [];
const words = [];
const configPath = 'config.json';

const config = new Config();

try {
    logger.log('info', 'Loading ' + configPath + '...');
    config.load(configPath);

    logger.log('info', 'Starting Asrielborg-3... Version 3.2.1');
    new AsrielBorg(config);
}
catch (err) {
    if (err.code === 'ENOENT') {
        logger.log('warn', 'Config file ' + configPath + ' doesn\'t exist. ' +
            'Creating one for you...');
        try {
            config.write(configPath);
            logger.log('info',
                'Config file created! Please edit ' + configPath +
                'then re-run this program.');
        }
        catch (err) {
            logger.log('error', 'Failed to create a config file. Message: %s',
                err.message);
        }
    }
    else {
        logger.log('error', 'An internal error has occurred that the bot' +
            ' cannot recover. Message:');
        logger.log('error', err.message);
        logger.log('debug', err.stack);
    }
}