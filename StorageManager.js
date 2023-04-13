//@ts-check
const fs = require("fs");
const Path = require("path");

let storage = {};

class StorageManager {
	constructor(Client, Console) {
		var path = Path.join(__dirname, "database/");

		Client.guilds.fetch();
		const Guilds = Client.guilds.cache;
		console.log(Guilds);
		Guilds.forEach((guild) => {
			if (!fs.existsSync(`${path}${guild.id}.json`)) {
				fs.writeFile(`${path}${guild.id}.json`, "{}", () => {});
			}
			storage[guild.id] = JSON.parse(fs.readFileSync(`${path}${guild.id}.json`, {encoding: "utf8"}));
		});
		storage["global"] = JSON.parse(fs.readFileSync(`${path}global.json`, {encoding: "utf8"}));
		//Save storage every minute
		setInterval(() => {
			for (let serverId in storage) {
				fs.writeFile(`${path}${serverId}.json`, JSON.stringify(storage[serverId], null, 2), () => {
					///Console.log(`Saved storage for server with id ${serverId}`, serverId == "global" ? null : serverId);
				});
			}
		}, 1 * 60 * 1000);
		Console.log("Storagemanager is ready", null);

		//Server data:
		/**
		 * Store data into storage.
		 * @param {string} name Name of the thing to be saved.
		 * @param {*} value Value of the config.
		 * @param {string} serverId Id of the server to save to
		 */
		this.set = (name, value, serverId) => {
			storage[serverId][name] = value;
			//Console.log(`Set the ${name} value to ${value}`, serverId);
		};

		/**
		 * Remove data from storage.
		 * @param {string} name Name of the file to be removed.
		 * @param {string} serverId Id of the server to save to
		 */
		this.unset = (name, serverId) => {
			delete storage[serverId][name];
			//Console.log(`Unset the ${name} value`, serverId);
		};

		/**
		 * Retrieve a value from storage.
		 * @param {string} name Name of the file to be retrieved.
		 * @param {string} serverId Id of the server to save to
		 */
		this.get = (name, serverId) => {
			//Console.log(`Retrieved the ${name} value, which is ${values[name]}`, serverId);
			return storage[serverId][name];
		};

		//Global data:
		/**
		 * Store data into storage.
		 * @param {string} name Name of the thing to be saved.
		 * @param {*} value Value of the config.
		 */
		this.globalSet = (name, value) => {
			storage["global"][name] = value;
			//Console.log(`Set the ${name} value to ${value}`, null);
		};

		/**
		 * Remove data from storage.
		 * @param {string} name Name of the file to be removed.
		 */
		this.globalUnset = (name) => {
			delete storage["global"][name];
			//Console.log(`Unset the ${name} value`, null);
		};

		/**
		 * Retrieve a value from storage.
		 * @param {string} name Name of the file to be retrieved.
		 */
		this.globalGet = (name) => {
			//Console.log(`Retrieved the ${name} value, which is ${values[name]}`, null);
			return storage["global"][name];
		};
	}
}

module.exports = StorageManager;
