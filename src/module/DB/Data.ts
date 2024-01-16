export interface DataOptions {
    id: string;
    timestamp: number;
}
export abstract class Data {
    id: string;
    constructor(options: DataOptions) {
        this.id = options.id;
        Object.assign(this, options);
    }
}