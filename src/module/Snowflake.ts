const snowflakes_list = new Set<Snowflake>;
setInterval(() => {
    snowflakes_list.forEach(snowflake => snowflake.tick())
}, 1)
export class Snowflake {
    workerId: number;
    epoch: number;
    increment = 0;
    now: number;
    nodeIdBits: number;
    sequenceBits: number;
    constructor(options: SnowflakeOptions) {
        this.workerId = options.workerId ?? 0;
        this.epoch = options.epoch ?? 0;
        this.nodeIdBits = options.nodeIdBits ?? 10;
        this.sequenceBits = options.sequenceBits ?? 12;
        this.now = + new Date

    }

    generate(): string
    generate(detail: true): {id: string, timestamp: number}
    generate(detail = false) {
        this.increment++;
        const timestamp = + new Date;
        const newTime = timestamp - this.epoch;
        const newTimeBinary = newTime.toString(2);
        const workerBinary = this.workerId.toString(2).padStart(this.nodeIdBits, '0');
        const incrementBinary = this.increment.toString(2).padStart(this.sequenceBits, '0');
        const snowflakeBinary = newTimeBinary + workerBinary + incrementBinary;

        const snowflake = BigInt('0b' + snowflakeBinary).toString();
        return detail ? {id: snowflake, timestamp: timestamp} : snowflake;
    }

    tick() {
        this.increment = 0
        this.now = + new Date
    }
}

export interface SnowflakeOptions {
    workerId?: number;
    epoch?: number;
    nodeIdBits?: number;
    sequenceBits?: number;
}