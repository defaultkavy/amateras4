import { config } from "../../bot_config";
import { db } from "../method/db";
import { Embed } from "../module/Bot/Embed";
import { Data, DataCreateOptions, DataOptions } from "../module/DB/Data";
import { Snowflake } from "../module/Snowflake";
import { Game } from "./Game";

export interface GameUidOptions extends DataOptions {
    name: string;
    thumbnail_url?: string;
    intro: string;
    gameId: string;
    userId: string;
    playerId: string;
}
export interface GameUidDB extends GameUidOptions {

}
export interface GameUid extends GameUidDB {}
export class GameUid extends Data {
    static collection = db.collection<GameUidDB>('game-uid');
    static manager = new Map<string, GameUid>();
    static snowflake = new Snowflake({epoch: config.epoch, workerId: 9});
    constructor(data: GameUidDB) {
        super(data);
    }

    async init() {}

    static async create(options: DataCreateOptions<GameUidOptions>) {
        const duplicate = await this.collection.findOne({name: options.name});
        if (duplicate) throw `该游戏名字已被占用`;
        const snowflake = this.snowflake.generate(true);
        const data: GameUidDB = {
            ...options,
            id: snowflake.id,
            timestamp: snowflake.timestamp
        }
        await this.collection.insertOne(data);
        const instance = new this(data);
        this.manager.set(instance.id, instance);
        return instance;
    }

    static async fetch(userId: string, gameId: string) {
        const data = await this.collection.findOne({userId, gameId});
        if (!data) return undefined;
        const instance = new this(data);
        this.manager.set(instance.id, instance);
        return instance;
    }

    static async fetchListFromUser(userId: string) {
        const list = await this.collection.find({userId}).toArray();
        return list.map(data => new this(data));
    }

    async delete() {
        GameUid.manager.delete(this.id);
        await GameUid.collection.deleteOne({id: this.id});
    }

    async edit(data: {name: string, thumbnail_url: string, intro: string, playerId: string}) {
        await GameUid.collection.updateOne({id: this.id}, {$set: data});
        this.name = data.name;
        this.thumbnail_url = data.thumbnail_url;
        this.intro = data.intro;
        this.playerId = data.playerId;
    }
    
    cardEmbed() {
        return new Embed()
            .author(this.name)
            .description(this.intro)
            .thumbnail(this.thumbnail_url)
            .field('ID', `${this.playerId}`)
            .footer(this.game.name, this.game.icon_url)
            .max()
            .color(0xa245c3);
    }

    get game() {
        return Game.manager.get(this.gameId) as Game;
    }
}