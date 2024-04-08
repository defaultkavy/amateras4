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
import { Game } from "./src/structure/Game";
import { cmd_uid } from "./src/command/uid";
import { cmdx_unsend } from "./src/context/unsend";
import { UserPlayer } from "./src/structure/user-player/Player";
import { cmd_skill } from "./src/command/skill";
import { cmd_me } from "./src/command/user";
import { GuildMessage } from "./src/structure/GuildMessage";
import { $Guild } from "./src/structure/$Guild";
export const cmd_list = [
    cmd_lobby,
    cmd_mod,
    cmd_vid,
    cmd_poll,
    cmd_bot,
    cmd_help,
    cmd_chat,
    cmd_post,
    cmd_uid,
    cmd_skill,
    cmd_me,
    cmdx_info,
    cmdx_unsend
]

// Init
new Log('System Initializing...');
System.init();
const bot = new BotClient({
    id: client.user.id,
    timestamp: Date.now(),
    token: client.token,
    ownerUserId: '',
    avatarURL: client.user.avatarURL({size: 1024}),
    username: client.user.username
}, client)
BotClient.manager.set(bot.id, bot);
await bot.init();
await BotClient.init();
GuildMessage;
// Global data load
await PostChannel.init();
await LogChannel.init();
await Game.init();
new Log('System Initialized');
//
if (config.dev) {
    cmd_list.push(cmd_test)
}
new Log(`Welcome to Amateras 4.`)