import { config } from "./bot_config";
import { cmdx_info } from "./src/command/context/info";
import { cmd_lobby } from "./src/command/lobby";
import { cmd_mod } from "./src/command/mod/mod";
import { cmd_poll } from "./src/command/poll";
import { cmd_post } from "./src/command/post";
import { cmd_test } from "./src/command/test";
import { cmd_vid } from "./src/command/vid";
import { client } from "./src/method/client";
import { CommandManager } from "./src/module/Bot/CommandManager";
import { Log } from "./src/module/Log/Log";
import { addListener } from "./src/module/Util/util";
import { PostMode } from "./src/structure/Post";
listeners();
await client.guilds.fetch();
for (const guild of client.guilds.cache.values()) {
    new Log(`Initializing ${guild.name}`)
    await guild.fetch();
    await guild.channels.fetch();
}
// Init
new Log('System Initializing...');
await PostMode.init();
new Log('System Initialized');
//
const cmd_manager = new CommandManager(client);
const cmd_list = [
    cmd_lobby,
    cmd_mod,
    cmd_vid,
    cmd_poll,
    cmd_post,
    cmdx_info,
]
if (config.dev) {
    cmd_list.push(cmd_test)
}
cmd_manager.add(cmd_list);
if (!config.debug) await deploy_command();
cmd_manager.listen();
new Log(`Welcome to Amateras 4.`)

async function deploy_command() {
    new Log('Deploying command...')
    await cmd_manager.deployGuilds([...client.guilds.cache.values()])
    new Log('Deployed command.')
}

function listeners() {
    addListener('guildCreate', async guild => {
        new Log(`Joining ${guild.name}`)
        await guild.fetch();
        await guild.channels.fetch();
        await cmd_manager.deployGuilds([guild])
    })

    addListener('guildDelete', guild => {
        new Log(`Leaving ${guild.name}`)
    })
}