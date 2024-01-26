//Environment variables
import dotenv from "dotenv";
dotenv.config();
export const isProduction = (process.env.NODE_ENV == "production") as boolean;

//Setup logger
import { logger, addFileLoggers } from "./logger";
if (isProduction) addFileLoggers();
//Setup database
import { addServer, getServer, updateServerName } from "./database";

//Connect to discord
import { Client, GatewayIntentBits, Partials } from "discord.js";
const TOKEN = process.env.TOKEN;
export const client = new Client({
    presence: { status: "online" },
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildBans,
        GatewayIntentBits.GuildIntegrations
    ],
    partials: [Partials.User, Partials.GuildMember, Partials.Message, Partials.Channel, Partials.Reaction]
});
client.login(TOKEN).catch((err) => {
    logger.error(err);
});

//Import modules
import fs from "fs";
import path from "path";
async function loadModuleDir(dir: string) {
    for (let file of fs.readdirSync(dir)) {
        let pth = path.join(dir, file);
        if (fs.lstatSync(pth).isDirectory()) {
            await loadModuleDir(pth);
        } else {
            await require(pth);
        }
    }
}

//Client ready
client.on("ready", async () => {
    logger.info(`Connected to discord as client ${client.user?.username}.`);
    //Import modules and set up commands
    const c = await import("./commands");
    await loadModuleDir(path.resolve(path.join("src", "modules")));
    c.setupCommands();
    //Check if every server has settings
    await client.guilds.fetch();
    client.guilds.cache.forEach(async (guild) => {
        let settings = await getServer(guild.id);
        if (!settings) {
            addServer(guild.id, guild.name);
        } else {
            updateServerName(guild.id, guild.name);
        }
    });
});
