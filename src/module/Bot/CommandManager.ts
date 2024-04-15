import { ApplicationCommandOptionAllowedChannelTypes, ApplicationCommandOptionType, AutocompleteFocusedOption, AutocompleteInteraction, BaseChannel, Client, CommandInteractionOption, Guild, GuildBasedChannel, GuildChannel, REST, Routes } from "discord.js";
import { Command, SubcommandGroup } from "./Command";
import { ExecutableCommand } from "./ExecutableCommand";
import { MenuCommand, MessageMenuCommand, UserMenuCommand } from "./MenuCommand";

export class CommandManager {
    client: Client<true>;
    cache = new Map<string, Command | UserMenuCommand | MessageMenuCommand>;
    constructor(client: Client<true>) {
        this.client = client;
    }

    listen() {
        this.client.on('interactionCreate', async i => {
            if (i.isChatInputCommand()) {
                if (!i.inCachedGuild()) return;
                const command = this.cache.get(i.commandName);
                if (command instanceof MenuCommand) return;
                if (!command) return;
                if (command.name !== i.commandName) return;
                const FirstOption = i.options.data[0];
                if (!FirstOption) return command.run(i, undefined);
                const FirstCMD = command.map.get(FirstOption.name);
                if (FirstOption.type === ApplicationCommandOptionType.Subcommand) {
                    if (FirstCMD instanceof ExecutableCommand) FirstCMD.run(i, FirstOption.options);
                } 
                else if (FirstOption.type === ApplicationCommandOptionType.SubcommandGroup && FirstCMD instanceof SubcommandGroup) {
                    const SecondOption = FirstOption.options![0];
                    const lastCmd = FirstCMD.map.get(SecondOption.name)
                    if (lastCmd instanceof ExecutableCommand) lastCmd.run(i, SecondOption.options)
                }
                else command.run(i, i.options.data)
            }

            else if (i.isAutocomplete()) {
                const command = this.cache.get(i.commandName);
                if (command instanceof MenuCommand) return;
                if (!command) return;

                const option1 = i.options.data[0];
                // cmd subcmd [options]
                if (option1.type === ApplicationCommandOptionType.Subcommand) {
                    const subcmd = command.getSubcommand(option1.name);
                    if (!subcmd) throw 'subcommand not found';
                    i.respond((await autocomplete(subcmd, option1.options)).slice(0, 25));
                }
                // cmd subgroup subcmd [options]
                else if (option1.type === ApplicationCommandOptionType.SubcommandGroup) {
                    const subgroup = command.getSubGroup(option1.name);
                    if (!subgroup) throw 'subcommand group is not found';
                    if (!option1.options) throw 'option1.options is undefined';
                    const option2 = option1.options[0];
                    const subcmd = subgroup.getSubcommand(option2.name);
                    if (!subcmd) throw 'subcommand not found';
                    i.respond((await autocomplete(subcmd, option2.options)).slice(0, 25));
                }
                // cmd [options]
                else i.respond((await autocomplete(command, [...i.options.data])).slice(0, 25));

                async function autocomplete(subcmd: ExecutableCommand | Command, options: CommandInteractionOption[] | undefined) {
                    if (!options) throw 'option is undefined';
                    const focused = options.find(option => option.focused);
                    if (!focused) throw 'autocomplete focused option is undefined';
                    options.splice(options.indexOf(focused));
                    const focused_option = subcmd.options.get(focused.name);
                    if (!focused_option) throw 'focused option not found';
                    const optionMap = new OptionMap(options)
                    try {
                        if (focused_option.autocompleteFn) return focused_option.autocompleteFn(focused as AutocompleteFocusedOption, optionMap, i as AutocompleteInteraction<'cached'>)
                    } catch(err) {
                        return []
                    }
                    return []
                }
            }

            else if (i.isContextMenuCommand()) {
                if (!i.inCachedGuild()) return;
                const command = this.cache.get(i.commandName);
                if (!(command instanceof MenuCommand)) return;
                command.run(i);
            }
        })
    }

    async deployGuilds(guilds: Guild[]) {
        const rest = new REST().setToken(this.client.token);
        return new Promise<void>(resolve => {
            guilds.forEach(async guild => {
                await rest.put(
                    Routes.applicationGuildCommands(this.client.user.id, guild.id),
                    { body: [...this.cache.values()].map(command => command.toJSON()) }
                )
            })
            resolve();
        })
    }

    add(command: Multiple<Command | UserMenuCommand | MessageMenuCommand>) {
        if (!(command instanceof Array)) command = [command]
        command.forEach(cmd => this.cache.set(cmd.name, cmd))
        return this;
    }

    delete(command: Command) {
        this.cache.delete(command.name);
        return this;
    }
}

export enum CommandTypes {
    ChatInput = 1,
    User = 2,
    Message = 3
}

export class OptionMap {
    private cache = new Map<string, string | boolean | number | BaseChannel | undefined>
    constructor(options: CommandInteractionOption[]) {
        options.forEach(option => this.cache.set(option.name, option.value));
    }

    get(name: string) {
        return this.cache.get(name);
    }

    getString(name: string) {
        const result = this.cache.get(name);
        if (typeof result !== 'string') throw `Command option value type is ${typeof result}, required string`
        return result
    }

    getNumber(name: string) {
        const result = this.cache.get(name);
        if (typeof result !== 'number') throw `Command option value type is ${typeof result}, required number`
        return result
    }

    getBoolean(name: string) {
        const result = this.cache.get(name);
        if (typeof result !== 'boolean') throw `Command option value type is ${typeof result}, required boolean`
        return result
    }
}