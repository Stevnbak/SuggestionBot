import { Client, GatewayIntentBits, Partials } from "discord.js";
const client = new Client({
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
export default client;

//Client errors
import { logger } from "./logger";
client.on("error", (error) => {
    logger.log("critical", error);
});
