import { MessageContextMenuCommandInteraction, UserContextMenuCommandInteraction } from "discord.js";
import { CommandExecuteInteraction } from "./ExecutableCommand";
import { Reply } from "./Reply";
import { MessageBuilder } from "./MessageBuilder";
import { CommandTypes } from "./CommandManager";
export type ContextMenuInteraction = UserContextMenuCommandInteraction<'cached'> | MessageContextMenuCommandInteraction<'cached'>;
type ExecuteFn<Type> = (interaction: Type) =>  OrPromise<void | any | Error | Reply>;
export abstract class MenuCommand<Type extends ContextMenuInteraction> {
    data: {
        name: string,
        type: CommandTypes
    }
    name: string
    _executeFn?: ExecuteFn<Type>;
    global: boolean;
    constructor(type: CommandTypes.User | CommandTypes.Message, name: string, global = false) {
        this.data = {name, type}
        this.name = name;
        this.global = global;
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

export class UserMenuCommand extends MenuCommand<UserContextMenuCommandInteraction<'cached'>> {
    constructor(name: string) {
        super(CommandTypes.User, name);
    }
}

export class MessageMenuCommand extends MenuCommand<MessageContextMenuCommandInteraction<'cached'>> {
    constructor(name: string) {
        super(CommandTypes.Message, name);
    }
}