import { ChannelType, MessageType } from "discord.js";
import { config } from "./bot_config";
import { cmd_bot } from "./src/command/bot";
import { cmd_chat } from "./src/command/chat";
import { cmd_help } from "./src/command/help";
import { cmd_lobby } from "./src/command/lobby";
import { cmd_mod } from "./src/command/mod/mod";
import { cmd_poll } from "./src/command/poll";
import { cmd_post } from "./src/command/post";
import { cmd_test } from "./src/command/test";
import { cmd_vid } from "./src/command/vid";
import { cmdx_info } from "./src/context/info";
import { client } from "./src/method/client";
import { Log } from "./src/module/Log/Log";
import { addListener } from "./src/module/Util/util";
import { BotClient } from "./src/structure/BotClient";
import { LogChannel } from "./src/structure/LogChannel";
import { PostChannel } from "./src/structure/PostChannel";
import { System } from "./src/structure/System";
export const cmd_list = [
    cmd_lobby,
    cmd_mod,
    cmd_vid,
    cmd_poll,
    cmd_bot,
    cmd_help,
    cmd_chat,
    cmd_post,
    cmdx_info,
]
listeners();
const bot = new BotClient({
    id: client.user.id,
    timestamp: Date.now(),
    token: client.token,
    ownerUserId: '',
    avatarURL: client.user.avatarURL({size: 1024}),
    username: client.user.username
}, client)
BotClient.manager.set(bot.id, bot);
await bot.init()

// Init
new Log('System Initializing...');
System.init();
await PostChannel.init();
await LogChannel.init();
await BotClient.init();
new Log('System Initialized');
//
if (config.dev) {
    cmd_list.push(cmd_test)
}
new Log(`Welcome to Amateras 4.`)

function listeners() {
    addListener('guildCreate', async guild => {
        new Log(`Joining ${guild.name} <${guild.client.user.username}(${guild.client.user.id})>`)
        await guild.fetch();
        await guild.channels.fetch();
        const bot = BotClient.get(guild.client.user.id);
        await bot.cmd_manager.deployGuilds([guild])
    })

    addListener('guildDelete', guild => {
        new Log(`Leaving ${guild.name} <${guild.client.user.username}(${guild.client.user.id})>`)
    })
}