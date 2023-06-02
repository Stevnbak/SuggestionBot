console.log("Starting bot...");
//Node modules required:
const Discord = require("discord.js");
const {GatewayIntentBits, Partials} = require("discord.js");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

//Managers required:
const SM = require("./StorageManager");
const EM = require("./ExportManager");
const LM = require("./ListenerManager");
const CM = require("./CommandManager");
const CR = require("./ChatResponder");
const C = require("./Console");

//Getting the bot token.
const TOKEN = process.env.USE_TEST ? process.env.TESTTOKEN : process.env.TOKEN;
//Creating the client.
const Client = new Discord.Client({
	disabledEvents: ["TYPING_START", "TYPING_STOP", "CHANNEL_PINS_UPDATE", "USER_SETTINGS_UPDATE"],
	intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildBans, GatewayIntentBits.GuildIntegrations],
	partials: [Partials.User, Partials.GuildMember, Partials.Message, Partials.Channel, Partials.Reaction]
});

const Console = new C(Client);
Console.log("Console is ready", null);

Client.on("ready", async () => {
	//Setting up the managers
	const ExportManager = new EM();
	const BotListeners = new LM(Client);
	const StorageManager = await new SM(Client, Console);
	const CommandManager = new CM(Client, StorageManager, Console);
	const ChatResponder = new CR(BotListeners, StorageManager, Console);

	//Setting up the bot object
	global.Bot = {
		Client,
		BotListeners,
		StorageManager,
		CommandManager,
		ChatResponder,
		ExportManager,
		Console
	};

	//Backup
	require("./BackupManager");

	//Requiring modules
	for (let addon of fs.readdirSync(path.join(__dirname, "addons"))) {
		require(path.join(__dirname, "addons", addon, "addon"));
	}
	Console.log("Loaded all addons", null);

	//Refresh applications
	await CommandManager.setup();

	//Ready
	Console.log("Bot is up and running with client " + Client.user.username, null);
});
//Logging in.
Client.login(TOKEN);
