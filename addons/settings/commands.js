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
