//Node modules required:
const Discord = require("discord.js");
const {GatewayIntentBits, Partials} = require("discord.js");
const fs = require("fs");
const path = require("path");

//Managers required:
const SM = require("./StorageManager");
const EM = require("./ExportManager");
const LM = require("./ListenerManager");
const CM = require("./CommandManager");
const CR = require("./ChatResponder");
const C = require("./Console");

//Config file.
const CONFIG = require("./config.json");

//Getting the bot token.
const TOKEN = CONFIG.TESTTOKEN;

//Creating the client.
const Client = new Discord.Client({
	disabledEvents: ["TYPING_START", "TYPING_STOP", "CHANNEL_PINS_UPDATE", "USER_SETTINGS_UPDATE"],
	intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildBans, GatewayIntentBits.GuildIntegrations],
	partials: [Partials.User, Partials.GuildMember, Partials.Message, Partials.Channel, Partials.Reaction]
});

const Console = new C(Client);
Console.log("Console is ready", null);

Client.on("ready", async () => {
	const ExportManager = new EM();
	ExportManager.export("config", CONFIG);
	const BotListeners = new LM(Client);
	const StorageManager = new SM(Client, Console);
	const CommandManager = new CM(Client, StorageManager, Console);
	const ChatResponder = new CR(BotListeners, StorageManager, Console);
	global.Bot = {
		Client,
		BotListeners,
		StorageManager,
		CommandManager,
		ChatResponder,
		ExportManager,
		Console
	};

	require("./BackupManager");

	//Requiring modules.
	for (let addon of fs.readdirSync(path.join(__dirname, "addons"))) {
		require(path.join(__dirname, "addons", addon, "addon"));
	}
	Console.log("Loaded all addons", null);

	//Refresh applications
	await CommandManager.setup();

	//Ready
	Console.log("Bot is up and running", null);
});
//Logging in.
Client.login(TOKEN);
