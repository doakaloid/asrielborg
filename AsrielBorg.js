const Discord = require('discord.js');
const fs = require('fs');
const _ = require('underscore');

const logger = require('./Logger');
const Util = require('./Util');
const Dictionary = require('./Dictionary');

class AsrielBorg {
    /**
     * @param {Config} config
     * @property {Config} config Bot config
     * @property {Client} client Discord client
     * @property {Dictionary} dictionary Dictionary of the bot
     */
    constructor(config) {
        this.config = config;
        this.dictionary = new Dictionary(config);
        this.connect();

        this.client.on('message', this.onMessage.bind(this));
    }

    connect() {
        if (this.config.getToken() === '') {
            throw new Error('Token is empty. I can\'t connect without a' +
                ' token. Set one in the config file.');
        }

        this.client = new Discord.Client();

        this.client.login(this.config.getToken()).then(() => {
            logger.log('info', 'AsrielBorg is connected and ready!');
        }).catch((err) => {
            logger.log('error',
                'An error occurred while connecting to Discord:' +
                ' %s', err.message);
        });
    }

    /**
     * @param {Message} message
     */
    onMessage(message) {
        logger.log('info', '[%s]: %s', message.author.username,
            message.content);

        if (message.author === this.client.user)
            return;

        if (this.config.getAdmins().includes(message.author.id)) {
            if (message.isMentioned(this.client.user)
                && message.content.startsWith(';')) {
                this.admin(message);
                return;
            }
        }

        if (this.config.getIgnoredUsers().includes(message.author.id))
            return;

        if (!this.config.getSpeaking())
            return;

        if (this.config.getLearning())
            this.dictionary.learn(message.content);

        const willReply = this.getWillReply(message);
        if (willReply)
            this.reply(message);
    }

    /**
     * Returns whether the bot will choose to reply to a message.
     * @param {Message} message
     */
    getWillReply(message) {
        const words = Util.splitWords(message.content.toLocaleLowerCase());

        let hasMagic = false;
        for (let mi = 0; !hasMagic, mi < this.config.getMagicWords().length; mi++) {
            if (words.has(this.config.getMagicWords()[mi]))
                hasMagic = true;
        }
        if (hasMagic) {
            const random = Math.floor(Math.random() * 100) + 1; // 1 to 100
            if (random <= this.config.getReplyMagic()) {
                logger.log('debug', 'Replying to magic');
                return true;
            }
        }
        logger.log('debug', 'Not replying to magic word');

        let hasNick =
            message.isMemberMentioned(this.client.user)
            || this.hasUsernameMention(message.content);

        if (hasNick) {
            const random = Math.floor(Math.random() * 100) + 1; // 1 to 100
            if (random <= this.config.getReplyNick()) {
                logger.log('debug', 'Replying to mention');
                return true;
            }
        }
        logger.log('debug', 'Not replying to mention');

        const random = Math.floor(Math.random() * 100) + 1; // 1 to 100
        const willReply = random <= this.config.getReplyRate();
        if (willReply)
            logger.log('debug', 'Replying because of replyRate');
        else
            logger.log('debug', 'Not replying to purely random chance');
        return willReply;
    }

    /**
     * Replies to a message
     * @param {Message} message The message to reply to
     */
    reply(message) {
        const _this = this;
        const messageStr = message.content.toLowerCase();
        let words = Util.splitWords(messageStr);

        function stripBotMentions() {
            // Strip username mentions from words list.
            for (let word of words) {
                if (_this.hasUsernameMention(word)) {
                    words.delete(word);
                }
            }
            logger.log('debug', 'Words after stripping bot mentions: "%s"', Array.from(words));
        }
        stripBotMentions();

        function removePings() {
            for (let word of words) {
                if (Util.isDiscordMention(word)) {
                    words.delete(word);
                }
            }
        }
        if (!this.config.getPingUsers()) {
            removePings();
        }

        const knownWords = this.dictionary.getKnownWords(words);
        if (knownWords.size === 0) {
            logger.log('debug',
                'Don\'t known any words in \"%s\" (username mentions not included)', Array.from(words));
            return;
        }
        logger.log('debug', 'I know the words: %s', Array.from(knownWords));

        const buildAroundWord = _.sample(Array.from(knownWords));

        logger.log('debug', 'Building around word \'%s\'', buildAroundWord);

        const finalSentence = this.dictionary.buildAround(buildAroundWord);

        if (finalSentence === '') {
            logger.log('debug', 'Final sentence was empty');
            return;
        }
        logger.log('debug', 'Built the sentence: %s', finalSentence);

        message.channel.send(finalSentence)
            .catch(err => {
                logger.log('debug', 'Error while sending msg: %s', err);
            });
    }

    /**
     * The function that handles admin commands
     * @param {Message} message Containing the admin command
     */
    admin(message) {
        const input = message.content.split(' ');

        if (input.length < 3)
            return;

        const command = input[2];
        const args = input.length === 3
            ? []
            : input.splice(3);

        switch (command) {
            case 'set':
                if (args.length !== 2) {
                    message.reply('Usage: set [property] [value]');
                    return;
                }
                const prop = args[0];
                const value = args[1];

                try {
                    this.setProperty(prop, value);
                    message.reply('Property ' + prop + ' set to ' + value + '. ');
                } catch (err) {
                    message.reply(err.message);
                }
                break;
            case 'shutup':
                if (this.config.getSpeaking()) {
                    this.config.setSpeaking(false);
                    message.reply('okay :(');
                }
                break;
            case 'wakeup':
                if (!this.config.getSpeaking()) {
                    this.config.setSpeaking(true);
                    message.reply('woohoo!');
                }
                break;
            case 'known':
                if (args.length !== 1) {
                    message.reply('Usage: known [word]');
                    return;
                }

                const occurrences = this.dictionary
                    .getAllLinesContaining(args[0])
                    .length;

                message.reply('The word ' + args[0] + ' shows up '
                    + occurrences + ' times in my vocabulary.');
                break;
            case 'forget':
                if (args.length !== 1) {
                    message.reply('Usage: forget [word]');
                    return;
                }

                const forgottenAmount = this.dictionary.forget(args[0]);

                message.reply('I forgot ' + forgottenAmount + ' contexts' +
                    ' containing ' + args[0] + '.');
                break;
            case 'help':
                message.reply('commands: set, shutup, wakeup, known, forget');
                break;
            default:
                break;
        }
    }

    /**
     * Tries to set a property in this bot's config
     * @param {String} prop
     * @param {String} value
     */
    setProperty(prop, value) {
        switch (prop) {
            case 'replyrate':
                this.config.setReplyRate(Util.parseInt(value));
                break;

            case 'replynick':
                this.config.setReplyNick(Util.parseInt(value));
                break;

            case 'replymagic':
                this.config.setReplyMagic(Util.parseInt(value));
                break;

            default:
                throw new Error('invalid property specified. Valid' +
                    ' properties are: replyrate, replynick, replymagic');
        }
    }

    /**
     * Returns true if the specified string matches an username mention or an alias mention.
     * Aliases are defined in usernameAliases in the config file.
     * @param {String} str
     * @return boolean
     */
    hasUsernameMention(str) {
        const words = Util.splitWords(str.toLowerCase());
		
		// Check if any words match any username aliases.
        const intersection = _.intersection(Array.from(words), this.config.getUsernameAliases());

        if (intersection.length > 0) {
            return true;
        }
        else {
			// Now check if anything in the string matches the Discord username.
            return str.toLowerCase().includes(this.client.user.username.toLowerCase());
        }
    }
}

module.exports = AsrielBorg;