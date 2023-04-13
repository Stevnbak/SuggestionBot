//@ts-check
const {EmbedBuilder, PermissionsBitField, ChannelType, ApplicationCommandType, ApplicationCommandOptionType, CommandInteraction} = require("discord.js");

/**
 * @typedef CommandOptions
 * @property {string} description | Description of the command.
 * @property {string} category | Category of the command.
 * @property {string[]} aliases | Aliases of the command (Only for slash commands).
 * @property {ApplicationCommandOptionType[]} options | Interaction options of the command.
 * @property {ApplicationCommandType} type | The interaction type.
 * @property {PermissionsBitField} permissions | The permissions bit field needed to use this command.
 */
/**
 * @typedef CommandExtras
 * @property {string} cmd The command that can triggers this callback.
 * @property {(CommandInteraction) => void} cb Callback to call once this command is triggered.
 *
 * @typedef {CommandExtras & CommandOptions} Command
 */
/**
 * Manages all the commands.
 */
class CommandManager {
	/**
	 *
	 * @param {import('discord.js').Client} Client Discord.JS client
	 * @param {typeof Bot.StorageManager} StorageManager The storage manager for the bot.
	 * @param {typeof Bot.Console} Console The Console for the bot.
	 */
	// @ts-ignore
	constructor(Client, StorageManager, Console) {
		/**
		 * Array of all the commands.
		 * @type {Command[]}
		 */
		this.commands = [];

		//Array of all the commands.
		this.applications = [];

		//Colours
		this.successColor = 0x239400;
		this.failColor = 0x910f00;
		this.neutralColor = 0x6e757d;

		/**
		 * Adds a command to be usable.
		 * @param {string} cmd The command that can trigger this callback.
		 * @param {Partial<CommandOptions>} options Options of the command.
		 * @property {string} description | Description of the command.
		 * @property {ApplicationCommandOptionType[]} options | Interaction options of the command.
		 * @property {string} category | Category of the command.
		 * @property {string[]} aliases | Aliases of the command (Only for slash commands).
		 * @property {PermissionsBitField} permissions | The permissions bit field needed to use this command.
		 * @param {(CommandInteraction) => void} cb Callback to call once the command is activated.
		 */

		this.add = (cmd, options, cb) => {
			/** @type {Command} */
			const data = Object.assign(
				{
					cb,
					cmd: cmd,
					category: "Uncategorized Commands",
					options: [],
					aliases: [],
					description: "No description provided.",
					type: ApplicationCommandType.ChatInput,
					permissions: PermissionsBitField.Flags.ViewChannel
				},
				options
			);
			const interaction = {
				name: cmd,
				type: data.type,
				default_member_permissions: data.permissions.toString(),
				dm_permission: false
			};
			if (data.options.length > 0) {
				interaction.options = data.options;
			}
			if (data.type == ApplicationCommandType.ChatInput) {
				interaction["description"] = data.description;
				interaction["name"] = cmd.toLowerCase();
				data.cmd = cmd.toLowerCase();
			}
			this.applications.push(interaction);
			//Add aliases
			if (data.aliases.length > 0 && data.type == ApplicationCommandType.ChatInput) {
				for (let alias of data.aliases) {
					let aliasInteraction = {...interaction};
					aliasInteraction.name = alias.toLowerCase();
					this.applications.push(aliasInteraction);
				}
			}
			///console.log(this.applications);
			this.commands.push(data);
		};

		this.setup = async () => {
			const {REST, Routes} = require("discord.js");
			const config = require("./config.json");

			const rest = new REST({version: "10"}).setToken(config.TESTTOKEN);

			//Create help command
			this.add("help", {description: "List of all available commands", category: "Misceleaneous", aliases: ["commands"], type: ApplicationCommandType.ChatInput}, async (/** @type {import('discord.js').ChatInputCommandInteraction} */ interaction) => {
				const embed = new EmbedBuilder();
				embed.setTitle("Available Commands");
				embed.setDescription("Here is a list of all available clash commands with your permissions. \n*(User context menu commands are not listed here, right click a user to see those.)*");
				embed.setColor(this.neutralColor);
				let stevnUser = await Client.users.fetch("307900989455859723");
				//@ts-ignore
				embed.setFooter({text: "Bot made by " + stevnUser.username, iconURL: stevnUser.avatarURL()});
				let availableCommands = this.commands.filter((c) => interaction.memberPermissions?.has(c.permissions) && c.type == ApplicationCommandType.ChatInput);
				let fields = availableCommands ? [] : [{name: "No commands available", value: " ", inline: false}];
				for (const category of [...new Set(availableCommands.map((c) => c.category))]) {
					let commands = availableCommands.filter((c) => c.category == category);
					let value = commands ? "" : "No commands available";
					for (const command of commands) {
						let name = command.cmd;
						if (command.aliases.length > 0) {
							name += ` (${command.aliases.join("/")})`;
						}
						value += `***/${name}** - ${command.description}*\n`;
					}
					fields.push({name: `__**${category}:**__`, value: value, inline: false});
				}
				embed.addFields(fields);
				await interaction.reply({embeds: [embed], ephemeral: true});
			});

			//Reload applications.
			try {
				await rest.put(Routes.applicationCommands(config.TEST_CLIENT_ID), {body: this.applications});
				Console.log("Reloaded application commands.");
			} catch (error) {
				console.error(error);
			}
		};

		//Activate applications.
		Client.on("interactionCreate", async (interaction) => {
			//Filter out non slash commands.
			if (!interaction.isChatInputCommand() && !interaction.isUserContextMenuCommand() && !interaction.isMessageContextMenuCommand()) return;
			//Filter out dms, other bots...
			if (interaction.guild == null || interaction.user.bot) return;
			//Find command.
			for (const command of this.commands) {
				if (command.cmd == interaction.commandName || command.aliases.includes(interaction.commandName)) {
					//Check if bot has the needed permissions
					if (!checkBotPermissions(interaction.channel, interaction.guild)) {
						Console.error("Bot permission error in guild with id: " + interaction.guild.id);
						return;
					}
					//Run command call back
					try {
						command.cb(interaction);
					} catch {
						async (error) => {
							if ((error.name === "DiscordAPIError" && !(error.path.endsWith("/messages") && error.code === 50013)) || error.name !== "DiscordAPIError") {
								//Error is not about sending messages.
								Console.error(`Error while executing command "${command.cmd[0]}"`);
								Console.error(error.stack);
								try {
									await interaction.reply({
										embeds: [new EmbedBuilder().setDescription("An error has occurred while running this command! It has been reported to the developer!").setColor(0xff0000)]
									});
								} catch (_) {}
							}
							Console.error(error);
						};
					}
				}
			}
		});

		//Done loading.
		Console.log("Commandmanager is ready", null);
	}
}

async function checkBotPermissions(channel, /** @type {import('discord.js').Guild} */ guild) {
	var neededPermissions = [PermissionsBitField.Flags.ViewAuditLog, PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.EmbedLinks, PermissionsBitField.Flags.AttachFiles, PermissionsBitField.Flags.AddReactions, PermissionsBitField.Flags.BanMembers, PermissionsBitField.Flags.KickMembers, PermissionsBitField.Flags.ModerateMembers];
	let me = await guild.members.fetch(guild.client.user.id);
	if (me.permissionsIn(channel).has(neededPermissions)) return true;
	return false;
}

module.exports = CommandManager;
