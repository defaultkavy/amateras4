import { Command } from "../module/Bot/Command";
import { Reply } from "../module/Bot/Reply";
import { Admin } from "../structure/Admin";

export const cmd_sys = new Command('sys', 'Amateras System command')
.subCommand('vid', 'Manage vid as user', subcmd => {
    subcmd
    .user('user', 'userID')
    .execute(async (i, options) => {
        const admin = Admin.get(i.user.id);
        if (options.user) {
            admin.proxyUser(options.user.id);
            return new Reply(`Proxy User Function ON: ${options.user}`)
        } else {
            admin.proxyUser(undefined);
            return new Reply(`Proxy User Function OFF`);
        }
    })
})