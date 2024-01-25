import { ChatInputCommandInteraction, TextChannel, PermissionFlagsBits, PermissionsBitField, EmbedBuilder } from "discord.js";
import { SendError, UpdateEmbed } from "./functions.js";
import { logger } from "../../logger";
import { addCommand, neutralColor, successColor, failColor } from "../../commands";
import { getAllSuggestions, getServer, getSuggestion } from "../../database.js";

addCommand(
    "refresh",
    {
        description: "Updates all suggestion embeds with newest design and data",
        category: "Suggestions",
        permissions: new PermissionsBitField(PermissionsBitField.Flags.BanMembers)
    },
    async (interaction: ChatInputCommandInteraction) => {
        if (interaction.guild == null) return;
        let startTime = process.uptime();
        interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setTitle("Starting to refresh all suggestion embeds.")
                    .setDescription("It can take a while to refresh everything, and there might be issues with voting while it's refreshing.")
                    .setColor(neutralColor)
            ],
            ephemeral: true
        });
        logger.info("Starting to refresh all suggestion embeds", interaction.guild.id);

        //Refresh suggestion embeds on bot start
        let suggestions = await getAllSuggestions(interaction.guild.id);
        if (!suggestions) return;
        let channel = (await interaction.guild.channels.fetch((await getServer(interaction.guild.id))?.defaultChannel ?? "")) as TextChannel;
        if (!channel) return;

        //Update each suggestion
        for (let suggestion of [...suggestions]) {
            //Refresh message and suggestion data
            let message = await channel.messages.fetch(suggestion.messageId);
            let suggestionData = await getSuggestion(suggestion.messageId);
            if (message && suggestionData) {
                //Update embed if message is found
                await UpdateEmbed(message, suggestionData.positiveVotes, suggestion.neutralVotes, suggestionData.negativeVotes);
            }
        }
        //Log completion
        interaction.followUp({
            embeds: [
                new EmbedBuilder()
                    .setTitle("Done refreshing suggestion embeds")
                    .setDescription(`Total time: ${Math.round((process.uptime() - startTime) * 1000) / 1000} seconds`)
                    .setColor(successColor)
            ],
            ephemeral: true
        });
        logger.info(`Refreshed all suggestion embeds in ${Math.round((process.uptime() - startTime) * 1000)} milliseconds`, interaction.guild.id);
    }
);
