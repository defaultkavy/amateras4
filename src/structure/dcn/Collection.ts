import { db } from "../../method/db";
import { snowflakes } from "../../method/snowflake";
import { DataOptions, Data, DataCreateOptions } from "../../module/DB/Data";
export interface CollectionOptions extends DataOptions {
    userId: string;
    name: string;
}
export interface CollectionDB extends CollectionOptions {}
export interface Collection extends CollectionDB {}
export class Collection extends Data {
    static collection = db.collection<CollectionDB>('dc-collection');
    static snowflake = snowflakes.dcn_collection;
    constructor(data: CollectionDB) {
        super(data);
    }

    static async create(options: DataCreateOptions<CollectionOptions>) {
        const snowflake = this.snowflake.generate(true);
        const data: CollectionDB = {
            ...options,
            ...snowflake,
        }
        await this.collection.insertOne(data);
        const instance = new this(data);
        return instance;
    }

    static async fetch(id: string) {
        const data = await this.collection.findOne({id});
        if (!data) throw 'DCP category not exist';
        const instance = new this(data);
        return instance;
    }

    static async fetchName(targetUserId: string, name: string) {
        const data = await this.collection.findOne({name, userId: targetUserId});
        if (!data) throw 'DCP category not exist';
        const instance = new this(data);
        return instance;
    }

    static async fetchFromUser(userId: string) {
        const list = await this.collection.find({userId}).toArray();
        return list.map(data => new this(data));
    }

    static async fetchList(idList: string[]) {
        const list = await this.collection.find({id: {$in: idList}}).toArray();
        return list.map(data => new this(data));
    }
}