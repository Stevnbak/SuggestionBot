const {StorageManager, Console, ExportManager, CommandManager, ChatResponder, Client, BotListeners} = Bot;
const {EmbedBuilder, PermissionsBitField, ApplicationCommandOptionType, ApplicationCommandType, ChannelType} = require("discord.js");
const Discord = require("discord.js");

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
		//Create input fields
		const playerInput = new Discord.TextInputBuilder().setCustomId("title").setLabel("Title of your suggestion").setStyle(Discord.TextInputStyle.Short).setMaxLength(100).setRequired(true);
		const descriptionInput = new Discord.TextInputBuilder().setCustomId("suggestion").setLabel("Describe the suggestion in great detail").setStyle(Discord.TextInputStyle.Paragraph).setMinLength(50).setMaxLength(1000).setRequired(true);
		const imageInput = new Discord.TextInputBuilder().setCustomId("image").setLabel("Image link").setPlaceholder("Direct link to an image").setStyle(Discord.TextInputStyle.Short).setRequired(false);

		//Create modal
		const modal = new Discord.ModalBuilder()
			.setTitle("Create a suggestion")
			.setCustomId("suggestionForm")
			.setComponents([new Discord.ActionRowBuilder().addComponents(playerInput), new Discord.ActionRowBuilder().addComponents(descriptionInput), new Discord.ActionRowBuilder().addComponents(imageInput)]);

		//Send modal
		interaction.id;
		interaction.showModal(modal);
		interaction
			.awaitModalSubmit({filter: (/** @type {import('discord.js').ModalSubmitInteraction} */ inter) => inter.isModalSubmit() && inter.customId == "suggestionForm" && inter.user == interaction.user, time: 5 * 60 * 1000})
			.then(async (/** @type {import('discord.js').ModalSubmitInteraction} */ modalInteraction) => {
				//Get report information
				let title = modalInteraction.fields.getTextInputValue("title");
				let description = modalInteraction.fields.getTextInputValue("suggestion");
				let image = modalInteraction.fields.getTextInputValue("image") || "None";

				//Log channel
				let channelID = StorageManager.get("suggestionChannel", modalInteraction.guild.id);
				if (channelID == null) {
					await interaction.reply({content: "The suggestion channel has not been set up yet. Please contact the server owner.", ephemeral: true});
					return;
				}
				/** @type {import('discord.js').TextChannel} */ let channel = await interaction.guild.channels.fetch(channelID);
				if (channel == null) {
					await sendError(modalInteraction, "The suggestion channel has not been set up yet. Please contact the server owner.");
					return;
				}

				//Embed
				let embed = new Discord.EmbedBuilder()
					.setTitle(title)
					.setColor(CommandManager.neutralColor)
					.setAuthor({name: modalInteraction.user.tag, iconURL: interaction.user.avatarURL()})
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
				const positiveButton = new Discord.ButtonBuilder().setStyle(Discord.ButtonStyle.Success).setLabel("👍").setCustomId("positiveVote");
				const neutralButton = new Discord.ButtonBuilder().setStyle(Discord.ButtonStyle.Primary).setLabel("🤷").setCustomId("neutralVote");
				const negativeButton = new Discord.ButtonBuilder().setStyle(Discord.ButtonStyle.Danger).setLabel("👎").setCustomId("negativeVote");

				//Send message
				let message = await channel.send({
					embeds: [embed],
					components: [new Discord.ActionRowBuilder().addComponents([positiveButton, neutralButton, negativeButton])]
				});

				//Add to storage
				let suggestions = StorageManager.get("suggestions", modalInteraction.guild.id) || [];
				suggestions.push({
					messageId: message.id,
					authorId: modalInteraction.user.id,
					title: title,
					description: description,
					image: image,
					score: 0,
					positiveVotes: 0,
					neutralVotes: 0,
					negativeVotes: 0
				});
				StorageManager.set("suggestions", suggestions, modalInteraction.guild.id);

				//Reply
				await modalInteraction.reply({
					embeds: [new Discord.EmbedBuilder().setTitle("Suggestion received successfully").setColor(CommandManager.successColor)],
					ephemeral: true
				});
			})
			.catch((error) => {
				console.error(error);
			});
	}
});

async function sendError(interaction, error) {
	await interaction.reply({embeds: [new Discord.EmbedBuilder().setTitle(error).setColor(CommandManager.failColor)], ephemeral: true});
}
