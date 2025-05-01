import { ActionRow, ComponentType, LinkButtonComponentData, MessageFlags, SelectMenuComponentOptionData, SeparatorComponentData } from "discord.js";
import { db } from "../method/db";
import { snowflakes } from "../method/snowflake";
import { Container, ContainerComponentData, ContainerData } from "../module/Bot/Container";
import { Data, DataCreateOptions, DataOptions } from "../module/DB/Data";
import { MessageBuilder } from "../module/Bot/MessageBuilder";
import { addInteractionListener } from "../module/Util/listener";
import { Modal } from "../module/Bot/Modal";

export interface ArticleOptions extends DataOptions {
    userId: string;
    title: string;
}
export interface ArticleDB extends ArticleOptions {
    data: ContainerData;
}
export interface Article extends ArticleDB {}
export class Article extends Data {
    static collection = db.collection<ArticleDB>('article');
    static snowflake = snowflakes.embed;

    static async create(options: DataCreateOptions<ArticleOptions>) {
            const snowflake = this.snowflake.generate(true);
            const data: ArticleDB = {
                ...options,
                ...snowflake,
                data: new Container().text(`# ${options.title}`).data
            }
            await this.collection.insertOne(data);
            return data;
    }

    static editorMessage(article: ArticleDB, resolver?: {
        components?: {index: number} | 'add', 
    }) {
        const getComponentName = (component: ContainerComponentData) => {
            if (!component) return '';
            if (component.type === ComponentType.Section) {
                if (component.accessory.type === ComponentType.Button) return '文字与链接区块';
                else return '文字与缩略图区块';
            } else return this.componentName(component);
        }
        const selectedComponent = typeof resolver?.components === 'object' ? article.data.components.at(resolver.components.index) : undefined;
        const componentList: SelectMenuComponentOptionData[] = article.data.components.map((component, i) => {
            return {
                label: `${selectedComponent === component ? '🟢' : '⚫'} ${i + 1}. ${getComponentName(component)}`,
                value: i.toString(),
            }
        })
        if (article.data.components.length < 10) componentList.push({label: `${resolver?.components === 'add' ? '🟢' : '⚫'} 新增段落`, value: 'add'})
        const message = new MessageBuilder()
            .container({...article.data})
            .actionRow(row => row
                .stringSelect(`article-component-select@${article.id}`, componentList, {
                    placeholder: selectedComponent 
                        ? `🟢 ${article.data.components.indexOf(selectedComponent) + 1}. ${getComponentName(selectedComponent)}`
                        : resolver?.components === 'add' ? '🟢 新增段落'
                        : '选择段落'
                })
            );

        if (resolver?.components && typeof resolver.components === 'object') {
            const index = resolver.components.index;
            if (!selectedComponent) throw 'Selected Component missing';
            if (selectedComponent.type === ComponentType.MediaGallery) {
                const mediaList = selectedComponent.items.map((item, i) => {
                    const filename = new URL(item.media.url).pathname.match(/\/([^/]+)$/)?.at(1);
                    if (filename === undefined) throw 'Media gallery list filename is missing'
                    return { label: `${i + 1}. ${filename}`, value: i.toString() }
                })
                if (mediaList.length < 10) mediaList.push({label: '新增图片', value: 'add'});
                message.actionRow(row => row
                    .stringSelect(`article-component-media-select@${article.id}$${index}`, mediaList, {
                        placeholder: `选择图片`
                    })
                )
            }
            else if (selectedComponent.type === ComponentType.Separator) {
                message.actionRow(row => row
                    .stringSelect(`article-component-separator-select@${article.id}$${index}`, [
                        {label: '行距：1', value: '1'},
                        {label: '行距：2', value: '2'},
                    ], { placeholder: `已选择行距：${selectedComponent.spacing ?? '1'}` })
                )
            }
            message
            .actionRow(row => {
                if (typeof resolver.components === 'object')
                return row
                .button('删除段落', `article-component-delete@${article.id}$${resolver.components.index}`, {disabled: article.data.components.length === 1})
                .button('上移段落', `article-component-moveup@${article.id}$${resolver.components.index}`, {disabled: resolver.components.index === 0})
                .button('下移段落', `article-component-movedown@${article.id}$${resolver.components.index}`, {disabled: resolver.components.index === article.data.components.length - 1})
                .button('编辑段落', `article-component-open-edit@${article.id}$${resolver.components.index}`, {disabled: selectedComponent.type === ComponentType.MediaGallery || selectedComponent.type === ComponentType.Separator})
            })
        } else if (resolver?.components === 'add') {
            const addComponentList: SelectMenuComponentOptionData[] = [10, 12, 14, 9, 99].map(i => ({label: this.componentName({type: i}), value: i.toString()}));
            message.actionRow(row => row
                .stringSelect(`article-component-add-select@${article.id}`, addComponentList , {
                    placeholder: '选择新增的段落类型'
                })
            )
        }
        Object.assign(message.data, {flags: MessageFlags.IsComponentsV2});
        message.data.content = undefined;
        return message;
    }

    static containerMessage(article: ArticleDB) {
        const message = new MessageBuilder().container(article.data)
        Object.assign(message.data, {flags: MessageFlags.IsComponentsV2});
        message.data.content = undefined;
        return message;
    }

    static componentName(component: {type: number}) {
        switch (component.type) {
            case ComponentType.TextDisplay: return '文字区块';
            case ComponentType.MediaGallery: return '图片区块';
            case ComponentType.File: return '文件区块';
            case ComponentType.Separator: return '分割线';
            case ComponentType.Section: return '文字与缩略图区块';
            case 99: return '文字与链接区块';
            default: return 'Error Type';
        }
    }

    static async fetch(id: string) {
        const article = await Article.collection.findOne({id});
        if (!article) throw 'Article not found';
        return article;
    }

    static async getSelectedComponentFromCustomId(customId: string) {
        const match = customId.match(/[a-z-]+@([0-9]+)\$([0-9]+)/);
        if (!match) throw 'Article component custom id error';
        const [_, articleId, index] = match;
        const article = await Article.fetch(articleId);
        const selectedComponent = article.data.components.at(+index);
        if (!selectedComponent) throw 'Selected component not found';
        return { articleId, article, selectedComponent, index };
    }

    static async getFromCustomId(customId: string) {
        const articleId = customId.split('@').at(1);
        if (!articleId) throw 'Article id missing';
        const article = await Article.fetch(articleId);
        if (!article) throw 'Article not found';
        return { articleId, article };
    }
}

addInteractionListener('article-component-delete', async i => {
    if (!i.isButton()) return;
    const { article, articleId, selectedComponent, index } = await Article.getSelectedComponentFromCustomId(i.customId);
    if (article.userId !== i.user.id) throw '无权限操作';
    if (article.data.components.length === 1) throw 'Article component delete: last component';
    article.data.components.splice(+index, 1);
    await i.update(Article.editorMessage(article, { components: {index: 0} }).data)
    await Article.collection.updateOne({id: articleId, userId: i.user.id}, {$set: {data: article.data}});
})

addInteractionListener('article-component-select', async i => {
    if (!i.isStringSelectMenu()) return;
    const articleId = i.customId.split('@').at(1);
    if (!articleId) throw 'Article id missing';
    const article = await Article.collection.findOne({id: articleId});
    if (!article) throw 'Article not found';
    if (article.userId !== i.user.id) throw '无权限操作';
    const indexOrAdd = i.values.at(0);
    if (indexOrAdd === undefined) throw 'Component index missing';
    i.update(Article.editorMessage(article, { components: indexOrAdd === 'add' ? indexOrAdd : {index: +indexOrAdd} }).data );
})

addInteractionListener('article-component-open-edit', async i => {
    if (!i.isButton()) return;
    const { article, articleId, selectedComponent, index } = await Article.getSelectedComponentFromCustomId(i.customId);
    if (article.userId !== i.user.id) throw '无权限操作';
    const modal = new Modal(`编辑${Article.componentName(selectedComponent)}`, `article-component-edit@${articleId}$${index}`);
    switch (selectedComponent.type) {
        case ComponentType.TextDisplay:
            modal.paragraph('内容', 'content', {required: true, value: selectedComponent.content, min_length: 1}); break;
        case ComponentType.Section: {
            modal.paragraph('文字内容', 'content', {required: true, min_length: 1, value: selectedComponent.components[0].content})
            if (selectedComponent.accessory.type === ComponentType.Thumbnail) {
                const thumbnail = selectedComponent.accessory;
                modal
                .short('缩略图链接', 'url', {required: true, value: thumbnail.media.url})
                .short('防止剧透', 'spoiler', {required: true, value: thumbnail.spoiler ? '1' : '0'})
            } else {
                const button = selectedComponent.accessory as LinkButtonComponentData;
                modal
                .short('按钮文字', 'label', {required: true, value: button.label})
                .short('按钮链接', 'url', {required: true, value: button.url})
            }
            break;
        }
    }

    i.showModal(modal.data)
})

addInteractionListener('article-component-edit', async i => {
    if (!i.isModalSubmit()) return;
    const { article, articleId, selectedComponent, index } = await Article.getSelectedComponentFromCustomId(i.customId);
    if (article.userId !== i.user.id) throw '无权限操作';
    switch (selectedComponent.type) {
        case ComponentType.TextDisplay:
            const content = i.fields.getTextInputValue('content');
            if (!content) throw 'Text Display content not found';
            selectedComponent.content = content;
            break;
        case ComponentType.Section:
            if (selectedComponent.accessory.type === ComponentType.Thumbnail) {
                const content = i.fields.getTextInputValue('content');
                const url = i.fields.getTextInputValue('url');
                const spoiler = i.fields.getTextInputValue('spoiler');
                if (!URL.canParse(url)) throw '不是正确的 URL 格式';
                selectedComponent.components[0].content = content;
                selectedComponent.accessory.media.url = url;
                selectedComponent.accessory.spoiler = spoiler !== '0'
            } else {
                const button = selectedComponent.accessory as LinkButtonComponentData;
                const content = i.fields.getTextInputValue('content');
                const url = i.fields.getTextInputValue('url');
                const label = i.fields.getTextInputValue('label');
                if (!URL.canParse(url)) throw '不是正确的 URL 格式';
                selectedComponent.components[0].content = content;
                button.url = url;
                button.label = label;
            }
            break;
        case ComponentType.File:
            const url = i.fields.getTextInputValue('url');
            const spoiler = i.fields.getTextInputValue('spoiler');
            if (!URL.canParse(url)) throw '不是正确的 URL 格式';
            selectedComponent.file.url = url;
            selectedComponent.spoiler = spoiler !== '0';
            break;

    }
    await i.message?.edit(Article.editorMessage(article, { components: {index: +index} }).data)
    await Article.collection.updateOne({id: articleId, userId: i.user.id}, {$set: {data: article.data}});
    i.deferUpdate();
})

addInteractionListener('article-component-add-select', async i => {
    if (!i.isStringSelectMenu()) return;
    const { article, articleId } = await Article.getFromCustomId(i.customId);
    if (article.userId !== i.user.id) throw '无权限操作';
    const type = i.values.at(0);
    if (!type) throw 'Article component add type not found';
    const modal = new Modal(`新增${Article.componentName({type: +type})}`, `article-component-add-edit@${article.id}$${type}`);
    switch (+type) {
        case ComponentType.TextDisplay: 
            modal
            .paragraph('内容', 'content', {required: true, min_length: 1});
            i.showModal(modal.data);
            break;
        case ComponentType.MediaGallery:
            modal
            .short('图片链接', 'url', {required: true})
            .short('防止剧透', 'spoiler', {required: true, value: '0'})
            i.showModal(modal.data);
            break;
        case ComponentType.Section: // thumbnail section
            modal
            .paragraph('文字内容', 'content', {required: true, min_length: 1})
            .short('缩略图链接', 'url', {required: true})
            .short('防止剧透', 'spoiler', {required: true, value: '0'})
            i.showModal(modal.data);
            break;
        case 99: // link button section
            modal
            .paragraph('文字内容', 'content', {required: true, min_length: 1})
            .short('按钮文字', 'label', {required: true, value: 'Open'})
            .short('按钮链接', 'url', {required: true})
            i.showModal(modal.data);
            break;
        case ComponentType.Separator:
            const container = new Container(article.data).separator();
            article.data = container.data;
            i.update(Article.editorMessage(article, {components: {index: container.data.components.length - 1} }).data)
            await Article.collection.updateOne({id: articleId, userId: i.user.id}, {$set: {data: article.data}});
            break;
        case ComponentType.File:
            modal
            .short('文件链接', 'url', {required: true})
            .short('防止剧透', 'spoiler', {required: true, value: '0'})
            i.showModal(modal.data);
            break;
    }
})

addInteractionListener('article-component-add-edit', async i => {
    if (!i.isModalSubmit()) return;
    const match = i.customId.match(/[a-z-]+@([0-9]+)\$([0-9]+)/);
    if (!match) throw 'Article component open edit custom id error';
    const [_, articleId, type] = match;
    const article = await Article.fetch(articleId);
    if (!article) throw 'Article not found';
    if (article.userId !== i.user.id) throw '无权限操作';
    const container = new Container(article.data);
    switch (+type) {
        case ComponentType.TextDisplay: {
            const content = i.fields.getTextInputValue('content');
            container.text(content);
            break;
        }
        case ComponentType.MediaGallery: {
            const url = i.fields.getTextInputValue('url');
            const spoiler = i.fields.getTextInputValue('spoiler');
            if (!URL.canParse(url)) throw '不是正确的 URL 格式';
            container.media(media => media.item(url, { spoiler: spoiler !== '0' }));
            break;
        }
        case ComponentType.Section: {
            const content = i.fields.getTextInputValue('content');
            const url = i.fields.getTextInputValue('url');
            const spoiler = i.fields.getTextInputValue('spoiler');
            if (!URL.canParse(url)) throw '不是正确的 URL 格式';
            container.section(section => section.text(content).thumbnail(url, {spoiler: spoiler !== '0'}))
            break;
        }
        case 99: {
            const content = i.fields.getTextInputValue('content');
            const url = i.fields.getTextInputValue('url');
            const label = i.fields.getTextInputValue('label');
            if (!URL.canParse(url)) throw '不是正确的 URL 格式';
            container.section(section => section.text(content).linkButton(label, url));
            break;
        }
        case ComponentType.File: {
            const url = i.fields.getTextInputValue('url');
            const spoiler = i.fields.getTextInputValue('spoiler');
            if (!URL.canParse(url)) throw '不是正确的 URL 格式';
            container.file(url, {spoiler: spoiler !== '0'});
            break;
        }
    }
    article.data = container.data;
    await i.message?.edit(Article.editorMessage(article, {components: {index: container.data.components.length - 1} }).data)
    await Article.collection.updateOne({id: articleId, userId: i.user.id}, {$set: {data: article.data}});
    i.deferUpdate();
})

addInteractionListener('article-component-media-select', async i => {
    if (!i.isStringSelectMenu()) return;
    const { article, articleId, selectedComponent, index } = await Article.getSelectedComponentFromCustomId(i.customId);
    if (article.userId !== i.user.id) throw '无权限操作';
    const indexOrAdd = i.values.at(0);
    if (indexOrAdd === undefined) throw 'Media item index missing';
    if (indexOrAdd === 'add') {
        i.showModal(new Modal(`新增图片`, `article-component-media-add@${articleId}$${index}` )
            .short('图片链接', 'url', {required: indexOrAdd === 'add'})
            .short('防止剧透', 'spoiler', {required: true, value: '0'})
        .data)
    } else {
        if (selectedComponent.type !== ComponentType.MediaGallery) throw 'Article component media add type error';
        const item = selectedComponent.items[+indexOrAdd];
        if (!item) 'Article component media edit: media item no found'
        const LAST_ITEM = selectedComponent.items.length === 1;
        i.showModal(new Modal(`编辑图片`, `article-component-media-edit@${articleId}$${index}%${indexOrAdd}` )
            .short(`图片链接${LAST_ITEM ? '' : '（留空将会删除）'}`, 'url', {required: LAST_ITEM, value: item.media.url})
            .short('防止剧透', 'spoiler', {required: true, value: item.spoiler ? '1' : '0'})
        .data)
    }
})

addInteractionListener('article-component-media-add', async i => {
    if (!i.isModalSubmit()) return;
    const { article, articleId, selectedComponent, index } = await Article.getSelectedComponentFromCustomId(i.customId);
    if (article.userId !== i.user.id) throw '无权限操作';
    const mediaData = article.data.components.at(+index);
    if (!mediaData) throw 'Article component media add media gallery not found'
    if (mediaData.type !== ComponentType.MediaGallery) throw 'Article component media add type error';
    const url = i.fields.getTextInputValue('url');
    const spoiler = i.fields.getTextInputValue('spoiler');
    if (!URL.canParse(url)) throw '不是正确的 URL 格式';
    mediaData.items.push({
        media: {url},
        spoiler: spoiler !== '0'
    })
    await i.message?.edit(Article.editorMessage(article, {components: {index: +index} }).data)
    await Article.collection.updateOne({id: articleId, userId: i.user.id}, {$set: {data: article.data}});
    i.deferUpdate();
})

addInteractionListener('article-component-media-edit', async i => {
    if (!i.isModalSubmit()) return;
    const { article, articleId, selectedComponent, index } = await Article.getSelectedComponentFromCustomId(i.customId);
    if (article.userId !== i.user.id) throw '无权限操作';
    const mediaIndex = i.customId.match(/[a-z-]+@([0-9]+)\$([0-9]+)%([0-9]+)/)?.at(-1);
    if (!mediaIndex) throw 'Article component media edit: media index is missing';
    if (selectedComponent.type !== ComponentType.MediaGallery) throw 'Article component media add type error';
    const url = i.fields.getTextInputValue('url');
    const spoiler = i.fields.getTextInputValue('spoiler');
    if (!url.length) {
        const item = selectedComponent.items.splice(+mediaIndex, 1);
        if (!item) throw 'Article component media edit: media item no found'
    } else {
        if (!URL.canParse(url)) throw '不是正确的 URL 格式';
        const item = selectedComponent.items[+mediaIndex]
        if (!item) throw 'Article component media edit: media item no found';
        item.media.url = url;
        item.spoiler = spoiler !== '0'
    }
    await i.message?.edit(Article.editorMessage(article, {components: {index: +index} }).data)
    await Article.collection.updateOne({id: articleId, userId: i.user.id}, {$set: {data: article.data}});
    i.deferUpdate();
})

addInteractionListener('article-component-separator-select', async i => {
    if (!i.isStringSelectMenu()) return;
    const { article, articleId, selectedComponent, index } = await Article.getSelectedComponentFromCustomId(i.customId);
    if (article.userId !== i.user.id) throw '无权限操作';
    const spacing = i.values.at(0);
    if (spacing === undefined) throw 'Article component separator select: spacing missing';
    const separator = article.data.components[+index] as SeparatorComponentData;
    if (!separator) throw 'Article component separator select: separactor not found';
    separator.spacing = +spacing;
    await i.update(Article.editorMessage(article, {components: {index: +index} }).data)
    await Article.collection.updateOne({id: articleId, userId: i.user.id}, {$set: {data: article.data}});
})

addInteractionListener('article-component-moveup', async i => {
    if (!i.isButton()) return;
    const { article, articleId, selectedComponent, index } = await Article.getSelectedComponentFromCustomId(i.customId);
    if (+index < 0) throw 'Article component move up: position error';
    article.data.components.splice(+index, 1);
    article.data.components.splice(+index - 1, 0, selectedComponent);
    await i.update(Article.editorMessage(article, {components: {index: +index - 1}}).data)
    await Article.collection.updateOne({id: articleId, userId: i.user.id}, {$set: {data: article.data}});
})

addInteractionListener('article-component-movedown', async i => {
    if (!i.isButton()) return;
    const { article, articleId, selectedComponent, index } = await Article.getSelectedComponentFromCustomId(i.customId);
    if (+index > article.data.components.length) throw 'Article component move down: position error';
    article.data.components.splice(+index, 1);
    article.data.components.splice(+index + 1, 0, selectedComponent);
    await i.update(Article.editorMessage(article, {components: {index: +index + 1}}).data);
    await Article.collection.updateOne({id: articleId, userId: i.user.id}, {$set: {data: article.data}});
})