import { MongoClient, ServerApiVersion, Db, ObjectId, Collection } from "mongodb";
import { logger } from "./logger";
//Connect to database
let database = null as Db | null;
export async function startConnection() {
    // Create a MongoClient with a MongoClientOptions object to set the Stable API version
    const client = new MongoClient(process.env.MONGO_DB!, {
        serverApi: {
            version: ServerApiVersion.v1,
            strict: true,
            deprecationErrors: false
        },
        monitorCommands: true
    });
    try {
        // Connect the client to the server
        await client.connect();
        // Connect to databse
        database = client.db("example-bot");
        // Get collections
        collections = {
            settings: database.collection("guild-settings"),
            suggestions: database.collection("suggestions")
        };
        logger.info(`Successfully connected to the database.`);
        logger.log("database", `Established connection to ${database.databaseName} with ${(await database.collections()).length} collections.`);
    } catch (err: any) {
        logger.log("critical", err);
        // Ensures that the client will close on error
        await client.close();
    }
}
startConnection();

//Collections
export let collections: { settings: Collection<GuildSettings>; suggestions: Collection<Suggestion> };

//Types
export class GuildSettings {
    constructor(public _id: string, public name: string, public ignoredRoles: string[], public ignoredUsers: string[], public defaultChannel?: string) {}
}
export class Suggestion {
    constructor(
        public _id: ObjectId,
        public title: string,
        public description: string,
        public image: string,
        public serverId: string,
        public messageId: string,
        public authorId: string,
        public positiveVotes: number,
        public negativeVotes: number,
        public neutralVotes: number,
        public votes: { [key: string]: -1 | 0 | 1 }
    ) {}
}
//Functions
export async function getAllSuggestions(guildId: string) {
    try {
        let suggestions = await collections.suggestions?.find({ serverId: guildId }).toArray();
        logger.log("database", `Retrieved ${suggestions.length} suggestion.`);
        return suggestions;
    } catch (err) {
        logger.log("critical", err);
    }
}
export async function getSuggestion(messageId: string) {
    try {
        let suggestion = await collections.suggestions?.findOne({ messageId });
        logger.log("database", `Retrieved suggestion ${suggestion?._id}`);
        return suggestion;
    } catch (err) {
        logger.log("critical", err);
    }
}
export async function addSuggestion(suggestion: Suggestion) {
    try {
        logger.log("database", `Added suggestion ${suggestion._id}`);
        let result = await collections.suggestions.insertOne(suggestion);
        return result.acknowledged;
    } catch (err) {
        logger.log("critical", err);
    }
}
export async function removeSuggestion(_id: ObjectId) {
    try {
        logger.log("database", `Removed suggestion ${_id}`);
        let result = await collections.suggestions.deleteOne({ _id });
        return result.acknowledged;
    } catch (err) {
        logger.log("critical", err);
    }
}
export async function updateSuggestion(_id: ObjectId, suggestion: Partial<Suggestion>) {
    try {
        logger.log("database", `Updated suggestion ${_id}`);
        let result = await collections.suggestions.updateOne({ _id }, { $set: suggestion });
        return result.acknowledged;
    } catch (err) {
        logger.log("critical", err);
    }
}
export async function getServer(guildId: string) {
    try {
        logger.log("database", `Retrieved server ${guildId}`);
        return await collections.settings.findOne({ _id: guildId });
    } catch (err) {
        logger.log("critical", err);
    }
}
export async function addServer(guildId: string, name: string) {
    try {
        logger.log("database", `Added new server ${name} (${guildId})`);
        let settings = {
            _id: guildId,
            name,
            ignoredRoles: [],
            ignoredUsers: []
        } as GuildSettings;
        let result = await collections.settings.insertOne(settings);
        return result.acknowledged;
    } catch (err) {
        logger.log("critical", err);
    }
}
export async function updateServerName(guildId: string, name: string) {
    try {
        logger.log("database", `Updated name of server ${name} (${guildId})`);
        let result = await collections.settings.updateOne({ _id: guildId }, { name });
        return result.acknowledged;
    } catch (err) {
        logger.log("critical", err);
    }
}
export async function setDefaultChannel(guildId: string, channelId: string | null) {
    try {
        logger.log("database", `Set default channel to ${guildId} in guild ${guildId}`);
        if (channelId) {
            let result = await collections.settings.updateOne({ _id: guildId }, { $set: { defaultChannel: channelId } });
            return result.acknowledged;
        } else {
            let result = await collections.settings.updateOne({ _id: guildId }, { $unset: { defaultChannel: true } });
            return result.acknowledged;
        }
    } catch (err) {
        logger.log("critical", err);
    }
}
export async function addIgnoredRole(guildId: string, roleId: string) {
    try {
        logger.log("database", `Adding role ${roleId} to ignored list in guild ${guildId}`);
        let result = await collections.settings.updateOne({ _id: guildId }, { $push: { ignoredRoles: roleId } });
        return result.acknowledged;
    } catch (err) {
        logger.log("critical", err);
    }
}
export async function removeIgnoredRole(guildId: string, roleId: string) {
    try {
        logger.log("database", `Removing role ${roleId} from ignored list in guild ${guildId}`);
        let result = await collections.settings.updateOne({ _id: guildId }, { $pull: { ignoredRoles: roleId } });
        return result.acknowledged;
    } catch (err) {
        logger.log("critical", err);
    }
}
export async function addIgnoredUser(guildId: string, userId: string) {
    try {
        logger.log("database", `Adding user ${userId} to ignored list in guild ${guildId}`);
        let result = await collections.settings.updateOne({ _id: guildId }, { $push: { ignoredUsers: userId } });
        return result.acknowledged;
    } catch (err) {
        logger.log("critical", err);
    }
}
export async function removeIgnoredUser(guildId: string, userId: string) {
    try {
        logger.log("database", `Removing user ${userId} from ignored list in guild ${guildId}`);
        let result = await collections.settings.updateOne({ _id: guildId }, { $pull: { ignoredUsers: userId } });
        return result.acknowledged;
    } catch (err) {
        logger.log("critical", err);
    }
}
