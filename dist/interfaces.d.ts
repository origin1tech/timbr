/// <reference types="node" />
import { EventEmitter } from 'events';
import { IAnsiStyles } from 'colurs';
export declare type RecordMethods<T, L extends string> = Record<L, {
    (...args): T;
}>;
export declare type ExtendWithMethods<T, L extends string> = T & RecordMethods<T, L>;
export declare type EventCallback = (event: ITimbrEventData) => void;
export declare type AnsiStyles = keyof IAnsiStyles;
export declare type OptionKeys = keyof ITimbrOptions;
export interface IMap<T> {
    [key: string]: T;
}
export interface ITimbrEventData {
    timestamp: string;
    type: string;
    message: string;
    meta: IMap<any>;
    args: any[];
    error?: Error;
    stackTrace?: IStacktraceFrame[];
}
export interface ITimbrStyles {
    [key: string]: AnsiStyles | AnsiStyles[];
}
export interface WritableStream extends EventEmitter {
    writable: boolean;
    write(buffer: Buffer | string, cb?: Function): boolean;
    write(str: string, encoding?: string, cb?: Function): boolean;
    end(): void;
    end(buffer: Buffer, cb?: Function): void;
    end(str: string, cb?: Function): void;
    end(str: string, encoding?: string, cb?: Function): void;
}
export interface IStacktraceFrame {
    method: string;
    filename: string;
    relative: string;
    line: number;
    column: number;
}
export interface IStacktraceResult {
    frames: IStacktraceFrame[];
    stack: string[];
    miniStack: string;
}
export interface ITimbrOptions {
    stream?: WritableStream;
    timestamp?: boolean | 'time' | 'datetime';
    level?: string | number;
    padLevels?: boolean;
    labelLevels?: boolean;
    colorize?: boolean;
    errorCapture?: boolean;
    errorExit?: boolean;
    errorConvert?: boolean;
    errorLevel?: string;
    errorConstruct?: boolean;
    stackTrace?: boolean;
    stackDepth?: number;
    prettyStack?: boolean;
    miniStack?: boolean;
    debugLevel?: string;
    debuggers?: string | string[];
    debugAuto?: boolean;
    styles?: ITimbrStyles;
    enabled?: boolean;
}
