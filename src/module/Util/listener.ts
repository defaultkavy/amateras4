import { ClientEvents, Client, Guild, MessageReaction, CacheType, AnySelectMenuInteraction, ButtonInteraction, ModalSubmitInteraction } from "discord.js";
import { CommandExecuteInteraction } from "../Bot/ExecutableCommand";
import { Reply, ReplyError } from "../Bot/Reply";
import { MessageBuilder } from "../Bot/MessageBuilder";

export const __CLIENT_EVENT_LISTENERS__: {
    [key in keyof ClientEvents]?: Set<(...args: ClientEvents[key]) => void>
} = {}
export const __EVENT_LISTENERS__: {
    [key in keyof ClientEvents]?: Set<(...args: ClientEvents[key]) => void>
} = {}
export function addClientListener<E extends keyof ClientEvents>(event: E, callback: (...args: ClientEvents[E]) => OrPromise<void> ) {
    const set = __CLIENT_EVENT_LISTENERS__[event];
    if (set instanceof Set) {
        set.add(callback);
    } else {
        Object.assign(__CLIENT_EVENT_LISTENERS__, {[event]: new Set().add(callback)});
    }
}
export function addListener<E extends keyof ClientEvents>(event: E, callback: (...args: ClientEvents[E]) => OrPromise<void> ) {
    const set = __EVENT_LISTENERS__[event];
    if (set instanceof Set) {
        set.add(callback);
    } else {
        Object.assign(__EVENT_LISTENERS__, {[event]: new Set().add(callback)});
    }
}

const __CLIENT_TYPE_EVENTS__: (keyof ClientEvents)[] = ['applicationCommandPermissionsUpdate', 'interactionCreate', 'guildCreate', 'guildDelete']
export function startListen(client: Client<true>) {
    for (const [event, fnSet] of Object.entries(__CLIENT_EVENT_LISTENERS__)) {
        client.on(event, async (...args) => {
            //@ts-ignore
            fnSet.forEach(fn => fn(...args))
        })
    }
    for (const [event, fnSet] of Object.entries(__EVENT_LISTENERS__)) {
        client.on(event, async (...args) => {
            const guildId = guildIdExtract(args[0]);
            const BotClient = (await import(`../../structure/BotClient.ts`)).BotClient;
            if (guildId) {
                if ([...BotClient.manager.values()].find(bot => [...bot.client.guilds.cache.keys()].includes(guildId))?.client !== client) return;
            }
            //@ts-ignore
            fnSet.forEach(fn => fn(...args))
        })
    }

}

function guildIdExtract(obj: Object) {
    if ('guildId' in obj) {
        return obj.guildId as string;
    } else if (obj instanceof Guild) {
        return obj.id;
    } else if (obj instanceof MessageReaction) {
        return obj.message.guildId;
    }
}

export type RestInteractionType<Cached extends CacheType> = 
| AnySelectMenuInteraction<Cached>
| ButtonInteraction<Cached>
| ModalSubmitInteraction<Cached>;
export function addInteractionListener(customIdStartWith: string, callback: (i: RestInteractionType<CacheType> & CommandExecuteInteraction) => OrPromise<string | Reply | Error | MessageBuilder | void>) {
    addClientListener('interactionCreate', async i => {
        if (!i.isAnySelectMenu() && !i.isModalSubmit() && !i.isButton()) return;
        if (!i.customId.startsWith(customIdStartWith)) return;
        const additional: CommandExecuteInteraction = { deferSlient: async () => await i.deferReply({ephemeral: true})}
        Object.assign(i, additional)
        try {
            const reply = await callback(i as any);
            if (reply === undefined) return;
            if (reply instanceof Reply) reply.reply(i);
            else if (reply instanceof MessageBuilder) reply.reply(i)
            else if (reply instanceof Error) new ReplyError(reply.message);
            else new ReplyError(reply);
        } catch(err) {
            new ReplyError(err).reply(i);
        }
    })
}