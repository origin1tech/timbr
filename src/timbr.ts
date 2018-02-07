

import { EventEmitter } from 'events';
import { relative, parse } from 'path';
import { Colurs, IColurs } from 'colurs';
import { extend, isDebug, keys, isBoolean, isPlainObject, isError, first, last, noop, isFunction, isNumber, toArray, toInteger, contains, isString, clone, isWindows, isEmpty } from 'chek';
import { IStacktraceFrame, IStacktraceResult, ITimbrEventData, ITimbrOptions, EventCallback, IMap, OptionKeys, AnsiStyles, ITimbrLevels, TimbrUnion, ITimbrDebugger, ITimbrLevel, ITimbr, TimestampCallback, ITimestamp, TimestampFormat, ITimestampResult } from './interfaces';
import { format, inspect } from 'util';

const IS_SYMBOLS_SUPPORTED = !isWindows() || process.env.VSCODE_PID || process.env.CI;
const EOL = '\n';
const colurs: IColurs = new Colurs();

// Build symbols.
const SYMBOLS = {
  error: IS_SYMBOLS_SUPPORTED ? '✖' : 'x',
  warn: IS_SYMBOLS_SUPPORTED ? '⚠' : '!!',
  info: IS_SYMBOLS_SUPPORTED ? 'ℹ' : 'i',
  trace: IS_SYMBOLS_SUPPORTED ? '◎' : 'o',
  debug: IS_SYMBOLS_SUPPORTED ? '✱' : '*',
  ok: IS_SYMBOLS_SUPPORTED ? '✔' : '√'
};

export const LOG_LEVELS = {
  error: ['bold', 'red'],
  warn: 'yellow',
  info: 'green',
  trace: 'cyan',
  debug: 'blue'
};

export type LogLevelKeys = keyof typeof LOG_LEVELS;

const DEFAULTS: ITimbrOptions = {
  stream: undefined,      // the stream to output log messages to.
  level: 'info',          // the level the logger is current set at.
  labelLevels: true,      // when true level label prefixes log message.
  padLevels: true,        // when true levels are padded on the left.
  colorize: true,         // whether or not to colorize output.
  errorExit: false,       // exit on error level.
  errorConvert: false,    // if first arg is error instance convert to error level.
  errorCapture: false,    // whether or not to capture uncaught errors.
  errorLevel: 'error',    // level to use for errors.
  errorConstruct: false,  // when true if error level convert msg to instanceof Error.
  stackTrace: true,       // whether or not to display full stack trace for errors.
  stackDepth: 0,          // the depth of stack traces results 0 for full stack.
  prettyStack: false,     // whether or not to prettify the stack trace.
  miniStack: false,       // mini stack trace appended to message.
  timestamp: 'time',      // timestamp format date, time or false.
  debugLevel: 'debug',    // level to use for debug.
  debugAuto: true,        // when true switch to debug level on Node debug detected.
  debugOnly: false        // when debugging only show debug level messages.
};

export class Timbr extends EventEmitter {

  private _debuggers: IMap<ITimbrDebug> = {};
  private _activeDebuggers: string[] = [];

  private _levels: ITimbrLevels;
  private _levelKeys: string[];
  private _symbols = SYMBOLS;

  stream: NodeJS.WritableStream;
  options: ITimbrOptions;

  constructor(options?: ITimbrOptions, levels?: ITimbrLevels) {
    super();
    this.init(options, levels);
  }

  /**
   * Init
   * Initializes intance using options.
   *
   * @param options Timbr options.
   * @param levels the levels to use for logging.
   */
  private init(options?: ITimbrOptions, levels?: ITimbrLevels) {

    options = this.options = extend({}, DEFAULTS, this.options, options);
    colurs.setOption('enabled', this.options.colorize);

    levels = levels || this._levels;

    if (isEmpty(levels))
      throw new Error('Cannot init Timbr using levels of undefined.');

    this._levels = levels;
    this._levelKeys = keys(levels);
    this.normalizeLevels();

    // Toggle the exception handler.
    this.toggleExceptionHandler(true);

    this.stream = options.stream || this.stream || process.stdout;

    if ((isDebug() || process.env.DEBUG) && options.debugAuto) {
      const debugLevel = options.debugLevel;
      if (~this._levelKeys.indexOf(<string>debugLevel))
        options.level = <string>debugLevel;
      if (process.env.DEBUG)
        this.addDebugger(process.env.DEBUG);
    }

    // Init methods.
    this._levelKeys.forEach((l, i) => {
      this[l] = this.logger.bind(this, l);
    });

  }

  /**
   * Normalize Levels
   * Normalizes log levels ensuring error, exit and debug levels as well as styles.
   */
  private normalizeLevels() {

    for (const k in this._levels) {
      if (!isPlainObject(this._levels[k])) {
        let level = this._levels[k];
        level = {
          label: k,
          styles: toArray(level, []),
          symbol: null,
          symbolPos: 'after'
        };
        this._levels[k] = level;
      }
      else {
        const lvl = this._levels[k] as ITimbrLevel;
        this._levels[k] = extend({}, lvl);
        lvl.label = lvl.label || k;
        lvl.styles = toArray(lvl.styles, []);
      }
    }

    const levelKeys = this._levelKeys;

    let level: any = this.options.level;
    const debugLevel = this.options.debugLevel;
    const errorLevel = this.options.errorLevel;
    const exitLevel = this.options.errorExit;

    let tmpLevel = level;
    if (isNumber(level))
      tmpLevel = levelKeys[level] || 'info';

    // ensure a level, if none select last.
    if (!~levelKeys.indexOf(tmpLevel))
      tmpLevel = last(levelKeys);
    level = this.options.level = tmpLevel;

    // ensure debug level.
    if (!~levelKeys.indexOf(debugLevel))
      this.options.debugLevel = last<string>(this._levelKeys);

    // ensure error level
    if (!~levelKeys.indexOf(errorLevel))
      this.options.errorLevel = first<string>(this._levelKeys);

  }

  /**
   * Is Debug
   * Returns true if level matches debug level.
   */
  private isDebugging() {
    return this.options.level === this.options.debugLevel;
  }

  /**
   * Get Index
   * Gets the index of a value in an array.
   *
   * @param level the key to get the index for.
   * @param arr the array to be inspected.
   */
  private getIndex(level: any) {
    return this._levelKeys.indexOf(level);
  }

  /**
   * Colorize
   * Applies ansi styles to value.
   *
   * @param val the value to be colorized.
   * @param styles the styles to be applied.
   */
  private colorize(val: any, styles: AnsiStyles | AnsiStyles[]) {
    if (!styles || !styles.length)
      return val;
    return colurs.applyAnsi(val, styles);
  }

  /**
   * Colorize If
   * If colors are enabled apply ansi styles to value.
   *
   * @param val the value to be colorized.
   * @param styles the styles to be applied.
   */
  private colorizeIf(val: any, styles?: AnsiStyles | AnsiStyles[]) {
    if (!this.options.colorize)
      return val;
    return this.colorize(val, styles);
  }

  /**
   * Parse Stack
   * Simple stack parser to limit and stylize stacktraces.
   *
   * @param stack the stacktrace to be parsed.
   * @param prune number of stack frames to prune.
   * @param depth the depth to trace.
   */
  private parseStack(stack: any, prune?: number, depth?: number): IStacktraceResult {

    prune = prune || 0;
    depth = depth || this.options.stackDepth;

    if (!stack)
      return null;

    const frames = [];
    const traced = [];
    let miniStack;

    stack.split(EOL)
      .slice(prune)
      .forEach((s, i) => {

        if (i >= depth && depth !== 0)
          return;

        let relativeFile, filename, column, line, method;

        method = s;
        method = s.replace(/^\s*at\s?/, '').split(' ')[0];
        s = s.replace(/^\s+/, '').replace(/^.+\(/, '').replace(/\)$/, '');
        s = s.split(':');
        filename = s[0];
        column = s[1];
        line = s[2];

        const isModule = /^module/.test(filename);
        relativeFile = filename;

        // Make path relative to cwd if not
        // module.js, bootstrap_node.js etc.
        if (/^\//.test(filename) && !isModule)
          relativeFile = `/${relative(process.cwd(), filename)}`;

        const parsedRelative = isModule ? filename : parse(relativeFile);

        const frame = {
          method: method,
          filename: filename,
          relative: relativeFile,
          line: toInteger(line, 0),
          column: toInteger(column, 0)
        };

        // const trace = `    at ${this.colorizeIf(method || 'uknown', 'magenta')} (${this.colorizeIf(relativeFile, 'green')}:${this.colorizeIf(line, 'yellow')}:${this.colorizeIf(column, 'yellow')})`;

        const trace = this.colorizeIf(`    at ${method} (${relativeFile}:${line}:${column})`, 'gray');

        if (i === 0)
          miniStack = this.colorizeIf(`(${parsedRelative.base}:${line}:${column})`, 'gray');

        frames.push(frame);
        traced.push(trace);

      });

    return {
      frames: frames,
      stack: traced,
      miniStack: miniStack
    };

  }

  /**
   * Get Timestamp
   * Gets a timestamp by format.
   *
   * @param format the format to return.
   */
  private getTimestamp(format?: TimestampFormat | ITimestamp) {

    format = format || this.options.timestamp;

    let config: ITimestampResult = {
      format: 'time',
      styles: 'gray',
      date: new Date(),
      timestamp: null
    };

    if (isPlainObject(format)) {
      extend(config, format);
    }
    else {
      config.format = format as TimestampFormat;
    }

    if (isFunction(config.format)) {
      config.timestamp = (config.format as TimestampCallback)();
    }
    else {
      const ts = config.date.toISOString();
      const split = ts.replace('Z', '').split('T');
      if (config.format === 'time')
        config.timestamp = split[1];
      else
        config.timestamp = `${split[0]} ${split[1]}`;
    }

    return config;

  }

  /**
   * Uncaught Exception
   * Handler for uncaught excrptions.
   *
   * @param err the error caught by process uncaughtException.
   */
  private uncaughtException(err: Error) {
    let errorLevel = this.options.errorLevel;
    if (!this.options.errorCapture || !this.exists(errorLevel))
      throw err;
    const origLevel = errorLevel;
    errorLevel += ':exception';
    this.logger(errorLevel, err, () => {
      this.toggleExceptionHandler(false);
      process.exit(1); // always exit on uncaught errors.
    });
  }

  /**
   * Toggle Exception Handler
   * Toggles uncaughtException listener.
   *
   * @param capture whether to capture uncaught exceptions or not.
   */
  private toggleExceptionHandler(capture?: boolean) {
    if (!capture)
      process.removeListener('uncaughtException', this.uncaughtException.bind(this));
    else
      process.on('uncaughtException', this.uncaughtException.bind(this));
  }

  /**
   * Add Debugger
   * : Adds a debugger namespace if does not already exist.
   *
   * @param namespace the debugger namespace to add.
   * @param instance the debugger instance.
   */
  private addDebugger(namespace: string, instance: ITimbrDebug) {
    this._debuggers[namespace] = instance;
  }

  /**
   * Remove Debugger
   * : Removes the specified namespace from debuggers.
   *
   * @param namespace the debugger namespace to remove.
   */
  private destroyDebugger(namespace: string) {
    this._activeDebuggers = this._activeDebuggers.filter(a => a !== namespace);
    delete this._debuggers[namespace];
  }

  /**
   * Get Debugger
   * Gets a debugger.
   *
   * @param namespace the namespace to get debugger by.
   */
  private getDebugger(namespace: string) {
    return ~this._debuggers.indexOf(namespace);
  }

  /**
   * Get Debugger
   * Gets all debugger instances.
   */
  private getDebuggers(): IMap<ITimbrDebug> {
    return this._debuggers;
  }

  /**
   * Pad
   * : Gets padding for level type.
   *
   * @param type the log level type.
   * @param offset additional offset.
   */
  private pad(type: string, offset?: number | string) {

    if (!this.options.padLevels)
      return '';

    let max = 0;
    let len = type.length;
    let i = this._levelKeys.length;
    let padding = '';
    offset = isString(offset) ? (offset as string).length : offset;
    offset = offset || 0;

    function pad(l) {
      let s = '';
      while (l--)
        s += ' ';
      return s;
    }

    const debugLevels = (this._debuggers || []).map(l => `debug-${l}`);
    const levels = this._levelKeys.concat(debugLevels);

    while (i--) {
      //  const diff = this._levelKeys[i].length - len;
      const diff = levels[i].length - len;
      if (diff > 0)
        padding = pad(diff + <number>offset);
    }

    return padding;

  }

  /**
   * Logger
   * : Common logger method.
   *
   * @param type the type of log message to log.
   * @param args the arguments to be logged.
   */
  logger(type: string, ...args: any[]) {

    const clone = args.slice(0);
    const origType = type;
    const splitType = type ? type.split(':') : null;
    type = splitType[0];

    // Flags used internally.
    const isResolve = contains(splitType, 'resolve');
    const isException = contains(splitType, 'exception');
    const debugGroup = type === 'debug' && splitType[1];
    const knownType = contains(this._levelKeys, type);
    let emitType = !debugGroup ? splitType[0] : origType;

    let stackTrace: IStacktraceResult;
    let err, errMsg, meta, metaFormatted, tsFmt, tsDate, msg, normalized, rawMsg, errType;
    let event: ITimbrEventData;
    let fn: EventCallback = noop;

    const result = [];
    const suffix = [];
    let pruneTrace = 1;

    // Converts to error if first arg is instance of Error.
    if ((clone[0] instanceof Error) && this.options.errorConvert)
      type = this.options.errorLevel;

    if (type === this.options.errorLevel && this.options.errorConstruct && isString(clone[0])) {
      clone[0] = new Error(clone[0]);
      pruneTrace = 2;
    }

    const level = (knownType ? this._levels[type] : null) as ITimbrLevel;
    const idx = this.getIndex(type);
    const activeIdx = this.getIndex(this.options.level);

    // If debugOnly and we are debugging ensure is debug level.
    if (this.options.debugOnly &&
      this.isDebugging() &&
      type !== this.options.level)
      return this;

    // Check if is loggable level.
    if (!isResolve && (idx > activeIdx))
      return this;

    if (isFunction(last(clone))) {
      fn = clone.pop();
      args.pop();
    }

    meta = isPlainObject(last(clone)) ? clone.pop() : null;
    err = isError(first(clone)) ? clone.shift() : null;
    stackTrace = err ?
      this.parseStack(err.stack, pruneTrace) :
      this.parseStack((new Error('get stack')).stack, 2);

    // Add optional timestamp.
    if (this.options.timestamp) {
      const ts = this.getTimestamp();
      tsFmt = ts.timestamp;
      tsDate = ts.date;
      result.push(this.colorizeIf(`[${tsFmt}]`, ts.styles));
    }

    // Add error type if not generic 'Error'.
    errType = err && err.name !== 'Error' ? `:${err.name}` : '';

    // Add log label type.
    if (knownType && this.options.labelLevels) {

      let styledType = this.colorizeIf(type, level.styles);
      let styledDebugType = 'debug-' + debugGroup;
      let padType = type;

      if (debugGroup) {
        styledDebugType = this.colorizeIf(styledDebugType, level.styles);
        styledType += styledDebugType;
      }

      const padding = this.pad(type);
      styledType += this.colorizeIf(errType, level.styles);
      result.push(padding + styledType + ':');

    }

    // If error we need to build the message.
    if (err) {
      errMsg = (err.message || 'Uknown Error');
      clone.unshift(errMsg);
    }

    rawMsg = clone[0] || null;

    // Format the message.
    if (clone.length) {
      if (clone.length > 1) {
        if (/(%s|%d|%j|%%)/g.test(clone[0])) {
          rawMsg = format(clone[0], clone.slice(1));
          result.push(rawMsg);
        }
        else {
          rawMsg = clone.join(' ');
          result.push(rawMsg);
        }
      }
      else {
        result.push(clone[0]);
      }
    }

    // Add formatted metadata to result.
    if (meta) {
      metaFormatted = format(inspect(meta, null, null, this.options.colorize));
      result.push(metaFormatted);
    }

    // Add ministack.
    if (this.options.miniStack && stackTrace)
      result.push(this.colorizeIf(stackTrace.miniStack, 'gray'));

    // Add stack trace if error.
    if (err && stackTrace) {
      if (this.options.prettyStack)
        suffix.push(format(inspect(stackTrace.frames, null, null, this.options.colorize)));
      else
        suffix.push(stackTrace.stack.join(EOL));
    }

    msg = result.join(' ');
    msg = (suffix.length ? msg + EOL + suffix.join(EOL) : msg) + EOL;

    // Output to stream if not resolving event result.
    if (!isResolve)
      this.stream.write(msg);

    event = {
      timestamp: tsDate,
      type: type,
      message: rawMsg + (metaFormatted || ''),
      formatted: msg,
      meta: meta,
      args: args,
      error: err,
      stackTrace: stackTrace.frames,
    };

    // Emit logged and logged by type listeners.
    this.emit('log', event);
    this.emit(`log:${emitType}`, event);

    // Call local callback.
    fn(event);

    // Toggle the exception for.
    if (isException)
      this.toggleExceptionHandler(false);

    // If no ouput return object.
    if (isResolve)
      return event;

    // Check if should exit on error.
    if (type === this.options.errorLevel && this.options.errorExit)
      process.exit();

    return this;

  }

  /**
   * Exists
   * : Checks if level exists in levels.
   *
   * @param level the key to check.
   */
  exists(level: any) {
    return !!~this.getIndex(level);
  }

  /**
   * Get
   * Gets a current option value.
   *
   * @param key the option key to get.
   */
  getOption<T>(key: OptionKeys): T {
    return this.options[<string>key];
  }

  /**
   * Set
   * Sets options for Logger.
   *
   * @param key the key or options object to be set.
   * @param value the value for the key.
   */
  setOption(key: OptionKeys | ITimbrOptions, value?: any) {
    let toggleExceptionHandler = key === 'errorCapture';
    if (isPlainObject(key)) {
      const _keys = keys(key as ITimbrOptions);
      this.options = extend({}, this.options, key);
      if (contains(_keys, 'errorCapture'))
        toggleExceptionHandler = true;
    }
    else {
      this.options[<string>key] = value;
    }
    if (toggleExceptionHandler)
      this.toggleExceptionHandler(this.options.errorCapture);
  }

  /**
   * Debugger
   * : Creates a new grouped debugger.
   *
   * @param namespace enables debugging by active group.
   */
  debugger(namespace: string): ITimbrDebug {

    // If no debuggers yet add unless explicitly disabled.
    // if ((!this._debuggers.length && enabled !== false) || enabled === true)
    //   this.addDebugger(group);

    // if (enabled === false)
    //   this.removeDebugger(group);

    // if (this.getDebugger(namespace))
    //   this.destroyDebugger(namespace);
    // else
    //   this.addDebugger(namespace);

    // return {
    //   log: (...args: any[]) => {
    //     if (!~this._debuggers.indexOf(namespace))
    //       return;
    //     this.logger(`debug:${namespace}`, ...args);
    //   },
    //   write: (...args: any[]) => {
    //     if (!~this._debuggers.indexOf(namespace))
    //       return;
    //     this.write(...args);
    //   },
    //   exit: this.exit
    //   // enable: this.addDebugger.bind(this, group),
    //   // disable: this.removeDebugger.bind(this, group)
    // };

    const self = this;
    let previous;

    const debug: any = function (...args: any[]) {

      const current = +new Date();
      const elapsed = current - (previous || current);

      debug.previous = previous;
      debug.current = current;
      debug.elasped = elapsed;
      previous = current;

      const result = self.logger('debug:resolve', ...args);

    };

    debug.namespace = namespace;
    debug.enabled = true;
    debug.colorize = true;
    debug.styles = [];
    debug.destroy = self.debuggers.destroy.bind(self, namespace);

    return debug;

  }

  get debuggers() {

    function toNamespace(instance: string | ITimbrDebug): string {
      if (isString(instance))
        return instance as string;
      return (instance as ITimbrDebug).namespace;
    }

    const methods = {

      /**
       * Create
       * Creates a debugger.
       *
       * @param namespace the namespace of the debugger to be created.
       */
      create: (namespace: string) => {
        const instance = this.debugger(namespace);
        this._debuggers[namespace] = instance;
      },

      enable: (namespace: string | ITimbrDebug) => {
        const ns = toNamespace(namespace);
        if (!~this._activeDebuggers.indexOf(ns))
          this._activeDebuggers.push(ns);
      },

      disable: (namespace: string | ITimbrDebug) => {
        const ns = toNamespace(namespace);
        this._activeDebuggers.splice(this._activeDebuggers.indexOf(ns), 1);
      },

      destroy: (namespace: string | ITimbrDebug) => {
        const ns = toNamespace(namespace);
        delete this._debuggers[ns];
      }

    };

    return methods;

  }

  /**
   * Symbol
   * : Gets known symbol for terminal or returns empty string.
   *
   * @param name the name of the symbol to return.
   */
  symbol(name: string, styles?: AnsiStyles | AnsiStyles[]) {
    if (this._symbols[name])
      name = this._symbols[name];
    styles = toArray(styles, []);
    if (!styles.length)
      return name;
    return colurs.applyAnsi(name, styles);
  }

  /**
   * Write
   * : Directly outputs to stream after formatting.
   *
   * @param args arguments to output to stream directly.
   */
  write(...args: any[]) {
    const obj = this.logger('write:resolve', ...args) as ITimbrEventData;
    this.stream.write(obj.message + EOL);
  }

  /**
   * Concat
   * : Same as write but concats to stream without line return appended.
   *
   * @param args the arguments to format and output.
   */
  concat(...args: any[]) {
    const obj = this.logger('write:resolve', ...args) as ITimbrEventData;
    this.stream.write(obj.message);
    return this;
  }

  /**
   * Exit
   * : Causes immediate exit.
   *
   * @param code the exit code if any.
   */
  exit(code?: number) {
    process.exit(code || 0);
  }

  // DEPRECATED

  /**
   * Get
   * Gets a current option value.
   *
   * @param key the option key to get.
   */
  get<T>(key: OptionKeys): T {
    return this.options[<string>key];
  }

  /**
   * Set
   * Sets options for Logger.
   *
   * @param key the key or options object to be set.
   * @param value the value for the key.
   */
  set(key: OptionKeys | ITimbrOptions, value?: any) {
    let toggleExceptionHandler = key === 'errorCapture';
    if (isPlainObject(key)) {
      const _keys = keys(key as ITimbrOptions);
      this.options = extend({}, this.options, key);
      if (contains(_keys, 'errorCapture'))
        toggleExceptionHandler = true;
    }
    else {
      this.options[<string>key] = value;
    }
    if (toggleExceptionHandler)
      this.toggleExceptionHandler(this.options.errorCapture);
  }

}

/**
 * Create
 * Creates a new instance of Timbr.
 *
 * @param options Timbr options.
 * @param levels the log levels to be used.
 */
export function create<L extends string>(options?: ITimbrOptions, levels?: ITimbrLevels): TimbrUnion<L> {

  let logger;

  const instance = new Timbr(options, levels);

  function Logger(...args: any[]) {
    if (args.length) {
      const obj = instance.logger('log:resolve', ...args) as ITimbrEventData;
      instance.stream.write(obj.message + EOL);
    }
    return logger;
  }

  for (const id in instance) {
    Logger[id] = instance[id];
  }

  // logger = intersect(Logger, instance);
  return Logger as TimbrUnion<L>;

}

// Inits a default instance.
export function init(options?: ITimbrOptions): TimbrUnion<LogLevelKeys> {
  return create<LogLevelKeys>(options, LOG_LEVELS);
}

export interface ITimbrDebug {
  (...args: any[]);
  namespace: string;
  colorize: boolean;
  styles: AnsiStyles | AnsiStyles[];
  previous: number;
  current: number;
  elapsed: number;
  enabled: boolean;
  destroy(): void;
}



