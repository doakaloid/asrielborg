'use strict';

module.exports = {
    /**
     * @return {Set.<String>} Words in this array
     */
    splitWords: function (str) {
        const words = new Set(str.split( /[.,;()? ]/ )); //TODO: Actually support pinging people with server-specific nicknames
        words.delete('');
        return words;
    },

    /**
     * Escapes a string from Regex
     * @param {String} str String to escape
     * @returns {XML|void|string|*}
     */
    escapeRegex: function (str) {
        return str.replace(/([.:!?*+\^$\[\]\\(){}\|\-])/g, "\\$1");
    },

    /**
     * Get all sentences from a string
     * @param {String} str
     * @return {Set.<String>}
     */
    splitSentences: function (str) {
        // Remove 'carriage returns'
        const str_ = str.replace(/\r/gm, '');

        // Split at line breaks and periods
        return new Set(str_.split(/\n+|\.\s+/));
    },

    /**
     * Actually throws an error if the int is NaN
     * @param {String} str
     */
    parseInt: function (str) {
        const num = parseInt(str);
        if (isNaN(num))
            throw new Error('invalid number specified');
        return num;
    },

    /**
     * Returns true if the specified string matches a Discord user mention pattern.
     * @param {String} str
     * @return {Boolean}
     */
    isDiscordMention: function (str) {
        return str.match(/<@(!)?.*>/) !== null;
    }
};
