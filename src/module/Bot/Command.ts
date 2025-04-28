import { AutocompleteFn, ExecutableCommand } from "./ExecutableCommand";
import { ApplicationCommandOptionData, ApplicationCommandOptionType, ApplicationCommandSubCommandData, ApplicationCommandSubGroupData, ApplicationCommandType, ChatInputApplicationCommandData } from "discord.js";

export class Command<Options = {}> extends ExecutableCommand {
    map = new Map<string, ExecutableCommand | SubcommandGroup>;
    global: boolean;
    data: {
        integration_types: CommandIntegrationTypes[],
        contexts: CommandContexts[],
        default_member_permissions: undefined | string
    } = {
        integration_types: [CommandIntegrationTypes.GUILD_INSTALL],
        contexts: [CommandContexts.GUILD, CommandContexts.BOT_DM, CommandContexts.PRIVATE_CHANNEL],
        default_member_permissions: undefined
    }
    constructor(name: string, description: string, global = false) {
        super(name, description);
        this.global = global;
    }

    subCommand(name: string, description: string, callback: (subcmd: ExecutableCommand) => void) {
        const subcmd = new Subcommand(name, description);
        this.map.set(name, subcmd);
        callback(subcmd);
        return this;
    }

    subGroup(group: SubcommandGroup) : this
    subGroup(name: string, description: string, callback: (group: SubcommandGroup) => void): this
    subGroup(resolver: string | SubcommandGroup, description?: string, callback?: (group: SubcommandGroup) => void) {
        if (resolver instanceof SubcommandGroup) {
            this.map.set(resolver.name, resolver);
            return this;
        }
        const group = new SubcommandGroup(resolver, description!);
        this.map.set(resolver, group);
        callback!(group);
        return this;
    }

    integrationTypes(types: CommandIntegrationTypes[]) {
        this.data.integration_types = types;
        return this;
    }

    contexts(contexts: CommandContexts[]) {
        this.data.contexts = contexts;
        return this;
    }
    
    //@ts-expect-error
    toJSON() {
        const data: ChatInputApplicationCommandData = {
            ...this.data,
            name: this.name,
            type: ApplicationCommandType.ChatInput,
            description: this.description,
            options: [...[...this.map.values()].map(cmd => cmd.toJSON()), ...[...this.options.values()].map(option => option.data)],
            contexts: [0, ...(this.global ? [1, 2] : [])]
        }
        return data;
    }

    getSubGroup(name: string) {
        return this.map.get(name) as SubcommandGroup | undefined;
    }

    getSubcommand(name: string) {
        return this.map.get(name) as ExecutableCommand | undefined;
    }

    defaultMemberPermissions(bitwise: string) {
        this.data.default_member_permissions = bitwise;
        return this;
    }
}

export enum CommandIntegrationTypes {
    GUILD_INSTALL,
    USER_INSTALL
}

export enum CommandContexts {
    GUILD,
    BOT_DM,
    PRIVATE_CHANNEL
}

export class Subcommand extends ExecutableCommand {}

export class SubcommandGroup {
    name: string;
    map = new Map<string, Subcommand>;
    description: string;
    constructor(name: string, description: string) {
        this.name = name;
        this.description = description;
    }

    subCommand(name: string, description: string, callback: (subcmd: Subcommand) => void) {
        const subcmd = new Subcommand(name, description);
        this.map.set(name, subcmd);
        callback(subcmd);
        return this;
    }

    toJSON() {
        const data: ApplicationCommandOptionData = {
            name: this.name,
            type: ApplicationCommandOptionType.SubcommandGroup,
            description: this.description,
            options: [...this.map.values()].map(cmd => cmd.toJSON())
        }
        return data;
    }

    getSubcommand(name: string) {
        return this.map.get(name) as Subcommand | undefined;
    }
}

export class CommandOption {
    data: Exclude<
    ApplicationCommandOptionData,
    ApplicationCommandSubGroupData | ApplicationCommandSubCommandData
  >;
    autocompleteFn?: AutocompleteFn;
    constructor(config: Exclude<
        ApplicationCommandOptionData,
        ApplicationCommandSubGroupData | ApplicationCommandSubCommandData
      >) {
        this.data = config;
    }
}
