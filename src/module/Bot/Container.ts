import { ActionRowComponentData, BaseButtonComponentData, BaseComponentData, ButtonStyle, ComponentType, FileComponentData, MediaGalleryComponentData, MediaGalleryItemData, SectionComponentData, SeparatorComponentData, TextDisplayComponentData, ThumbnailComponentData } from "discord.js";

export interface ContainerData {
    type: ComponentType.Container,
    id?: number;
    components: ContainerComponentData[];
}

export class Container {
    data: ContainerData = {
        type: ComponentType.Container,
        id: undefined,
        components: []
    };
    constructor(data?: ContainerData) {
        this.data = data ?? this.data;
    }

    setComponent(...component: ContainerComponentData[]) {
        this.data.components.push(...component);
        return this;
    }

    section(...builder: SectionHandler[]) {
        builder.forEach(handler => {
            const section = handler(new Section())
            this.setComponent(section.data);
        })
        return this;
    }

    text(content: string, id?: number) {
        this.setComponent({type: ComponentType.TextDisplay, content, id});
        return this;
    }

    file(...options: Omit<FileComponentTypedDate, 'type'>[]) {
        this.setComponent(...options.map(opt => ({...opt, type: ComponentType.File} as FileComponentTypedDate)))
        return this;
    }

    media(...builder: MediaGalleryHandler[]) {
        builder.forEach(handler => {
            const media = handler(new MediaGallery());
            this.setComponent(media.data);
        })
    }

    separator(options: Omit<SeparatorComponentData, 'type'> = {}) {
        this.data.components.push({ type: ComponentType.Separator, ...options});
        return this;
    }
}

export enum ContainerComponent {
    ActionRow = 1,
    Section = 9,
    TextDisplay = 10,
    File = 13,
    MediaGallery = 12,
    Separator = 14
}

export type ContainerComponentData = 
SectionComponentTypedDate | 
TextDisplayComponentTypedDate | 
MediaGalleryComponentTypedDate | 
FileComponentTypedDate | 
SeparatorComponentTypedDate;
export type SectionHandler = (section: Section) => Section;
export type MediaGalleryHandler = (media: MediaGallery) => MediaGallery;

export type SectionComponentTypedDate = (SectionComponentData & {type: ComponentType.Section})
export type MediaGalleryComponentTypedDate = (MediaGalleryComponentData & {type: ComponentType.MediaGallery, items: MediaGalleryItemData[]})
export type FileComponentTypedDate = (FileComponentData & {type: ComponentType.File})
export type SeparatorComponentTypedDate = (SeparatorComponentData & {type: ComponentType.Separator})
export type TextDisplayComponentTypedDate = (TextDisplayComponentData & {type: ComponentType.TextDisplay})

export class Section {
    data: SectionComponentTypedDate = {
        type: ComponentType.Section,
        id: undefined,
        components: [],
        accessory: undefined as any
    }

    id(id: number) {
        this.data.id = id;
        return this;
    }

    text(content: string, id?: number) {
        (this.data.components as TextDisplayComponentData[]).push({type: ComponentType.TextDisplay, content, id});
        return this;
    }

    button(label: string, customId: string, style: Exclude<ButtonStyle, ButtonStyle.Link>, options: Omit<BaseButtonComponentData, 'type' | 'label' | 'style'> = {}) {
        this.data.accessory = { type: ComponentType.Button, style, label, customId, ...options };
        return this;
    }

    linkButton(label: string, url: string, options: Omit<BaseButtonComponentData, 'type' | 'style' | 'label'> = {}) {
        this.data.accessory = {label, url, type: ComponentType.Button, style: ButtonStyle.Link, ...options};
        return this;
    }

    thumbnail(url: string, options?: Omit<ThumbnailComponentData, 'type' | 'media'>) {
        this.data.accessory = {type: ComponentType.Thumbnail, media: {url}, ...options};
        return this;
    }
}
export class MediaGallery {
    data: MediaGalleryComponentTypedDate = {
        type: ComponentType.MediaGallery,
        id: undefined,
        items: []
    }

    id(id: number) {
        this.data.id = id;
        return this;
    }
    
    item(url: string, options: Omit<MediaGalleryItemData, 'media'> = {}) {
        (this.data.items as MediaGalleryItemData[]).push({ media: { url }, ...options })
        return this;
    }
}