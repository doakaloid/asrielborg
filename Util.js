'use strict';

module.exports = {
    /**
     * @return {Set.<String>} Words in this array
     */
    splitWords: function(str)
    {
        const words = new Set(str.split(/(?!<@)[.!,;:()? ](?!>)/));
        words.delete('');
        return words;
    },

    /**
     * Escapes a string from Regex
     * @param {String} str String to escape
     * @returns {XML|void|string|*}
     */
    escapeRegex: function(str)
    {
        return str.replace(/([.?*+\^$\[\]\\(){}\|\-])/g, "\\$1");
    },

    /**
     * Get all sentences from a string
     * @param {String} str
     * @return {Set.<String>}
     */
    splitSentences: function(str)
    {
        // Remove 'carriage returns'
        const str_ = str.replace(/\r/gm, '');

        // Split at line breaks and periods
        return new Set( str_.split(/\n+|\.\s+/) );
    }
};
