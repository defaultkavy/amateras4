import { db } from "../../method/db";
import { snowflakes } from "../../method/snowflake";
import { Embed } from "../../module/Bot/Embed";
import { DataOptions, Data, DataCreateOptions } from "../../module/DB/Data";
import { $ } from "../../module/Util/text";
import { BotClient } from "../BotClient";
import { Collection } from "./Collection";
import { List } from "./List";
export interface FollowOptions extends DataOptions {
    userId: string;
    targetUserId: string;
    collectionIdList: string[];
    listId: string;
}
export interface FollowDB extends FollowOptions {}
export interface Follow extends FollowDB {}
export class Follow extends Data {
    static collection = db.collection<FollowDB>('dcp-follow');
    static snowflake = snowflakes.dcp_follow;
    constructor(data: FollowDB) {
        super(data);
    }

    static async create(options: DataCreateOptions<FollowOptions>) {
        const snowflake = this.snowflake.generate(true);
        const data: FollowDB = {
            ...options,
            ...snowflake,
        }
        await this.collection.insertOne(data);
        const instance = new this(data);
        return instance;
    }

    static async fetch(id: string) {
        const data = await this.collection.findOne({id});
        if (!data) throw 'DCP follow not exist';
        const instance = new this(data);
        return instance;
    }

    static async fetchFromTarget(targetUserId: string, collectionIdList: string[]) {
        const collection = collectionIdList.length ? {collectionIdList: {$in: collectionIdList}} : {}
        const list = await this.collection.find({targetUserId, ...collection}).toArray();
        return list.map(data => new this(data))
    }

    static async fetchFromListWithTarget(listId: string, targetUserId: string) {
        const data = await this.collection.findOne({targetUserId, listId});
        if (!data) throw 'DCP follow not exist';
        const instance = new this(data);
        return instance;
    }

    static async fetchFromUserWithTarget(userId: string, targetUserId: string) {
        const list = await this.collection.find({targetUserId, userId}).toArray();
        return list.map(data => new this(data))
    }

    static async fetchFromUser(userId: string) {
        const list = await this.collection.find({userId}).toArray();
        return list.map(data => new this(data))
    }

    async fetch_List() {
        return List.fetch(this.listId);
    }

    async fetchCollectionList() {
        return Collection.fetchList(this.collectionIdList);
    }

    get targetUser() {
        return BotClient.getUser(this.targetUserId);
    }

    async infoEmbed() {
        const list = await this.fetch_List();
        const collectionList = await this.fetchCollectionList();
        const targetUser = this.targetUser;
        return new Embed()
            .description($([
                $.Line(`你关注了 `, $.Bold(targetUser?.username)),
                collectionList.length 
                    ? [
                        $.Line(`收藏集`),
                        collectionList.map(l => $.Blockquote(l.name))
                    ]
                    : $.Line(`收藏集 | 你关注了该用户的所有内容`),
                $.Line(`列表 | ${list.name}`)
            ]))
            .footer(`Discord 内容发布管理`)
    }

    async addCollection(collectionId: string) {
        this.collectionIdList.push(collectionId);
        await Follow.collection.updateOne({id: this.id, userId: this.userId}, {$push: {
            collectionIdList: collectionId
        }})
    }

    async removeCollection(collectionId: string) {
        this.collectionIdList.splice(this.collectionIdList.indexOf(collectionId), 1);
        await Follow.collection.updateOne({id: this.id, userId: this.userId}, {$pull: {
            collectionIdList: collectionId
        }})
    }

    async delete() {
        await Follow.collection.deleteOne({id: this.id})
    }
}