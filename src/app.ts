//Environment variables
import dotenv from "dotenv";
dotenv.config();
export const isProduction = (process.env.NODE_ENV == "production") as boolean;

//Setup logger
import { logger, addFileLoggers } from "./logger";
if (isProduction) addFileLoggers();
//Setup database
import { startConnection, addServer, getServer, updateServerName } from "./database";

//Connect to discord (after connecting to database)
import client from "./client";
const TOKEN = process.env.TOKEN;
startConnection(isProduction).then(() => {
    client
        .login(TOKEN)
        .then(() => logger.info("Logging into discord..."))
        .catch((err) => {
            logger.error(err);
        });
});

//Import modules
import { setupCommands } from "./commands";
import "./modules/modules";

//Client ready
client.on("ready", async () => {
    logger.info(`Connected to discord as client ${client.user?.username}.`);
    //Setup commands
    setupCommands(client);
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
