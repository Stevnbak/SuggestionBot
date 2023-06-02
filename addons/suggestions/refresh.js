const {StorageManager, Console, ExportManager, CommandManager, ChatResponder, Client, BotListeners} = Bot;
const Discord = require("discord.js");

const {UpdateEmbed} = require("./functions.js");

CommandManager.add(
	"refresh",
	{
		description: "Updates all suggestion embeds with newest design and data",
		category: "Suggestions",
		permissions: [Discord.PermissionFlagsBits.BanMembers]
	},
	async (interaction) => {
		let startTime = process.uptime();
		interaction.reply({embeds: [new Discord.EmbedBuilder().setTitle("Starting to refresh all suggestion embeds.").setDescription("It can take a while to refresh everything, and there might be issues with voting while it's refreshing.").setColor(CommandManager.neutralColor)], ephemeral: true});
		Console.log("Starting to refresh all suggestion embeds", interaction.guild.id);

		//Refresh suggestion embeds on bot start
		let suggestions = await StorageManager.suggestionStorage.find({serverId: interaction.guild.id});
		if (!suggestions) return;
		/** @type {import('discord.js').TextChannel} */ let channel = await interaction.guild.channels.fetch(await StorageManager.get("suggestionChannel", interaction.guild.id));
		if (!channel) return;

		//Update each suggestion
		for (let suggestion of [...suggestions]) {
			//Refresh message and suggestion data
			let message = await channel.messages.fetch(suggestion.messageId);
			let suggestionData = StorageManager.getSuggestion(suggestion.messageId, interaction.guild.id);

			if (message) {
				//Update embed if message is found
				await UpdateEmbed(message, suggestionData.positiveVotes, suggestion.neutralVotes, suggestionData.negativeVotes);
			} else {
				//Delete suggestion if message is not found
				///suggestions = suggestions.filter((s) => s.messageId != suggestionData.messageId);
				///StorageManager.set("suggestions", suggestions, interaction.guild.id);
			}
		}
		//Log completion
		interaction.followUp({
			embeds: [
				new Discord.EmbedBuilder()
					.setTitle("Done refreshing suggestion embeds")
					.setDescription(`Total time: ${Math.round((process.uptime() - startTime) * 1000) / 1000} seconds`)
					.setColor(CommandManager.successColor)
			],
			ephemeral: true
		});
		Console.log(`Refreshed all suggestion embeds in ${Math.round((process.uptime() - startTime) * 1000)} milliseconds`, interaction.guild.id);
	}
);
