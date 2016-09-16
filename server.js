'use strict';

const fs          = require('fs');
const express     = require('express');
const body_parser = require('body-parser');
const crypto      = require('crypto');
const session     = require('client-sessions');
const jwt         = require('jsonwebtoken');
const socketioJwt = require('socketio-jwt');
const socketIo    = require('socket.io');
const http        = require('http');
const cookie_parser = require('cookie-parser');

const log  = require('./log' );
const User = require('./user');
const Bot = require('./main');

const PASSWORD_PATH   = './password_hash';
const JWT_SECRET      = crypto.randomBytes(1024);
const MIN_NICK_LENGTH = 3;
const MAX_NICK_LENGTH = 20;
const MIN_PASS_LENGTH = 6;
const MAX_PASS_LENGTH = 100;

var app     = express();
var port    = 10991;
var server  = http.Server(app);
var sio     = socketIo.listen(server);

/**
 * Loads the password from the PASSWORD_PATH file.
 * If a file is not found at the path, a new one will be created.
 * If the program has no access to the path, it will shut down.
 */
function load_password() {
    let password_hash = '';
    try {
        fs.accessSync(PASSWORD_PATH, fs.FS_OK);
        fs.readFile(PASSWORD_PATH, (err, data) => {
            if (err) { throw err; }
            log.notice('Loaded password successfully.');
            
            if (data.toString() === '') {
                log.warning(`Please go to http://127.0.0.1:${port}/ to set your password.`)
            }
            password_hash = data.toString();
        })
    }
    catch (err) {
        fs.writeFile(PASSWORD_PATH, '', (err) => {
            if (err) {
                log.error(`Could not write to ${PASSWORD_PATH}. Please check your permissions and try again.`);
                throw err;
            }
            else {
                log.notice(`Created a blank password file due to non-existing password. Please go to http://127.0.0.1:${port}/ to set your password.`);
            }
        });
    }
    return password_hash;
}

/**
 * Writes provided password to the PASSWORD_PATH file.
 * @param {String} password - the password to store (preferably hashed)
 */
function write_password(password) {
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
    server_start: function (user_port) {
        var self = this;

        if (user_port !== "undefined") {
            port = user_port;
        }
        this.password_hash = load_password();
        
        app.set('view engine', 'ejs');
        
        app.use(body_parser.json());
        app.use(body_parser.urlencoded({ extended: true }));
        app.use(cookie_parser());

        app.use(express.static('static'));
        
        app.get('/', (req, res) => {
           log.panel(`${req.connection.remoteAddress} accessed the login page.`);    
        
           if (req.cookies.token) {
               res.redirect('/panel');
           } else {
               res.render('index.ejs', {
                   password_set: (this.password_hash !== ''),
                   success_state: true,
                   message: '',
               });
           }
        });
        
        app.post('/', (req, res) => {
            //User is setting a new password
            if (typeof req.body.new_password === 'string') {
                let new_password = req.body.new_password;

                let success_state = false;
                let message = "An error occurred.";

                if (this.password_hash !== '') {
                    //There is already a password.
                    message = "There is already a password set. Refresh this page.";
                }
                else if (new_password.length > MAX_PASS_LENGTH || new_password.length < MIN_PASS_LENGTH) {
                    message = `The password must have ${MIN_PASS_LENGTH} to ${MAX_PASS_LENGTH} characters.`;
                }
                else {
                    message = "Password set successfully.";
                    success_state = true;
                }

                if (success_state) {
                    this.password_hash = crypto.createHash('sha256')
                                               .update(new_password)
                                               .digest('hex');
                }

                res.send({
                    success_state: success_state,
                    message: message
                });
                
            } else if (typeof req.body.login_input === 'string'
                    && typeof req.body.login_name  === 'string') {
                //User is attempting to log in with not necessarily valid input
                let login_password = req.body.login_input;
                let login_name = req.body.login_name;
                let nickname_rating = rate_nickname(login_name);
                
                if (this.password_hash === '') {
                    //There is no password set.
                    res.send({
                        success_state: false,
                        message: "There isn't any password set.",
                    });  
                } else if (nickname_rating === 'notstring') {
                    //Bad username. Not a string.
                    res.send({
                        success_state: false,
                        message: "Nickname is not a string.",
                    });
                } else if (nickname_rating === 'badlength') {
                    //Bad nickname size.
                    res.send({
                        success_state: false,
                        message: `Bad nickname. It must be longer than ${MIN_NICK_LENGTH} characters and shorter than ${MAX_NICK_LENGTH}.`,
                    });  
                } else if (login_password.length > 100 || login_password.length < 5) {
                    //Password isn't even valid.
                    res.send({
                        success_state: false,
                        message: "Invalid password.",
                    });
                } else if (nickname_rating === 'taken') {
                    //Username is taken.
                    res.send({
                        success_state: false,
                        message: "This username is taken.",
                    });
                } else {
                    //Password is valid, now we check if it matches the password we have
                    let hashed_password_attempt = crypto.createHash('sha256')
                                                        .update(login_password)
                                                        .digest('hex');
                    
                    if (hashed_password_attempt == this.password_hash) {
                        //Success. Now create a token with the desired nickname AND store the IP address in the token.
                        let token = make_token(req.body.login_name, req.connection.remoteAddress);
                        
                        res.send({
                            success_state: true,
                            token: token});
                    } else {
                        res.send({
                            success_state: false,
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
var user_list   = [];
var user_id     = 1; // A unique integer for each user.

function print_online_users() {
    log.panel(`Users online: ` + get_online_users().map( function (el) {
        return [el.profile.nickname, el.profile.ip_address];
    }).join('; '));
}

/**
 * Produces a token for panel authentication.
 * @param {String} nick - The nickname to be used by the authenticated user.
 * @param {String} ip_address - The ip_address of the user.
 */
function make_token(nick, ip_address) {
    let user_profile = {
        nickname: nick,
        ip_address: ip_address,
        user_id: user_id
    };
    user_id++;

    user_list.push(new User(user_profile));

    return jwt.sign(user_profile, JWT_SECRET, { expiresIn: 60 * 60 }); // Expires in 1 hour
}

/**
 * UNUSED.
 */
function update_token(socket, token) {
    let signed_token = jwt.sign(token, JWT_SECRET, { expiresIn: 60 * 60 }); // Expires in 1 hour
    socket.emit('token_update', {token: signed_token});
} 

/**
 * Returns whether a nickname is available for usage.
 * @param {String} name
 */
function rate_nickname(name) {
    if (typeof name !== 'string') {
        return 'notstring';
    }

    if (name.length > 20 || name.length < 3) {
        return 'badlength';
    }

    if (is_username_taken(name)) {
        return 'taken';
    }

    return 'available';
}

/**
 * @return {Array} an array of online Users
 */
function get_online_users() {
    return user_list.filter( function (user) {
        return user.status === 'online';
    });
}

/**
 * This function is unfortunately, more complicated than I wanted it to be.
 * If the username entered is a string, it will consider a name to be 'taken':
 *      - If the inserted name and a user's name is equal;
 *      - AND if that user is online.
 * If the username entered is an User object, it will consider a name to be 'taken':
 *      - If the provided user has the same name as another user;
 *      - AND if that user is online;
 *      - AND if that user DOES NOT have the same user_id as the provided user.
 * @param {User|String} username
 * @return {Boolean}
 */
function is_username_taken(username) {
    if (typeof username === 'string') {

        let lowercase_name = username.toLowerCase();
        return user_list.find( function (el) { 
            return ((el.profile.nickname.toLowerCase() === lowercase_name) && (el.status === 'online'));
        });
    } else if (username instanceof User) {
        let lowercase_name = username.profile.nickname.toLowerCase();
        return user_list.find( function (el) {
            return ((el.profile.nickname.toLowerCase() === lowercase_name) && (el.status === 'online') && (el.profile.user_id !== username.profile.user_id));
        });
    }
}

/**
 * @param {Object} decoded_token
 * @return {User}
 */
function get_user_by_token(decoded_token) {
    return user_list.find( function (user) {
       return user.profile.user_id === decoded_token.user_id;
    });
}

/**
 * Updates the visual list of all the connected clients
 */
function update_clients_user_list() {
    sio.sockets.emit('user_list', get_online_users().map( function(user) {
         return {
            nickname: user.profile.nickname,
            ip_address: user.profile.ip_address
         };
    }));
}

sio.set('authorization', socketioJwt.authorize(
    {
        secret: JWT_SECRET,
        handshake: true
    }
));
        
sio.sockets
   .on('connection', function (socket) {
        let user = get_user_by_token(socket.client.request.decoded_token);

        if (is_username_taken(user)) {
            socket.emit('invalid_token', {message: "Username is taken."});
            socket.disconnect(true);
            return;
        }
        
        user.set_status('online');
        update_clients_user_list();

        log.panel(`${user.profile.nickname} connected to the admin panel.`);
        print_online_users();                         
    
        socket.emit('bot_config', Bot.get_all_options());

        socket.on('disconnect', function () {
            user.set_status('offline');
            update_clients_user_list();

            log.panel(`User ${user.profile.nickname} disconnected.`);
            print_online_users();                        
        });
    });