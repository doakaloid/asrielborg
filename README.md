AsrielBorg is a clone of SeeBorg, an IRC (Internet Relay Chat) bot created by Eugene Bujak in C++. AsrielBorg is written to work with Discord and Node.js 6.5.0. AsrielBorg is a bot that can learn from other users and formulate responses according to the contexts that the bot already knows. It is not coherent most of the time, but it does provide for some good entertainment.

**IF YOU ARE UPDATING FROM 1.0.0, YOU MUST INSTALL NODE.JS 6.5.0**

### Installation
   1. Install Node.js 6.5.0: (Download: https://nodejs.org/en/)
   2. Create a Discord bot. (Guide: https://github.com/reactiflux/discord-irc/wiki/Creating-a-discord-bot-&-getting-a-token)
   3. Edit the ```token``` field in ```config.json``` and insert the token for your bot.
   4. Run the bot with the command ```node main.js```
   5. *Recommended*: If you wish to leave your bot running for prolonged periods of time, it is recommended that you install *forever* with ```npm install forever```. Use ```forever start main.js``` to start the bot instead. To stop the bot, use ```forever stop <pid>```.

### Credits
   - Eugene Bujak, for creating the first SeeBorg
   - AndroFox, for recreating SeeBorg in JavaScript
   - Foxscotch, for incredible support
 
# License
This project is licensed under the ISC license. See the LICENSE file for more info.