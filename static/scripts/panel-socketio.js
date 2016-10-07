/**
 * Created by androfox on 30/09/16.
 */
"use strict";
let token = readCookie('token');

//If there is no token, you must go back to the main page
//to login again and get a new one.
if (token === null) {
    window.location.href = '/';
}
else {
    var socket = io.connect('', {
        query: 'token=' + token
    });

    socket.on('connect', function () {
        console.log("Connected to the server.");
    });

    socket.on('updateBotPanel', function (data) {
        console.log("Received data: " + JSON.stringify(data));
        if (typeof data.replyRate === 'number') {
            $("#replyRate-value").text(data.replyRate);
            $("#replyRate-slider").slider({
                range: "min",
                min: 0,
                max: 100,
                value: data.replyRate,
            });
        }
        if (typeof data.replyNick === 'number') {
            $("#replyNick-value").text(data.replyNick);
            $("#replyNick-slider").slider({
                range: "min",
                min: 0,
                max: 100,
                value: data.replyNick,
            });
        }
        if (typeof data.replyMagic === 'number') {
            $("#replyMagic-value").text(data.replyMagic);
            $("#replyMagic-slider").slider({
                range: "min",
                min: 0,
                max: 100,
                value: data.replyMagic,
            });
        }
        if (typeof data.learning === 'boolean') {
            if (data.learning) {
                $("#learning-check").prop("checked", true);
                $("#learning-label").html("<span class='label label-success'>ON</span>");
            } else {
                $("#learning-check").prop("checked", false);
                $("#learning-label").html("<span class='label label-danger'>OFF</span>");
            }
        }
        if (typeof data.speaking === 'boolean') {
            if (data.speaking) {
                $("#speaking-check").prop("checked", true);
                $("#speaking-label").html("<span class='label label-success'>ON</span>");
            } else {
                $("#speaking-check").prop("checked", false);
                $("#speaking-label") .html("<span class='label label-danger'>OFF</span>");
            }
        }
        if (data.magicWords) {
            $("#magic-words-table").html("");

            data.magicWords.forEach(function (word) {
                $("#magic-words-table").append(`<tr><td class='magic-word-entry'><span class="word">${word}</span></td></tr>`);
            });
        }
        if (data.blacklistedWords) {
            $("#blacklisted-words-table").html("");

            data.blacklistedWords.forEach(function (word) {
                $("#blacklisted-words-table").append(`<tr><td class='blacklisted-word-entry'><span class="word">${word}</span></td></tr>`);
            });
        }
    });

    socket.on('updateToken', function (data) {
        token = data.token;

        let date = new Date();
        date.setTime(date.getTime() + (12 * 60 * 60 * 1000));

        document.cookie = `token=${token}; expires=${date.toGMTString()}; path=/`
    });

    socket.on('error', function (data) {
        alert("Connection closed. " + (data.message));
        document.cookie = 'token=;Path=/;expires Thu, 01 Jan 1970 00:00:01 GMT;'
        window.location.href = '/';
    });

    socket.on('invalidToken', function (data) {
        alert("Token has expired. Please log in again.");
        document.cookie = 'token=;Path=/;expires Thu, 01 Jan 1970 00:00:01 GMT;'
        window.location.href = '/';
    });

    socket.on('connect_timeout', function () {
        alert('The connection has timed out.');
    });

    socket.on('registeredUserList', function (data) {
        let onlineUsers = data;
        $("#user-table").html(""); // Empty the user list to receive a new one.
        onlineUsers.forEach(function (user) {
            $("#user-table").append(`<tr><td>${user.nickname}</td><td>${user.ipAddress}</td></tr>`);
        });
    });

    socket.on('submitDataResult', function (data) {
        console.log("submitDataResult: " + JSON.stringify(data));
        switch (data.location) {
            case 'magicWordsInput':
                if (data.success) {
                    $("#magic-word-modal").modal("hide");
                    $("#magic-word-input")
                        .val("");
                    $("#magic-word-input-error").fadeOut();
                } else {
                    //Show error
                    $("#magic-word-input-error")
                        .fadeOut()
                        .html(`<span class="glyphicon glyphicon-exclamation-sign" aria-hidden="true"></span> ${data.message}`)
                        .fadeIn();
                }
                break;
            case 'blacklistedWordsInput':
                if (data.success) {
                    $("#blacklisted-word-modal").modal("hide");
                    $("#blacklisted-word-input")
                        .val("");
                    $("#blacklisted-word-input-error").fadeOut();
                } else {
                    //Show error
                    $("#blacklisted-word-input-error")
                        .fadeOut()
                        .html(`<span class="glyphicon glyphicon-exclamation-sign" aria-hidden="true"></span> ${data.message}`)
                        .fadeIn();
                }
                break;
            default:
                break;
        }
    });
}
