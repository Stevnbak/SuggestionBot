import { EmbedBuilder, PermissionsBitField, ApplicationCommandOptionType, ApplicationCommandType, ChannelType, ButtonInteraction, GuildChannel, TextChannel, DMChannel, Interaction } from "discord.js";
const { UpdateEmbed, SendError } = require("./functions.js");
import { logger } from "../../logger";
import { addCommand, neutralColor, successColor, failColor } from "../../commands";
import client from "../../client";
import { getSuggestion, removeSuggestion, updateSuggestion } from "../../database";

//Vote button
client.on("interactionCreate", async (interaction: Interaction) => {
    try {
        if (!interaction.isButton()) return;
        if (interaction.guild == null) return;
        if (!interaction.customId.includes("Vote")) return;
        interaction.deferReply({ ephemeral: true });
        let vote = interaction.customId == "positiveVote" ? 1 : interaction.customId == "negativeVote" ? -1 : interaction.customId == "neutralVote" ? 0 : (null as -1 | 0 | 1 | null);
        let message = await interaction.message.fetch();
        //Get suggestion info from storage
        let suggestion = await getSuggestion(message.id);
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
        await updateSuggestion(suggestion._id, suggestion);
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
        logger.info(consoleReply, interaction.guild.id);
    } catch (err) {
        logger.log("critical", err);
    }
});

//Delete button event
client.on("interactionCreate", async (interaction: Interaction) => {
    try {
        if (!interaction.isButton()) return;
        if (interaction.guild == null) return;
        if (interaction.customId != "deleteSuggestion") return;

        let message = await interaction.message.fetch();
        if (message.channel.type === ChannelType.DM) return;
        //Get suggestion info from storage
        let suggestion = await getSuggestion(message.id);
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
        await removeSuggestion(suggestion._id);

        //Interaction reply
        interaction.reply({
            embeds: [new EmbedBuilder().setTitle('Deleted the suggestion with the title "' + suggestion.title + '" successfully').setColor(successColor)],
            ephemeral: true
        });
    } catch (err) {
        logger.log("critical", err);
    }
});
