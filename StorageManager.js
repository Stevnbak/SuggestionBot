//@ts-check
const fs = require("fs");
const Path = require("path");
const mongoose = require("mongoose");
let Client, Console;
//Schemas
const serverSchema = new mongoose.Schema({
	id: {type: String, required: true, unique: true},
	name: {type: String, required: false},
	suggestionChannel: {type: String, required: false},
	suggestions: {
		type: [
			{
				messageId: String,
				authorId: String,
				title: String,
				description: String,
				image: String,
				score: Number,
				positiveVotes: Number,
				negativeVotes: Number,
				neutralVotes: Number,
				votes: {
					type: Object,
					default: {}
				}
			}
		],
		default: []
	},
	ignoredRoles: {
		type: Array,
		default: [],
		required: false
	},
	ignoredUsers: {
		type: Array,
		default: [],
		required: false
	}
});
const globalSchema = new mongoose.Schema({
	id: {type: String, required: true, unique: true},
	backupTime: Number
});
//Models
const storage = mongoose.model("Server Storage", serverSchema, "servers");
const globalStorage = mongoose.model("Global Storage", globalSchema, "global");
class StorageManager {
	//Constructor
	constructor(client, console) {
		Client = client;
		Console = console;

		//Add entry on joining new server
		Client.on("guildCreate", (guild) => {
			Console.log("Joined server", guild.id);
			storage.findOne({id: guild.id}).then((res) => {
				if (!res) {
					///Console.log("Adding new server to database");
					storage
						.create({id: guild.id, name: guild.name})
						.then(() => {
							///Console.log("Added new server to database");
						})
						.catch((err) => {
							Console.error(err);
						});
				} else {
					///Console.log("Server already in database");
				}
			});
		});

		// @ts-ignore
		return new Promise(async (resolve) => {
			//Connect to mongodb database
			mongoose.set("strictQuery", false);
			await mongoose
				.connect(process.env.MONGO_DB || "", {
					dbName: "SuggestionBot"
				})
				.catch((error) => {
					Console.log("Database connection failed. exiting now...");
					Console.error(error);
					process.exit(1);
				});
			Console.log("Connected to database");
			//Add entry for each guild
			await Client.guilds.fetch();
			const Guilds = Client.guilds.cache;
			for (let guild of Guilds) {
				let guildId = guild[0];
				let guildName = guild[1].name;
				let res = await storage.findOne({id: guildId});
				if (!res) {
					///Console.log("Adding new server to database");
					await storage.create({id: guildId, name: guildName}).catch((err) => {
						Console.error(err);
					});
					///Console.log("Added new server to database");
				} else {
					///Console.log("Server already in database");
				}
			}
			//Add global entry
			globalStorage.findOne({id: "global"}).then((res) => {
				if (!res) {
					///Console.log("Adding new global entry to database");
					globalStorage
						.create({id: "global", backupTime: 0})
						.then(() => {
							///Console.log("Added new global entry to database");
						})
						.catch((err) => {
							Console.error(err);
						});
				} else {
					///Console.log("Global entry already in database");
				}
			});
			Console.log("Added all entries to database");
			//Resolve
			Console.log("Storagemanager is ready");
			resolve(this);
		});
	}

	/**
	 * Store data into storage.
	 * @param {string} name Name of the thing to be saved.
	 * @param {*} value Value of the config.
	 * @param {string} serverId Id of the server to save to
	 */
	async set(name, value, serverId) {
		await storage.updateOne({id: serverId}, {[name]: value});
	}

	/**
	 * Remove data from storage.
	 * @param {string} name Name of the file to be removed.
	 * @param {string} serverId Id of the server to save to
	 */
	async unset(name, serverId) {
		await storage.updateOne({id: serverId}, {[name]: null});
	}

	/**
	 * Retrieve a value from storage.
	 * @param {string} name Name of the file to be retrieved.
	 * @param {string} serverId Id of the server to save to
	 */
	async get(name, serverId) {
		return await storage.findOne({id: serverId}).then((res) => {
			if (res) {
				return res[name];
			} else {
				return null;
			}
		});
	}

	//Global data:
	/**
	 * Store data into storage.
	 * @param {string} name Name of the thing to be saved.
	 * @param {*} value Value of the config.
	 */
	async globalSet(name, value) {
		await globalStorage.updateOne({id: "global"}, {[name]: value});
	}

	/**
	 * Remove data from storage.
	 * @param {string} name Name of the file to be removed.
	 */
	async globalUnset(name) {
		await globalStorage.updateOne({id: "global"}, {[name]: null});
	}

	/**
	 * Retrieve a value from storage.
	 * @param {string} name Name of the file to be retrieved.
	 */
	async globalGet(name) {
		return await globalStorage.findOne({id: "global"}).then((res) => {
			if (res) {
				return res[name];
			} else {
				return null;
			}
		});
	}
}

//Convert old data files to new database entries
const convertOldData = async (StorageManager) => {
	//Get all files in the data folder
	const files = fs.readdirSync("./database");
	//Loop through all files
	for (let file of files) {
		//Get information
		let guildId = file.split(".")[0];
		let fileData = JSON.parse(fs.readFileSync(`./database/${file}`, "utf8"));
		if (guildId == "global") continue;
		let guild = await Client.guilds.fetch(guildId);
		//Add the guild to the database
		await storage.findOne({id: guildId}).then((res) => {
			if (!res) {
				///Console.log("Adding new server to database");
				storage
					.create({id: guildId, name: guild.name})
					.then(() => {
						///Console.log("Added new server to database");
					})
					.catch((err) => {
						Console.error(err);
					});
			} else {
				///Console.log("Server already in database");
			}
		});
		//Loop through all the guild data
		for (let data in fileData) {
			await StorageManager.set(data, fileData[data], guildId);
		}
		//Delete the file
		fs.unlinkSync(`./database/${file}`);
	}
	Console.log("Converted old data files to new database entries");
};

//Export the class
module.exports = StorageManager;
module.exports.convertOldData = convertOldData;
