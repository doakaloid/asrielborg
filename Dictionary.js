const fs = require('fs');
const _ = require('underscore');

const Util = require('./Util');
const logger = require('./Logger');

const linesPath = 'lines.txt';

class Dictionary {
    /**
     * @param {Config} config
     * @property {Set.<String>} lines Lines known
     * @property {Set.<String>} words Words known
     */
    constructor(config) {
        this.config = config;
		this.lines = new Set();
		this.words = new Set();
        this.load();
        setInterval(this.save.bind(this), this.config.getAutoSavePeriod() * 1000);
    }

    load() {
        let data;
        try {
            data = fs.readFileSync(linesPath, 'utf8');
        }
        catch (err) {
            if (err.code === 'ENOENT') {
                logger.log('warn', 'No lines.txt file found. If this is a' +
                    ' fresh install, that\'s fine.');
                this.lines = new Set();
                return;
            }
            else {
                throw err;
            }
        }

        const lines = data.toLowerCase();
        this.lines = Util.splitSentences(lines);
        this.words = new Set(Util.splitWords(lines));

        logger.log('info',
            'Done loading! I know ' + this.lines.size + ' lines' +
            ' and ' + this.words.size + ' unique words.');
    }

    save() {
        let data = '';

        for (let line of this.lines) {
            const sentences = Util.splitSentences(line);
            for (let sentence of sentences)
                data += sentence + '\n';
        }

        fs.writeFile(linesPath, data, (err) => {
            if (err) throw err;
            logger.log('info', 'Saved dictionary!');
        });
    }

    /**
     * Returns true if the word is known
     * @param word Word to look up
     * @return {Boolean}
     */
    knows(word) {
        return this.words.has(word);
    }

    /**
     * Returns the words that the bot knows from the line
     * @param {Set.<String>} words Words to look up
     */
    getKnownWords(words) {
        let known = new Set();
        for (let word of words) {
            if (this.knows(word))
                known.add(word);
        }
        return known;
    }

    /**
     * Returns all the lines containing the specified word.
     * @param {String} word
     * @returns {Array}
     */
    getAllLinesContaining(word) {
        const linesContainingWord = [];
        const pattern = new RegExp('\\b' + word + '\\b', 'gi');

        for (let str of this.lines) {
            if (str.match(pattern)) {
                linesContainingWord.push(str);
            }
        }

        return linesContainingWord;
    }

    /**
     * @private
     * @param {String} word
     * @return {String} A random line containing the specified word
     */
    getRandomLineContaining(word) {
        word = Util.escapeRegex(word);

        const li = this.getAllLinesContaining(word);

        if (li.length === 0)
            return '';

        return li.length === 1
            ? li[0]
            : _.sample(li);
    }

    /**
     * Generates a sentence around specified word
     * @param {String} word Word to build around
     * @return {String} The finished sentence
     */
    buildAround(word) {
        let leftSide = this.getRandomLineContaining(word);
        let rightSide = this.getRandomLineContaining(word);

        const pattern = new RegExp('\\b' + Util.escapeRegex(word) + '\\b', 'gi');

        leftSide = leftSide.split(pattern)[0];
        rightSide = rightSide
            .split(pattern)
            .splice(-1, 1)
            .join(' ');

        return [leftSide, word, rightSide].join('');
    }

    /**
     * Learns given string
     * @param {String} str Line to learn
     */
    learn(str) {
        const sentences = Util.splitSentences(str);
        const words = Array.from(Util.splitWords(str));

        if (_.intersection(words, this.config.getBlacklistedWords()).length !== 0) {
            logger.log('debug', '\"%s\" contains a blacklisted word.' +
                ' Refusing to learn.', str);
            return;
        }

        for (let s of sentences)
            this.lines.add(s);

        for (let w of words)
            this.words.add(w);
    }

    /**
     * Permanently forgets specified word
     * @param word
     * @return {Number} the amount of forgotten lines
     */
    forget(word) {
        const pattern =
            new RegExp('\\b' + Util.escapeRegex(word) + '\\b', 'gi');

        let forgottenAmount = 0;
        for (let line of this.lines) {
            if (line.match(pattern)) {
                this.lines.delete(line);
                forgottenAmount++;
            }
        }
        return forgottenAmount;
    }
}

module.exports = Dictionary;