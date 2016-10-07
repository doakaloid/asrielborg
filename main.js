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
    fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, ' '), (err) =>  {
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
    wordListName = wordListName.slice(0, -6); // Example: magicWordsRemove, blacklistedWordsRemove

    if (typeof value !== 'string') {
        throw new Error("The word must be a string.");
    }
    else if (!config[wordListName].includes(value.toLowerCase())) {
        throw new Error(`Word not found in ${wordListName}.`);
    }
    return wordListName;
}

function setReplyPercentage(optionName, value) {
    if (value > 100 || value < 0) {
        throw new Error("Value must be greater than 0 and smaller than 100. Please contact the developer.");
    } else {
        config[optionName] = value;
    }
}

function setConfigBoolean(optionName, value) {
    if (typeof value === 'boolean') {
        config[optionName] = value;
    } else {
        throw new Error("Value must be a boolean. Please contact the developer.");
    }
}

module.exports = {

    submitDataTypes: ['magicWordsAdd', 'magicWordsRemove', 'setReplyRate',
        'setReplyMagic', 'setReplyNick', 'setSpeaking', 'setLearning', 'blacklistedWordsAdd',
        'blacklistedWordsRemove'],
    /**
     * @param {String} optionName
     * @param {*} value
     */
    setOption(optionName, value) {
        let trueOptionName = null;
        if (typeof value === 'string') {
            value = value.toLowerCase();
        }

        switch (optionName) {
            case 'magicWordsAdd':
            case 'blacklistedWordsAdd':
                trueOptionName = validateWordListInsertion(optionName, value);

                config[trueOptionName].push(value);
                break;
            case 'magicWordsRemove':
            case 'blacklistedWordsRemove':
                trueOptionName = validateWordListRemoval(optionName, value);
                let wordToBeRemovedIndex = config[trueOptionName].indexOf(value);

                config[trueOptionName].splice(wordToBeRemovedIndex, 1);
                break;
            case 'setReplyRate':
                trueOptionName = 'replyRate';
                setReplyPercentage(trueOptionName, value);
                break;
            case 'setReplyMagic':
                trueOptionName = 'replyMagic';
                setReplyPercentage(trueOptionName, value);
                break;
            case 'setReplyNick':
                trueOptionName = 'replyNick';
                setReplyPercentage(trueOptionName, value);
                break;
            case 'setSpeaking':
                trueOptionName = 'speaking';
                setConfigBoolean(trueOptionName, value);
                break;
            case 'setLearning':
                trueOptionName = 'learning';
                setConfigBoolean(trueOptionName, value);
                break;
            default:
                throw new Error('Unknown option. Please contact the developer.');
                break;
        }
        writeConfig();
        // option name will be returned so that the server can tell the client which option
        // will be updated in their browser
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
    webpanel: false,
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
    log.warning(`Config ${CONFIG_PATH} not found! Creating a new one. Please edit it and restart this program.`);
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
    if (typeof data.webpanel !== 'boolean') {
        throw new Error("Invalid `webpanel` value! It must be a boolean.");
    }
    if (typeof data.port !== 'number' || data.port < 1 || data.port > 65535) {
        throw new Error("Invalid 'port' value! It must be a number between 1 and 65535.");
    }
    if (typeof data.token !== 'string') {
        throw new Error("Invalid 'token' value! It must be a string.");
    }
    if (typeof data.replyRate !== 'number' || data.replyRate < 0 || data.replyRate > 100) {
        throw new Error("Invalid 'replyRate' value! It must be a number between 0 and 100.");
    }
    if (typeof data.replyNick !== 'number' || data.replyNick < 0 || data.replyNick > 100) {
        throw new Error("Invalid 'replyNick' value! It must be a number between 0 and 100.");
    }
    if (typeof data.replyMagic !== 'number' || data.replyMagic < 0 || data.replyMagic > 100) {
        throw new Error("Invalid 'replyMagic' value! It must be a number between 0 and 100.");
    }
    if (typeof data.speaking !== 'boolean') {
        throw new Error("Invalid 'speaking' value! It must be a boolean.");
    }
    if (typeof data.learning !== 'boolean') {
        throw new Error("Invalid 'learning' value! It must be a boolean.");
    }
    if (typeof data.autoSavePeriod !== 'number' || data.autoSavePeriod < 200) {
        throw new Error("Invalid 'autoSavePeriod' value! It must be a number greater than 200.");
    }
    if (!(data.magicWords instanceof Array)) {
        throw new Error("Invalid 'magicWords' value! It must be an array containing strings.");
    }
    if (data.magicWords.find((el) => typeof el !== 'string') !== undefined) {
        throw new Error("All words in 'magicWords' must be strings.");
    }
    if (data.blacklistedWords.find((el) => typeof el !== 'string') !== undefined) {
        throw new Error("All words in 'blacklistedWords' must be strings.");
    }

    data.magicWords.forEach( (obj, i) => {
        data.magicWords[i] = obj.trim().toLowerCase();
    });
    data.blacklistedWords.forEach( (obj, i) => {
        data.blacklistedWords[i] = obj.trim().toLowerCase();
    });

    config = data; // Save the configuration into memory.
    loadLinesFile();
}

/**
 * Load the file in LINES_PATH.
 * If the file doesn't exist, it will create a new one and then call connect().
 * If the file does exit,
 */
function loadLinesFile() {
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

        data = data.toString()
            .toLowerCase()
            .replace(/\r/gm, '');
        // data: the file's contents turned into lowercase, with all the carriage returns removed.

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
    if (config.webpanel) {
        server.startServer(config.port);
    }

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
    return str.replace(/([.?*+\^$\[\]\\(){}\|\-])/g, "\\$1");
}

/**
 * Filter the words from a line string.
 * @param {String} line
 * @return {Array} - The array containing the words of the string.
 */
function extractWords(line) {
    return line.split(/[.!,;:()?\ ]/);
}