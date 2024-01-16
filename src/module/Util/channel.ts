import { CategoryChannel, ChannelType, ForumChannel, Guild, GuildChannel, GuildChannelCreateOptions, GuildForumThreadCreateOptions, MappedGuildChannelTypes, MessageCreateOptions, NonThreadGuildBasedChannel, OverwriteData, Role, TextBasedChannel, TextChannel, ThreadChannel } from "discord.js";
import { MessageBuilder } from "../Bot/MessageBuilder";

export async function deleteCategory(category: CategoryChannel) {
    await category.fetch();
    const categoryChildrenSize = category.children.cache.size;
    for (const channel of category.children.cache.values()) {
        await channel.delete().catch();
    }
    await category.delete().catch();
    return {
        deleted: true,
        childrenSize: categoryChildrenSize
    }
}

export function permissionsIncluded(channel: NonThreadGuildBasedChannel, permissionOverwrites: OverwriteData[]) {
    for (const overwrite of permissionOverwrites) {
        const id = typeof overwrite.id === 'string' ? overwrite.id : overwrite.id.id;
        const find = channel.permissionOverwrites.cache.get(id);
        if (!find) return false; 
        if (overwrite.allow instanceof Array) {
            for (const bitField of overwrite.allow) {
                if (!find.allow.has(bitField)) return false;
            }
        }
        if (overwrite.deny instanceof Array) {
            for (const bitField of overwrite.deny) {
                if (!find.deny.has(bitField)) return false;
            }
        }
    }
    return true;
}


/**
 * Check channel exists, if not then create one.
 * @param options Channel create options
 * @returns 
 */
export async function channelInit<T extends keyof MappedGuildChannelTypes>(options: GuildChannelCreateOptions & {
    type: T,
    channelAlias: string,
    channelId?: string,
    guild: Guild,
    permissionOverwrites: OverwriteData[]
}) {
    const {guild, channelId, name, permissionOverwrites, channelAlias} = options
    const create = async () => {
        const channel = await guild.channels.create<T>({
            ...options,
            reason: 'Channel initialize.',
        })
        console.log(`${channelAlias} channel created`)

        return channel;
    }

    const channel = channelId 
    ? await guild.channels.fetch(channelId).catch(err => undefined).then(async channel => channel ?? await create()) 
    : await create();

    if (channel instanceof GuildChannel) {
        if (!permissionsIncluded(channel, permissionOverwrites)) {
            await channel.permissionOverwrites.set(permissionOverwrites)
            console.log(`${channelAlias} channel permissions overwrited`)
        }
        if (options.name !== channel.name) channel.setName(options.name).catch(console.error);
        if (options.position !== undefined && options.position !== channel.position) channel.setPosition(options.position).catch(console.error);
        
        if (channel instanceof ForumChannel) {
            if (options.defaultForumLayout && channel.defaultForumLayout !== options.defaultForumLayout) channel.setDefaultForumLayout(options.defaultForumLayout).catch(console.error);
        }
    } 

    return channel;
}

export async function postInit(options: GuildForumThreadCreateOptions & {
    aliasName: string
    forum: ForumChannel,
    threadId: string | undefined
}) {
    const {forum, aliasName} = options;
    const create = async () => {
        const post = await forum.threads.create({
            reason: 'Post initialize',
            ...options,
        })
        console.log(`${aliasName} post created`)
        return post;
    }
    
    const post = options.threadId 
        ? await forum.threads.fetch(options.threadId).catch(err => undefined).then(async post => 
            post instanceof ThreadChannel
                ? post
                : await create())
        : await create();
    if (post.archived) post.setArchived(false);
    return post;
}

export async function messageInit(options: {
    channel: TextBasedChannel;
    builder: MessageBuilder;
    messageId?: string;
}) {
    const {channel, builder, messageId} = options
    const send = async () => builder.send(channel);
    const message = messageId
        ? await channel.messages.fetch(messageId).catch(err => undefined).then(async message => 
            message ? message.edit(builder.data) : await send())
        : await send();
    return message;
}