const fs = require('fs');

/**
 * @typedef {Object} ConfigProperties
 * @type {Object}
 * @property {String} token Token used to log in
 * @property {Number} replyRate Reply rate to any given line, in percent
 * @property {Number} replyNick Reply rate to a mention, in percent
 * @property {Number} replyMagic Reply rate to a magic word, in percent
 * @property {Boolean} speaking If true, bot can speak
 * @property {Boolean} learning If true, bot will learn new words
 * @property {Boolean} pingUsers If true, bot will ping users
 * @property {Number} autoSavePeriod Interval in seconds in which to save the dictionary
 * @property {Array.<String>} magicWords List of magic words
 * @property {Array.<String>} blacklistedWords Words to not be learned
 * @property {Array.<String>} admins User IDs of the people who can control
 * @property {Array.<String>} ignoredUsers User IDs of the people who will be ignored
 * @property {Array.<String>} usernameAliases Other names the bot is known by
 */

class Config {
    constructor() {
        /**
         * @type {ConfigProperties}
         * @private
         */
        this.properties = {
            token: '',
            replyRate: 100,
            replyNick: 100,
            replyMagic: 100,
            speaking: true,
            learning: true,
            pingUsers: false,
            autoSavePeriod: 200,
            magicWords: ['magic', 'words'],
            blacklistedWords: ['dinosaurs'],
            admins: ['316431277668433920'],
            ignoredUsers: [],
            usernameAliases: ['asriel'],
        };
    }

    write(path) {
        fs.writeFileSync(path, JSON.stringify(this.properties, null, ' '));
    }

    load(path) {
        const data = JSON.parse(fs.readFileSync(path));

        this.setToken(data.token);
        this.setReplyRate(data.replyRate);
        this.setReplyNick(data.replyNick);
        this.setReplyMagic(data.replyMagic);
        this.setSpeaking(data.speaking);
        this.setLearning(data.learning);
        this.setPingUsers(data.pingUsers);
        this.setAutoSavePeriod(data.autoSavePeriod);
        this.setMagicWords(data.magicWords);
        this.setBlacklistedWords(data.blacklistedWords);
        this.setAdmins(data.admins);
        this.setIgnoredUsers(data.ignoredUsers);
        this.setUsernameAliases(data.usernameAliases);
    }

    setToken(t) {
        if (typeof t !== 'string')
            throw new Error('\'token\' must be a string');

        this.properties.token = t;
    }

    setReplyRate(r) {
        if (typeof r !== 'number')
            throw new Error('\'replyRate\' must be a Number');

        if (r < 0 || r > 100)
            throw new Error('\'replyRate\' must be in between 0 and 100');

        this.properties.replyRate = r;
    }

    setReplyNick(r) {
        if (typeof r !== 'number')
            throw new Error('\'replyNick\' must be a Number');

        if (r < 0 || r > 100)
            throw new Error('\'replyNick\' must be in between 0 and 100');

        this.properties.replyNick = r;
    }

    setReplyMagic(r) {
        if (typeof r !== 'number')
            throw new Error('\'replyMagic\' must be a Number');

        if (r < 0 || r > 100)
            throw new Error('\'replyMagic\' must be in between 0 and 100');

        this.properties.replyMagic = r;
    }

    setSpeaking(s) {
        if (typeof s !== 'boolean')
            throw new Error('\'speaking\' must be either \'true\' or \'false\'');

        this.properties.speaking = s;
    }

    setLearning(l) {
        if (typeof l !== 'boolean')
            throw new Error('\'learning\' must be either \'true\' or \'false\'');

        this.properties.learning = l;
    }

    setPingUsers(p) {
        if (typeof p !== 'boolean')
            throw new Error('\'pingUsers\' must be either \'true\' or \'false\'');

        this.properties.pingUsers = p;
    }

    setAutoSavePeriod(a) {
        if (typeof a !== 'number')
            throw new Error('\'autoSavePeriod must be a Number');

        if (a < 0)
            throw new Error('\'autoSavePeriod\' cannot be a negative number');

        this.properties.autoSavePeriod = a;
    }

    setMagicWords(m) {
        if (!(m instanceof Array))
            throw new Error('\'magicWords\' must be an array');

        const lowercaseMagicWords = m.map(str => str.toLowerCase());

        this.properties.magicWords = lowercaseMagicWords;
    }

    setBlacklistedWords(b) {
        if (!(b instanceof Array))
            throw new Error('\'blacklistedWords\' must be an array');

        const lowerCaseBlacklistedWords = b.map(str => str.toLowerCase());

        this.properties.blacklistedWords = lowerCaseBlacklistedWords;
    }

    setAdmins(a) {
        if (!(a instanceof Array))
            throw new Error('\'admins\' must be an array');

        this.properties.admins = a;
    }

    setIgnoredUsers(ig) {
        if (!(ig instanceof Array)) {
            throw new Error('\'ignoredUsers\' must be an array');
        }
        this.properties.ignoredUsers = ig;
    }

    setUsernameAliases(ua) {
        if (!(ua instanceof Array)) {
            throw new Error('\'usernameAliases\' must be an array');
        }

        const lowerCaseUsernameAliases = ua.map(str => str.toLowerCase());

        this.properties.usernameAliases = lowerCaseUsernameAliases;
    }

    getToken() { return this.properties.token; }
    getReplyRate() { return this.properties.replyRate; }
    getReplyNick() { return this.properties.replyNick; }
    getReplyMagic() { return this.properties.replyMagic; }
    getSpeaking() { return this.properties.speaking; }
    getLearning() { return this.properties.learning; }
    getPingUsers() { return this.properties.pingUsers; }
    getAutoSavePeriod() { return this.properties.autoSavePeriod; }
    getMagicWords() { return this.properties.magicWords.slice(); }
    getBlacklistedWords() { return this.properties.blacklistedWords.slice(); }
    getAdmins() { return this.properties.admins.slice(); }
    getIgnoredUsers() { return this.properties.ignoredUsers.slice(); }
    getUsernameAliases() { return this.properties.usernameAliases.slice(); }
}

module.exports = Config;