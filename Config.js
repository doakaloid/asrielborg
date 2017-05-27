const fs = require('fs');

class Config
{
    /**
     * @property {String} token Token used to log in
     * @property {Number} replyRate Bot reply rate to any given line, in percent
     * @property {Number} replyNick Bot reply rate to mention, in percent
     * @property {Number} replyMagic Bot reply rate to magic word, in percent
     * @property {Boolean} speaking Bot can speak if true
     * @property {Boolean} learning Bot learns new words if true
     * @property {Number} autoSavePeriod Interval in seconds in which to save the
     * dictionary
     * @property {Array.<String>} magicWords Magic words
     * @property {Array.<String>} blacklistedWords Words the bot will not learn
     * @property {Array.<String>} admins ID of the users who can control the bot
     * @property {Array.<String>} ignoredUsers ID of the users who will be
     * ignored by the bot
     */
    constructor()
    {
        this.token = '';
        this.replyRate = 100;
        this.replyNick = 100;
        this.replyMagic = 100;
        this.speaking = true;
        this.learning = true;
        this.autoSavePeriod = 200;
        this.magicWords = ['magic', 'words'];
        this.blacklistedWords = ['bad word'];
        this.admins = ['316431277668433920'];
        this.ignoredUsers = [];
    }

    write(path)
    {
        const json = {
            token: this.token,
            replyRate: this.replyRate,
            replyNick: this.replyNick,
            replyMagic: this.replyMagic,
            speaking: this.speaking,
            learning: this.learning,
            autoSavePeriod: this.autoSavePeriod,
            magicWords: this.magicWords,
            blacklistedWords: this.blacklistedWords,
            admins: this.admins,
            ignoredUsers: this.ignoredUsers
        };

        fs.writeFileSync( path, JSON.stringify(json, null, ' ') );
    }

    load(path)
    {
        const data = JSON.parse( fs.readFileSync(path) );

        this.setToken(data.token);
        this.setReplyRate(data.replyRate);
        this.setReplyNick(data.replyNick);
        this.setReplyMagic(data.replyMagic);
        this.setSpeaking(data.speaking);
        this.setLearning(data.learning);
        this.setAutoSavePeriod(data.autoSavePeriod);
        this.setMagicWords(data.magicWords);
        this.setBlacklistedWords(data.blacklistedWords);
        this.setAdmins(data.admins);
        this.setIgnoredUsers(data.ignoredUsers);
    }

    setToken(t)
    {
        if (typeof t !== 'string')
            throw new Error('\'token\' must be a string');

        this.token = t;
    }

    setReplyRate(r)
    {
        if (typeof r !== 'number')
            throw new Error('\'replyRate\' must be a Number');

        if (r < 0 || r > 100)
            throw new Error('\'replyRate\' must be in between 0 and 100');

        this.replyRate = r;
    }

    setReplyNick(r)
    {
        if (typeof r !== 'number')
            throw new Error('\'replyNick\' must be a Number');

        if (r < 0 || r > 100)
            throw new Error('\'replyNick\' must be in between 0 and 100');

        this.replyNick = r;
    }

    setReplyMagic(r)
    {
        if (typeof r !== 'number')
            throw new Error('\'replyMagic\' must be a Number');

        if (r < 0 || r > 100)
            throw new Error('\'replyMagic\' must be in between 0 and 100');

        this.replyMagic = r;
    }

    setSpeaking(s)
    {
        if (typeof s !== 'boolean')
            throw new Error('\'speaking\' must be either \'true\' or \'false\'');

        this.speaking = s;
    }

    setLearning(l)
    {
        if (typeof l !== 'boolean')
            throw new Error('\'learning\' must be either \'true\' or \'false\'');

        this.learning = l;
    }

    setAutoSavePeriod(a)
    {
        if (typeof a !== 'number')
            throw new Error('\'autoSavePeriod must be a Number');

        if (a < 0)
            throw new Error('\'autoSavePeriod\' cannot be a negative number');

        this.autoSavePeriod = a;
    }

    setMagicWords(m)
    {
        if (!(m instanceof Array))
            throw new Error('\'magicWords\' must be an array');

        this.magicWords = m;
    }

    setBlacklistedWords(b)
    {
        if (!(b instanceof Array))
            throw new Error('\'blacklistedWords\' must be an array');

        this.blacklistedWords = b;
    }

    setAdmins(a)
    {
        if (!(a instanceof Array))
            throw new Error('\'admins\' must be an array');

        this.admins = a;
    }

    setIgnoredUsers(ig)
    {
        if (!(ig instanceof Array))
        {
            throw new Error('\'ignoredUsers\' must be an array');
        }
        this.ignoredUsers = ig;
    }
}

module.exports = Config;