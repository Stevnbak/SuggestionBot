const {StorageManager, Console, ExportManager, CommandManager, ChatResponder, Client, BotListeners} = Bot;
const Discord = require("discord.js");

async function UpdateEmbed(message, positiveVotes, neutralVotes, negativeVotes) {
	let embed = message.embeds[0];
	let fields = embed.fields;

	//Calculate score
	let score = positiveVotes - negativeVotes;
	let scoreField = fields.find((field) => field.name == "Score");
	scoreField.value = score;

	//Update fields
	let totalVotes = positiveVotes + negativeVotes + neutralVotes;
	let positiveField = fields.find((field) => field.name == "Positive Votes");
	let negativeField = fields.find((field) => field.name == "Negative Votes");
	let neutralField = fields.find((field) => field.name == "Neutral Votes");
	positiveField.value = `${positiveVotes} - ${totalVotes == 0 ? 0 : Math.round((positiveVotes / totalVotes) * 100 * 100) / 100}%`;
	negativeField.value = `${negativeVotes} - ${totalVotes == 0 ? 0 : Math.round((negativeVotes / totalVotes) * 100 * 100) / 100}%`;
	neutralField.value = `${neutralVotes} - ${totalVotes == 0 ? 0 : Math.round((neutralVotes / totalVotes) * 100 * 100) / 100}%`;

	//Create new embed
	let newEmbed = new Discord.EmbedBuilder(embed);

	//Embed colour
	newEmbed.setColor(GetColor(score));

	//Create new buttons
	const positiveButton = new Discord.ButtonBuilder().setStyle(Discord.ButtonStyle.Success).setLabel(`I agree - (${positiveVotes})`).setCustomId("positiveVote");
	const neutralButton = new Discord.ButtonBuilder().setStyle(Discord.ButtonStyle.Primary).setLabel(`I'm not sure - (${neutralVotes})`).setCustomId("neutralVote");
	const negativeButton = new Discord.ButtonBuilder().setStyle(Discord.ButtonStyle.Danger).setLabel(`I disagree - (${negativeVotes})`).setCustomId("negativeVote");
	const deleteButton = new Discord.ButtonBuilder().setStyle(Discord.ButtonStyle.Secondary).setLabel("Delete").setCustomId("deleteSuggestion");

	//Update embed
	try {
		await message.edit({embeds: [newEmbed], components: [new Discord.ActionRowBuilder().addComponents([positiveButton, neutralButton, negativeButton, deleteButton])]});
	} catch (error) {
		Console.error(`Failed to update suggestion embed for suggestion "${embed.title}"`, message.guild.id);
		return;
	}
	///Console.log(`Updated suggestion embed for suggestion "${embed.title}"`, message.guild.id);

	//Color from score
	function GetColor(score) {
		if (score >= 20) return CommandManager.successColor;
		else if (score <= -20) return CommandManager.failColor;
		else return CommandManager.neutralColor;
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

async function CanMemberCreateSuggestion(/** @type {import('discord.js').GuildMember} */ member) {
	let guild = member.guild;
	let updatedMember = await member.fetch();
	//Timed out
	if (updatedMember.communicationDisabledUntil != null) {
		if (updatedMember.communicationDisabledUntil > Date.now()) {
			Console.log("Blocked suggestion from user with name " + updatedMember.user.tag + " because of a timeout.", guild.id);
			return false;
		}
	}

	//Ignore roles
	let ignoreRoles = (await StorageManager.get("ignoredRoles", guild.id)) ?? [];
	let userRoles = updatedMember.roles.cache.map((role) => role.id);
	if (ignoreRoles.some((roleId) => userRoles.includes(roleId))) {
		Console.log("Blocked suggestion from user with name " + updatedMember.user.tag + " because of an ignored role.", guild.id);
		return false;
	}

	//Ignore users
	let ignoreUsers = (await StorageManager.get("ignoredUsers", guild.id)) ?? [];
	if (ignoreUsers.includes(updatedMember.id)) {
		Console.log("Blocked suggestion from ignored user with name " + updatedMember.user.tag, guild.id);
		return false;
	}

	//Allowed
	return true;
}

async function SendError(/** @type {import('discord.js').ButtonInteraction} */ interaction, error) {
	try {
		await interaction.reply({embeds: [new Discord.EmbedBuilder().setTitle(error).setColor(CommandManager.failColor)], ephemeral: true});
	} catch (e) {
		try {
			await interaction.followUp({embeds: [new Discord.EmbedBuilder().setTitle(error).setColor(CommandManager.failColor)], ephemeral: true});
		} catch (e) {
			try {
				await interaction.editReply({embeds: [new Discord.EmbedBuilder().setTitle(error).setColor(CommandManager.failColor)], ephemeral: true});
			} catch (e) {
				Console.error(`Failed to send error message to user`, interaction.guild.id);
			}
		}
	}
}

module.exports = {
	UpdateEmbed,
	SendError,
	CanMemberCreateSuggestion
};
