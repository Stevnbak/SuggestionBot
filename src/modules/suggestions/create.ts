import {
    EmbedBuilder,
    PermissionsBitField,
    ApplicationCommandOptionType,
    ApplicationCommandType,
    ChannelType,
    ButtonInteraction,
    ChatInputCommandInteraction,
    ModalSubmitInteraction,
    TextChannel,
    GuildMember,
    ButtonStyle,
    ButtonBuilder,
    ActionRowBuilder,
    TextInputBuilder,
    TextInputStyle,
    ModalBuilder,
    Interaction,
    ActionRow
} from "discord.js";
import { SendError, CanMemberCreateSuggestion } from "./functions";
import { logger } from "../../logger";
import { addCommand, neutralColor, successColor, failColor } from "../../commands";
import { client } from "../../app";
import { addSuggestion, getServer } from "../../database";
import { ObjectId } from "mongodb";

//Interaction chat event
addCommand(
    "create",
    {
        description: "Create suggestion button embed",
        category: "Suggestions",
        permissions: new PermissionsBitField(PermissionsBitField.Flags.Administrator),
        type: ApplicationCommandType.ChatInput
    },
    async (interaction: ChatInputCommandInteraction) => {
        //Create embed
        const embed = new EmbedBuilder().setTitle("Make a suggestion").setDescription("Press the create button to make your suggestion.").setColor(neutralColor);
        //Create buttons
        const button = new ButtonBuilder().setStyle(ButtonStyle.Success).setLabel("Create Suggestion").setCustomId("createSuggestionButton");

        //Send interaction
        interaction.channel!.send({
            embeds: [embed],
            components: [new ActionRowBuilder<ButtonBuilder>().addComponents([button])]
        });
        interaction.reply({ content: "Button menu created", ephemeral: true });
    }
);

//Button & Modal events
client.on("interactionCreate", async (interaction: Interaction) => {
    if (!interaction.isButton()) return;
    //Handle create button click
    if (interaction.customId === "createSuggestionButton") {
        //Check if member can create suggestion
        if (!(await CanMemberCreateSuggestion(interaction.member as GuildMember))) {
            await SendError(interaction, "You cannot create a suggestion at this time.");
            return;
        }

        //Create input fields
        const playerInput = new TextInputBuilder().setCustomId("title").setLabel("Title of your suggestion").setStyle(TextInputStyle.Short).setMaxLength(100).setRequired(true);
        const descriptionInput = new TextInputBuilder()
            .setCustomId("suggestion")
            .setLabel("Describe the suggestion in great detail")
            .setStyle(TextInputStyle.Paragraph)
            .setMinLength(50)
            .setMaxLength(1000)
            .setRequired(true);
        const imageInput = new TextInputBuilder().setCustomId("image").setLabel("Image link").setPlaceholder("Direct link to an image").setStyle(TextInputStyle.Short).setRequired(false);

        //Create modal
        const modal = new ModalBuilder()
            .setTitle("Create a suggestion")
            .setCustomId("suggestionForm")
            .setComponents([
                new ActionRowBuilder<TextInputBuilder>().addComponents(playerInput),
                new ActionRowBuilder<TextInputBuilder>().addComponents(descriptionInput),
                new ActionRowBuilder<TextInputBuilder>().addComponents(imageInput)
            ]);
        interaction.showModal(modal);
    }
});

//Modal event
client.on("interactionCreate", async (interaction: Interaction) => {
    if (!interaction.isModalSubmit()) return;
    if (interaction.guild == null) return;
    if (interaction.customId != "suggestionForm") return;

    //Check if member can create suggestion
    if (!(await CanMemberCreateSuggestion(interaction.member as GuildMember))) {
        await SendError(interaction as ModalSubmitInteraction, "You cannot create a suggestion at this time.");
        return;
    }

    //Get report information
    let title = interaction.fields.getTextInputValue("title");
    let description = interaction.fields.getTextInputValue("suggestion");
    let image = interaction.fields.getTextInputValue("image") || "None";

    //Log channel
    let channelID = (await getServer(interaction.guild.id))?.defaultChannel;
    if (channelID == null) {
        SendError(interaction, "The suggestion channel has not been set up yet. Please contact the server owner.");
        return;
    }
    let channel = (await interaction.guild.channels.fetch(channelID)) as TextChannel;
    if (channel == null) {
        SendError(interaction, "The suggestion channel has not been set up yet. Please contact the server owner.");
        return;
    }

    //Embed
    let embed = new EmbedBuilder()
        .setTitle(title)
        .setColor(neutralColor)
        .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.avatarURL() ?? "" })
        .setTimestamp()
        .setDescription(description)
        .addFields([
            { name: "Score", value: "0", inline: false },
            { name: "Positive Votes", value: "0 - 0%", inline: true },
            { name: "Neutral Votes", value: "0 - 0%", inline: true },
            { name: "Negative Votes", value: "0 - 0%", inline: true }
        ]);
    if (image != "None") embed.setImage(image);

    //Create buttons
    const positiveButton = new ButtonBuilder().setStyle(ButtonStyle.Success).setLabel("I agree - (0)").setCustomId("positiveVote");
    const neutralButton = new ButtonBuilder().setStyle(ButtonStyle.Primary).setLabel("I'm not sure - (0)").setCustomId("neutralVote");
    const negativeButton = new ButtonBuilder().setStyle(ButtonStyle.Danger).setLabel("I disagree - (0)").setCustomId("negativeVote");
    const deleteButton = new ButtonBuilder().setStyle(ButtonStyle.Secondary).setLabel("Delete").setCustomId("deleteSuggestion");
    const resetButton = new ButtonBuilder().setStyle(ButtonStyle.Secondary).setLabel("Reset vote").setCustomId("resetVote");

    //Send message
    let message = await channel.send({
        embeds: [embed],
        components: [new ActionRowBuilder<ButtonBuilder>().addComponents([positiveButton, neutralButton, negativeButton, deleteButton])]
    });

    //Add to storage
    let suggestion = {
        _id: new ObjectId(),
        serverId: interaction.guild.id,
        messageId: message.id,
        authorId: interaction.user.id,
        title: title,
        description: description,
        image: image,
        score: 0,
        positiveVotes: 0,
        neutralVotes: 0,
        negativeVotes: 0,
        votes: {}
    };
    await addSuggestion(suggestion);

    //Reply
    await interaction.reply({
        embeds: [new EmbedBuilder().setTitle(`Suggestion "${title}" received successfully`).setColor(successColor)],
        ephemeral: true
    });
    logger.info(`${interaction.user.tag} created suggestion "${title}"`, interaction.guild.id);
});
