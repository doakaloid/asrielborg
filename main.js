"use strict";

module.exports = {
    /**
     * @param {String} option
     * @param {*} value
     */
    set_option(option, value) {
        if (option === 'replyrate' || option === 'replynick' || option === 'replymagic') {
            if (value >= 0 && value <= 100) {
                config[option] = value;
            }
        } else if (option === 'speaking' || option === 'learning') {
            if (typeof value === 'boolean') {
                config[option] = value;
            }
        } else if (option === 'autosaveperiod') {
            if (value > 0) {
                config[option] = value;
            }
        } else if (typeof value === 'string') {
            if (option === 'magic_words_add' || option === 'blacklisted_words_add') {
                option = option.slice(0, -4); // Removes the '_add' portion of the option
                value = value.toLowerCase().trim();

                if (!config[option].includes(value)) { // Check if the word already exists in the lists
                    config[option].push(value);
                }
            } else if (option === 'magic_words_remove' || option === 'blacklisted_words_remove') {
                option = option.slice(0, -7); // Removes the '_remove' portion of the option
                value = value.toLowerCase().trim();

                let index = config[option].indexOf(value);
                if (index > -1) {
                    config[option].splice(index, 1);
                }
            }
        }
    },
    /**
     * @param {Array} options
     * @return {Array}
     */
    get_options(options) {
        return options.map( (option) => config[option]);
    },
    get_all_options() {
        return {
            replyrate: config.replyrate,
            replynick: config.replynick,
            replymagic: config.replymagic,

            speaking: config.speaking,
            learning: config.learning,

            autosaveperiod: config.autosaveperiod,

            magic_words: config.magic_words,
            blacklisted_words: config.blacklisted_words
        };
    },
    save_config: write_config
};

const Discord = require('discord.js');
const fs = require('fs');
const assert = require('assert');

// Asrielborg's modules
const log = require('./log');
const server = require('./server');

// You can change the paths here, for whatever reason.
const config_path = './config.json';
const lines_path = './lines.txt';

var known_lines = [];
var known_words = [];
var bot;

log.notice("Check for updates! They can be found at https://git.io/via60");
log.notice("AsrielBorg Version 2.0.0 DEV is now loading... This might take a while if your lines file is too big.");

var config = {
    port: 10991,                        // The port the panel will run in.
    token: "YOUR TOKEN HERE",           // Discord API Token

    replyrate: 1.0,                     // The chance that the bot will reply to any message, in percent.
    replynick: 100.0,                   // The chance that the bot will reply when its nick is mentioned, in percent.
    replymagic: 10.0,                   // The chance that the bot will reply when a magic word is said, in percent.

    speaking: true,                     // Whether the bot is speaking or not.
    learning: true,                     // Whether the bot is learning or not.

    autosaveperiod: 200,                // Auto save period (in seconds)

    magic_words: ["a trigger", "another trigger"], // The list of magic words the bot will reply to (separated by spaces)
    blacklisted_words: ["very bad word", "another bad word"]  // The list of words that will make the bot not learn a sentence if it contains one of these words
};

/**
 * Writes a new configuration file from the config object.
 */
function write_config() {
    "use strict";
    fs.writeFile(config_path, JSON.stringify(config, null, '\n'), (err) => {
        if (err) {
            return log.fatal(`Could not write to ${config_path}. ${err}`);
        }
    });
}

// Does a config file already exist? Attempting to load from config_path.
try {
    fs.accessSync(config_path, fs.FS_OK);
    fs.readFile(config_path, (err, data) => {
        if (err) { throw err; }
        validate_config( JSON.parse(data) );
    });
} catch (err) {
    // Config file doesn't exist or is not accessible. Attempt creating a new one.
    write_config();
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
 * {String} magic_words          - The list of magic words the bot will reply to (separated by spaces).
 * {String} blacklisted_words    - (Optional) The list of words that will make the bot not learn a sentence if it contains one of these words
 */
function validate_config(data) {
    "use strict";
    assert((typeof data.port  === 'number' && data.port >= 1 && data.port <= 65535));
    assert((typeof data.token === 'string'));
    //
    assert((typeof data.replyrate === 'number' && data.replyrate >= 0 && data.replyrate <= 100));
    assert((typeof data.replynick === 'number' && data.replynick >= 0 && data.replynick <= 100));
    assert((typeof data.replymagic === 'number' && data.replymagic >= 0 && data.replymagic <= 100));
    //
    assert((typeof data.speaking === 'boolean'));
    //
    assert((typeof data.learning === 'boolean'));
    //
    assert((typeof data.autosaveperiod === 'number' && data.autosaveperiod >= 0 ));
    //
    assert((data.magic_words instanceof Array));
    data.magic_words = data.magic_words.map( (word) => word.toLowerCase().trim());
    //
    assert((data.blacklisted_words instanceof Array));
    data.blacklisted_words = data.blacklisted_words.map( (word) => word.toLowerCase().trim());

    config = data; // Save the configuration into memory.
    load_lines();

}

/**
 * Load the file in lines_path.
 * If the file doesn't exist, it will create a new one and then call connect().
 * If the file does exit,
 */
function load_lines() {
    "use strict";
    if (!fs.existsSync(lines_path)) {
        fs.writeFile(lines_path, "", (err) => {
            if (!err) {
                log.notice(`Created new ${lines_path}.`);
                connect(); // Loading was successful; connect to server.
            } else {
                console.log(`Could not write to ${lines_path}. ${err}`);
            }
        });
    }
    fs.readFile(lines_path, (err, data) => {
        if (err) { throw err; }
        // data: the file's contents turned into lowercase, with all the carriage returns removed.
        data = data.toString()
            .toLowerCase()
            .replace(/\r/gm,'');

        known_lines = data.split(/(\n|\.\ )/)
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
    "use strict";
    server.server_start(config.port);

    bot = new Discord.Client();
    bot.login(config.token);

    bot.on("ready", () => {
        log.notice("Successfully connected to Discord.");
    });

    bot.on("message", (message_t) => {
        log.message(message_t.author, message_t.channel, message_t.content);
        if (message_t.author !== bot.user) {
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
    "use strict";
    let message = message_t.content.toLowerCase();  // Stores the contents of the message object in a string variable.

    if (config.learning) {
        learn(message);
    }

    if (config.speaking) {
        let words = get_words(message);

        if (config.speaking) {
            /**
             * contains_magic is an anonymous function that will return true if the message
             * contains any of the words inside config.magic_words. Not case sensitive.
             */
            let contains_magic = function () {
                return config.magic_words.find( (entry) => message.includes(entry));
            };

            let chance = Math.floor(Math.random() * 100);

            if ((contains_magic() && chance <= config.replymagic)
                ||  (message.includes(bot.user.username) && chance <= config.replynick)
                ||  (chance <= config.replyrate)) {
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
    "use strict";
    let message       = message_t.content.toLowerCase(); // Stores the contents of the message object in a string variable.
    let message_words = get_words(message);

    let recognized = []; // Array of words that the bot recognizes in the message.
    message_words.forEach( (word) => {
        if (known_words.includes(word)) {
            recognized.push(word);
        }
    });

    if (recognized.length <= 0) {
    } else {
        let picked_word = choose_from(recognized); // Pick a random word from the recognized words to start building a sentence from there.
        let output_msg = [picked_word];            //

        let re = new RegExp(`\\b${escapeRegex(picked_word)}\\b`, "gi"); // This expression matches the picked word.

        // Start filling the output message from the left.
        let random_line = get_random_line_containing(picked_word);
        output_msg.unshift(random_line.split(re)
            .splice(0, 1)
            .join(re));

        // Start filling the output message from the right.
        random_line = get_random_line_containing(picked_word);
        output_msg.push(random_line.split(re)
            .splice(-1, 1)
            .join(re));

        message_t.channel.sendMessage(output_msg.join(''));
    }
}

/**
 * @param {String} message - The message to be learned.
 */
function learn(message) {
    "use strict";
    let filtered_message = message.toLowerCase()
        .split(/\.\ |\n/);

    let message_words    = get_words(message.toLowerCase());

    let prohibited_words = []; // Flag that determines whether the sentence contains a blacklisted word
    if (config.blacklisted_words.length > 0) {
        config.blacklisted_words.forEach((el) => {
            if (message_words.includes(el)) {
                // Word in message matches a blacklisted word.
                prohibited_words.push(el);
            }
        });
    }
    if (prohibited_words.length > 0) {
        log.notice(`Refusing to learn message containing blacklisted words: ${prohibited_words.join(', ')}`);
    }

    filtered_message.forEach( (sentence) => {
        if (known_lines.includes(sentence)) {
            // Sentence already found in lines.
            return false;
        }
        known_lines.push(sentence);

        message_words.forEach( (word) => {
            if (!known_words.includes(word)) {
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
    "use strict";
    fs.writeFile(lines_path, known_lines.join('\r\n'), (err) => {
        if (err) {
            return log.error(`Could not write to ${lines_path}. ${err}`);
        }
        log.notice(`Saved lines at ${new Date()}.`);
    });
}

/**
 * Choose a random element from an array.
 * @param {Array} array
 * @return {Object} - random object within the array
 */
function choose_from(array) {
    "use strict";
    if (array.length === 0) {
        return null;
    }
    return array[Math.floor(Math.random() * array.length)];
}

/**
 * Returns a random line that contains a word.
 * @param {String} word - The word to search for.
 * @return {String} - The random line found in the known lines.
 */
function get_random_line_containing(word) {
    "use strict";
    let line_list = [];
    let re = new RegExp(`\\b${escapeRegex(word)}\\b`, 'gi');

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
    "use strict";
    let dict = {};
    let i;
    let l = array.length;
    let r = [];
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
function escapeRegex(str) {
    "use strict";
    return str.replace(/([.?*+\^$\[\]\\(){}\|\-])/g, "\\$1");
}

/**
 * Filter the words from a line string.
 * @param {String} line
 * @return {Array} - The array containing the words of the string.
 */
function get_words(line) {
    "use strict";
    return line.split(/[.!,;:()?\ ]/);
}