namespace Bot {
	import {Client, Message, EmbedBuilder, Channel, TextChannel, User, StringResolvable, Snowflake, MessageOptions, Attachment, MessageReaction, Emoji, UserResolvable, OAuth2Application, GuildMember} from "discord.js";

	// Shortcut type, since it's used a lot.
	export type Message = Message;
	export type Permissions = PermissionResolvable;

	export type UserResolvable = UserResolvable;

	export const Client: Client;

	export const BotListeners: {
		on: Client["on"];

		once: Client["once"];
	};

	export const CommandManager: import("./CommandManager");

	export const ChatResponder: import("./ChatResponder");

	export const StorageManager: import("./StorageManager");

	export const Console: import("./Console");

	export const ExportManager: {
		import<K extends keyof ExportMap>(prop: K): ExportMap[K];
		import(prop: string): strictTypes extends true ? unknown : any;
		export<K extends keyof ExportMap>(prop: K, value: ExportMap[K]): void;
		export(prop: string, value: any): void;
	};
}
