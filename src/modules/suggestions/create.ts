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
import client from "../../client";
import { addSuggestion, getServer } from "../../database";
import { ObjectId } from "mongodb";

//Interaction chat event
addCommand(
    "create",
    {
        description: "Create suggestion button embed",
        category: "Suggestions",
        permissions: new PermissionsBitField(PermissionsBitField.Flags.Administrator),
        type: ApplicationCommandType.ChatInput,
        options: [
            {
                name: "channel",
                description: "suggestion channel (if different from default)",
                type: ApplicationCommandOptionType.Channel,
                required: false,
                channelTypes: [ChannelType.GuildText]
            }
        ]
    },
    async (interaction: ChatInputCommandInteraction) => {
        //Create embed
        const embed = new EmbedBuilder().setTitle("Make a suggestion").setDescription("Press the create button to make your suggestion.").setColor(neutralColor);
        let channelId = interaction.options.getChannel("channel")?.id;
        //Create buttons
        const button = new ButtonBuilder()
            .setStyle(ButtonStyle.Success)
            .setLabel("Create Suggestion")
            .setCustomId("createSuggestionButton" + (channelId ? `-${channelId}` : ""));

        //Send interaction
        interaction.channel!.send({
            embeds: [embed],
            components: [new ActionRowBuilder<ButtonBuilder>().addComponents([button])]
        });
        interaction.reply({ content: "Button menu created", ephemeral: true });
    }
);

//Button event
client.on("interactionCreate", async (interaction: Interaction) => {
    try {
        if (!interaction.isButton() || !interaction.guild) return;
        //Handle create button click
        if (interaction.customId.startsWith("createSuggestionButton")) {
            //Check if member can create suggestion
            if (!(await CanMemberCreateSuggestion(interaction.member as GuildMember))) {
                return await SendError(interaction, "You cannot create a suggestion at this time.");
            }

            //Get channel
            let serverSettings = await getServer(interaction.guild.id);
            console.log(serverSettings);
            let channelID = serverSettings?.defaultChannel;
            if (interaction.customId.includes("-")) {
                channelID = interaction.customId.split("-")[1];
            }
            console.log(channelID);
            if (!channelID || !(await interaction.guild.channels.fetch(channelID))) {
                return await SendError(interaction, "No suggestion channel found. Please contact the server owner.");
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
                .setCustomId("suggestionForm-" + channelID)
                .setComponents([
                    new ActionRowBuilder<TextInputBuilder>().addComponents(playerInput),
                    new ActionRowBuilder<TextInputBuilder>().addComponents(descriptionInput),
                    new ActionRowBuilder<TextInputBuilder>().addComponents(imageInput)
                ]);
            interaction.showModal(modal);
        }
    } catch (err) {
        logger.log("critical", err);
        try {
            if (interaction.isRepliable())
                interaction
                    .reply({
                        embeds: [new EmbedBuilder().setDescription("An error has occurred while running this command! It has been reported to the developer!").setColor(0xff0000)],
                        ephemeral: true
                    })
                    .catch(() => {});
        } catch {}
    }
});

//Modal event
client.on("interactionCreate", async (interaction: Interaction) => {
    try {
        if (!interaction.isModalSubmit()) return;
        if (interaction.guild == null) return;
        if (!interaction.customId.startsWith("suggestionForm")) return;

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
        let channelID = interaction.customId.split("-")[1] ?? "";
        console.log(channelID);
        let channel = (await interaction.guild.channels.fetch(channelID)) as TextChannel;
        if (!channel) {
            return SendError(interaction, "The suggestion channel has not been set up yet. Please contact the server owner.");
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
        logger.info(`${interaction.user.tag} created suggestion "${title}", in the server ${interaction.guild.id}`);
    } catch (err) {
        logger.log("critical", err);
        try {
            if (interaction.isRepliable())
                interaction
                    .reply({
                        embeds: [new EmbedBuilder().setDescription("An error has occurred while running this command! It has been reported to the developer!").setColor(0xff0000)],
                        ephemeral: true
                    })
                    .catch(() => {});
        } catch {}
    }
});
