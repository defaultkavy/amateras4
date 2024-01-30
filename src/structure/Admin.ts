export interface AdminOptions {
    userId: string;
}
export interface Admin extends AdminOptions {}
export class Admin {
    static manager = new Map<string, Admin>();
    vid_proxyUserId: string | undefined;
    constructor(options: AdminOptions) {
        Object.assign(this, options);
    }

    static create(options: AdminOptions) {
        const admin = new Admin(options)
        this.manager.set(admin.userId, admin);
        return admin;
    }

    static get(userId: string) {
        const admin = this.manager.get(userId);
        if (!admin) throw `You are not admin`;
        return admin;
    }

    static safeGet(userId: string) {
        const admin = this.manager.get(userId);
        return admin;
    }

    proxyUser(userId: string | undefined) {
        this.vid_proxyUserId = userId;
        return this;
    }
}