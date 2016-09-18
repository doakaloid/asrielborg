"use strict";

const Discord = require('discord.js');
const fs = require('fs');
const assert = require('assert');

const MAX_WORDLIST_WORD_LENGTH = 20;
const MIN_WORDLIST_WORD_LENGTH = 1;

/**
 * Writes a new configuration file from the config object.
 */
function writeConfig() {
    "use strict";
    fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, ' '), (err) => {
        if (err) {
            return log.fatal(`Could not write to ${CONFIG_PATH}. ${err}`);
        }
    });
}

function validateWordListInsertion(wordListName, value) {
    wordListName = wordListName.slice(0, -3); // Example: magicWordsAdd, blacklistedWordsAdd

    if (typeof value !== 'string') {
        throw new Error('The word must be a string.');
    }
    else if (value.length > MAX_WORDLIST_WORD_LENGTH) {
        throw new Error(`This word is too long. It must be smaller than ${MAX_WORDLIST_WORD_LENGTH} characters.`);
    }
    else if (value.length < MIN_WORDLIST_WORD_LENGTH) {
        throw new Error(`This word is too small. It must be longer than ${MIN_WORDLIST_WORD_LENGTH} characters.`);
    }
    else if (config[wordListName].includes(value.toLowerCase())) {
        throw new Error(`Word is already found in ${wordListName}.`);
    }
    return wordListName;
}

function validateWordListRemoval(wordListName, value) {
    wordListName = wordListName.slice(0, -7); // Example: magicWordsRemove, blacklistedWordsRemove

    if (typeof value !== 'string') {
        throw new Error('The word must be a string.');
    }
    else if (!config[wordListName].includes(value.toLowerCase())) {
        throw new Error(`Word not found in ${wordListName}.`);
    }
    return wordListName;
}

module.exports = {

    submitDataTypes: ['magicWordsAdd', 'blacklistedWordsAdd'],
    /**
     * @param {String} optionName
     * @param {*} value
     */
    setOption(optionName, value) {
        let trueOptionName = '';

        switch (optionName) {
            case 'magicWordsAdd':
            case 'blacklistedWordsAdd':
                trueOptionName = validateWordListInsertion(optionName, value);

                config[trueOptionName].push(value);
                console.log(config[trueOptionName]);
                break;
            default:
                throw new Error('Unknown option.');
                break;
        }
        writeConfig();
        return trueOptionName;
    },
    /**
     * @param {Array} options
     * @return {Array}
     */
    getOptions(options) {
        let returnOptions = {};
        options.forEach(el => returnOptions[el] = config[el]);
        return returnOptions;
    },
    retrieveAllOptions() {
        return {
            replyRate: config.replyRate,
            replyNick: config.replyNick,
            replyMagic: config.replyMagic,

            speaking: config.speaking,
            learning: config.learning,

            autoSavePeriod: config.autoSavePeriod,

            magicWords: config.magicWords,
            blacklistedWords: config.blacklistedWords
        };
    },
    save_config: writeConfig,
};

// Asrielborg's modules
const log = require('./log');
const server = require('./server');

// You can change the paths here, for whatever reason.
const CONFIG_PATH = './config.json';
const LINES_PATH = './lines.txt';

var linesDictionary = [];
var wordsDictionary = [];
var bot;

log.notice("Check for updates! They can be found at https://git.io/via60");
log.notice("AsrielBorg Version 2.0.0 DEV is now loading... This might take a while if your lines file is too big.");

var config = {
    port: 10991,                        // The port the panel will run in.
    token: "YOUR TOKEN HERE",           // Discord API Token

    replyRate: 1.0,                     // The chance that the bot will reply to any message, in percent.
    replyNick: 100.0,                   // The chance that the bot will reply when its nick is mentioned, in percent.
    replyMagic: 10.0,                   // The chance that the bot will reply when a magic word is said, in percent.

    speaking: true,                     // Whether the bot is speaking or not.
    learning: true,                     // Whether the bot is learning or not.

    autoSavePeriod: 200,                // Auto save period (in seconds)

    magicWords: ["a trigger", "another trigger"], // The list of magic words the bot will reply to (separated by spaces)
    blacklistedWords: ["very bad word", "another bad word"]  // The list of words that will make the bot not learn a sentence if it contains one of these words
};

// Does a config file already exist? Attempting to load from CONFIG_PATH.
try {
    fs.accessSync(CONFIG_PATH, fs.FS_OK);
    fs.readFile(CONFIG_PATH, (err, data) => {
        if (err) {
            throw err;
        }
        validateConfig(JSON.parse(data));
    });
} catch (err) {
    // Config file doesn't exist or is not accessible. Attempt creating a new one.
    writeConfig();
}

/**
 * Validates the configuration inside the data object.
 * @param {Object} data - The configuration dictionary.
 *
 * Data contains the following fields:
 * {Number} port                - The port that the panel will run in.
 * {String} token               - The Discord API token to be used for the bot.
 * {Number} replyRate           - The chance that the bot will reply to any message, in percent.
 * {Number} replyMagic          - The chance that the bot will reply when a magic word is said, in percent.
 * {Number} speaking            - Whether the bot is speaking or not. (0: not learning, 1: learning)
 * {Number} learning            - Whether the bot is learning or not. (0: not learning, 1: learning)
 * {Number} autoSavePeriod      - Auto save period (in seconds)
 * {String} magicWords          - The list of magic words the bot will reply to (separated by spaces).
 * {String} blacklistedWords    - (Optional) The list of words that will make the bot not learn a sentence if it contains one of these words
 */
function validateConfig(data) {
    "use strict";
    assert((typeof data.port === 'number' && data.port >= 1 && data.port <= 65535));
    assert((typeof data.token === 'string'));
    //
    assert((typeof data.replyRate === 'number' && data.replyRate >= 0 && data.replyRate <= 100));
    assert((typeof data.replyNick === 'number' && data.replyNick >= 0 && data.replyNick <= 100));
    assert((typeof data.replyMagic === 'number' && data.replyMagic >= 0 && data.replyMagic <= 100));
    //
    assert((typeof data.speaking === 'boolean'));
    //
    assert((typeof data.learning === 'boolean'));
    //
    assert((typeof data.autoSavePeriod === 'number' && data.autoSavePeriod >= 0 ));
    //
    assert((data.magicWords instanceof Array));
    data.magicWords = data.magicWords.map((word) => word.toLowerCase().trim());
    //
    assert((data.blacklistedWords instanceof Array));
    data.blacklistedWords = data.blacklistedWords.map((word) => word.toLowerCase().trim());

    config = data; // Save the configuration into memory.
    loadLinesFile();

}

/**
 * Load the file in LINES_PATH.
 * If the file doesn't exist, it will create a new one and then call connect().
 * If the file does exit,
 */
function loadLinesFile() {
    "use strict";
    if (!fs.existsSync(LINES_PATH)) {
        fs.writeFile(LINES_PATH, "", (err) => {
            if (!err) {
                log.notice(`Created new ${LINES_PATH}.`);
                connect(); // Loading was successful; connect to server.
            } else {
                console.log(`Could not write to ${LINES_PATH}. ${err}`);
            }
        });
    }
    fs.readFile(LINES_PATH, (err, data) => {
        if (err) {
            throw err;
        }
        // data: the file's contents turned into lowercase, with all the carriage returns removed.
        data = data.toString()
            .toLowerCase()
            .replace(/\r/gm, '');

        linesDictionary = data.split(/(\n|\.\ )/)
            .filter((el) => {
                return el !== "\n"; // Remove all the unnecessary line breaks.
            });
        wordsDictionary = unique(extractWords(data));

        log.notice(`I know ${linesDictionary.length - 1} lines and ${wordsDictionary.length - 1} unique words.`);
        connect();
    });
}

/**
 * Connects to Discord using the discord.js API.
 */
function connect() {
    "use strict";
    server.startServer(config.port);

    bot = new Discord.Client();
    bot.login(config.token);

    bot.on("ready", () => {
        log.notice("Successfully connected to Discord.");
    });

    bot.on("message", (discordMessage) => {
        log.message(discordMessage.author, discordMessage.channel, discordMessage.content);
        if (discordMessage.author !== bot.user) {
            processMessage(discordMessage);
        }
    });

    bot.on("messageDelete", (discordMessage) => {
        discordMessage.channel.sendMessage(`${discordMessage.author}: i know what you did`);
    });

    setInterval(saveLinesFile, config.autoSavePeriod * 1000);
}

/**
 * Handles all learning and speech of the bot.
 * @param {Object} discordMessage - Discord messageString object to be processed
 */
function processMessage(discordMessage) {
    "use strict";
    let messageString = discordMessage.content.toLowerCase();  // Stores the contents of the messageString object in a string variable.

    if (config.learning) {
        learn(messageString);
    }

    if (config.speaking) {
        let words = extractWords(messageString);

        if (config.speaking) {
            /**
             * containsMagic is an anonymous function that will return true if the messageString
             * contains any of the words inside config.magicWords. Not case sensitive.
             */
            let containsMagic = function () {
                return config.magicWords.find((entry) => messageString.includes(entry));
            };

            let chance = Math.floor(Math.random() * 100);

            if ((containsMagic() && chance <= config.replyMagic)
                || (messageString.includes(bot.user.username) && chance <= config.replyNick)
                || (chance <= config.replyRate)) {
                replyTo(discordMessage);
            }
        }
    }
}

/**
 * Replies to the messageString object using the Discord API.
 * @param {Object} discordMessage - The messageString that it will reply to.
 */
function replyTo(discordMessage) {
    "use strict";
    let messageString = discordMessage.content.toLowerCase(); // Stores the contents of the messageString object in a string variable.
    let messageWords = extractWords(messageString);

    let recognizedWords = []; // Array of words that the bot recognizes in the messageString.
    messageWords.forEach((word) => {
        if (wordsDictionary.includes(word)) {
            recognizedWords.push(word);
        }
    });

    if (recognizedWords.length <= 0) {
    } else {
        let startingWord = chooseRandomFromArray(recognizedWords); // Pick a random word from the recognizedWords words to start building a sentence from there.
        let messageToSend = [startingWord];            //

        let re = new RegExp(`\\b${escapeRegex(startingWord)}\\b`, "gi"); // This expression matches the picked word.

        // Start filling the output messageString from the left.
        let randomLine = retrieveRandomLineContaining(startingWord);
        messageToSend.unshift(randomLine.split(re)
            .splice(0, 1)
            .join(re));

        // Start filling the output messageString from the right.
        randomLine = retrieveRandomLineContaining(startingWord);
        messageToSend.push(randomLine.split(re)
            .splice(-1, 1)
            .join(re));

        discordMessage.channel.sendMessage(messageToSend.join(''));
    }
}

/**
 * @param {String} messageString - The messageString to be learned.
 */
function learn(messageString) {
    "use strict";
    let choppedMessage = messageString.toLowerCase()
        .split(/\.\ |\n/);

    let messageWords = extractWords(messageString.toLowerCase());

    let forbiddenWords = []; // Flag that determines whether the sentence contains a blacklisted word
    if (config.blacklistedWords.length > 0) {
        config.blacklistedWords.forEach((el) => {
            if (messageWords.includes(el)) {
                // Word in messageString matches a blacklisted word.
                forbiddenWords.push(el);
            }
        });
    }
    if (forbiddenWords.length > 0) {
        log.notice(`Refusing to learn message containing blacklisted words: ${forbiddenWords.join(', ')}`);
    }

    choppedMessage.forEach((sentence) => {
        if (linesDictionary.includes(sentence)) {
            // Sentence already found in lines.
            return false;
        }
        linesDictionary.push(sentence);

        messageWords.forEach((word) => {
            if (!wordsDictionary.includes(word)) {
                // Word is not known; add word to vocabulary.
                wordsDictionary.push(word);
            }
        });
    });
}

/**
 * Write all the bot's lines to the LINES_PATH file.
 */
function saveLinesFile() {
    "use strict";
    fs.writeFile(LINES_PATH, linesDictionary.join('\r\n'), (err) => {
        if (err) {
            return log.error(`Could not write to ${LINES_PATH}. ${err}`);
        }
        log.notice(`Saved lines at ${new Date()}.`);
    });
}

/**
 * Choose a random element from an array.
 * @param {Array} array
 * @return {Object} - random object within the array
 */
function chooseRandomFromArray(array) {
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
function retrieveRandomLineContaining(word) {
    "use strict";
    let matchingLines = [];
    let re = new RegExp(`\\b${escapeRegex(word)}\\b`, 'gi');

    linesDictionary.forEach((line, i, arr) => {
        if (line.match(re)) {
            matchingLines.push(line);
        }
    });
    return matchingLines.length > 0 ? chooseRandomFromArray(matchingLines) : "";
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
function extractWords(line) {
    "use strict";
    return line.split(/[.!,;:()?\ ]/);
}