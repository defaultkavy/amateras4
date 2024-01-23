export class Log {
    message: string;
    timestamp = Date.now();
    displaytime = new Intl.DateTimeFormat('en', {day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', hour12: false, second: '2-digit', minute: '2-digit'})
    constructor(message: string) {
        this.message = message;
        this.stdout();
    }

    stdout() {
        console.log(`${this.displaytime.format(this.timestamp)} ${this.message}`)
    }
}

export class ErrLog extends Error {
    timestamp = Date.now();
    displaytime = new Intl.DateTimeFormat('en', {day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', hour12: false, second: '2-digit', minute: '2-digit'})
    constructor(message: string | unknown) {
        super(message as any);
        this.stdout();
    }

    stdout() {
        console.log(`${this.displaytime.format(this.timestamp)} ERROR | ${this.message}`)
    }
}