'use strict';

const fs = require('fs');
const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const session = require('client-sessions');
const jwt = require('jsonwebtoken');
const socketioJwt = require('socketio-jwt');
const socketIo = require('socket.io');
const http = require('http');
const cookieParser = require('cookie-parser');

const log = require('./log');
const User = require('./user');
const Bot = require('./main');

const PASSWORD_PATH = './serverPasswordHash';
const JWT_SECRET = crypto.randomBytes(1024);
const MIN_NICK_LENGTH = 3;
const MAX_NICK_LENGTH = 20;
const MIN_PASS_LENGTH = 6;
const MAX_PASS_LENGTH = 100;

var app = express();
var port = 10991;
var server = http.Server(app);
var sio = socketIo.listen(server);

/**
 * Loads the password from the PASSWORD_PATH file.
 * If a file is not found at the path, a new one will be created.
 * If the program has no access to the path, it will shut down.
 */
function load_password() {
    "use strict";

    let passwordHash = '';
    try {
        fs.accessSync(PASSWORD_PATH, fs.FS_OK);
        fs.readFile(PASSWORD_PATH, (err, data) => {
            if (err) {
                throw err;
            }
            log.notice('Loaded password successfully.');

            if (data.toString() === '') {
                log.warning(`Please go to http://127.0.0.1:${port}/ to set your password.`)
            }
            passwordHash = data.toString();
        });
    }
    catch (err) {
        fs.writeFile(PASSWORD_PATH, '', (err) => {
            if (err) {
                log.error(`Could not write to ${PASSWORD_PATH}. Please check your permissions and try again.`);
                throw err;
            }
            log.notice(`Created a blank password file due to non-existing password. Please go to http://127.0.0.1:${port}/ to set your password.`);
        });
    }
    return passwordHash;
}

/**
 * Writes provided password to the PASSWORD_PATH file.
 * @param {String} password - the password to store (preferably hashed)
 */
function writePasswordFile(password) {
    fs.writeFile(PASSWORD_PATH, password, (err) => {
        if (err) {
            log.error(`Could not write to ${PASSWORD_PATH}. Please check your permissions and try again.`);
            throw err;
        }
        log.notice("Password updated.");
    });
}

function checkAuth(req, res, next) {
    if (!req.cookies.token) {
        res.redirect('/');
    } else {
        next();
    }
}

module.exports = {

    /**
     * @param {Number} user_port - Any integer between 1 and 65535.
     */
    startServer: function (user_port) {
        var self = this;

        if (user_port !== "undefined") {
            port = user_port;
        }
        this.serverPasswordHash = load_password();

        app.set('view engine', 'ejs');

        app.use(bodyParser.json());
        app.use(bodyParser.urlencoded({extended: true}));
        app.use(cookieParser());

        app.use(express.static('static'));

        app.get('/', (req, res) => {
            log.panel(`${req.connection.remoteAddress} accessed the login page.`);

            if (req.cookies.token) {
                res.redirect('/panel');
            } else {
                res.render('index.ejs', {
                    passwordSet: (this.serverPasswordHash !== ''),
                    successState: true,
                    message: '',
                });
            }
        });

        app.post('/', (req, res) => {
            //User is setting a new password
            if (typeof req.body.new_password === 'string') { //TODO: FIX VARIABLE NAME
                let insertedNewPassword = req.body.new_password;

                let success = false;
                let responseMessage = "An error occurred.";

                if (this.serverPasswordHash !== '') {
                    //There is already a password.
                    responseMessage = "There is already a password set. Refresh this page.";
                }
                else if (insertedNewPassword.length > MAX_PASS_LENGTH || insertedNewPassword.length < MIN_PASS_LENGTH) {
                    responseMessage = `The password must have ${MIN_PASS_LENGTH} to ${MAX_PASS_LENGTH} characters.`;
                }
                else {
                    responseMessage = "Password set successfully.";
                    success = true;
                }

                if (success) {
                    this.serverPasswordHash = crypto.createHash('sha256')
                        .update(insertedNewPassword)
                        .digest('hex');
                }
                res.send({
                    successState: success,
                    message: responseMessage
                });

            } else if (typeof req.body.login_input === 'string'
                && typeof req.body.login_name === 'string') {
                //User is attempting to log in with not necessarily valid input
                let formPassword = req.body.login_input;
                let formNickname = req.body.login_name;
                let nicknameRating = rateNickname(formNickname);

                if (this.serverPasswordHash === '') {
                    //There is no password set.
                    res.send({
                        successState: false,
                        message: "There isn't any password set.",
                    });
                } else if (nicknameRating === 'notstring') {
                    //Bad username. Not a string.
                    res.send({
                        successState: false,
                        message: "Nickname is not a string.",
                    });
                } else if (nicknameRating === 'badlength') {
                    //Bad nickname size.
                    res.send({
                        successState: false,
                        message: `Bad nickname. It must be longer than ${MIN_NICK_LENGTH} characters and shorter than ${MAX_NICK_LENGTH}.`,
                    });
                } else if (formPassword.length > 100 || formPassword.length < 5) {
                    //Password isn't even valid.
                    res.send({
                        successState: false,
                        message: "Invalid password.",
                    });
                } else if (nicknameRating === 'taken') {
                    //Username is taken.
                    res.send({
                        successState: false,
                        message: "This username is taken.",
                    });
                } else {
                    //Password is valid, now we check if it matches the password we have
                    let hashedFormPassword = crypto.createHash('sha256')
                        .update(formPassword)
                        .digest('hex');

                    if (hashedFormPassword == this.serverPasswordHash) {
                        //Success. Now create a token with the desired nickname AND store the IP address in the token.
                        let token = generateToken(req.body.login_name, req.connection.remoteAddress);

                        res.send({
                            successState: true,
                            token: token
                        });
                    } else {
                        res.send({
                            successState: false,
                            message: "Invalid password.",
                        });
                    }
                }
            }
        });

        app.get('/panel', checkAuth, (req, res) => {
            res.render('panel.ejs');
        });

        server.listen(port, function () {
            log.panel("Server is now running.");
        });
    }
};

//Socket.IO stuff here.
var registeredUsers = [];
var uniqueUserID = 1; // A unique integer for each user.

function printOnlineUsers() {
    log.panel(`Users online: ` + getOnlineUsers().map(function (el) {
            return [el.profile.nickname, el.profile.ipAddress];
        }).join('; '));
}

/**
 * Produces a token for panel authentication.
 * @param {String} nick - The nickname to be used by the authenticated user.
 * @param {String} ipAddress - The ipAddress of the user.
 */
function generateToken(nick, ipAddress) {
    let userProfile = {
        nickname: nick,
        ipAddress: ipAddress,
        userId: uniqueUserID
    };
    uniqueUserID++;

    registeredUsers.push(new User(userProfile));

    return jwt.sign(userProfile, JWT_SECRET, {expiresIn: 60 * 60}); // Expires in 1 hour
}

/**
 * UNUSED.
 */
function updateToken(socket, token) {
    let signedToken = jwt.sign(token, JWT_SECRET, {expiresIn: 60 * 60}); // Expires in 1 hour
    socket.emit('token_update', {token: signedToken});
}

/**
 * Returns whether a nickname is available for usage.
 * @param {String} nickname
 */
function rateNickname(nickname) {
    if (typeof nickname !== 'string') {
        return 'notstring';
    }

    if (nickname.length > 20 || nickname.length < 3) {
        return 'badlength';
    }

    if (checkUsernameTaken(nickname)) {
        return 'taken';
    }

    return 'available';
}

/**
 * @return {Array} an array of online Users
 */
function getOnlineUsers() {
    return registeredUsers.filter(function (user) {
        return user.status === 'online';
    });
}

/**
 * This function is unfortunately, more complicated than I wanted it to be.
 * If the username entered is a string, it will consider a name to be 'taken':
 *      - If the inserted name and a user's name is equal;
 *      - AND if that user is online.
 * If the username entered is an User object, it will consider a name to be 'taken': *      - If the provided user has the same name as another user; *      - AND if that user is online;
 *      - AND if that user DOES NOT have the same uniqueUserID as the provided user.
 * @param {User|String} userOrNickname
 * @return {Boolean}
 */
function checkUsernameTaken(userOrNickname) {

    if (typeof userOrNickname === 'string') {
        let usernameLowercase = userOrNickname.toLowerCase();
        return registeredUsers.find(function (el) {
            return ((el.profile.nickname.toLowerCase() === usernameLowercase) && (el.status === 'online'));
        });
    } else if (userOrNickname instanceof User) {
        let usernameLowercase = userOrNickname.profile.nickname.toLowerCase();
        return registeredUsers.find(function (el) {
            return ((el.profile.nickname.toLowerCase() === usernameLowercase) && (el.status === 'online') && (el.profile.userId !== userOrNickname.profile.userId));
        });
    }
}

/**
 * @param {Object} decoded_token
 * @return {User}
 */
function getUserByToken(decoded_token) {
    return registeredUsers.find(function (user) {
        return user.profile.userId === decoded_token.userId;
    });
}

/**
 * Updates the visual list of all the connected clients
 */
function updateAllClientsUserList() {
    sio.sockets.emit('registeredUserList', getOnlineUsers().map(function (user) {
        return {
            nickname: user.profile.nickname,
            ipAddress: user.profile.ipAddress
        };
    }));
}

/**
 * Broadcasts panel update to all clients.
 * @param {Array} settings
 */
function updateAllClientsPanel(settings) {
    sio.sockets.emit('updateBotPanel', settings);
}

function determineMessageLocation(optionName) {
    switch(optionName) {
        case 'magicWordsAdd':
            return 'magicWordInput';
        case 'magicWordsRemove':
            return 'magicWordsTable';
        default:
            return 'undefined';
    }
}

sio.set('authorization', socketioJwt.authorize({
        secret: JWT_SECRET,
        handshake: true
    }
));

sio.sockets
    .on('connection', function (socket) {
        let user = getUserByToken(socket.client.request.decoded_token);

        if (checkUsernameTaken(user)) {
            socket.emit('invalidToken', {message: "Username is taken."});
            socket.disconnect(true);
            return;
        }

        // Commence the connection ritual
        user.setStatus('online');
        log.panel(`${user.profile.nickname} connected to the admin panel.`);

        printOnlineUsers();
        updateAllClientsUserList();

        socket.emit('updateBotPanel', Bot.retrieveAllOptions()); // Send the bot configs to the new user
        // End of the connection ritual

        socket.on('disconnect', function () {
            user.setStatus('offline');
            updateAllClientsUserList();

            log.panel(`User ${user.profile.nickname} disconnected.`);
            printOnlineUsers();
        });

        socket.on('submitData', function (data) {
            let res = {
                success: false,
                location: determineMessageLocation(data.submitType),
                message: 'Unknown error.',
            };

            let trueOptionName = '';
            if (Bot.submitDataTypes.includes(data.submitType)) {
                try {
                    trueOptionName = Bot.setOption(data.submitType, data.value);
                    res.success = true;
                    res.message = "Task successful.";
                    updateAllClientsPanel(Bot.getOptions([trueOptionName]));
                } catch (error) {
                    res.message = error.message;
                }
            } else {
                res.message = "Invalid submitType.";
            }

            socket.emit('submitDataResult', res);
        });
    });
