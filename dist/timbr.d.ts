/// <reference types="node" />
import { EventEmitter } from 'events';
import { ITimbrEventData, ITimbrOptions, OptionKeys, AnsiStyles, ITimbrLevels, TimbrUnion, ITimbrDebugger } from './interfaces';
export declare const LOG_LEVELS: {
    error: string[];
    warn: string;
    info: string;
    trace: string;
    debug: string;
};
export declare type LogLevelKeys = keyof typeof LOG_LEVELS;
export declare class Timbr extends EventEmitter {
    private _debuggers;
    private _levels;
    private _levelKeys;
    private _symbols;
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
     * Is Debug
     * Returns true if level matches debug level.
     */
    private isDebugging();
    /**
     * Get Index
     * Gets the index of a value in an array.
     *
     * @param level the key to get the index for.
     * @param arr the array to be inspected.
     */
    private getIndex(level);
    /**
     * Colorize
     * Applies ansi styles to value.
     *
     * @param val the value to be colorized.
     * @param styles the styles to be applied.
     */
    private colorize(val, styles);
    /**
     * Colorize If
     * If colors are enabled apply ansi styles to value.
     *
     * @param val the value to be colorized.
     * @param styles the styles to be applied.
     */
    private colorizeIf(val, styles?);
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
    private toggleExceptionHandler(capture?);
    /**
     * Add Debugger
     * : Adds a debugger group if does not already exist.
     *
     * @param group the debugger group to add.
     */
    private addDebugger(group);
    /**
     * Remove Debugger
     * : Removes the specified group from debuggers.
     *
     * @param group the debugger group to remove.
     */
    private removeDebugger(group);
    /**
     * Exists Debugger
     * Checks if a debugger exists.
     *
     * @param group the group to be checked.
     */
    private existsDebugger(group);
    /**
     * Pad
     * : Gets padding for level type.
     *
     * @param type the log level type.
     * @param offset additional offset.
     */
    private pad(type, offset?);
    /**
     * Logger
     * : Common logger method.
     *
     * @param type the type of log message to log.
     * @param args the arguments to be logged.
     */
    logger(type: string, ...args: any[]): ITimbrEventData | this;
    /**
     * Exists
     * : Checks if level exists in levels.
     *
     * @param level the key to check.
     */
    exists(level: any): boolean;
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
     * Debugger
     * : Creates a new grouped debugger.
     *
     * @param group enables debugging by active group.
     */
    debugger(group: string): ITimbrDebugger;
    /**
     * Debuggers
     * : Returns list of debuggers.
     */
    debuggers(): string[];
    /**
     * Symbol
     * : Gets known symbol for terminal or returns empty string.
     *
     * @param name the name of the symbol to return.
     */
    symbol(name: string, styles?: AnsiStyles | AnsiStyles[]): string | any[];
    /**
     * Write
     * : Directly outputs to stream after formatting.
     *
     * @param args arguments to output to stream directly.
     */
    write(...args: any[]): void;
    /**
     * Concat
     * : Same as write but concats to stream without line return appended.
     *
     * @param args the arguments to format and output.
     */
    concat(...args: any[]): this;
    /**
     * Exit
     * : Causes immediate exit.
     *
     * @param code the exit code if any.
     */
    exit(code?: number): void;
    /**
     * Get
     * Gets a current option value.
     *
     * @param key the option key to get.
     */
    get<T>(key: OptionKeys): T;
    /**
     * Set
     * Sets options for Logger.
     *
     * @param key the key or options object to be set.
     * @param value the value for the key.
     */
    set(key: OptionKeys | ITimbrOptions, value?: any): void;
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
