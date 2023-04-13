//@ts-check
const fs = require('fs');

class Console {
    constructor(Client) {
        var time = new Date();
        let logFilePath = `./logs/log-${time.getFullYear()}.${time.getMonth() + 1}.${time.getDate()}-${time.getHours()}.${time.getMinutes()}.${time.getSeconds()}.txt`;
        fs.writeFile(logFilePath, '', () => {});
        let logger = fs.createWriteStream(logFilePath);
        logger.write(`Log file created ${time.getFullYear()}.${time.getMonth() + 1}.${time.getDate()}-${time.getHours()}.${time.getMinutes()}.${time.getSeconds()} \n`);

        /**
         * Log a string to both the console and the log file.
         * @param {string} text Name of the text to be logged.
         * @param {string | null} serverId Id of the server
         */
        this.log = (text, serverId = null) => {
            if (serverId != null) var serverName = Client.guilds.cache.get(serverId).name + '';
            else var serverName = 'Global';
            let consoleText = `[${new Date().toLocaleDateString()}-${new Date().toLocaleTimeString()}] - [${serverName}] > ${text}`;
            console.log(consoleText);
            logger.write(consoleText + '\n');
        };

        /**
         * Log a string to both the console and the log file.
         * @param {string} error Name of the error to be saved.
         */
        this.error = (error) => {
            let consoleText = `[${new Date().toLocaleDateString()}-${new Date().toLocaleTimeString()}] - [ERROR] > ${error}`;
            console.error(consoleText);
            logger.write(consoleText + '\n');
        };
    }
}

module.exports = Console;
