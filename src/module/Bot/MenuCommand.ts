import { MessageContextMenuCommandInteraction, UserContextMenuCommandInteraction } from "discord.js";
import { CommandExecuteInteraction } from "./ExecutableCommand";
import { Reply } from "./Reply";
import { MessageBuilder } from "./MessageBuilder";
import { CommandTypes } from "./CommandManager";
import { CommandIntegrationTypes, CommandContexts } from "./Command";
export type ContextMenuInteraction = UserContextMenuCommandInteraction | MessageContextMenuCommandInteraction;
type ExecuteFn<Type> = (interaction: Type) =>  OrPromise<void | any | Error | Reply>;
export abstract class MenuCommand<Type extends ContextMenuInteraction> {
    data: {
        name: string,
        type: CommandTypes,
        integration_types: CommandIntegrationTypes[],
        contexts: CommandContexts[] 
    }
    name: string
    _executeFn?: ExecuteFn<Type>;
    global: boolean;
    constructor(type: CommandTypes.User | CommandTypes.Message, name: string, global = false) {
        this.data = {
            name, type,
            integration_types: [CommandIntegrationTypes.GUILD_INSTALL],
            contexts: [CommandContexts.GUILD, CommandContexts.BOT_DM, CommandContexts.PRIVATE_CHANNEL] 
        }
        this.name = name;
        this.global = global;
    }

    integrationTypes(types: CommandIntegrationTypes[]) {
        this.data.integration_types = types;
        return this;
    }

    contexts(contexts: CommandContexts[]) {
        this.data.contexts = contexts;
        return this;
    }
    execute(fn: ExecuteFn<Type>) {
        this._executeFn = fn;
        return this;
    }

    async run(i: ContextMenuInteraction) {
        
        if (this._executeFn) {
            const feedback = (reply: any) => {
                if (!reply) return;
                if (reply instanceof Error) {
                    i[i.deferred ? 'followUp' : 'reply' ]({content: reply.message, ephemeral: true})
                } else if (reply instanceof Reply) reply.reply(i);
                else if (reply instanceof MessageBuilder) reply.reply(i);
                else {
                    i[i.deferred ? 'followUp' : 'reply' ]({content: `${reply}`, ephemeral: true})
                }
            }
            const additional: CommandExecuteInteraction = { deferSlient: async () => await i.deferReply({ephemeral: true})}
            Object.assign(i, additional)
            try {
                const reply = await this._executeFn(i as CommandExecuteInteraction & Type);
                feedback(reply);
            } catch(err) {
                feedback(err);
            }
        }
    }

    toJSON() {
        return this.data;
    }
}

export class UserMenuCommand extends MenuCommand<UserContextMenuCommandInteraction> {
    constructor(name: string, global = false) {
        super(CommandTypes.User, name, global);
    }
}

export class MessageMenuCommand extends MenuCommand<MessageContextMenuCommandInteraction> {
    constructor(name: string, global = false) {
        super(CommandTypes.Message, name, global);
    }
}