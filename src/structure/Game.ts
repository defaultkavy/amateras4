import { config } from "../../bot_config";
import { db } from "../method/db";
import { Data, DataCreateOptions, DataOptions } from "../module/DB/Data";
import { Snowflake } from "../module/Snowflake";

export interface GameOptions extends DataOptions {
    id: string;
    name: string;
    alias_name: string[];
    icon_url: string;
}
export interface GameDB extends GameOptions {

}
export interface Game extends GameDB {}
export class Game extends Data {
    static collection = db.collection<GameDB>('game');
    static manager = new Map<string, Game>();
    static snowflake = new Snowflake({epoch: config.epoch, workerId: 8});
    constructor(data: GameDB) {
        super(data);
    }

    async init() {}

    static async init() {
        const cursor = this.collection.find()
        const list = await cursor.toArray()
        cursor.close();
        list.forEach(data => {
            const instance = new this(data);
            this.manager.set(data.id, instance);
            instance.init();
        })
    }

    static async create(options: DataCreateOptions<GameOptions>) {
        const duplicate = await this.collection.findOne({name: options.name});
        if (duplicate) throw `该游戏名字已被占用`;
        const snowflake = this.snowflake.generate(true);
        const data: GameDB = {
            ...options,
            id: snowflake.id,
            timestamp: snowflake.timestamp
        }
        await this.collection.insertOne(data);
        const instance = new this(data);
        this.manager.set(instance.id, instance);
        return instance;
    }

    static async fetch(id: string) {
        const data = await this.collection.findOne({id: id});
        if (!data) throw '该游戏不存在';
        const instance = new this(data);
        this.manager.set(instance.id, instance);
        return instance;
    }

    async delete() {
        Game.manager.delete(this.id);
        await Game.collection.deleteOne({id: this.id});
    }

    async edit(data: {name: string, alias_name: string[]}) {
        await Game.collection.updateOne({id: this.id}, {$set: {data}});
        this.name = data.name;
        this.alias_name = data.alias_name;
    }
    
}