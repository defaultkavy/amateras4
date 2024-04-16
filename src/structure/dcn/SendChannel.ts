import { db } from "../../method/db";
import { Embed } from "../../module/Bot/Embed";
import { DataCreateOptions } from "../../module/DB/Data";
import { $ } from "../../module/Util/text";
import { InGuildDataOptions, InGuildData } from "../InGuildData";
import { Collection } from "./Collection";

export interface SendChannelOptions extends InGuildDataOptions {
    userId: string;
    channelId: string;
    collectionIdList: string[];
}
export interface SendChannelDB extends SendChannelOptions {}
export interface SendChannel extends SendChannelDB {}
export class SendChannel extends InGuildData {
    static collection = db.collection<SendChannelDB>('dcn-send-channel');
    constructor(data: SendChannelDB) {
        super(data);
    }

    static async create(options: DataCreateOptions<SendChannelOptions>) {
        const data: SendChannelDB = {
            ...options,
            id: options.channelId,
            timestamp: Date.now()
        }
        await this.collection.insertOne(data);
        const instance = new this(data);
        return instance;
    }

    static async fetch(id: string, userId: string) {
        const data = await this.collection.findOne({id, userId});
        if (!data) throw 'DCN send channel not exist';
        const instance = new this(data);
        return instance;
    }

    static async fetchFromUser(userId: string) {
        const list = await this.collection.find({userId}).toArray();
        return list.map(data => new this(data));
    }

    async addCollection(collectionId: string) {
        this.collectionIdList.push(collectionId);
        await SendChannel.collection.updateOne({id: this.id, userId: this.userId}, {$push: {
            collectionIdList: collectionId
        }})
    }

    async removeCollection(collectionId: string) {
        this.collectionIdList.splice(this.collectionIdList.indexOf(collectionId), 1);
        await SendChannel.collection.updateOne({id: this.id, userId: this.userId}, {$pull: {
            collectionIdList: collectionId
        }})
    }

    async fetchCollection() {
        return await Collection.fetchList(this.collectionIdList);
    }

    async infoEmbed() {
        const collections = await this.fetchCollection();

        return new Embed()
            .description($([
                $.Line(`频道 | `, $.Channel(this.channelId)),
                collections.length 
                    ? [
                        $.Line(`收藏集`),
                        collections.map(collection => $.Blockquote(collection.name))
                    ]
                    : $.Line(`收藏集 | 无`)
            ]))
            .footer(`Discord 内容发布管理`)
    }

    async delete() {
        await SendChannel.collection.deleteOne({id: this.id, userId: this.userId})
    }
}