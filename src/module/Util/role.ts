import { Guild, Role, RoleCreateOptions } from "discord.js"

export async function roleInit(options: RoleCreateOptions & {
    aliasName: string,
    roleId: string,
    guild: Guild,
}) {
    const {guild, roleId, aliasName} = options
    const create = async () => {
        const role = await guild.roles.create({
            reason: 'Role initialize.',
            ...options,
        })
        console.log(`${aliasName} role created`)
        return role;
    }

    const role = roleId 
    ? await guild.roles.fetch(roleId).catch(err => undefined).then(async role => 
        role instanceof Role ? role : await create()) 
    : await create();

    if (options.name && role.name !== options.name) role.setName(options.name).catch(log);
    return role;
}