"use strict"

const Discord = require("discord.js");
const fs = require('fs');
const assert = require('assert');
const _ = require('underscore');

// Asrielborg's modules
const log = require('./log');
const server = require('./server');

// You can change the paths here, for whatever reason.
const config_path = "./config.json";
const lines_path = "./lines.txt";

var known_lines = [];
var known_words = [];
var bot;

log.notice("Check for updates! They can be found at https://git.io/via60");
log.notice("AsrielBorg Version 2.0.0 is now loading... This might take a while if your lines file is too big.");

var config = {
    port: 10991,                        // TODO: The port the panel will run in.
    token: "YOUR TOKEN HERE",           // Discord API Token

    replyrate: 1.0,                     // The chance that the bot will reply to any message, in percent.
    replynick: 100.0,                   // The chance that the bot will reply when its nick is mentioned, in percent.
    replymagic: 10.0,                   // The chance that the bot will reply when a magic word is said, in percent.
    
    speaking: 1,                        // Whether the bot is speaking or not. (0: not learning, 1: learning)
    learning: 1,                        // Whether the bot is learning or not. (0: not learning, 1: learning)
    
    autosaveperiod: 200,                // Auto save period (in seconds)
    
    magicwords: "this will trigger me", // The list of magic words the bot will reply to (separated by spaces)
    blacklisted_words: "very bad word"   // The list of words that will make the bot not learn a sentence if it contains one of these words
};

module.exports = {
    set_option: function(setting, value) {
        if (setting === 'replyrate' || setting === 'replynick' || setting === 'replymagic') {
            if (value >= 0 && value <= 100) {
                config[setting] = value;
            }
        } else if (setting === 'speaking' || settings === 'learning') {
            if (value == 0 || value == 1) {
                config[setting] = value;
            }
        } else if (setting === 'autosaveperiod') {
            if (value > 0) {
                config[setting] = value;
            }
        } else if (setting === 'magicwords' || setting === 'blacklisted_words') {
            config[setting] = value.toLowerCase()
                                   .trim()
                                   .split(' ');
        }
    }
}

// Does a config file already exist? Attempting to load from config_path.
try {
    fs.accessSync(config_path, fs.FS_OK);
    fs.readFile(config_path, (err, data) => {
        if (err) throw err;
        validateconf( JSON.parse(data) );
    });
} catch (err) {
    // Config file doesn't exist or is not accessible. Attempt creating a new one.
    fs.writeFile(config_path, JSON.stringify(config, null, '\n'), (err) => {
        if (err) {
            return log.fatal(`Could not write to ${config_path}. ${err}`);
        }
        log.notice(`Written to configuration to ${config_path}. Please check and modify it.`);
    });
}

/**
 * Validates the configuration inside the data object.
 * @param {Object} data - The configuration dictionary.
 * 
 * Data contains the following fields:
 * {Number} port                - The port that the panel will run in.
 * {String} token               - The Discord API token to be used for the bot.
 * {Number} replyrate           - The chance that the bot will reply to any message, in percent.
 * {Number} replymagic          - The chance that the bot will reply when a magic word is said, in percent.
 * {Number} speaking            - Whether the bot is speaking or not. (0: not learning, 1: learning)
 * {Number} learning            - Whether the bot is learning or not. (0: not learning, 1: learning)
 * {Number} autosaveperiod      - Auto save period (in seconds)
 * {String} magicwords          - The list of magic words the bot will reply to (separated by spaces).
 * {String} blacklisted_words    - (Optional) The list of words that will make the bot not learn a sentence if it contains one of these words
 */
function validateconf(data) {
    assert((typeof data.port === 'number'
                && data.port >= 1
                && data.port <= 65536
           ));
    
    assert((typeof data.token === 'string'));
    
    assert((typeof data.replyrate === 'number'
                && data.replyrate >= 0 
                && data.replyrate <= 100
           ));
    
    assert((typeof data.replynick      === 'number'
                && data.replynick >= 0 
                && data.replynick <= 100
           ));
    
    assert((typeof data.replymagic === 'number'
                && data.replymagic >= 0 
                && data.replymagic <= 100
           ));
    
    assert((typeof data.speaking === 'number'
               && (data.speaking == 0 || data.speaking == 1)
           ));
    
    assert((typeof data.learning === 'number'
               && (data.learning == 0 || data.learning == 1)
           ));
    
    assert((typeof data.autosaveperiod === 'number'
                && data.autosaveperiod >= 0
           ));
    
    assert((typeof data.magicwords === 'string'));
    data.magicwords = data.magicwords
						  .toLowerCase()
                          .trim()
						  .split(' ');
    
    assert((typeof data.blacklisted_words === "string" || data.blacklisted_words === undefined));
    if (data.blacklisted_words === undefined) {
        data.blacklisted_words = [];
    } else {
        data.blacklisted_words = data.blacklisted_words
                                     .toLowerCase()
                                     .trim()
                                     .split(' ');
    }
    
    config = data; // Save the configuration into memory.
    loadlines();
}

/**
 * Load the file in lines_path.
 * If the file doesn't exist, it will create a new one and then call connect().
 * If the file does exit, 
 */
function loadlines() {
	if (!fs.existsSync(lines_path)) {
		fs.writeFile(lines_path, "", (err) => {
            if (err) {
                return console.log(`Could not write to ${lines_path}. ${err}`);
            }
            log.notice(`Created new ${lines_path}.`);
            connect(); // Loading was successful; connect to server.
        });
	}
	fs.readFile(lines_path, (err, data) => {
		if (err) throw err;
		
        // data: the file's contents turned into lowercase, with all the carriage returns removed.
		data = data.toString()
				   .toLowerCase()
				   .replace(/\r/gm,'')
		
		known_lines = data.split(/(\n|\. )/)
						  .filter((el) => {
								return el !== "\n"; // Remove all the unnecessary line breaks.
                           });
						  
		known_words = unique(get_words(data));
		
		log.notice(`I know ${known_lines.length - 1} lines and ${known_words.length - 1} unique words.`);
		connect();
	});
}

/**
 * Connects to Discord using the discord.js API.
 */
function connect() {
    var bot_server = server.server_start(config.port);

    bot = new Discord.Client();
	bot.login(config.token);
    
    bot.on("ready", () => {
        log.notice("Successfully connected to Discord.");
    });

    bot.on("message", (message_t) => {
        if (message_t.author != bot.user) {
			log.message(message_t.author, message_t.channel, message_t.content);
            process_message(message_t);
        }
    });
    
    bot.on("messageDelete", (message_t) => {
        message_t.channel.sendMessage(`${message_t.author}: i know what you did`);
    });
    
    setInterval(save_lines, config.autosaveperiod * 1000);
}

/**
 * Handles all learning and speech of the bot.
 * @param {Object} message_t - Discord message object to be processed
 */
function process_message(message_t) {
    let message = message_t.content.toLowerCase();  // Stores the contents of the message object in a string variable.

    if (config.learning) {
        learn(message);
    }

    if (config.speaking) {
        let words = get_words(message);
        
        if (config.speaking) {
            /**
             * contains_magic is an anonymous function that will return true if the message
             * contains any of the words inside config.magicwords. Not case sensitive.
             */
            let contains_magic = function () {
                var matching_words = [];
                config.magicwords.forEach( (magic_word) => {
                    if (contains_case_insensitive(words, magic_word)) {
                        matching_words.push(magic_word);
                    }
                });
                return matching_words.length > 0;
            }

            let chance = Math.floor(Math.random() * 100);

            if (   (contains_magic() && chance <= config.replymagic) // Magic word check
                || (contains_case_insensitive(words, bot.user.username) && chance <= config.replynick) // Reply to nick check
                || (chance <= config.replyrate) // Default reply check
               ) {
                reply_to(message_t);
			}
        }
    }
}

/**
 * Replies to the message object using the Discord API.
 * @param {Object} message_t - The message that it will reply to.
 */
function reply_to(message_t) {
    let message       = message_t.content.toLowerCase(); // Stores the contents of the message object in a string variable.
    let message_words = get_words(message);
    
    let recognized = []; // Array of words that the bot recognizes in the message.
    message_words.forEach( (word, i, arr) => {
        if (known_words.indexOf(word) > -1) {
            recognized.push(word); // 
        }
    });
    
    if (recognized.length > 0) {
        let picked_word   = choose_from(recognized); // Pick a random word from the recognized words to start building a sentence from there.
        let output_msg = [picked_word];          // 
        
        let re = new RegExp(`\\b${RegExp.quote(picked_word)}\\b`, "gi"); // This expression matches the picked word.
        
        // Start filling the output message from the left.
        let random_line = get_random_line_containing(picked_word);
        output_msg.unshift(random_line.split(re)     //
									  .splice(0, 1)
									  .join(re)
                          );
        
        // Start filling the output message from the right.
        random_line = get_random_line_containing(picked_word);
        output_msg.push(random_line.split(re)
								   .splice(-1, 1)
								   .join(re)
						  );
        
        message_t.channel.sendMessage(output_msg.join(''));
    }
}

/**
 * @param {String} message - The message to be learned.
 */
function learn(message) {
    let filtered_message = message.toLowerCase()
                                  .split(/\. |\n/);
    let message_words    = get_words(message.toLowerCase());
	
    let prohibited_words = []; // Flag that determines whether the sentence contains a blacklisted word
    if (config.blacklisted_words.length > 0) {
        config.blacklisted_words.forEach((el) => {
            if (message_words.indexOf(el) != -1) {
                // Word in message matches a blacklisted word.
                prohibited_words.push(el);
            }
        });
    }
    if (prohibited_words.length > 0) {
        log.notice(`Refusing to learn message containing blacklisted words: ${prohibited_words.join(', ')}`)
    }
    
    filtered_message.forEach( (sentence) => {
        if (known_lines.indexOf(sentence) > -1) {
            // Sentence already found in lines.
			return false; 
        }
        known_lines.push(sentence);
        
        message_words.forEach( (word) => {
            if (known_words.indexOf(word) == -1) {
                // Word is not known; add word to vocabulary.
                known_words.push(word);
            }
        });
    });
}

/**
 * Write all the bot's lines to the lines_path file.
 */
function save_lines() {
    fs.writeFile(lines_path, known_lines.join('\r\n'), (err) => {
        if (err) {
            return log.error(`Could not write to ${lines_path}. ${err}`);
        }
        log.notice(`Saved lines at ${Date()}.`);
    });
}

/**
 * Returns a random line that contains a word.
 * @param {String} word - The word to search for.
 * @return {String} - The random line found in the known lines.
 */
function get_random_line_containing(word) {
    let line_list = [];
    let re = new RegExp(`\\b${RegExp.quote(word)}\\b`, 'gi');
    
    known_lines.forEach( (line, i, arr) => {
        if ( line.match(re) ) {
            line_list.push(line);
        }
    });
    return line_list.length > 0 ? choose_from(line_list) : "";
}

/**
 * Removes all duplicates from a provided array.
 * @param {Array} array
 * @return {Array} - The processed array.
 */
function unique(array) {
    var dict = {};
    var i;
    var l = array.length;
    var r = [];
    for (i = 0; i < l; i += 1) {
        dict[array[i]] = array[i]; 
    }
    for (i in dict) {
        r.push(dict[i]);
    }
    return r;
}

/**
 * Allows use of variable strings in regular expressions.
 * @param {String} str
 * @return {String}
 */
RegExp.quote = function(str) {
     return str.replace(/([.?*+^$[\]\\(){}|-])/g, "\\$1");
};

/**
 * Checks if an array contains an element.
 * @param {Array} array_ - the array to check
 * @param {String} x - the string to search for in the array
 * @return {boolean} - returns whether x is contained in array_
 */
function contains_case_insensitive(array_, x) {
    return array_.some( function (el, i) { 
        if (el.toLowerCase() === x.toLowerCase()) {
            return true;
        }
    });
}
    
/**
 * Choose a random element from an array.
 * @param {Array} array_
 * @return {Object} - random object within the array
 */
function choose_from(array_) {
    if (array_.length == 0) {
        return null;
    } 
    return array_[Math.floor(Math.random() * array_.length)];
}

/**
 * Filter the words from a line string.
 * @param {String} line
 * @return {Array} - The array containing the words of the string.
 */
function get_words(line) {
    return line.split(/[\.\!\,\;\:\(\)\ \?]/);
}