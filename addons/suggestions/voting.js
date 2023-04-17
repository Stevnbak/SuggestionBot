const {StorageManager, Console, ExportManager, CommandManager, ChatResponder, Client, BotListeners} = Bot;
const {EmbedBuilder, PermissionsBitField, ApplicationCommandOptionType, ApplicationCommandType, ChannelType} = require("discord.js");
const Discord = require("discord.js");

//Vote button
BotListeners.on("interactionCreate", async (/** @type {import('discord.js').ButtonInteraction} */ interaction) => {
	if (!interaction.isButton()) return;
	if (!interaction.customId.includes("Vote")) return;

	let vote = interaction.customId == "positiveVote" ? 1 : interaction.customId == "negativeVote" ? -1 : 0;

	let message = await interaction.message.fetch();
	let embed = message.embeds[0];
	let fields = embed.fields;

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

	//Create new embed and update message
	let newEmbed = new Discord.EmbedBuilder(embed);
	if (suggestion.score > 20) newEmbed.setColor(CommandManager.successColor);
	else if (suggestion.score < -20) newEmbed.setColor(CommandManager.failColor);
	else newEmbed.setColor(CommandManager.neutralColor);

	//Update embed
	message.edit({embeds: [newEmbed]});

	//Update storage
	suggestion.votes[interaction.user.id] = vote;
	suggestions[suggestions.findIndex((suggestion) => suggestion.messageId == message.id)] = suggestion;
	StorageManager.set("suggestions", suggestions, interaction.guild.id);

	//Interaction reply
	interaction.reply({embeds: [new Discord.EmbedBuilder().setTitle("Vote for " + interaction.customId.replace("Vote", "") + " received successfully").setColor(CommandManager.successColor)], ephemeral: true});
});

//Delete button event
BotListeners.on("interactionCreate", async (/** @type {import('discord.js').ButtonInteraction} */ interaction) => {
	if (!interaction.isButton()) return;
	if (interaction.customId != "deleteSuggestion") return;

	let message = await interaction.message.fetch();

	//Get suggestion info from storage
	let suggestions = StorageManager.get("suggestions", interaction.guild.id) || [];
	let suggestion = suggestions.find((suggestion) => suggestion.messageId == message.id);
	if (!suggestion) {
		await sendError(interaction, "Suggestion not found in database");
		return;
	}

	//Check if user has permission to delete
	let member = await interaction.guild.members.fetch(interaction.user.id);
	if (!member.permissionsIn(message.channel).has(PermissionsBitField.Flags.ManageMessages) && member.id != suggestion.authorId) {
		await sendError(interaction, "You do not have permission to delete this suggestion");
		return;
	}

	//Delete suggestion
	message.delete();
	suggestions = suggestions.filter((s) => s.messageId != message.id);

	//Update storage
	StorageManager.set("suggestions", suggestions, interaction.guild.id);

	//Interaction reply
	interaction.reply({embeds: [new Discord.EmbedBuilder().setTitle('Deleted the suggestion with the title "' + suggestion.title + '" successfully').setColor(CommandManager.successColor)], ephemeral: true});
});

async function sendError(interaction, error) {
	await interaction.reply({embeds: [new Discord.EmbedBuilder().setTitle(error).setColor(CommandManager.failColor)], ephemeral: true});
}
