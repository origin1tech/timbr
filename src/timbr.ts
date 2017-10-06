
import { EventEmitter } from 'events';
import { relative, parse } from 'path';
import { Colurs, IColurs } from 'colurs';
import { extend, isDebug, keys, isBoolean, isPlainObject, isError, first, last, noop, isFunction, isNumber, toArray, toInteger, contains, isString, clone } from 'chek';
import { IStacktraceFrame, IStacktraceResult, WritableStream, ITimbrEventData, ITimbrOptions, ITimbrStyles, EventCallback, IMap, ExtendWithMethods, OptionKeys, RecordMethods } from './interfaces';
import { format, inspect } from 'util';
import { EOL } from 'os';

const STYLES: ITimbrStyles = {
  error: ['bold', 'red'],
  warn: 'yellow',
  info: 'green',
  trace: 'cyan',
  debug: 'blue'
};

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
  debuggers: [],          // active debug groups.
  debugAuto: true,        // when true switch to debug level on Node debug detected.
  styles: STYLES,         // ansi styles for coloring log messages.
  enabled: true,          // used in testing.
};

export class TimbrInstance extends EventEmitter {

  private _debuggers: string[] = [];
  private _colurs: IColurs;
  private _levels: string[];

  stream: WritableStream;
  options: ITimbrOptions;

  constructor(options?: ITimbrOptions, ...levels: string[]) {

    super();

    this.options = extend({}, DEFAULTS, options);

    // Normalizes when custom.
    this._levels = levels;
    this.normalizeLevels();

    if (isDebug() && this.options.debugAuto) {
      const debugLevel = this.options.debugLevel;
      if (~levels.indexOf(<string>debugLevel))
        this.options.level = <string>debugLevel;
    }

    if (this.options.errorCapture)
      this.toggleExceptionHandler(true);

    this.stream = this.options.stream || process.stdout;
    this._colurs = new Colurs({ enabled: this.options.colorize });

    if (this.options.debuggers.length)
      this._debuggers = isString(this.options.debuggers) ? [<string>this.options.debuggers] : this.options.debuggers as string[];

    // Init methods.
    levels.forEach((l, i) => {
      this[l] = this.logger.bind(this, l);
      return this;
    });


  }

  /**
   * Normalize Levels
   * : Normalizes log levels ensuring error, exit and debug levels as well as styles.
   *
   * @param levels custom log levels if provided.
   */
  private normalizeLevels() {

    const levels = this._levels;

    const baseStyles: any = [
      'red',
      'yellow',
      'green',
      'cyan',
      'blue',
      'magenta',
      'gray'
    ];

    let level: any = this.options.level;
    const debugLevel = this.options.debugLevel;
    const errorLevel = this.options.errorLevel;
    const exitLevel = this.options.errorExit;

    let tmpLevel = level;
    if (isNumber(level))
      tmpLevel = levels[level] || 'info';

    if (!~levels.indexOf(tmpLevel))
      tmpLevel = last(levels);
    level = this.options.level = tmpLevel;

    // ensure debug level.
    if (!~levels.indexOf(debugLevel))
      this.options.debugLevel = last(this._levels);

    // ensure error level
    if (!~levels.indexOf(errorLevel))
      this.options.errorLevel = first(this._levels);

    levels.forEach((l, i) => {
      if (!this.options.styles[l])
        this.options.styles[l] = baseStyles[i] || (Math.floor(Math.random() * 6) + 1);
    });

  }

  /**
   * Get Index
   * Gets the index of a value in an array.
   *
   * @param level the key to get the index for.
   * @param arr the array to be inspected.
   */
  private getIndex(level: any) {
    return this._levels.indexOf(level);
  }

  /**
   * Colorize
   * Applies ansi styles to value.
   *
   * @param val the value to be colorized.
   * @param styles the styles to be applied.
   */
  private colorize(val: any, styles: string | string[]) {
    if (!styles || !styles.length)
      return val;
    return this._colurs.applyAnsi(val, styles);
  }

  /**
   * Colorize If
   * If colors are enabled apply ansi styles to value.
   *
   * @param val the value to be colorized.
   * @param styles the styles to be applied.
   */
  private colorizeIf(val: any, styles: string | string[]) {
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
  private getTimestamp(format?: boolean | 'time' | 'datetime') {
    format = format || this.options.timestamp;
    const timestamp = (new Date()).toISOString();
    const split = timestamp.replace('Z', '').split('T');
    if (format === true)
      return timestamp;
    if (format === 'time')
      return split[1];
    return `${split[0]} ${split[1]}`;
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
   * : Adds a debugger group if does not already exist.
   *
   * @param group the debugger group to add.
   */
  private addDebugger(group: string) {
    if (!~this._debuggers.indexOf(group))
      this._debuggers.push(group);
  }

  /**
   * Remove Debugger
   * : Removes the specified group from debuggers.
   *
   * @param group the debugger group to remove.
   */
  private removeDebugger(group: string) {
    this._debuggers = this._debuggers.filter(d => d !== group);
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
    let i = this._levels.length;
    let padding = '';
    offset = isString(offset) ? (offset as string).length : offset;
    offset = offset || 0;

    function pad(l) {
      let s = '';
      while (l--)
        s += ' ';
      return s;
    }

    while (i--) {
      const diff = this._levels[i].length - len;
      if (diff > 0)
        padding = pad(diff + <number>offset);
    }

    return padding;

  }

  /**
   * Logger
   * Private common logger method.
   *
   * @param type the type of log message to log.
   * @param args the arguments to be logged.
   */
  logger(type: string, ...args: any[]) {

    if (!this.options.enabled)
      return this;

    const clone = args.slice(0);
    const origType = type;
    const splitType = type.split(':');
    type = splitType[0];

    // Flags used internally.
    const isResolve = contains(splitType, 'resolve');
    const isException = contains(splitType, 'exception');
    const debugGroup = type === 'debug' && splitType[1];
    const knownType = contains(this._levels, type);
    const emitType = !debugGroup ? splitType[0] : origType;

    let stackTrace: IStacktraceResult;
    let err, errMsg, meta, metaFormatted, tsFmt, ts, msg, normalized, rawMsg, errType;
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

    const level = this.getIndex(type);
    const activeLevel = this.getIndex(this.options.level);

    // If resolve ignore level checking.
    if (level > activeLevel && !isResolve)
      return this;

    if (isFunction(last(clone))) {
      fn = clone.pop();
      args.pop();
    }

    meta = isPlainObject(last(clone)) ? clone.pop() : null;
    err = isError(first(clone)) ? clone.shift() : null;
    stackTrace = err ?
      this.parseStack(err.stack, pruneTrace) :
      this.parseStack((new Error('get stack')).stack, 3);

    // Add optional timestamp.
    if (this.options.timestamp) {
      tsFmt = `${this.getTimestamp()}`;
      ts = `${this.getTimestamp(true)}`;
      result.push(this.colorizeIf(`[${tsFmt}]`, 'magenta'));
    }

    // Add error type if not generic 'Error'.
    errType = err && err.name !== 'Error' ? `:${err.name}` : '';

    // Add log label type.
    if (!knownType || !this.options.labelLevels) {
      let styles = this.options.styles;
      let styledType = this.colorizeIf(type, styles[type]);
      const padding = this.pad(emitType);
      let styledDebugType;
      if (debugGroup) {
        styledDebugType = this.colorizeIf(':' + debugGroup, 'gray');
        styledType += styledDebugType;
      }
      styledType += this.colorizeIf(errType, styles[type]);
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

    // Output to stream.
    if (!isResolve)
      this.stream.write(msg);

    event = {
      timestamp: ts,
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

  /**
   * Debugger
   * : Creates a new grouped debugger.
   *
   * @param group enables debugging by active group.
   * @param enabled when true disables group.
   */
  debugger(group: string, enabled?: boolean) {

    // If no debuggers yet add unless explicitly disabled.
    if ((!this._debuggers.length && enabled !== false) || enabled === true)
      this.addDebugger(group);

    if (enabled === false)
      this.removeDebugger(group);

    return {
      log: (...args: any[]) => {
        if (!~this._debuggers.indexOf(group))
          return;
        this.logger(`debug:${group}`, ...args);
        return this;
      },
      write: (...args: any[]) => {
        if (!~this._debuggers.indexOf(group))
          return;
        this.write(...args);
        return this;
      },
      exit: this.exit,
      enable: this.addDebugger.bind(group),
      disable: this.removeDebugger.bind(group)
    };

  }

  /**
   * Debuggers
   * : Returns list of debuggers.
   */
  debuggers() {
    return this._debuggers;
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

}

export class Timbr extends TimbrInstance {

  constructor(options?: ITimbrOptions) {
    super(options, 'error', 'warn', 'info', 'trace', 'debug');
  }

  /**
   * Error
   * : Used for logging application errors.
   *
   * @param args arguments to be logged.
   */
  error(...args: any[]) {
    this.logger('error', ...args);
    return this;
  }

  /**
   * Warn
   * : Used for logging application warning.
   *
   * @param args arguments to be logged.
   */
  warn(...args: any[]) {
    this.logger('warn', ...args);
    return this;
  }

  /**
   * Info
   * : Used for logging application information.
   *
   * @param args arguments to be logged.
   */
  info(...args: any[]) {
    this.logger('info', ...args);
    return this;
  }

  /**
   * Trace
   * : Used for logging application tracing.
   *
   * @param args arguments to be logged.
   */
  trace(...args: any[]) {
    this.logger('trace', ...args);
    return this;
  }

  /**
   * Debug
   * : Used for debugging application.
   *
   * @param args arguments to be logged.
   */
  debug(...args: any[]) {
    this.logger('debug', ...args);
    return this;
  }

  /**
   * Factory
   * : Factory to create custom instance of Timbr.
   *
   * @param options the Timbr options.
   * @param levels the custom log levels to extend Timbr with.
   */
  create<L extends string>(options: ITimbrOptions, ...levels: L[]) {
    return (new TimbrInstance(options, ...levels)) as ExtendWithMethods<TimbrInstance, L>;
  }

}