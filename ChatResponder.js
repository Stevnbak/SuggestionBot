//@ts-check
const {EmbedBuilder, PermissionsBitField, ChannelType} = require('discord.js');
/**
 * @typedef {"Uncategorized Commands"|"Misc"} ChatCategory
 *
 */

/**
 * @typedef ChatOptions
 * @property {string} description | Description of the responder.
 * @property {ChatCategory} category | Category of the responder.
 * @property {boolean} hide | Whether to hide the responder from the help list.
 * @property {string} word | The command that can triggers this callback.
 * @property {(message: import('discord.js').Message) => void} cb | Callback to call once this command is triggered.
 */
/**
 * Manages all the chat responders.
 */
class ChatResponder {
    /**
     * @param {import('discord.js').Client} Client Discord.JS client
     * @param {typeof Bot.StorageManager} StorageManager The storage manager for the bot.
     */
    constructor({on}, StorageManager, Console) {
        /**
         * Array of all the commands.
         * @type {ChatOptions[]}
         */
        this.responders = [];

        /**
         * Adds a command to be usable.
         * @param {string} word | The command that can trigger this callback.
         * @param {Partial<ChatOptions>} options | Options of the command.
         * @property {string} description | Description of the responder.
         * @property {ChatCategory} category | Category of the responder.
         * @property {boolean} hide | Whether to hide the responder from the help list.
         * @property {(message: import('discord.js').Message) => void} cb Callback to call once this command is triggered.
         */

        this.add = (word, options, cb) => {
            /** @type {ChatOptions} */
            const data = Object.assign(
                {
                    cb,
                    word: word.toLowerCase(),
                    category: 'Uncategorized Commands',
                    description: 'No description provided.',
                    hide: false,
                    index: 0,
                    dm: null,
                },
                options
            );
            this.responders.push(data);
        };
        //Activate text commands.
        on('messageCreate', async (msg) => {
            //Filter out dms and other bots...
            if (msg.channel.type === ChannelType.DM || msg.author.bot || msg.guild == null) return;
            const content = msg.content.toLowerCase();
            for (const command of this.responders) {
                if (content.includes(command.word)) {
                    //Check if bot has the needed permissions
                    if (!checkBotPermissions(msg.channel, msg.guild)) {
                        Console.error('Bot permission error in guild with id: ' + msg.guild.id);
                        return;
                    }
                    try {
                        command.cb(msg);
                    } catch {
                        async (error) => {
                            if ((error.name === 'DiscordAPIError' && !(error.path.endsWith('/messages') && error.code === 50013)) || error.name !== 'DiscordAPIError') {
                                //Error is not about sending messages.
                                Console.error(`Error while executing chat responder "${command.word[0]}"`);
                                Console.error(error.stack);
                                Console.error('=====');
                                try {
                                    await msg.channel.send({
                                        embeds: [new EmbedBuilder().setDescription('An error has occurred while running this command! It has been reported to the developer!').setColor(0xff0000)],
                                    });
                                } catch (_) {}
                            }
                            Console.log(error);
                        };
                    }
                }
            }
        });
        Console.log('Chatresponder is ready', null);
    }
}
async function checkBotPermissions(channel, /** @type {import('discord.js').Guild} */ guild) {
    var neededPermissions = [
        PermissionsBitField.Flags.ViewAuditLog,
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.SendMessagesInThreads,
        PermissionsBitField.Flags.EmbedLinks,
        PermissionsBitField.Flags.AttachFiles,
        PermissionsBitField.Flags.ReadMessageHistory,
        PermissionsBitField.Flags.AddReactions,
    ];
    let me = await guild.members.fetch(guild.client.user.id);
    if (me.permissionsIn(channel).has(neededPermissions)) return true;
    return false;
}
module.exports = ChatResponder;
