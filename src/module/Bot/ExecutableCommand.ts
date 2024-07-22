import { InteractionResponse, ChatInputCommandInteraction, CommandInteractionOption, ApplicationCommandOptionType, ApplicationCommandSubCommandData, ApplicationCommandNonOptionsData, ApplicationCommandChannelOptionData, ApplicationCommandAutocompleteNumericOptionData, ApplicationCommandAutocompleteStringOptionData, ApplicationCommandNumericOptionData, ApplicationCommandStringOptionData, ApplicationCommandRoleOptionData, ApplicationCommandUserOptionData, ApplicationCommandMentionableOptionData, ApplicationCommandBooleanOptionData, ApplicationCommandAttachmentOption, AutocompleteFocusedOption, AutocompleteInteraction, ApplicationCommandOptionChoiceData, User, GuildBasedChannel, Role, Attachment, CacheType, ApplicationCommandChoicesData, ApplicationCommandOptionData, ApplicationCommandChoicesOption, ApplicationCommandAutocompleteStringOption, ApplicationCommandAutocompleteNumericOption, ApplicationCommandStringOption, ApplicationCommandNumericOption } from "discord.js";
import { CommandOption } from "./Command";
import { Reply } from "./Reply";
import { MessageBuilder } from "./MessageBuilder";
import { OptionMap } from "./CommandManager";

export interface CommandExecuteInteraction {
    /** Same as method defferReply(), but is ephemeral */
    deferSlient: () => Promise<InteractionResponse<true>>
}
type ExecuteFnInGuild<Options> = (interaction: ChatInputCommandInteraction<'cached'> & CommandExecuteInteraction, options: Options) => OrPromise<void | any | Error | Reply>;
type ExecuteFn<Options> = (interaction: ChatInputCommandInteraction & CommandExecuteInteraction, options: Options) => OrPromise<void | any | Error | Reply>;

export abstract class ExecutableCommand {
    options = new Map<string, CommandOption>;
    _executeFnInGuild?: ExecuteFnInGuild<this['_options']>;
    _executeFn?: ExecuteFn<this['_options']>;
    _options!: {};
    name: string;
    description: string;
    constructor(name: string, description: string) {
        this.name = name;
        this.description = description;
    }

    async run(i: ChatInputCommandInteraction, options: Readonly<CommandInteractionOption[] | undefined>) {
        const data = options ? options.map(option => {
            switch (option.type) {
                case ApplicationCommandOptionType.String: 
                case ApplicationCommandOptionType.Integer: 
                case ApplicationCommandOptionType.Number: 
                case ApplicationCommandOptionType.Boolean: 
                    return [option.name, option.value];
                case ApplicationCommandOptionType.Attachment:
                    return [option.name, option.attachment]
                case ApplicationCommandOptionType.Channel:
                    return [option.name, option.channel];
                case ApplicationCommandOptionType.Mentionable:
                    return [option.name, option.user ?? option.member ?? option.role];
                case ApplicationCommandOptionType.Role:
                    return [option.name, option.role];
                case ApplicationCommandOptionType.User:
                    return [option.name, option.user];
                case ApplicationCommandOptionType.Subcommand: 
                case ApplicationCommandOptionType.SubcommandGroup: 
                    throw '';
            }
        }) : undefined;
        
        const feedback = (reply: any) => {
            if (!reply) return;
            if (reply instanceof Error) {
                i[i.deferred ? 'followUp' : 'reply' ]({content: reply.message, ephemeral: true})
            } else if (reply instanceof Reply) reply.reply(i);
            else if (reply instanceof MessageBuilder) reply.reply(i);
            else {
                i[i.deferred ? 'followUp' : 'reply' ]({content: `${reply}`, ephemeral: true})
            }
        }
        const additional: CommandExecuteInteraction = { deferSlient: async () => await i.deferReply({ephemeral: true})}
        Object.assign(i, additional)
        try {
            if (i.inCachedGuild()) {
                if (this._executeFnInGuild) {
                    const reply = await this._executeFnInGuild(i as CommandExecuteInteraction & ChatInputCommandInteraction<'cached'>, Object.fromEntries(data ?? []));
                    feedback(reply);
                } else if (this._executeFn) {
                    const reply = await this._executeFn(i as CommandExecuteInteraction & ChatInputCommandInteraction, Object.fromEntries(data ?? []))
                    feedback(reply);
                }
            } else {
                if (!this._executeFn) return;
                const reply = await this._executeFn(i as CommandExecuteInteraction & ChatInputCommandInteraction, Object.fromEntries(data ?? []))
                feedback(reply);
            }
        } catch(err) {
            feedback(err);
        }
    }

    /**
     * Command execute method. In the Execute Function: 
     * - Return {@link Error} or {@link Reply} with message will direcly send an reply to user
     * - Read {@link Reply} to get more method for reply settings
     * @param fn Command execute function. When command is trigger, will execute this function for response.
     * @returns 
     */
    executeInGuild(fn: ExecuteFnInGuild<this['_options']>) {
        this._executeFnInGuild = fn;
        return this;
    }

    execute(fn: ExecuteFn<this['_options']>) {
        this._executeFn = fn;
        return this;
    }
    addInput<Name extends string, Required extends boolean, Type extends CommandOptionValueTypes, Options extends this['_options']>(name: Name, description: string, type: Type, config?: {required?: Required, type?: Type} & Omit<ApplicationCommandFilteredOptionData<Type>, 'name' | 'description' | 'type'>) {
        //@ts-expect-error
        const option = new CommandOption({
            ...config,
            type: type,
            name: name,
            description: description,
            autocomplete: config?.autocomplete ? true : undefined
        })
        if (config?.autocomplete) option.autocompleteFn = config.autocomplete;
        this.options.set(name, option);
        return this as unknown as this & {_options: Options & Record<Name, Required extends true ? CommandOptionTypesMap[Type] : CommandOptionTypesMap[Type] | undefined>};
    }
    string = this.setInput(ApplicationCommandOptionType.String);
    boolean = this.setInput(ApplicationCommandOptionType.Boolean);
    user = this.setInput(ApplicationCommandOptionType.User);
    attachment = this.setInput(ApplicationCommandOptionType.Attachment);
    channel = this.setInput(ApplicationCommandOptionType.Channel);
    mentionable = this.setInput(ApplicationCommandOptionType.Mentionable);
    role = this.setInput(ApplicationCommandOptionType.Role);
    integer = this.setInput(ApplicationCommandOptionType.Integer);
    number = this.setInput(ApplicationCommandOptionType.Number);

    setInputs<Options extends this['_options'], O>(callback: (execmd: ExecutableCommand) => ExecutableCommand & {_options: O}) {
        return callback(this) as unknown as this & {_options: Options & O}
    }

    private setInput<Type extends CommandOptionValueTypes>(type: Type) {
        return <Name extends string, Required extends boolean>
            (name: Name, description: string, config?: {required?: Required} & Omit<ApplicationCommandFilteredOptionData<Type>, 'name' | 'description' | 'type'>) => this.addInput(name, description, type, config)
    }

    toJSON() {
        const data: ApplicationCommandSubCommandData = {
            name: this.name,
            type: ApplicationCommandOptionType.Subcommand,
            description: this.description,
            options: [...this.options.values()].map(option => option.data)
        }
        return data;
    }
}

export type ApplicationCommandValueOptionData = 
| ApplicationCommandNonOptionsData
| ApplicationCommandChannelOptionData
| ApplicationCommandAutocompleteRestructure<ApplicationCommandAutocompleteNumericOptionData>
| ApplicationCommandAutocompleteRestructure<ApplicationCommandAutocompleteStringOptionData>
| ApplicationCommandNumericOptionData
| ApplicationCommandStringOptionData
| ApplicationCommandRoleOptionData
| ApplicationCommandUserOptionData
| ApplicationCommandMentionableOptionData
| ApplicationCommandBooleanOptionData
| ApplicationCommandAttachmentOption

export type ApplicationCommandFilteredOptionData<T extends CommandOptionValueTypes> = 
    T extends ApplicationCommandOptionType.Attachment ? ApplicationCommandAttachmentOption
    : T extends ApplicationCommandOptionType.Boolean ? ApplicationCommandBooleanOptionData
    : T extends ApplicationCommandOptionType.String ? ApplicationCommandOptionRestructure<string>
    : T extends ApplicationCommandOptionType.Number ? ApplicationCommandOptionRestructure<number>
    : T extends ApplicationCommandOptionType.Channel ? ApplicationCommandChannelOptionData
    : T extends ApplicationCommandOptionType.User ? ApplicationCommandUserOptionData
    : T extends ApplicationCommandOptionType.Integer ? ApplicationCommandOptionRestructure<number>
    : T extends ApplicationCommandOptionType.Mentionable ? ApplicationCommandMentionableOptionData
    : T extends ApplicationCommandOptionType.Role ? ApplicationCommandRoleOptionData
    : ApplicationCommandStringOptionData

type ApplicationCommandOptionRestructure<T extends string | number> = 
(ApplicationCommandChoicesRestructure<T extends string ? ApplicationCommandStringOption : ApplicationCommandNumericOption> 
| ApplicationCommandAutocompleteRestructure<T extends string ? ApplicationCommandAutocompleteStringOption : ApplicationCommandAutocompleteNumericOption> ) 

type ApplicationCommandChoicesRestructure<T extends ApplicationCommandChoicesOption> = Omit<T, 'autocomplete'> & {autocomplete?: undefined} & (ApplicationCommandStringOption | ApplicationCommandNumericOption);
type ApplicationCommandAutocompleteRestructure<T extends {autocomplete: true}> = Omit<T, 'autocomplete'> & {autocomplete: AutocompleteFn, choices?: undefined}
export type AutocompleteFn = (focused: AutocompleteFocusedOption, options: OptionMap, i: AutocompleteInteraction<'cached'>) => Promise<ApplicationCommandOptionChoiceData[]> | ApplicationCommandOptionChoiceData[]
export type AutocompleteOptionMap = Map<string, CommandInteractionOption<CacheType>>

type CommandOptionValueTypes = Exclude<ApplicationCommandOptionType, 1 | 2>;

type CommandOptionTypesMap = {
    3: string;
    4: number;
    5: boolean;
    6: User;
    7: GuildBasedChannel;
    8: Role;
    9: unknown;
    10: number;
    11: Attachment;
}