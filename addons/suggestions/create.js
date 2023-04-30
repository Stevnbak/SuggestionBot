const {StorageManager, Console, ExportManager, CommandManager, ChatResponder, Client, BotListeners} = Bot;
const {EmbedBuilder, PermissionsBitField, ApplicationCommandOptionType, ApplicationCommandType, ChannelType} = require("discord.js");
const Discord = require("discord.js");

const {SendError, CanMemberCreateSuggestion} = require("./functions.js");

//Interaction chat event
CommandManager.add(
	"create",
	{
		description: "Create suggestion button embed",
		category: "Suggestions",
		permissions: PermissionsBitField.Flags.Administrator,
		type: ApplicationCommandType.ChatInput
	},
	async (/** @type {import('discord.js').ChatInputCommandInteraction} */ interaction) => {
		//Create embed
		const embed = new Discord.EmbedBuilder().setTitle("Make a suggestion").setDescription("Press the create button to make your suggestion.").setColor(CommandManager.neutralColor);
		//Create buttons
		const button = new Discord.ButtonBuilder().setStyle(Discord.ButtonStyle.Success).setLabel("Create Suggestion").setCustomId("createSuggestionButton");

		//Send interaction
		interaction.channel.send({
			embeds: [embed],
			components: [new Discord.ActionRowBuilder().addComponents([button])]
		});
		interaction.reply({content: "Button menu created", ephemeral: true});
	}
);

//Button & Modal events
BotListeners.on("interactionCreate", async (/** @type {import('discord.js').ButtonInteraction} */ interaction) => {
	if (!interaction.isButton()) return;
	//Handle create button click
	if (interaction.customId === "createSuggestionButton") {
		//Check if member can create suggestion
		if (!(await CanMemberCreateSuggestion(interaction.member))) {
			await SendError(interaction, "You cannot create a suggestion at this time.");
			return;
		}

		//Create input fields
		const playerInput = new Discord.TextInputBuilder().setCustomId("title").setLabel("Title of your suggestion").setStyle(Discord.TextInputStyle.Short).setMaxLength(100).setRequired(true);
		const descriptionInput = new Discord.TextInputBuilder().setCustomId("suggestion").setLabel("Describe the suggestion in great detail").setStyle(Discord.TextInputStyle.Paragraph).setMinLength(50).setMaxLength(1000).setRequired(true);
		const imageInput = new Discord.TextInputBuilder().setCustomId("image").setLabel("Image link").setPlaceholder("Direct link to an image").setStyle(Discord.TextInputStyle.Short).setRequired(false);

		//Create modal
		const modal = new Discord.ModalBuilder()
			.setTitle("Create a suggestion")
			.setCustomId("suggestionForm")
			.setComponents([new Discord.ActionRowBuilder().addComponents(playerInput), new Discord.ActionRowBuilder().addComponents(descriptionInput), new Discord.ActionRowBuilder().addComponents(imageInput)]);
		interaction.showModal(modal);
	}
});

//Modal event
BotListeners.on("interactionCreate", async (/** @type {import('discord.js').ModalSubmitInteraction} */ interaction) => {
	if (!interaction.isModalSubmit()) return;
	if (interaction.customId != "suggestionForm") return;

	//Check if member can create suggestion
	if (!(await CanMemberCreateSuggestion(interaction.member))) {
		await SendError(interaction, "You cannot create a suggestion at this time.");
		return;
	}

	//Get report information
	let title = interaction.fields.getTextInputValue("title");
	let description = interaction.fields.getTextInputValue("suggestion");
	let image = interaction.fields.getTextInputValue("image") || "None";

	//Log channel
	let channelID = StorageManager.get("suggestionChannel", interaction.guild.id);
	if (channelID == null) {
		SendError(interaction, "The suggestion channel has not been set up yet. Please contact the server owner.");
		return;
	}
	/** @type {import('discord.js').TextChannel} */ let channel = await interaction.guild.channels.fetch(channelID);
	if (channel == null) {
		SendError(interaction, "The suggestion channel has not been set up yet. Please contact the server owner.");
		return;
	}

	//Embed
	let embed = new Discord.EmbedBuilder()
		.setTitle(title)
		.setColor(CommandManager.neutralColor)
		.setAuthor({name: interaction.user.tag, iconURL: interaction.user.avatarURL()})
		.setTimestamp()
		.setDescription(description)
		.addFields([
			{name: "Score", value: "0", inline: false},
			{name: "Positive Votes", value: "0 - 0%", inline: true},
			{name: "Neutral Votes", value: "0 - 0%", inline: true},
			{name: "Negative Votes", value: "0 - 0%", inline: true}
		]);
	if (image != "None") embed.setImage(image);

	//Create buttons
	const positiveButton = new Discord.ButtonBuilder().setStyle(Discord.ButtonStyle.Success).setLabel("I agree - (0)").setCustomId("positiveVote");
	const neutralButton = new Discord.ButtonBuilder().setStyle(Discord.ButtonStyle.Primary).setLabel("I'm not sure - (0)").setCustomId("neutralVote");
	const negativeButton = new Discord.ButtonBuilder().setStyle(Discord.ButtonStyle.Danger).setLabel("I disagree - (0)").setCustomId("negativeVote");
	const deleteButton = new Discord.ButtonBuilder().setStyle(Discord.ButtonStyle.Secondary).setLabel("Delete").setCustomId("deleteSuggestion");
	const resetButton = new Discord.ButtonBuilder().setStyle(Discord.ButtonStyle.Secondary).setLabel("Reset vote").setCustomId("resetVote");

	//Send message
	let message = await channel.send({
		embeds: [embed],
		components: [new Discord.ActionRowBuilder().addComponents([positiveButton, neutralButton, negativeButton, deleteButton])]
	});

	//Add to storage
	let suggestions = StorageManager.get("suggestions", interaction.guild.id) || [];
	suggestions.push({
		messageId: message.id,
		authorId: interaction.user.id,
		title: title,
		description: description,
		image: image,
		score: 0,
		positiveVotes: 0,
		neutralVotes: 0,
		negativeVotes: 0
	});
	StorageManager.set("suggestions", suggestions, interaction.guild.id);

	//Reply
	await interaction.reply({
		embeds: [new Discord.EmbedBuilder().setTitle(`Suggestion "${title}" received successfully`).setColor(CommandManager.successColor)],
		ephemeral: true
	});
	Console.log(`${interaction.user.tag} created suggestion "${title}"`, interaction.guild.id);
});
