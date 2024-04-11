import ytdl from "ytdl-core";
import { db } from "../../method/db";
import { Data, DataCreateOptions, DataOptions } from "../../module/DB/Data";
import { Music } from "./Music";

export interface MusicAuthorOptions extends DataOptions {
    id: string;
    name: string;
    thumbnailUrl?: string;
    verified: boolean;
    userId?: string;
    channel_url: string;
    external_channel_url?: string;
    user_url?: string;
    subscriber_count?: number;
}
export interface MusicAuthorDB extends MusicAuthorOptions {}
export interface MusicAuthor extends MusicAuthorDB {}

export class MusicAuthor extends Data {
    static collection = db.collection<MusicAuthorDB>('music-author');
    constructor(data: MusicAuthorDB) {
        super(data);
    }

    static async create(authorDetail: ytdlAuthor) {
        const duplicate = await this.collection.findOne({id: authorDetail.id});
        if (duplicate) throw `Music author exists`;
        const data: MusicAuthorDB = {
            id: authorDetail.id,
            channel_url: authorDetail.channel_url,
            external_channel_url: authorDetail.external_channel_url,
            name: authorDetail.name,
            verified: authorDetail.verified,
            subscriber_count: authorDetail.subscriber_count,
            thumbnailUrl: authorDetail.thumbnails?.at(-1)?.url,
            timestamp: Date.now()
        }
        await this.collection.insertOne(data);
        const instance = new this(data);
        return instance;
    }

    static async fetch(id: string) {
        const data = await this.collection.findOne({id});
        if (!data) throw 'Music author not exists';
        const instance = new this(data);
        return instance;
    }
}
export interface ytdlAuthor {
  id: string;
  name: string;
  avatar: string; 
  thumbnails?: ytdlThumbnail[];
  verified: boolean;
  user?: string;
  channel_url: string;
  external_channel_url?: string;
  user_url?: string;
  subscriber_count?: number;
}

export interface ytdlThumbnail {
  url: string;
  width: number;
  height: number;
}