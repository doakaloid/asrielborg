'use strict';

var colors = require('colors');

module.exports = {
    warning: function (msg) {
        console.log(`${`[WARNING]`.yellow.bold} ${msg.red}`);
    },
    
    notice: function (msg) {
        console.log(`${`[NOTICE]`.green.bold} ${msg}`);
    },
    
    fatal: function (msg) {
        console.log(`${`[FATAL]`.red.bold} ${msg.red}`);
    },
    
    error: function (msg) {
        console.log(`${`[ERROR]`.red.bold} ${msg.red}`);
    },
	
	message: function (author, channel, msg) {
		console.log(`[${channel.name}]: <${author.username}> ${msg}`);
	},

    panel: function (msg) {
        console.log(`${`[PANEL]`.magenta.bold} ${msg}`);
    }
};
