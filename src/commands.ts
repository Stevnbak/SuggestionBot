import {
    ApplicationCommand,
    ApplicationCommandData,
    ApplicationCommandDataResolvable,
    ApplicationCommandOption,
    ApplicationCommandResolvable,
    ApplicationCommandType,
    Channel,
    ChannelType,
    ChatInputCommandInteraction,
    Client,
    EmbedBuilder,
    Guild,
    GuildApplicationCommandManager,
    GuildChannel,
    Interaction,
    PermissionResolvable,
    PermissionsBitField,
    SlashCommandBuilder
} from "discord.js";

//Types
type Command = {
    command: string;
    options: CommandOptions;
    callback: Function;
};
type Responder = {
    word: string;
    options: ResponderOptions;
    callback: Function;
};
type CommandOptions = {
    description: string;
    category: string;
    aliases: string[];
    showInHelp: boolean;
    type: ApplicationCommandType;
    options: ApplicationCommandOption[];
    permissions: PermissionsBitField;
};
const defaultCommandOptions = {
    description: "No description provided.",
    category: "Uncategorized",
    options: [],
    aliases: [],
    showInHelp: true,
    type: ApplicationCommandType.ChatInput,
    permissions: new PermissionsBitField(PermissionsBitField.Flags.ViewChannel)
} as CommandOptions;
type ResponderOptions = {
    description: string;
    category: string;
    aliases: string[];
    showInHelp: boolean;
};
const defaultResponderOptions = {
    description: "No description provided.",
    category: "Uncategorized",
    aliases: [],
    showInHelp: true
} as ResponderOptions;
export const successColor = 0x239400;
export const failColor = 0x910f00;
export const neutralColor = 0x6e757d;

//Create commands & responders
const commands = [] as Command[];
const responders = [] as Responder[];
const discordCommandApplications = [] as Object[];
export function addCommand(command: string, options: Partial<CommandOptions>, callback: Function) {
    let completedOptions = { ...defaultCommandOptions, ...options };
    commands.push({ command, options: completedOptions, callback });
    let interaction: Object = {
        name: command,
        type: completedOptions.type,
        default_member_permissions: completedOptions.permissions,
        dm_permission: false,
        options: completedOptions.options
    };
    if (completedOptions.type == ApplicationCommandType.ChatInput) {
        interaction = { ...interaction, name: command.toLowerCase(), description: completedOptions.description ?? "" };
    }
    discordCommandApplications.push(interaction);
    //Aliases
    if (completedOptions.aliases && completedOptions.aliases.length > 0 && completedOptions.type == ApplicationCommandType.ChatInput) {
        for (let alias of completedOptions.aliases ?? []) {
            let aliasInteraction = { ...interaction, name: alias.toLocaleLowerCase() };
            discordCommandApplications.push(aliasInteraction);
        }
    }
}
export function addResponder(word: string, options: Partial<ResponderOptions>, callback: Function) {
    responders.push({ word, options: { ...defaultResponderOptions, ...options }, callback });
}

import { REST, Routes } from "discord.js";
import { logger } from "./logger";
export async function setupCommands(client: Client) {
    //Create help command
    addCommand(
        "help",
        { description: "List of all available commands", category: "Miscellaneous", aliases: ["commands"], type: ApplicationCommandType.ChatInput },
        async (interaction: ChatInputCommandInteraction) => {
            //Create basic embed
            const embed = new EmbedBuilder();
            embed.setTitle("Available Commands");
            embed.setDescription("Here is a list of all available slash commands with your permissions. \n*(User context menu commands are not listed here, right click a user to see those.)*");
            embed.setColor(neutralColor);
            let author = await client.users.fetch("307900989455859723");
            embed.setFooter({ text: "Bot made by " + author.globalName, iconURL: author.avatarURL() ?? "" });
            //Add commands
            let availableCommands = commands.filter((c) => c.options.showInHelp && interaction.memberPermissions?.has(c.options.permissions) && c.options.type == ApplicationCommandType.ChatInput);
            let fields = availableCommands ? [] : [{ name: "No commands available", value: " ", inline: false }];
            for (const category of availableCommands.map((c) => c.options.category).filter((value, index, array) => array.indexOf(value) === index)) {
                let commands = availableCommands.filter((c) => c.options.category == category);
                let value = commands ? "" : "No commands available";
                for (const command of commands) {
                    let name = command.command;
                    if (command.options.aliases.length > 0) {
                        name += ` (/${command.options.aliases.join(", /")})`;
                    }
                    value += `***/${name}** - ${command.options.description}*\n`;
                }
                fields.push({ name: `__**${category}:**__`, value: value, inline: false });
            }
            embed.addFields(fields);
            //Reply with embed
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    );
    logger.info("Created help command.");
    //Reload applications.
    try {
        const rest = new REST().setToken(process.env.TOKEN!);
        await rest.put(Routes.applicationCommands(process.env.CLIENT_ID!), {
            body: discordCommandApplications
        });
        logger.info("Reloaded application commands.");
    } catch (error) {
        logger.error(error);
    }

    //Activate commands & responders
    client.on("messageCreate", (message) => {
        //Filter out dms and other bots...
        if (message.channel.type === ChannelType.DM || message.author.bot || message.guild == null) return;
        //Check content
        const content = message.content.toLowerCase();
        for (const command of responders) {
            if (content.includes(command.word) || command.options.aliases.some((a) => content.includes(a))) {
                //Check if bot has the needed permissions
                if (!checkBotPermissions(message.channel as GuildChannel, message.guild)) {
                    logger.error("Bot permission error in guild with id: " + message.guild.id);
                    return;
                }
                //Run callback and catch errors
                try {
                    command.callback(message);
                } catch (error) {
                    message
                        .reply({
                            embeds: [new EmbedBuilder().setDescription("An error has occurred while running this command!\nIt has been reported to the developer!").setColor(0xff0000)]
                        })
                        .catch(() => {});
                    logger.log("critical", error);
                }
            }
        }
    });
    client.on("interactionCreate", (interaction) => {
        //Filter out non slash commands.
        if (!interaction.isChatInputCommand() && !interaction.isUserContextMenuCommand() && !interaction.isMessageContextMenuCommand()) return;
        //Filter out dms, other bots...
        if (interaction.channel?.type === ChannelType.DM || interaction.user.bot || interaction.guild == null) return;
        //Find command.
        for (const command of commands) {
            if (command.command == interaction.commandName || command.options.aliases.includes(interaction.commandName)) {
                //Check if bot has the needed permissions
                if (!checkBotPermissions(interaction.channel as GuildChannel, interaction.guild)) {
                    logger.error("Bot permission error in guild with id: " + interaction.guild.id);
                    return;
                }
                //Run callback and catch errors
                try {
                    command.callback(interaction);
                } catch (error) {
                    logger.log("critical", error);
                    try {
                        interaction
                            .reply({
                                embeds: [new EmbedBuilder().setDescription("An error has occurred while running this command! It has been reported to the developer!").setColor(0xff0000)],
                                ephemeral: true
                            })
                            .catch(() => {});
                    } catch {}
                }
            }
        }
    });
}

async function checkBotPermissions(channel: GuildChannel, guild: Guild) {
    var neededPermissions = [
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.SendMessagesInThreads,
        PermissionsBitField.Flags.EmbedLinks,
        PermissionsBitField.Flags.AddReactions
    ];
    let me = await guild.members.fetch(guild.client.user.id);
    return channel.permissionsFor(me).has(neededPermissions);
}
