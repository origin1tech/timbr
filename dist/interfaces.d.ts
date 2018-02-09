/// <reference types="node" />
import { IAnsiStyles } from 'colurs';
import { Timbr } from './timbr';
export declare type EventCallback = (message?: string, event?: ITimbrEventData) => void;
export declare type AnsiStyles = keyof IAnsiStyles;
export declare type OptionKeys = keyof ITimbrOptions;
export declare type TimbrSymbols = keyof ITimbrSymbols;
export declare type TimestampCallback = () => string;
export declare type TimestampFormat = false | 'epoch' | 'time' | 'datetime' | 'iso' | TimestampCallback;
export declare type TimbrMethod<L extends string> = (...args: any[]) => TimbrUnion<L>;
export declare type TimbrUnion<L extends string> = ITimbr<L> & Record<L, TimbrMethod<L>>;
export declare type DebuggerOrNamespace = string | ITimbrDebug | (string | ITimbrDebug)[];
export declare type BeforeWrite = (event?: ITimbrEventData) => string;
export interface IMap<T> {
    [key: string]: T;
}
export interface ITimbrLevelBase {
    styles?: string | string[];
    symbol?: string | TimbrSymbols;
    symbolPos?: string;
    symbolStyles?: string | string[];
}
export interface ITimbrLevel extends ITimbrLevelBase {
    label?: string;
}
export interface ITimbrLevels extends IMap<string | string[] | ITimbrLevel> {
}
export interface ITimbr<L extends string> extends Timbr {
    (...args: any[]): TimbrUnion<L>;
}
export interface ITimbrEventData {
    type: string;
    subTypes: string[];
    index: number;
    activeIndex: number;
    level: ITimbrLevel | ITimbrDebug;
    timestamp: string | number | Date;
    message: string;
    meta: IMap<any>;
    args: any[];
    error?: Error;
    stack?: IStacktraceResult;
    compiled?: any[];
}
export interface ITimbrParsedEvent extends ITimbrEventData {
    fn?: EventCallback;
}
export interface IStacktraceFrame {
    method: string;
    filename: string;
    relative: string;
    line: number;
    column: number;
}
export interface IStacktraceResult {
    stackFrames: IStacktraceFrame[];
    stackTrace: string[];
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
export interface ITimbrDebugOptions extends ITimbrLevelBase {
}
export interface ITimbrDebug extends ITimbrDebugOptions {
    (...args: any[]): any;
    namespace: string;
    previous: number;
    current: number;
    elapsed: number;
    enabled(): boolean;
    enable(): void;
    disable(): void;
    destroy(): void;
}
export interface ITimbrOptions {
    stream?: NodeJS.WritableStream;
    level?: string | number;
    colorize?: boolean;
    labelLevels?: boolean;
    padLevels?: boolean;
    timestamp?: TimestampFormat;
    timestampStyles?: AnsiStyles | AnsiStyles[];
    timestampLocale?: string;
    timestampTimezone?: string;
    errorCapture?: boolean;
    errorLevel?: string;
    errorExit?: boolean;
    errorConvert?: boolean;
    errorConstruct?: boolean;
    stackTrace?: boolean;
    stackDepth?: number;
    miniStack?: boolean;
    debugLevel?: string | false;
    debugOnly?: boolean;
    beforeWrite?: BeforeWrite;
}
