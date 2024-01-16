type Class<T extends (...args: any) => any> = ReturnType<T>;

type Split<String extends string, Divider extends string> = 
    string extends String ? string[] : 
    String extends '' ? [] : 
    String extends `${infer T}${Divider}${infer U}` ? [T, ...Split<U, Divider>] : [String];

type Dig<O extends Object, Path extends string> = 
    Path extends '' ? never :
    Path extends `${infer Name}.${infer Tree}` ? 
        Name extends keyof O ? 
            O[Name] extends Object ? Dig<O[Name], Tree> : O[Name] 
        : never
    : Path extends keyof O ? O[Path] : never

type ResolveObject<O extends Object, P extends string> = {
    [key in P]: Dig<O, P>
}

type DeepPartial<O extends Object> = {
    [key in keyof O]?: O[key] extends Object ? DeepPartial<O[key]> : O[key]
}

type Multiple<T> = T | T[]

type OrPromise<T> = T | Promise<T>
