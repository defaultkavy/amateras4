import { db } from "../../method/db";
import { snowflakes } from "../../method/snowflake";
import { DataOptions, Data, DataCreateOptions } from "../../module/DB/Data";
export interface ListOptions extends DataOptions {
    userId: string;
    name: string;
    default: boolean;
}
export interface ListDB extends ListOptions {}
export interface List extends ListDB {}
export class List extends Data {
    static collection = db.collection<ListDB>('dcn-list');
    static snowflake = snowflakes.dcn_list;
    constructor(data: ListDB) {
        super(data);
    }

    static async create(options: DataCreateOptions<ListOptions>) {
        const snowflake = this.snowflake.generate(true);
        const data: ListDB = {
            ...options,
            ...snowflake,
        }
        await this.collection.insertOne(data);
        const instance = new this(data);
        return instance;
    }

    static async fetch(id: string) {
        const data = await this.collection.findOne({id});
        if (!data) throw 'DCN list not exist';
        const instance = new this(data);
        return instance;
    }

    static async fetchDefault(userId: string) {
        const data = await this.collection.findOne({userId, default: true}) ?? await this.create({
            default: true,
            name: `预设列表`,
            userId: userId
        })
        const instance = new this(data);
        return instance;
    }

    static async fetchName(userId: string, name: string) {
        const data = await this.collection.findOne({userId, name});
        if (!data) throw 'DCN list not exist';
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