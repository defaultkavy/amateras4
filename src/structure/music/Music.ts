import ytdl from "@distube/ytdl-core";
import { db } from "../../method/db";
import { Data, DataCreateOptions, DataOptions } from "../../module/DB/Data";
import { MusicAuthor, ytdlAuthor, ytdlThumbnail } from "./MusicAuthor";
import { Readable } from "stream";

export interface MusicOptions extends DataOptions {
    id: string;
    likes: number | null;
    authorId: string;
    description: string | null;
    url: string;
    views: string;
    title: string;
    keywords?: string[];
    thumbnailUrl?: string;
}
export interface MusicDB extends MusicOptions {}
export interface Music extends MusicDB {}

export class Music extends Data {
    static collection = db.collection<MusicDB>('music');
    constructor(data: MusicDB) {
        super(data);
    }

    static async create(detail: ytdlVideoDetails) {
        const duplicate = await this.collection.findOne({id: detail.videoId});
        if (duplicate) throw `Music exists`;
        const data: MusicDB = {
            id: detail.videoId,
            likes: detail.likes,
            authorId: detail.author.id,
            description: detail.description,
            url: detail.video_url,
            views: detail.viewCount,
            title: detail.title,
            keywords: detail.keywords,
            timestamp: Date.now(),
            thumbnailUrl: detail.thumbnails.at(-1)?.url
        }
        await this.collection.insertOne(data);
        const instance = new this(data);
        return instance;
    }

    static async fetchYouTubeMusic(url: string) {
        const info = await ytdl.getBasicInfo(url);
        const videoDetail = info.videoDetails;
        const authorDetail = videoDetail.author;
        const music = await this.fetch(videoDetail.videoId).catch(err => undefined);
        const author = await MusicAuthor.fetch(videoDetail.author.id).catch(err => undefined) ?? await MusicAuthor.create(authorDetail);
        if (!music) {
            const music = await this.create(videoDetail)
            return music;
        } else return music
    }

    static async fetch(id: string) {
        const data = await this.collection.findOne({id});
        if (!data) throw 'Music not exists';
        const instance = new this(data);
        return instance;
    }

    static async validURL(url: string) {
        const IS_VALID = ytdl.validateURL(url);
        if (!IS_VALID) throw '请输入有效的 YouTube 链接';
    }

    async fetchAuthor() {
        return await MusicAuthor.fetch(this.authorId);
    }

    stream() {
        return ytdl(this.url, {
            quality: 'highestaudio',
            filter: 'audioonly',
            highWaterMark: 1 << 25
        })
    }
}

export interface ytdlVideoDetails {
    videoId: string;
    title: string;
    lengthSeconds: string;
    keywords?: string[];
    thumbnails: ytdlThumbnail[];
    averageRating: number;
    allowRatings: boolean;
    viewCount: string;
    isPrivate: boolean;
    isUnpluggedCorpus: boolean;
    isLiveContent: boolean;
    published: number;
    video_url: string;
    age_restricted: boolean;
    likes: number | null;
    description: string | null;
    author: ytdlAuthor;
}