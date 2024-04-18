import {
    ButtonBuilder,
    EmbedBuilder,
    EmbedField,
    ButtonStyle,
    ActionRowBuilder,
    GuildMember,
    ButtonInteraction,
    Message,
    Embed,
    ActionRow,
    ActionRowData,
    MessageActionRowComponent,
    ButtonComponent,
    Interaction,
    ModalSubmitInteraction,
    ChatInputCommandInteraction
} from "discord.js";
import { logger } from "../../logger";
import { neutralColor, successColor, failColor } from "../../commands";
import { getServer } from "../../database";

export async function UpdateEmbed(message: Message, positiveVotes: number, neutralVotes: number, negativeVotes: number) {
    if (message.guild == null) return;
    let embed = message.embeds[0];
    let fields = embed.fields as EmbedField[];

    //Calculate score
    let score = positiveVotes - negativeVotes;
    let scoreField = fields.find((field) => field.name == "Score");
    scoreField!.value = score + "";

    //Update fields
    let totalVotes = positiveVotes + negativeVotes + neutralVotes;
    let positiveField = fields.find((field) => field.name == "Positive Votes");
    let negativeField = fields.find((field) => field.name == "Negative Votes");
    let neutralField = fields.find((field) => field.name == "Neutral Votes");
    positiveField!.value = `${positiveVotes} - ${totalVotes == 0 ? 0 : Math.round((positiveVotes / totalVotes) * 100 * 100) / 100}%`;
    negativeField!.value = `${negativeVotes} - ${totalVotes == 0 ? 0 : Math.round((negativeVotes / totalVotes) * 100 * 100) / 100}%`;
    neutralField!.value = `${neutralVotes} - ${totalVotes == 0 ? 0 : Math.round((neutralVotes / totalVotes) * 100 * 100) / 100}%`;

    //Create new embed
    let newEmbed = new EmbedBuilder(embed.data);

    //Embed colour
    newEmbed.setColor(GetColor(score));

    //Create new buttons
    const positiveButton = new ButtonBuilder().setStyle(ButtonStyle.Success).setLabel(`I agree - (${positiveVotes})`).setCustomId("positiveVote");
    const neutralButton = new ButtonBuilder().setStyle(ButtonStyle.Primary).setLabel(`I'm not sure - (${neutralVotes})`).setCustomId("neutralVote");
    const negativeButton = new ButtonBuilder().setStyle(ButtonStyle.Danger).setLabel(`I disagree - (${negativeVotes})`).setCustomId("negativeVote");
    const deleteButton = new ButtonBuilder().setStyle(ButtonStyle.Secondary).setLabel("Delete").setCustomId("deleteSuggestion");

    //Update embed
    try {
        await message.edit({ embeds: [newEmbed], components: [new ActionRowBuilder<ButtonBuilder>().addComponents([positiveButton, neutralButton, negativeButton, deleteButton])] });
    } catch (error) {
        logger.error(`Failed to update suggestion embed for suggestion "${embed.title}", in the server ${message.guild.id}`);
        return;
    }

    //Color from score
    function GetColor(score: number) {
        if (score >= 20) return successColor;
        else if (score <= -20) return failColor;
        else return neutralColor;
    }
    /**function GetColor(score) {
		let start = 125;
		let max = 255;
		let step = Math.round((max / 50) * Math.abs(score));
		//Create rgb values
		let primary = start + step;
		let secondary = start - step;
		if (primary > max) primary = max;
		if (secondary < 0) secondary = 0;
		//Set rgb values
		if (score > 0) {
			r = secondary;
			g = primary;
			b = secondary;
		} else if (score < 0) {
			r = primary;
			g = secondary;
			b = secondary;
		} else {
			r = start;
			g = start;
			b = start;
		}
		//Convert to hex
		let hexColour = numberToHex(r) + numberToHex(g) + numberToHex(b);
		function numberToHex(number) {
			let hex = number.toString(16);
			while (hex.length < 2) hex = "0" + hex;
			return hex;
		}
		while (hexColour.length < 6) hexColour += "0";
		hexColour.length = 6;

		//Return hex
		return hexColour;
	}*/
}

export async function CanMemberCreateSuggestion(member: GuildMember) {
    let guild = member.guild;
    let updatedMember = await member.fetch();
    //Timed out
    if (updatedMember.communicationDisabledUntil != null) {
        if (updatedMember.communicationDisabledUntil > new Date()) {
            logger.info(`Blocked suggestion from user with name ${updatedMember.user.username} because of a timeout., in the server ${guild.id}`);
            return false;
        }
    }
    let serverSettings = await getServer(guild.id);
    //Ignore roles
    let ignoreRoles = serverSettings?.ignoredRoles ?? [];
    let userRoles = updatedMember.roles.cache.map((role) => role.id);
    if (ignoreRoles.some((roleId) => userRoles.includes(roleId))) {
        logger.info(`Blocked suggestion from user with name ${updatedMember.user.username} because of an ignored role, in the server ${guild.id}`);
        return false;
    }

    //Ignore users
    let ignoreUsers = serverSettings?.ignoredUsers ?? [];
    if (ignoreUsers.includes(updatedMember.id)) {
        logger.info(`Blocked suggestion from ignored user with name ${updatedMember.user.username}, in the server ${guild.id}`);
        return false;
    }

    //Allowed
    return true;
}

export async function SendError(interaction: ButtonInteraction | ModalSubmitInteraction | ChatInputCommandInteraction, error: string) {
    try {
        await interaction.reply({ embeds: [new EmbedBuilder().setTitle(error).setColor(failColor)], ephemeral: true });
    } catch (e) {
        try {
            await interaction.followUp({ embeds: [new EmbedBuilder().setTitle(error).setColor(failColor)], ephemeral: true });
        } catch (e) {
            try {
                await interaction.editReply({ embeds: [new EmbedBuilder().setTitle(error).setColor(failColor)] });
            } catch (e) {
                logger.error(`Failed to send error message to user, in the server ${interaction.guild?.id}`);
            }
        }
    }
}
