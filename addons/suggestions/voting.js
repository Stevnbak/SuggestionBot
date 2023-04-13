const {StorageManager, Console, ExportManager, CommandManager, ChatResponder, Client, BotListeners} = Bot;
const {EmbedBuilder, PermissionsBitField, ApplicationCommandOptionType, ApplicationCommandType, ChannelType} = require("discord.js");
const Discord = require("discord.js");

//Button & Modal events
BotListeners.on("interactionCreate", async (/** @type {import('discord.js').ButtonInteraction} */ interaction) => {
	if (!interaction.isButton()) return;
	if (!interaction.customId.includes("Vote")) return;

	let vote = interaction.customId == "positiveVote" ? 1 : interaction.customId == "negativeVote" ? -1 : 0;

	let message = await interaction.message.fetch();
	let fields = message.embeds[0].fields;

	//Get suggestion info from storage
	let suggestions = StorageManager.get("suggestions", interaction.guild.id) || [];
	let suggestion = suggestions.find((suggestion) => suggestion.messageId == message.id);
	if (!suggestion) {
		await sendError(interaction, "Suggestion not found in database");
		return;
	}
	//Check if user has already voted
	suggestion.votes = suggestion.votes || {};
	let changedVote = false;
	if (Object.keys(suggestion.votes).includes(interaction.user.id)) {
		changedVote = true;
		let oldVote = suggestion.votes[interaction.user.id];
		if (oldVote == vote) {
			await sendError(interaction, "You have already voted this way");
			return;
		}
		if (oldVote == 1) suggestion.positiveVotes--;
		else if (oldVote == -1) suggestion.negativeVotes--;
		else if (oldVote == 0) suggestion.neutralVotes--;
		suggestion.score -= oldVote;
	}

	//Update score
	suggestion.score += vote;
	let scoreField = fields.find((field) => field.name == "Score");
	scoreField.value = suggestion.score;

	//Update votes
	if (vote == 1) suggestion.positiveVotes++;
	else if (vote == -1) suggestion.negativeVotes++;
	else if (vote == 0) suggestion.neutralVotes++;
	let totalVotes = suggestion.positiveVotes + suggestion.negativeVotes + suggestion.neutralVotes;

	//Update fields
	let positiveField = fields.find((field) => field.name == "Positive Votes");
	let negativeField = fields.find((field) => field.name == "Negative Votes");
	let neutralField = fields.find((field) => field.name == "Neutral Votes");
	positiveField.value = `${suggestion.positiveVotes} - ${Math.round((suggestion.positiveVotes / totalVotes) * 100 * 100) / 100}%`;
	negativeField.value = `${suggestion.negativeVotes} - ${Math.round((suggestion.negativeVotes / totalVotes) * 100 * 100) / 100}%`;
	neutralField.value = `${suggestion.neutralVotes} - ${Math.round((suggestion.neutralVotes / totalVotes) * 100 * 100) / 100}%`;

	//Update embed
	message.edit({embeds: [message.embeds[0]]});

	//Update storage
	suggestion.votes[interaction.user.id] = vote;
	suggestions[suggestions.findIndex((suggestion) => suggestion.messageId == message.id)] = suggestion;
	StorageManager.set("suggestions", suggestions, interaction.guild.id);

	//Interaction reply
	interaction.reply({embeds: [new Discord.EmbedBuilder().setTitle("Vote recieved succesfully").setColor(CommandManager.successColor)], ephemeral: true});
});

async function sendError(interaction, error) {
	await interaction.reply({embeds: [new Discord.EmbedBuilder().setTitle(error).setColor(CommandManager.failColor)], ephemeral: true});
}
