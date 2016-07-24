"use strict"
var Discord = require("discord.js");
var fs = require('fs');
var assert = require('assert');
var _ = require('underscore');
var log = require('./log');

var config_path = "./config.json";
var lines_path = "./lines.txt";

var known_lines = [];
var known_words = [];
var bot;

log.notice("AsrielBorg is now loading ... This might take a while if your lines file is too big.");

var config = {
    //The port for the web admin panel.
    admin_port: 10991,
    //Discord API Token
    token: "",
    //The chance that the bot will reply to any message, in percent.
    replyrate: 1.0,
    //The chance that the bot will reply when its nick is mentioned, in percent.
    replynick: 100.0,
    //The chance that the bot will reply when a magic word is said, in percent.
    replymagic: 10.0,
    
    //Whether the bot is speaking or not. (0: not learning, 1: learning)
    speaking: 1,
    //Whether the bot is learning or not. (0: not learning, 1: learning)
    learning: 1,
    
    //Auto save period (in seconds)
    autosaveperiod: 200,
    //The list of magic words the bot will reply to (separated by spaces)
    magicwords: "this will trigger me",
};

//Does a config file already exist? Default is config.json.
try {
    fs.accessSync(config_path, fs.FS_OK);
    fs.readFile(config_path, (err, data) => {
        if (err) throw err;
    validateconf( JSON.parse(data) );
    });
} catch (err) {
    //Config file doesn't exist or is not accessible. Attempt creating a new one.
    fs.writeFile(config_path, JSON.stringify(config, null, '\n'), (err) => {
        if (err) {
            return log.fatal(`Could not write to ${config_path}. ${err}`);
        }
        log.notice(`Written to configuration to ${config_path}. Please check and modify it.`);
    });
}

function validateconf(data) { 
    assert((typeof data.admin_port     === "number" 
                && data.admin_port > 0 
                && data.admin_port <= 65565
           ));
    assert((typeof data.token          === "string"));
    assert((typeof data.replyrate      === "number"
                && data.replyrate >= 0 
                && data.replyrate <= 100
           ));
    assert((typeof data.replynick      === "number"
                && data.replynick >= 0 
                && data.replynick <= 100
           ));
    assert((typeof data.replymagic     === "number" 
                && data.replymagic >= 0 
                && data.replymagic <= 100
           ));
    assert((typeof data.speaking       === "number"
               && (data.speaking == 0 || data.speaking == 1)
           ));
    assert((typeof data.learning       === "number"
               && (data.learning == 0 || data.learning == 1)
           ));
    assert((typeof data.autosaveperiod === "number"
                && data.autosaveperiod >= 0
           ));
    assert((typeof data.magicwords === "string"));

    data.magicwords = data.magicwords.toLowerCase().split(' ');
    config = data;
    loadlines();
}

function loadlines() {
    //Does the lines file already exist? Default is lines.txt.
    try {
        fs.readFile(lines_path, (err, data) => {
            if (err) throw err;
            
            known_lines = data.toString().replace(/(\r)/gm,"").split("\n");
            known_words = unique(data.toString().replace(/(\r)/gm,"").split(/\n| /));
            log.notice(`I know ${known_lines.length} lines and ${known_words.length} unique words.`);
            connect();
        });
    } catch (err) {
        fs.writeFile(lines_path, "", (err) => {
            if (err) { return console.log(`Could not write to ${lines_path}. ${err}`); }
            log.notice(`Created new ${lines_path}.`);
            connect();
        });
    }
}

function connect() {
    bot = new Discord.Client();
    
    bot.loginWithToken(config.token);
    
    bot.on("ready", () => {
        log.notice("Successfully connected to Discord.");
    });
    
    bot.on("message", (message_t) => {
        if (message_t.author != bot.user) {
            process_message(message_t);
        }
    });
    
    bot.on("messageDeleted", (message_t) => {
        bot.sendMessage(message_t.channel, `${message_t.author}: i know what you did`);
    });
    
    setInterval(save_lines, config.autosaveperiod * 1000);
}

function process_message(message_t) {
    if (config.speaking) {
        var message = message_t.content;
        var words = message.split(' ');
        
        if (config.learning) { learn(message); }
        
        if (config.speaking) {
            var replychance = Math.floor(Math.random() * 100);
            var replyflag = false;

            //check if the bot will reply to a magic word
            var contains_magic = function () {
                var matching_words = [];
                config.magicwords.forEach( (magic_word) => {
                    if (containsCaseInsensitive(words, magic_word)) {
                        matching_words.push(magic_word);
                    }
                });
                return matching_words;
            }
            if (contains_magic().length > 0 && replychance < config.replymagic ) { replyflag = true; }
    
            //check if the bot will reply to nick
            else if (containsCaseInsensitive(words, bot.user.username) && replychance < config.replynick) { replyflag = true; }

            //check if the bot will reply to default chance
            else if (replychance < config.replyrate) { replyflag = true; }
            if (replyflag) {
                reply(message_t);
            }
        }
    }
}

function reply(message_t) {
    var message = message_t.content;
    var words = message.split(' ');
    
    //search for words that the bot already knows 
    var known = [];
    words.forEach( (word, i, arr) => {
        if (known_words.indexOf(word) > -1) {
            known.push(word);
        }
    });
    
    if (known.length > 0) {
        var picked_word = chooseFrom(known);
        var form_sentence = [picked_word];
        
        var re = new RegExp(`\\b${RegExp.quote(picked_word)}\\b`, "gi");
        
        //fill left
        var randomline = get_random_line_containing(picked_word);
        form_sentence.unshift(randomline.split(re).splice(0, 1).join(re));
        //fill right
        var randomline = get_random_line_containing(picked_word);
        form_sentence.push(randomline.split(re).splice(-1, 1).join(re));
        
        bot.sendMessage(message_t.channel, form_sentence.join(''));
    }
}

function learn(message) {
    var filterlines = message.split('. ');
    
    filterlines.forEach( (sentence) => {
        if (known_lines.indexOf(sentence) > -1) { return false; } //if the sentence is already found in lines
        var words = sentence.split(' ');
        words.forEach( (word) => {
            if (known_words.indexOf(word) == -1) {
                words.push(word);
            }
        });
        known_lines.push(sentence);
    });
}
  
function save_lines() {
    fs.writeFile(lines_path, known_lines.join('\r\n'), (err) => {
        if (err) {
            return log.error(`Could not write to ${lines_path}. ${err}`);
        }
        log.notice(`Saved lines to ${lines_path}.`);
    });
}

//Assist function
function get_random_line_containing(word) {
    var line_list = [];
    var re = new RegExp(`\\b${RegExp.quote(word)}\\b`, 'gi');
    
    known_lines.forEach( (line, i, arr) => {
        if ( line.match(re) ) {
            line_list.push(line);
        }
    });
    return line_list.length > 0 ? chooseFrom(line_list) : "";
}

//Assist function
//Removes all duplicates from an array
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

//Assist function
function isChannel(name) {
    if ( /^[#&]\w+$/.test(name) ) {
        return true;
    return false;
    }
}


//Assist function
RegExp.quote = function(str) {
     return str.replace(/([.?*+^$[\]\\(){}|-])/g, "\\$1");
};

//Assist function
function containsCaseInsensitive(array1, element) {
    return array1.some( function (el, i) { 
        if (el.toLowerCase() === element.toLowerCase()) {
            return true;
        }
    });
}
    
//Assist function
function chooseFrom(array1) {
    if (array1.length == 0) {
        return [];
    } 
    return array1[Math.floor(Math.random() * array1.length)];
}