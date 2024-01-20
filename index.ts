import { config } from "./bot_config";
import { cmdx_info } from "./src/command/context/info";
import { cmd_lobby } from "./src/command/lobby";
import { cmd_mod } from "./src/command/mod/mod";
import { cmd_vid } from "./src/command/vid";
import { client } from "./src/method/client";
import { CommandManager } from "./src/module/Bot/CommandManager";
import { Log } from "./src/module/Log/Log";
import { addListener } from "./src/module/Util/util";

await client.guilds.fetch();
for (const guild of client.guilds.cache.values()) {
    await guild.fetch();
    await guild.channels.fetch();
    new Log(guild.name)
}
const cmd_manager = new CommandManager(client);
const cmd_list = [
    cmd_lobby,
    cmd_mod,
    cmd_vid,
    cmdx_info
]

cmd_manager.add(cmd_list);
if (config.debug) await deploy_command();
cmd_manager.listen();

async function deploy_command() {
    new Log('Deploying command...')
    await cmd_manager.deployGuilds([...client.guilds.cache.values()])
    new Log('Deployed command.')
}
addListener('guildCreate', async guild => {
    await guild.fetch();
    await guild.channels.fetch();
    await cmd_manager.deployGuilds([guild])
    new Log(guild.name)
})