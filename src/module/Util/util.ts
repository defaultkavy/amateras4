import { ClientEvents, CacheType, AnySelectMenuInteraction, ButtonInteraction, ModalSubmitInteraction, ChannelSelectMenuInteraction, Client, Guild, MessageReaction } from "discord.js";
import { CommandExecuteInteraction } from "../Bot/ExecutableCommand";
import { Reply, ReplyError } from "../Bot/Reply";
export const URLRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/;
export const __EVENT_LISTENERS__: {
    [key in keyof ClientEvents]?: Set<(...args: ClientEvents[key]) => void>
} = {}
export function addListener<E extends keyof ClientEvents>(event: E, callback: (...args: ClientEvents[E]) => OrPromise<void> ) {
    const set = __EVENT_LISTENERS__[event];
    if (set instanceof Set) {
        set.add(callback);
    } else {
        Object.assign(__EVENT_LISTENERS__, {[event]: new Set().add(callback)});
    }
}

const __CLIENT_TYPE_EVENTS__: (keyof ClientEvents)[] = ['applicationCommandPermissionsUpdate', 'interactionCreate', ]
export function startListen(client: Client<true>) {
    for (const [event, fnSet] of Object.entries(__EVENT_LISTENERS__)) {
        client.on(event, async (...args) => {
            const guildId = guildIdExtract(args[0]);
            const BotClient = (await import(`../../structure/BotClient.ts`)).BotClient;
            if (guildId) {
                if (!__CLIENT_TYPE_EVENTS__.includes(event as keyof ClientEvents)) {
                    if ([...BotClient.manager.values()].find(bot => [...bot.client.guilds.cache.keys()].includes(guildId))?.client !== client) return;
                }
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
export function addInteractionListener(customIdStartWith: string, callback: (i: RestInteractionType<CacheType> & CommandExecuteInteraction) => OrPromise<string | Reply | Error | void>) {
    addListener('interactionCreate', async i => {
        if (!i.isAnySelectMenu() && !i.isModalSubmit() && !i.isButton()) return;
        if (!i.customId.startsWith(customIdStartWith)) return;
        const additional: CommandExecuteInteraction = { deferSlient: async () => await i.deferReply({ephemeral: true})}
        Object.assign(i, additional)
        try {
            const reply = await callback(i as any);
            if (reply === undefined) return;
            if (reply instanceof Reply) reply.reply(i);
            else if (reply instanceof Error) new ReplyError(reply.message);
            else new ReplyError(reply);
        } catch(err) {
            new ReplyError(err).reply(i);
        }
    })
}

export function multipleResolver<T>(resolver: Multiple<T>): T[] {
    return resolver instanceof Array ? resolver : [resolver]
}

export function setIntervalAbsolute(unit: 'milisecond' | 'second' | 'minute' | 'hour' | 'day' | 'month' | 'year', callback: () => OrPromise<any>, multiply: number = 1) {
    const now = new Date();
    const next = new Date(now)
    switch (unit) {
        case 'year': next.setFullYear(unit === 'year' ? now.getFullYear() + multiply : 0);
        case 'month': next.setMonth(unit === 'month' ? now.getMonth() + multiply : 0);
        case 'day': next.setDate(unit === 'day' ? now.getDate() + multiply : 0);
        case 'hour': next.setHours(unit === 'hour' ? now.getHours() + multiply : 0);
        case 'minute': next.setMinutes(unit === 'minute' ? now.getMinutes() + multiply : 0);
        case 'second': next.setSeconds(unit === 'second' ? now.getSeconds() + multiply : 0);
        case 'milisecond': next.setMilliseconds(unit === 'milisecond' ? now.getMilliseconds() + multiply : 0);
    }
    
    setTimeout(() => {
        callback()
        setIntervalAbsolute(unit, callback, multiply)
    }, +next - +now);
}

export function getUserIdFromText(content: string) {
    const match_list = content.match(/\<@([0-9]+)\>/g)
    if (!match_list) throw '请输入至少一个用户的@名字';
    const mention_list = Array.from(match_list);
    return mention_list.map(mention => {
        return mention.replace('<@', '').replace('>', '')
    })
}

export function getUTCTimestamp(timestamp = Date.now()) {
    return `${timestamp}`.slice(0, -3);
}

export function substringWith(content: string, start: number, end: number, replace?: string) {
    return `${content.substring(start, end)}${content.length > end ? replace : ''}`
}

export function codeBlock(content: string) {
    return `\`\`\`${content}\`\`\``
}