/// <reference types="node" />
import { IAnsiStyles } from 'colurs';
import { Timbr } from './timbr';
export declare type EventCallback = (event: ITimbrEventData) => void;
export declare type AnsiStyles = keyof IAnsiStyles;
export declare type OptionKeys = keyof ITimbrOptions;
export declare type TimbrSymbols = keyof ITimbrSymbols;
export declare type TimestampCallback = () => string;
export declare type TimestampFormat = 'time' | 'datetime' | TimestampCallback;
export declare type TimbrMethod<L extends string> = (...args: any[]) => TimbrUnion<L>;
export declare type TimbrUnion<L extends string> = ITimbr<L> & Record<L, TimbrMethod<L>>;
export interface IMap<T> {
    [key: string]: T;
}
export interface ITimbrLevel {
    label?: string;
    styles?: AnsiStyles | AnsiStyles[];
    symbol?: string | TimbrSymbols;
    symbolPos?: 'before' | 'after';
}
export interface ITimbrLevels extends IMap<string | string[] | ITimbrLevel> {
}
export interface ITimbr<L extends string> extends Timbr {
    (...args: any[]): TimbrUnion<L>;
}
export interface ITimbrEventData {
    timestamp: string;
    type: string;
    message: string;
    formatted: string;
    meta: IMap<any>;
    args: any[];
    error?: Error;
    stackTrace?: IStacktraceFrame[];
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
export interface ITimbrSymbols {
    error: string;
    warn: string;
    info: string;
    trace: string;
    debug: string;
    ok: string;
}
export interface ITimestamp {
    format: TimestampFormat;
    styles?: AnsiStyles | AnsiStyles[];
}
export interface ITimestampResult extends ITimestamp {
    date: Date;
    timestamp: string;
}
export interface ITimbrOptions {
    stream?: NodeJS.WritableStream;
    timestamp?: TimestampFormat | ITimestamp;
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
    debugAuto?: boolean;
    debugOnly?: boolean;
}
export interface ITimbrDebugger {
    log(...args: any[]): void;
    write(...args: any[]): void;
    exit(code: number): void;
}
