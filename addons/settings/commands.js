const {StorageManager, Console, ExportManager, CommandManager, ChatResponder, Client, BotListeners} = Bot;
const {EmbedBuilder, PermissionsBitField, ApplicationCommandOptionType, ApplicationCommandType, ChannelType} = require("discord.js");

CommandManager.add(
	"channel",
	{
		description: "Set the suggestions channel",
		category: "Settings",
		options: [
			{
				name: "channel",
				description: "the channel",
				type: ApplicationCommandOptionType.Channel,
				channelTypes: [ChannelType.GuildText]
			}
		],
		permissions: PermissionsBitField.Flags.KickMembers | PermissionsBitField.Flags.BanMembers,
		type: ApplicationCommandType.ChatInput
	},
	async (/** @type {import('discord.js').ChatInputCommandInteraction} */ interaction) => {
		const channel = interaction.options.getChannel("channel");
		if (channel == null) {
			//Remove channel
			setChannel(null, interaction.guild);
			var msgEmbed = new EmbedBuilder().setColor(CommandManager.successColor).setTitle(`Mod log channel has been removed`);
			await interaction.reply({embeds: [msgEmbed], ephemeral: true});
			Console.log(`Removed suggestion channel`, interaction.guild.id);
			return;
		}
		//Check if channel exists and is a text channel
		if (channel.type != ChannelType.GuildText) {
			var msgEmbed = new EmbedBuilder().setColor(CommandManager.errorColor).setDescription(`The channel must be a text channel`);
			await interaction.reply({embeds: [msgEmbed], ephemeral: true});
			return;
		}
		//Update log channel
		setChannel(channel.id, interaction.guild);
		var msgEmbed = new EmbedBuilder().setColor(CommandManager.successColor).setTitle(`The suggestion channel has been set to`).setDescription(`${channel}`);
		await interaction.reply({embeds: [msgEmbed], ephemeral: true});
		Console.log(`Set suggestion channel to #${channel.name}`, interaction.guild.id);
	}
);

function setChannel(channelId, guild) {
	if (channelId) {
		StorageManager.set("suggestionChannel", channelId, guild.id);
	} else {
		StorageManager.unset("suggestionChannel", guild.id);
	}
}

CommandManager.add(
	"ignore-role",
	{
		description: "Update the ignored roles list",
		category: "Settings",
		options: [
			{
				name: "add",
				description: "Add a role to the ignore list",
				type: ApplicationCommandOptionType.Subcommand,
				options: [
					{
						name: "role",
						description: "the role to add",
						type: ApplicationCommandOptionType.Role,
						required: true
					}
				]
			},
			{
				name: "remove",
				description: "Remove a role from the ignore list",
				type: ApplicationCommandOptionType.Subcommand,
				options: [
					{
						name: "role",
						description: "the role to remove",
						type: ApplicationCommandOptionType.Role,
						required: true
					}
				]
			},
			{
				name: "list",
				description: "List the ignored roles",
				type: ApplicationCommandOptionType.Subcommand
			}
		],
		permissions: PermissionsBitField.Flags.KickMembers | PermissionsBitField.Flags.BanMembers,
		type: ApplicationCommandType.ChatInput
	},
	async (/** @type {import('discord.js').ChatInputCommandInteraction} */ interaction) => {
		let sub = interaction.options.getSubcommand();

		let currentList = StorageManager.get("ignoredRoles", interaction.guild.id) ?? [];

		if (sub == "add" || sub == "remove") {
			let role = interaction.options.getRole("role");
			if (role == null) {
				await interaction.reply({embeds: [new EmbedBuilder().setColor(CommandManager.errorColor).setTitle(`Invalid role`)], ephemeral: true});
				return;
			}
			if (sub == "add") {
				if (currentList.includes(role.id)) {
					await interaction.reply({embeds: [new EmbedBuilder().setColor(CommandManager.errorColor).setTitle(`This role is already ignored`)], ephemeral: true});
					return;
				}
				currentList.push(role.id);
				await interaction.reply({embeds: [new EmbedBuilder().setColor(CommandManager.successColor).setTitle("Added a role").setDescription(`Added ${role} to the ignore list`)], ephemeral: true});
				Console.log(`Added ${role.name} (${role.id}) to the ignore list`, interaction.guild.id);
			}
			if (sub == "remove") {
				if (!currentList.includes(role.id)) {
					await interaction.reply({embeds: [new EmbedBuilder().setColor(CommandManager.errorColor).setTitle(`This role is not ignored`)], ephemeral: true});
					return;
				}
				currentList.splice(currentList.indexOf(role.id), 1);
				await interaction.reply({embeds: [new EmbedBuilder().setColor(CommandManager.successColor).setTitle("Removed a role").setDescription(`Removed ${role} from the ignore list`)], ephemeral: true});
				Console.log(`Removed ${role.name} (${role.id}) from the ignore list`, interaction.guild.id);
			}
			//Update list
			StorageManager.set("ignoredRoles", currentList, interaction.guild.id);
		} else {
			//List
			let msgEmbed = new EmbedBuilder().setColor(CommandManager.successColor).setTitle(`Ignored roles`);
			let description = "";
			if (currentList.length == 0) {
				description = "There are no ignored roles";
			}
			for (let i = 0; i < currentList.length; i++) {
				let role = await interaction.guild.roles.fetch(currentList[i]);
				description += `- ${role}\n`;
			}
			msgEmbed.setDescription(description);
			await interaction.reply({embeds: [msgEmbed], ephemeral: true});
			Console.log("Listed ignored roles", interaction.guild.id);
		}
	}
);

CommandManager.add(
	"banlist",
	{
		description: "Update the ban list",
		category: "Settings",
		options: [
			{
				name: "add",
				description: "Add a user to the ban list",
				type: ApplicationCommandOptionType.Subcommand,
				options: [
					{
						name: "user",
						description: "the user to add",
						type: ApplicationCommandOptionType.User,
						required: true
					}
				]
			},
			{
				name: "remove",
				description: "Remove a user from the ban list",
				type: ApplicationCommandOptionType.Subcommand,
				options: [
					{
						name: "user",
						description: "the user to remove",
						type: ApplicationCommandOptionType.User,
						required: true
					}
				]
			},
			{
				name: "list",
				description: "List the banned users",
				type: ApplicationCommandOptionType.Subcommand
			}
		],
		permissions: PermissionsBitField.Flags.KickMembers | PermissionsBitField.Flags.BanMembers,
		type: ApplicationCommandType.ChatInput
	},
	async (/** @type {import('discord.js').ChatInputCommandInteraction} */ interaction) => {
		let sub = interaction.options.getSubcommand();

		let currentList = StorageManager.get("ignoredUsers", interaction.guild.id) ?? [];

		if (sub == "add" || sub == "remove") {
			let user = interaction.options.getUser("user");
			if (user == null) {
				await interaction.reply({embeds: [new EmbedBuilder().setColor(CommandManager.errorColor).setTitle(`Invalid user`)], ephemeral: true});
				return;
			}
			if (sub == "add") {
				if (currentList.includes(user.id)) {
					await interaction.reply({embeds: [new EmbedBuilder().setColor(CommandManager.errorColor).setTitle(`This user is already banned`)], ephemeral: true});
					return;
				}
				currentList.push(user.id);
				await interaction.reply({embeds: [new EmbedBuilder().setColor(CommandManager.successColor).setTitle("Added a user").setDescription(`Added ${user} to the ban list`)], ephemeral: true});
				Console.log(`Added ${user.username} (${user.id}) to the ignore list`, interaction.guild.id);
			}
			if (sub == "remove") {
				if (!currentList.includes(user.id)) {
					await interaction.reply({embeds: [new EmbedBuilder().setColor(CommandManager.errorColor).setTitle(`This user is not banned`)], ephemeral: true});
					return;
				}
				currentList.splice(currentList.indexOf(user.id), 1);
				await interaction.reply({embeds: [new EmbedBuilder().setColor(CommandManager.successColor).setTitle("Removed a user").setDescription(`Removed ${user} from the ban list`)], ephemeral: true});
				Console.log(`Removed ${user.username} (${user.id}) from the ignore list`, interaction.guild.id);
			}
			//Update list
			StorageManager.set("ignoredUsers", currentList, interaction.guild.id);
		} else {
			//List
			let msgEmbed = new EmbedBuilder().setColor(CommandManager.successColor).setTitle(`Banned users`);
			let description = "";
			if (currentList.length == 0) {
				description = "There are no banned users";
			}
			for (let i = 0; i < currentList.length; i++) {
				let member = await interaction.guild.members.fetch(currentList[i]);
				description += `- ${member}\n`;
			}
			msgEmbed.setDescription(description);
			await interaction.reply({embeds: [msgEmbed], ephemeral: true});
			Console.log("Listed ignored users", interaction.guild.id);
		}
	}
);
