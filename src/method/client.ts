import { Client, ClientOptions, Partials } from "discord.js";
import { config } from "../../bot_config";
import { Log } from "../module/Log/Log";
export const CLIENT_OPTIONS: ClientOptions = {
    intents: ['GuildMembers', 'MessageContent', 'GuildIntegrations', 'GuildMessages', 'Guilds', 'DirectMessages', 'DirectMessageTyping', 'DirectMessageReactions'],
    partials: [Partials.Channel, Partials.Message]
}
export const client = new Client(CLIENT_OPTIONS) as Client<true>

new Log('Discord connecting...');
await client.login(config.bot.token);
new Log(`Discord connected: ${client.user?.username}`)