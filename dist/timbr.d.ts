/// <reference types="node" />
import { EventEmitter } from 'events';
import { WritableStream, ITimbrEventData, ITimbrOptions, ExtendWithMethods, OptionKeys } from './interfaces';
export declare class TimbrInstance extends EventEmitter {
    private _debuggers;
    private _colurs;
    private _levels;
    stream: WritableStream;
    options: ITimbrOptions;
    constructor(options?: ITimbrOptions, ...levels: string[]);
    /**
     * Normalize Levels
     * : Normalizes log levels ensuring error, exit and debug levels as well as styles.
     *
     * @param levels custom log levels if provided.
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
    private colorizeIf(val, styles);
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
     * Pad
     * : Gets padding for level type.
     *
     * @param type the log level type.
     * @param offset additional offset.
     */
    private pad(type, offset?);
    /**
     * Logger
     * Private common logger method.
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
    get<T>(key: OptionKeys): T;
    /**
     * Set
     * Sets options for Logger.
     *
     * @param key the key or options object to be set.
     * @param value the value for the key.
     */
    set(key: OptionKeys | ITimbrOptions, value?: any): void;
    /**
     * Debugger
     * : Creates a new grouped debugger.
     *
     * @param group enables debugging by active group.
     * @param enabled when true disables group.
     */
    debugger(group: string, enabled?: boolean): {
        log: (...args: any[]) => this;
        write: (...args: any[]) => this;
        exit: (code?: number) => void;
        enable: any;
        disable: any;
    };
    /**
     * Debuggers
     * : Returns list of debuggers.
     */
    debuggers(): string[];
    /**
     * Write
     * : Directly outputs to stream after formatting.
     *
     * @param args arguments to output to stream directly.
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
export declare class Timbr extends TimbrInstance {
    constructor(options?: ITimbrOptions);
    /**
     * Error
     * : Used for logging application errors.
     *
     * @param args arguments to be logged.
     */
    error(...args: any[]): this;
    /**
     * Warn
     * : Used for logging application warning.
     *
     * @param args arguments to be logged.
     */
    warn(...args: any[]): this;
    /**
     * Info
     * : Used for logging application information.
     *
     * @param args arguments to be logged.
     */
    info(...args: any[]): this;
    /**
     * Trace
     * : Used for logging application tracing.
     *
     * @param args arguments to be logged.
     */
    trace(...args: any[]): this;
    /**
     * Debug
     * : Used for debugging application.
     *
     * @param args arguments to be logged.
     */
    debug(...args: any[]): this;
    /**
     * Factory
     * : Factory to create custom instance of Timbr.
     *
     * @param options the Timbr options.
     * @param levels the custom log levels to extend Timbr with.
     */
    create<L extends string>(options: ITimbrOptions, ...levels: L[]): ExtendWithMethods<TimbrInstance, L>;
}
export declare const create: <L extends string>(options?: ITimbrOptions, ...levels: L[]) => ExtendWithMethods<TimbrInstance, L>;
export { create as get };
