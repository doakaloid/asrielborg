const Discord = require('discord.js');
const fs = require('fs');
const _ = require('underscore');

const logger = require('./Logger');
const Util = require('./Util');
const Dictionary = require('./Dictionary');

class AsrielBorg
{
    /**
     * @param {Config} config
     * @property {Config} config Bot config
     * @property {Client} client Discord client
     * @property {Dictionary} dictionary Dictionary of the bot
     */
    constructor(config)
    {
        this.config = config;
        this.dictionary = new Dictionary(config);
        this.connect();

        this.client.on('message', this.onMessage.bind(this));
    }

    connect()
    {
        if (this.config.token === '')
        {
            throw new Error('Token is empty. I can\'t connect without a' +
                ' token. Set one in the config file.');
        }

        this.client = new Discord.Client();

        this.client.login(this.config.token).then(() =>
        {
            logger.log('info', 'AsrielBorg is connected and ready!');
        }).catch((err) =>
        {
            logger.log('error',
                'An error occurred while connecting to Discord:' +
                ' %s', err.message);
        });
    }

    /**
     * @param {Message} message
     */
    onMessage(message)
    {
        logger.log('info', '[%s]: %s', message.author.username,
            message.content);

        if (message.author === this.client.user)
            return;

        if (this.config.admins.includes(message.author.id))
        {
            if (message.isMentioned(this.client.user)
                && message.content.startsWith(';'))
            {
                this.admin(message);
                return;
            }
        }

        if (this.config.ignoredUsers.includes(message.author.id))
            return;

        if (!this.config.speaking)
            return;

        if (this.config.learning)
            this.dictionary.learn(message.content);

        const willReply = this.getWillReply(message);
        if (willReply)
            this.reply(message);
    }

    /**
     * Returns whether the bot will choose to reply to a message.
     * @param {Message} message
     */
    getWillReply(message)
    {
        const words = Util.splitWords( message.content.toLocaleLowerCase() );

        let hasMagic = false;
        for (let mi = 0; !hasMagic, mi < this.config.magicWords.length; mi++)
        {
            if (words.has(this.config.magicWords[mi]))
                hasMagic = true;
        }
        if (hasMagic)
        {
            const random = Math.floor(Math.random() * 100) + 1; // 1 to 100
            if (random <= this.config.replyMagic)
            {
                logger.log('debug', 'Replying to magic');
                return true;
            }
        }
        logger.log('debug', 'Not replying to magic word');

        let hasNick = message.isMemberMentioned(this.client.user);
        if (hasNick)
        {
            const random = Math.floor(Math.random() * 100) + 1; // 1 to 100
            if (random <= this.config.replyNick)
            {
                logger.log('debug', 'Replying to mention');
                return true;
            }
        }
        logger.log('debug', 'Not replying to mention');

        const random = Math.floor(Math.random() * 100 ) + 1; // 1 to 100
        const willReply = random <= this.config.replyRate;
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
    reply(message)
    {
        const messageStr = message.content.toLowerCase();
        const words = Util.splitWords( messageStr );

        const knownWords = this.dictionary.getKnownWords(words);
        if (knownWords.size === 0)
        {
            logger.log('debug',
                'Don\'t known any words in \"%s\"', messageStr );
            return;
        }
        logger.log('debug', 'I know the words: %s', Array.from(knownWords) );

        const buildAroundWord = _.sample( Array.from(knownWords) );
        const finalSentence = this.dictionary.buildAround(buildAroundWord);

        if (finalSentence === '')
        {
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
    admin(message)
    {
        const input = message.content.split(' ');

        if (input.length < 3)
            return;

        const command = input[2];
        const args = input.length === 3
            ? []
            : input.splice(3);

        switch (command)
        {
            case 'set':
                if (args.length !== 2)
                {
                    message.reply('Usage: set [property] [value]');
                    return;
                }
                const prop = args[0];
                const value = args[1];

                try {
                    this.setProperty(prop, value);
                } catch (err) {
                    message.reply(err.message);
                }
                break;
            case 'known':
                if (args.length !== 1)
                {
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
                if (args.length !== 1)
                {
                    message.reply('Usage: forget [word]');
                    return;
                }

                const forgottenAmount = this.dictionary.forget(args[0]);

                message.reply('I forgot ' + forgottenAmount + ' contexts' +
                    ' containing ' + args[0] + '.');
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
    setProperty(prop, value)
    {
        switch (prop)
        {
            case 'replyrate':
                this.config.setReplyRate( Util.parseInt(value) );
                break;

            case 'replynick':
                this.config.setReplyNick( Util.parseInt(value));
                break;

            case 'replymagic':
                this.config.setReplyMagic( Util.parseInt(value) );
                break;

            case 'speaking':
                if (value !== 'true' || value !== 'false')
                    throw new Error('value must be either true or false');
                this.config.setSpeaking(value === 'true');
                break;

            case 'learning':
                if (value !== 'true' || value !== 'false')
                    throw new Error('value must be either true or false');
                this.config.setLearning(value === 'true');
                break;

            case 'autosaveperiod':
                this.config.setAutoSavePeriod( Util.parseInt(value) );
                break;

            default:
                throw new Error('invalid property specified. Valid' +
                    ' properties are: replyrate, replynick, replymagic,' +
                    ' speaking, learning, autosaveperiod');
        }
    }
}

module.exports = AsrielBorg;