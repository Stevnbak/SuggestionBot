const {StorageManager, Console, ExportManager, CommandManager, ChatResponder, Client, BotListeners} = Bot;
const {EmbedBuilder, PermissionsBitField, ApplicationCommandOptionType, ApplicationCommandType, ChannelType} = require("discord.js");
const Discord = require("discord.js");

const {UpdateEmbed, SendError} = require("./functions.js");

//Vote button
BotListeners.on("interactionCreate", async (/** @type {import('discord.js').ButtonInteraction} */ interaction) => {
	if (!interaction.isButton()) return;
	if (!interaction.customId.includes("Vote")) return;

	interaction.deferReply({ephemeral: true});

	let vote = interaction.customId == "positiveVote" ? 1 : interaction.customId == "negativeVote" ? -1 : interaction.customId == "neutralVote" ? 0 : null;

	let message = await interaction.message.fetch();

	//Get suggestion info from storage
	let suggestion = await StorageManager.getSuggestion(message.id, interaction.guild.id);
	if (!suggestion) {
		await SendError(interaction, "Suggestion not found in database");
		return;
	}
	//Check if user has already voted
	suggestion.votes = suggestion.votes || {};
	let changedVote = false;
	if (Object.keys(suggestion.votes).includes(interaction.user.id)) {
		changedVote = true;
		let oldVote = suggestion.votes[interaction.user.id];
		if (oldVote == vote) {
			await SendError(interaction, "You have already voted this way");
			return;
		}
		if (oldVote == 1) suggestion.positiveVotes--;
		else if (oldVote == -1) suggestion.negativeVotes--;
		else if (oldVote == 0) suggestion.neutralVotes--;
	} else {
		if (vote == null) {
			await SendError(interaction, "You have not voted on this suggestion yet");
			return;
		}
	}

	//Update votes
	if (vote == 1) suggestion.positiveVotes++;
	else if (vote == -1) suggestion.negativeVotes++;
	else if (vote == 0) suggestion.neutralVotes++;

	//Update embed
	UpdateEmbed(message, suggestion.positiveVotes, suggestion.neutralVotes, suggestion.negativeVotes);

	//Update storage
	if (vote != null) suggestion.votes[interaction.user.id] = vote;
	else delete suggestion.votes[interaction.user.id];
	await StorageManager.updateSuggestion(message.id, suggestion, interaction.guild.id);

	//Interaction reply
	let reply;
	let consoleReply;
	if (vote != null && changedVote) {
		reply = `Your vote for suggestion "${suggestion.title}"  has been successfully changed to ${interaction.customId.replace("Vote", "")}`;
		consoleReply = `${interaction.user.tag} changed their vote on suggestion "${suggestion.title}" to ${vote == 1 ? "positive" : vote == -1 ? "negative" : "neutral"}`;
	} else if (vote != null) {
		reply = `Your ${interaction.customId.replace("Vote", "")} vote for suggestion "${suggestion.title}" has been recieved successfully`;
		consoleReply = `${interaction.user.tag} voted ${vote == 1 ? "positive" : vote == -1 ? "negative" : "neutral"} on suggestion "${suggestion.title}"`;
	} else {
		reply = `Your vote for suggestion "${suggestion.title}" has been successfully removed`;
		consoleReply = `${interaction.user.tag} removed their vote on suggestion "${suggestion.title}"`;
	}

	interaction.deleteReply();

	///interaction.reply({embeds: [new Discord.EmbedBuilder().setTitle(reply).setColor(CommandManager.successColor)], ephemeral: true});
	Console.log(consoleReply, interaction.guild.id);
});

//Delete button event
BotListeners.on("interactionCreate", async (/** @type {import('discord.js').ButtonInteraction} */ interaction) => {
	if (!interaction.isButton()) return;
	if (interaction.customId != "deleteSuggestion") return;

	let message = await interaction.message.fetch();

	//Get suggestion info from storage
	let suggestion = StorageManager.getSuggestion(message.id, interaction.guild.id);
	if (!suggestion) {
		await SendError(interaction, "Suggestion not found in database");
		return;
	}

	//Check if user has permission to delete
	let member = await interaction.guild.members.fetch(interaction.user.id);
	if (!member.permissionsIn(message.channel).has(PermissionsBitField.Flags.ManageMessages) && member.id != suggestion.authorId) {
		await SendError(interaction, "You do not have permission to delete this suggestion");
		return;
	}

	//Delete suggestion
	message.delete();
	StorageManager.deleteSuggestion(message.id, interaction.guild.id);

	//Update storage
	StorageManager.updateSuggestion(message.id, suggestion, interaction.guild.id);

	//Interaction reply
	interaction.reply({embeds: [new Discord.EmbedBuilder().setTitle('Deleted the suggestion with the title "' + suggestion.title + '" successfully').setColor(CommandManager.successColor)], ephemeral: true});
});
