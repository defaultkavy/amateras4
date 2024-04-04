import { AutocompleteFocusedOption, AutocompleteInteraction } from "discord.js";
import { ExecutableCommand } from "../../module/Bot/ExecutableCommand";
import { Lobby } from "../../structure/Lobby";
import { cmd_mod } from "./mod";
import { Reply } from "../../module/Bot/Reply";

export function mod_lobby() {
    cmd_mod.subGroup('lobby', '房间管理', group => {
        group
        .subCommand('close', '强制关闭房间', subcmd => {
            adminLobbySelect(subcmd)
            .execute(async (i, options) => {
                const lobby = await Lobby.fetch(options.lobby);
                lobby.delete(i.user.id);
                return new Reply(`房间【${lobby.name}】已强制关闭`)
            })
        })
    })
}
    
function adminLobbySelect(subcmd: ExecutableCommand) {
    return subcmd
    .string('lobby', '选择房间', {required: true, 
        autocomplete: async (focused: AutocompleteFocusedOption, _: any, i: AutocompleteInteraction<'cached'>) => {
            const list = await Lobby.collection.find({guildId: i.guildId}).toArray();
            const filtered = list.filter(lobby => lobby.name.toLowerCase().includes(focused.value.toLowerCase()));
            return filtered.map(lobby => ({
                name: `${lobby.name}`,
                value: lobby.id
            }))
        }
    })
}