/// <reference types="node" />
import { EventEmitter } from 'events';
import { ITimbrOptions, IMap, OptionKeys, AnsiStyles, ITimbrLevels, TimbrUnion, ITimbrParsedEvent, ITimbrDebug, DebuggerOrNamespace, ITimbrDebugOptions } from './interfaces';
export declare const LOG_LEVELS: {
    error: string[];
    warn: string;
    info: string;
    trace: string;
    verbose: string;
    debug: {
        styles: string;
        indent: string;
        timestamp: boolean;
    };
};
export declare type LogLevelKeys = keyof typeof LOG_LEVELS;
export declare class Timbr extends EventEmitter {
    private _debuggers;
    private _activeDebuggers;
    private _levels;
    private _levelKeys;
    stream: NodeJS.WritableStream;
    options: ITimbrOptions;
    constructor(options?: ITimbrOptions, levels?: ITimbrLevels);
    /**
     * Init
     * Initializes intance using options.
     *
     * @param options Timbr options.
     * @param levels the levels to use for logging.
     */
    private init(options?, levels?);
    /**
     * Normalize Levels
     * Normalizes log levels ensuring error, exit and debug levels as well as styles.
     */
    private normalizeLevels();
    /**
     * Get Index
     * Gets the index of a value in an array.
     *
     * @param level the key to get the index for.
     * @param arr the array to be inspected.
     */
    private getIndex(level);
    /**
     * Parse Stack
     * Simple stack parser to limit and stylize stacktraces.
     *
     * @param stack the stacktrace to be parsed.
     * @param prune number of stack frames to prune.
     * @param depth the depth to trace.
     */
    private parseStack(stack, prune?, depth?);
    /**
     * Get Timestamp
     * Gets a timestamp by format.
     *
     * @param format the format to return.
     */
    private getTimestamp(format?);
    /**
     * Uncaught Exception
     * Handler for uncaught excrptions.
     *
     * @param err the error caught by process uncaughtException.
     */
    private uncaughtException(err);
    /**
     * Toggle Exception Handler
     * Toggles uncaughtException listener.
     *
     * @param capture whether to capture uncaught exceptions or not.
     */
    private toggleExceptionHandler(capture);
    /**
     * Pad
     * : Gets padding for level type.
     *
     * @param type the log level type.
     * @param offset additional offset.
     */
    private pad(type, offset?);
    /**
     * Prettify Object
     * Formats an object for display in terminal.
     *
     * @param obj the object to be prettified.
     */
    private prettifyObject(obj, padding);
    /**
     * Get
     * Gets a current option value.
     *
     * @param key the option key to get.
     */
    getOption<T>(key: OptionKeys): T;
    /**
     * Set
     * Sets options for Logger.
     *
     * @param key the key or options object to be set.
     * @param value the value for the key.
     */
    setOption(key: OptionKeys | ITimbrOptions, value?: any): void;
    /**
     * Colorize
     * Applies ansi styles to value.
     *
     * @param val the value to be colorized.
     * @param styles the styles to be applied.
     */
    colorize(val: any, styles: AnsiStyles | AnsiStyles[]): any;
    /**
     * Debugger
     * Creates a new debugger instance.
     *
     * @param options debugger options.
     */
    debugger(options: ITimbrDebugOptions): ITimbrDebug;
    /**
     * Debugger
     * Creates a new debugger instance.
     *
     * @param namespace creates a debugger by namespace.
     * @param options debugger options.
     */
    debugger(namespace?: string | ITimbrDebugOptions, options?: ITimbrDebugOptions): ITimbrDebug;
    readonly debuggers: {
        get: (namespace: string) => ITimbrDebug;
        set: (namespace: string, key: string, val: any) => any;
        getAll: () => IMap<ITimbrDebug>;
        create: (namespace: string, options?: ITimbrDebugOptions) => void;
        enabled: (namespaceOrInstance: string | ITimbrDebug) => boolean;
        enable: (namespaceOrInstance: DebuggerOrNamespace) => void;
        disable: (namespaceOrInstance: DebuggerOrNamespace) => void;
        destroy: (namespaceOrInstance: DebuggerOrNamespace) => void;
    };
    /**
     * Parse
     * Parses log arguments and compiles event.
     *
     * @param type the type of log message to log.
     * @param args the arguments to be logged.
     */
    parse(type: string, ...args: any[]): ITimbrParsedEvent;
    /**
     * Logger
     * Common logger method which calls .parse();
     *
     * @param type the type of message to be logged.
     * @param args the arguments to be logged.
     */
    logger(type: string, ...args: any[]): this;
    /**
     * Symbol
     * : Gets known symbol for terminal or returns empty string.
     *
     * @param name the name of the symbol to return.
     */
    symbol(name: string, styles?: AnsiStyles | AnsiStyles[]): any;
    /**
     * Write
     * : Directly outputs to stream after formatting.
     *
     * @param args arguments to output to stream directly.
     */
    writeLn(...args: any[]): this;
    /**
     * Concat
     * : Same as write but concats to stream without line return appended.
     *
     * @param args the arguments to format and output.
     */
    write(...args: any[]): this;
    /**
     * Exit
     * : Causes immediate exit.
     *
     * @param code the exit code if any.
     */
    exit(code?: number): void;
}
/**
 * Create
 * Creates a new instance of Timbr.
 *
 * @param options Timbr options.
 * @param levels the log levels to be used.
 */
export declare function create<L extends string>(options?: ITimbrOptions, levels?: ITimbrLevels): TimbrUnion<L>;
export declare function init(options?: ITimbrOptions): TimbrUnion<LogLevelKeys>;
