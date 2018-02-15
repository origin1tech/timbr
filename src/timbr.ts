

import { EventEmitter } from 'events';
import { relative, parse } from 'path';
import { Colurs, IColurs } from 'colurs';
import * as stringifyObj from 'stringify-object';
import { extend, isDebug, keys, isBoolean, isPlainObject, isError, first, last, noop, isFunction, isNumber, toArray, toInteger, contains, isString, clone, isWindows, isEmpty, split, isValue, isUndefined, getType } from 'chek';
import { IStacktraceFrame, IStacktraceResult, ITimbrEventData, ITimbrOptions, EventCallback, IMap, OptionKeys, AnsiStyles, ITimbrLevels, TimbrUnion, ITimbrLevel, ITimbr, TimestampCallback, ITimbrParsedEvent, TimestampFormat, ITimbrDebug, DebuggerOrNamespace, ITimbrDebugOptions } from './interfaces';
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

const PRETTIFY_COLORS = {
  number: 'yellow',
  integer: 'yellow',
  float: 'yellow',
  boolean: 'yellow',
  string: 'green',
  date: 'magenta',
  regexp: 'red',
  null: 'bold',
  undefined: 'gray',
  function: 'cyan'
};

export const LOG_LEVELS = {
  error: ['bold', 'red'],
  warn: 'yellow',
  info: 'green',
  trace: 'cyan',
  verbose: 'magenta',
  debug: {
    styles: 'blue',
    indent: '     ',
    timestamp: false
  }
};

export type LogLevelKeys = keyof typeof LOG_LEVELS;

const DEFAULTS: ITimbrOptions = {
  stream: process.stderr, // the stream to output log messages to.
  level: 'info',          // the level the logger is current set at.
  colorize: true,         // whether or not to colorize output.
  labels: true,           // when true level label prefixes log message.
  padding: true,          // when true levels are padded on the left.
  prettyMeta: false,    // when true metadata on new line prettified.
  timestamp: 'time',      // timestamp format date, time or false.
  timestampStyles: null,  // Ansi styles for colorizing.
  timestampLocale: 'en-US', // The locale for timestamps.
  timestampTimezone: 'UTC', // IANA timezone string ex: America/Los_Angeles
  errorLevel: 'error',    // level to use for errors.
  errorExit: false,       // exit on error level.
  errorConvert: false,    // when true converts to error level when Error is detected.
  errorCapture: false,    // whether or not to capture uncaught errors.
  errorCaptureExit: true, // whether to exit on captured uncaught exceptions.
  errorConstruct: false,  // convert string msg to instanceof Error for error level.
  stackTrace: true,       // whether or not to display full stack trace for errors.
  stackDepth: 0,          // the depth of stack traces results 0 for full stack.
  miniStack: false,       // mini stack trace appended to message.
  debugLevel: 'debug',    // set a level as the default debugger.
  debugOnly: false,       // when debugging, only show debug level messages.
  debugElapsed: true,     // when true debug messages show elapsed time in ms.
  beforeWrite: null       // Called before writing to stream for customizing output.
};

export class Timbr extends EventEmitter {

  private _debuggers: IMap<ITimbrDebug> = {};
  private _activeDebuggers: string[] = [];

  private _levels: ITimbrLevels;
  private _levelKeys: string[];

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

    if (isDebug()) {

      const envDebug = process.env.DEBUG;
      let active: any = envDebug ? split(envDebug.trim().replace(/  +/g, ''), [',', ' ']) : [];

      if (!active.length)
        this._activeDebuggers.push('default');
      else
        this._activeDebuggers = active;

      if (process.env.DEBUG_ONLY === 'true')
        this.options.debugOnly = true;

    }

    // Init methods.
    this._levelKeys.forEach((l, i) => {
      if (l === this.options.debugLevel) {
        const _debugr = this.debugger('default', this._levels[l] as ITimbrDebugOptions);
        this[l] = _debugr.bind(this);
      }
      else {
        this[l] = this.logger.bind(this, l);
      }
    });

  }

  /**
   * Normalize Levels
   * Normalizes log levels ensuring error, exit and debug levels as well as styles.
   */
  private normalizeLevels() {

    const levelDefaults = {
      styles: null,
      symbol: null,
      symbolPos: 'after',
      symbolStyles: null,
      padding: this.options.padding,
      timestamp: this.options.timestamp,
      miniStack: this.options.miniStack,
      indent: '',
      contentStyles: null,
      elapsedTime: true
    };

    for (const k in this._levels) {
      if (!isPlainObject(this._levels[k])) {
        let level = this._levels[k];
        this._levels[k] = extend({}, levelDefaults, { label: k, styles: toArray(level) });
      }
      else {
        let level = this._levels[k] as ITimbrLevel;

        // Extend with defaults.
        level = extend({}, levelDefaults, level);

        // Ensure label if not disabled.
        level.label = !isValue(level.label) ? k : level.label;

        // Check if known symbol.
        if (level.symbol && SYMBOLS[level.symbol])
          level.symbol = SYMBOLS[level.symbol];

        // Fallback to level styles if symbol styles not defined.
        if ((level.symbolStyles && !level.symbolStyles.length) || isUndefined(level.symbolStyles))
          level.symbolStyles = level.styles;

        if (isNumber(level.indent))
          level.indent = ' '.repeat(level.indent as number);

        // Update the level.
        this._levels[k] = level;

      }
    }

    const levelKeys = this._levelKeys;
    let activeLevel: any = this.options.level;
    const errorLevel = this.options.errorLevel;

    // Ensure a default log level.
    let tmpLevel = activeLevel;
    if (isNumber(activeLevel))
      tmpLevel = levelKeys[activeLevel] || 'info';

    // ensure a level, if none select last.
    if (!~levelKeys.indexOf(tmpLevel))
      tmpLevel = last(levelKeys);
    activeLevel = this.options.level = tmpLevel;

    // ensure error level
    if (!~levelKeys.indexOf(errorLevel))
      this.options.errorLevel = first<string>(this._levelKeys);

    // Ensure default log level config.
    if (!this._levels['log'])
      this._levels['log'] = {
        label: 'log',
        styles: null,
        symbol: null
      };

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
   * Parse Stack
   * Simple stack parser to limit and stylize stacktraces.
   *
   * @param stack the stacktrace to be parsed.
   * @param prune number of stack frames to prune.
   * @param depth the depth to trace.
   */
  private parseStack(stack: any, prune?: number, depth?: number): IStacktraceResult {

    prune = isEmpty(prune) ? 0 : prune;
    depth = isEmpty(depth) ? this.options.stackDepth : depth;

    if (!stack)
      return null;

    const frames = [];
    const traced = [];
    let miniStack;

    stack = stack.split(EOL);
    const first = stack.shift();
    stack = stack.slice(prune);
    stack.unshift(first);

    stack
      .forEach((s, i) => {

        if (i >= depth && depth !== 0)
          return;

        let relativeFile, filename, column, line, method;

        const orig = s;
        method = s;
        method = s.replace(/^\s*at\s?/, '').split(' ')[0];
        s = s.replace(/^\s+/, '').replace(/^.+\(/, '').replace(/\)$/, '');
        s = s.split(':');
        filename = s[0];
        line = s[1];
        column = s[2];

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

        // const trace = `    at ${method} (${relativeFile}:${line}:${column})`;

        if (i === 1)
          miniStack = `(${parsedRelative.base}:${line}:${column})`;

        frames.push(frame);
        traced.push(orig);

      });

    return {
      stackFrames: frames,
      stackTrace: traced,
      miniStack: miniStack
    };

  }

  /**
   * Get Timestamp
   * Gets a timestamp by format.
   *
   * @param format the format to return.
   */
  private getTimestamp(format?: TimestampFormat) {

    format = !isValue(format) ? this.options.timestamp : format;

    if (!format)
      return null;

    const date = new Date();
    let dt: any = date.toLocaleString(this.options.timestampLocale, { timeZone: this.options.timestampTimezone, hour12: false });

    let result: any;

    dt = dt.replace(' ', '').split(',');
    let localeDate: any = dt[0];
    const localeTime = dt[1];

    localeDate = localeDate
      .split('/')
      .map(v => v.length < 2 ? '0' + v : v)
      .join('-');

    if (isFunction(format))
      result = (format as Function)();

    else if (format === 'epoch')
      result = date.getTime() + '';

    else if (format === 'iso')
      result = date.toISOString();

    else if (format === 'time')
      result = localeTime;

    else if (format === 'datetime')
      result = localeDate + ' ' + localeTime;

    return result;

  }

  /**
   * Uncaught Exception
   * Handler for uncaught excrptions.
   *
   * @param err the error caught by process uncaughtException.
   */
  private uncaughtException(err: Error) {
    let errorLevel = this.options.errorLevel;
    const exists = ~this.getIndex(errorLevel);
    if (!this.options.errorCapture || !exists)
      throw err;
    // Disable to prevent loops will exit after catching.
    this.toggleExceptionHandler(false);
    this.logger(errorLevel, err);
    if (this.options.errorCaptureExit)
      process.exit(1);
  }

  /**
   * Toggle Exception Handler
   * Toggles uncaughtException listener.
   *
   * @param capture whether to capture uncaught exceptions or not.
   */
  private toggleExceptionHandler(capture: boolean) {
    if (!capture)
      process.removeListener('uncaughtException', this.uncaughtException.bind(this));
    else
      process.on('uncaughtException', this.uncaughtException.bind(this));
  }

  /**
   * Pad
   * : Gets padding for level type.
   *
   * @param type the log level type.
   * @param offset additional offset.
   */
  private pad(type: string, offset?: number | string) {

    if (!this.options.padding)
      return '';

    let max = 0;
    let len = type.length;
    let i;
    let padding = '';
    offset = isString(offset) ? (offset as string).length : offset;
    offset = offset || 0;

    const debugLevels = (this._activeDebuggers || []).map(l => {
      if (l === 'default')
        return 'debug';
      return l;
    });

    let levels = [];

    for (const k in this._levels) {
      const level = this._levels[k] as ITimbrLevel;
      if (level.label)
        levels.push(level.label);
    }

    i = levels.length;

    while (i--) {
      const diff = levels[i].length - len;
      const t = levels[i];
      if (diff > 0 && (padding.length < diff + <number>offset))
        padding = ' '.repeat(diff + <number>offset);
    }

    return padding;

  }

  /**
   * Prettify Object
   * Formats an object for display in terminal.
   *
   * @param obj the object to be prettified.
   */
  private prettifyObject(obj: any, padding: boolean) {

    const self = this;
    const colorKeys = keys(PRETTIFY_COLORS);

    function transform(obj, prop, orig) {
      let val = obj[prop];
      let typed = getType(val);
      if (~colorKeys.indexOf(typed)) {
        const color = PRETTIFY_COLORS[typed];
        return self.colorize(val, color);
      }
      else {
        return orig;
      }
    }

    let result = stringifyObj(obj, {
      indent: '  ',
      transform: transform
    });

    if (padding) {
      let pad = this.pad('', 2);
      result = result
        .split('\n')
        .map(v => pad + v)
        .join('\n');
    }


    return result;
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
   * Colorize
   * Applies ansi styles to value.
   *
   * @param val the value to be colorized.
   * @param styles the styles to be applied.
   */
  colorize(val: any, styles: AnsiStyles | AnsiStyles[]) {
    if (!styles || !styles.length)
      return val;
    return colurs.applyAnsi(val, styles);
  }

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

  /**
   * Debugger
   * Creates a new debugger instance.
   *
   * @param namespace creates a debugger by namespace.
   * @param options debugger options.
   */
  debugger(namespace?: string | ITimbrDebugOptions, options?: ITimbrDebugOptions): ITimbrDebug {

    const self = this;
    let previous, debug;

    if (isPlainObject(namespace)) {
      options = namespace as ITimbrDebugOptions;
      namespace = undefined;
    }

    namespace = namespace || 'default';

    const DEBUG_DEFAULTS = {
      label: namespace,
      styles: 'blue',
      symbol: false,
      symbolPos: 'after',
      symbolStyles: null,
      padding: this.options.padding,
      timestamp: this.options.timestamp,
      miniStack: this.options.miniStack,
      indent: '',
      contentStyles: null,
      elapsedTime: this.options.debugElapsed
    };

    // Check if debugger exists.
    if (this._debuggers[namespace as string])
      return this._debuggers[namespace as string];

    options = extend({}, DEBUG_DEFAULTS, options);

    debug = function (...args: any[]) {

      if (!isDebug() || (!~self._activeDebuggers.indexOf(namespace as string) && !~self._activeDebuggers.indexOf('*')))
        return self;

      const current = +new Date();
      const elapsed = current - (previous || current);

      debug.set('previous', previous);
      debug.set('current', current);
      debug.set('elapsed', elapsed);

      previous = current;

      const event = self.parse(`debug:${debug.namespace}`, ...args);

      let msg = event.compiled.join(' ');

      // let elapsedTimeStr = self.colorize(`(${elapsed}ms)`, debug.styles);
      // const compiled = [msg];
      // if (debug.elapsedTime)
      //   compiled.push(elapsedTimeStr);

      // msg = compiled.join(' ');

      // If content styles strip and colorize
      if (debug.contentStyles && debug.contentStyles.length) {
        msg = colurs.strip(msg);
        msg = self.colorize(msg, debug.contentStyles);
      }

      // Write the message.
      self.options.stream.write(msg + EOL);

      self.emit('debug', event.message, event);
      self.emit(`debug:${event.type}`, event.message, event);

      event.fn(event.message, event);

      return self;

    };

    debug.namespace = namespace;
    debug.styles = options.styles;
    debug.symbol = options.symbol;
    debug.symbolPos = options.symbolPos;
    debug.symbolStyles = options.symbolStyles;
    debug.miniStack = options.miniStack;
    debug.timestamp = options.timestamp;
    debug.indent = options.indent;
    debug.label = options.label;
    debug.padding = options.padding;
    debug.contentStyles = options.contentSytles;
    debug.elapsedTime = options.elapsedTime;

    if (isUndefined(debug.symbolStyles) || (debug.symbolStyles && !debug.symbolStyles.length))
      debug.symbolStyles = debug.styles;

    debug.elapsed = 0;
    debug.current = 0;
    debug.previous = 0;

    debug.enabled = self.debuggers.enabled.bind(self, namespace);
    debug.enable = self.debuggers.enable.bind(self, namespace);
    debug.disable = self.debuggers.disable.bind(self, namespace);
    debug.destroy = self.debuggers.destroy.bind(self, namespace);
    debug.set = self.debuggers.set.bind(self, namespace);

    // Add to collection.
    this._debuggers[namespace as string] = debug;

    return debug;

  }

  get debuggers() {

    function toNamespace(instance: string | ITimbrDebug): string {
      if (isString(instance)) {
        return (instance as string).replace(/^debug:/, '') as string;
      }
      return (instance as ITimbrDebug).namespace;
    }

    const methods = {

      /**
       * Get
       * Gets a debugger.
       */
      get: (namespace: string) => {
        const ns = toNamespace(namespace);
        return this._debuggers[ns];
      },

      /**
       * Set
       * Sets a value on an existing debugger.
       */
      set: (namespace: string, key: string, val: any) => {
        const ns = toNamespace(namespace);
        if (this._debuggers[ns])
          this._debuggers[ns][key] = val;
        return methods;
      },

      /**
       * Get All
       * Gets an object containing all debuggers.
       */
      getAll: () => {
        return this._debuggers;
      },

      /**
       * Create
       * Creates a debugger.
       *
       * @param namespace the namespace of the debugger to be created.
       */
      create: (namespace: string, options?: ITimbrDebugOptions) => {
        const ns = toNamespace(namespace);
        const instance = this.debugger(ns, options);
        this._debuggers[ns] = instance;
      },

      /**
       * Enabled
       * Checks if namespace or instance is enabled.
       *
       * @param namespaceOrInstnace the ns or instance to check.
       */
      enabled: (namespaceOrInstance: string | ITimbrDebug) => {
        const ns = toNamespace(namespaceOrInstance);
        return !!~this._activeDebuggers.indexOf(ns);
      },

      /**
       * Enable
       * Enables a namespace, instance or array of namespaces or instances.
       *
       * @param namespaceOrInstnace the ns or instance to enable.
       */
      enable: (namespaceOrInstance: DebuggerOrNamespace) => {
        namespaceOrInstance = toArray<string | ITimbrDebug>(namespaceOrInstance);
        namespaceOrInstance.forEach(ns => {
          ns = toNamespace(ns) as string;
          if (!~this._activeDebuggers.indexOf(ns))
            this._activeDebuggers.push(ns);
        });
      },

      /**
       * Disable
       * Disables a namespace, instance or array of namespaces or instances.
       *
       * @param namespaceOrInstnace the ns or instance to disable.
       */
      disable: (namespaceOrInstance: DebuggerOrNamespace) => {
        namespaceOrInstance = toArray<string | ITimbrDebug>(namespaceOrInstance);
        namespaceOrInstance.forEach(ns => {
          ns = toNamespace(ns) as string;
          this._activeDebuggers.splice(this._activeDebuggers.indexOf(ns), 1);
        });
      },

      /**
       * Destroy
       * Destroys a namespace, instance or array of namespaces or instances.
       *
       * @param namespaceOrInstnace the ns or instance to destroy.
       */
      destroy: (namespaceOrInstance: DebuggerOrNamespace) => {
        namespaceOrInstance = toArray<string | ITimbrDebug>(namespaceOrInstance);
        namespaceOrInstance.forEach(ns => {
          ns = toNamespace(ns) as string;
          delete this._debuggers[ns];
        });
      }

    };

    return methods;

  }

  /**
   * Parse
   * Parses log arguments and compiles event.
   *
   * @param type the type of log message to log.
   * @param args the arguments to be logged.
   */
  parse(type: string, ...args: any[]) {

    let baseType = type || '';

    let clone = args.slice(0);
    clone[0] = clone[0] || '';
    const subTypes = baseType.split(':');
    baseType = subTypes.length ? subTypes.shift() : null;
    const knownType = contains(this._levelKeys, baseType);
    const debugr = baseType === 'debug' ? this.debuggers.get(subTypes.join(':')) : null;

    let stack: IStacktraceResult = {};
    let err, meta, ts, msg;
    let event: ITimbrParsedEvent = {};
    let fn: EventCallback = noop;

    let prune = 0;
    let pruneGen = debugr ? 2 : 2;

    // Check if should convert to error level.
    if (isError(clone[0]) && baseType !== this.options.errorLevel && this.options.errorConvert && !debugr) {
      baseType = this.options.errorLevel;
      type = subTypes.length ? baseType + ':' + subTypes.join(':') : baseType;
    }

    // Convert first arg to error.
    if (baseType === this.options.errorLevel && this.options.errorConstruct && isString(clone[0])) {
      clone[0] = new Error(clone[0]);
      prune = 2;
    }

    let level: any = debugr ? debugr : this._levels[baseType] || null;
    const idx = this.getIndex(type);
    const activeIdx = this.getIndex(this.options.level);

    // Check if last is callback.
    if (isFunction(last(clone))) {
      fn = clone.pop();
      args.pop();
    }

    let tmpMeta: any = {};

    // Shift first arg as message.
    msg = clone.shift();

    // Only metadata was logged.
    if (isPlainObject(msg)) {
      tmpMeta = msg;
      msg = '';
    }

    // Inspect for formatters.
    const fmtrs = (isString(msg) && msg.match(/(%s|%d|%j|%%)/g)) || [];
    const fmtArgs = clone.slice(0, fmtrs.length);
    let suffixArgs = clone.slice(fmtrs.length);

    // Check if first arge is an Error.
    err = isError(msg) ? msg : null;

    // Get stacktrace from error or fake it.
    stack = err ?
      this.parseStack(err.stack, prune) :
      this.parseStack((new Error('get stack')).stack, pruneGen);

    // Check if message should be formatted.
    if (fmtArgs.length)
      msg = format(msg, ...fmtArgs);

    // Inspect suffix args for metadata.

    suffixArgs.forEach((v, i) => {
      if (isPlainObject(v))
        tmpMeta = extend(tmpMeta, v);
    });

    suffixArgs = suffixArgs.filter(v => !isPlainObject(v));

    if (suffixArgs.length)
      msg += (' ' + suffixArgs.join(' '));

    // Check if last is metadata.
    meta = !isEmpty(tmpMeta) ? tmpMeta : null;

    if (err) {
      const origMsg = msg;
      if (this.options.stackTrace)
        msg = stack.stackTrace.join(EOL);
      else
        msg = stack.stackTrace[0];
      // if orig msg contains val append it.
      // probably never used but just in case.
      if (origMsg && origMsg.length)
        msg += (' \n' + origMsg);
    }

    event = {
      type: type,
      level: level,
      index: idx,
      activeIndex: activeIdx,
      message: msg, // this gets updated after compile.
      timestamp: this.getTimestamp(level && level.timestamp),
      meta: meta,
      args: args,
      error: err || null,
      stack: stack,
      fn: fn
    };

    let compiled = [];

    let metaStyled, elapsedStyled;

    // Style metadata.
    if (meta) {
      if (!this.options.prettyMeta)
        metaStyled = inspect(meta, { colors: this.options.colorize });
      else
        metaStyled = this.prettifyObject(meta, level.padding);
    }

    // Styled debug elapsed time.
    if (debugr) {
      elapsedStyled = this.colorize(`(${debugr.elapsed}ms)`, debugr.styles as AnsiStyles);
    }


    // Ignore for write, writeLn and log levels.
    if (!/^write/.test(baseType) && baseType !== 'log') {

      // Check for indent.
      if (level.indent && level.indent.length)
        compiled.push(level.indent);

      // Add timestamp.
      if (this.options.timestamp && event.timestamp)
        compiled.push(this.colorize(`[${event.timestamp}]`, this.options.timestampStyles));

      // Add log level label.
      if (level.label && event.type) {
        let label = level.label;
        let padding = '';
        if (debugr && label === 'default')
          label = 'debug';
        if (level.padding)
          padding = this.pad(label || '', null);
        if (label && label.length) {
          label = this.colorize(padding + label + ':', level.styles as AnsiStyles[]);
          compiled.push(label);
        }
      }
      else {
        // need to offset if using labels.
        const offset = this.options.labels ? 1 : 0;
        if (level.padding)
          compiled.push(this.pad('', offset));
      }

      // Check for Symbol.
      if (level && level.symbol && level.symbolPos === 'before')
        compiled.push(this.colorize(level.symbol, level.symbolStyles));

      compiled.push(event.message);

      // Add metadata.
      if (metaStyled && !this.options.prettyMeta)
        compiled.push(metaStyled);

      // Add ministack if not error.
      if (level.miniStack) {
        if (!event.error || (event.error && !this.options.stackTrace))
          compiled.push(this.colorize(event.stack.miniStack, 'gray'));
      }

      if (level.elapsedTime)
        compiled.push(elapsedStyled);

      // Check for Symbol after.
      if (level && level.symbol && level.symbolPos === 'after')
        compiled.push(this.colorize(level.symbol, level.symbolStyles));

      if (metaStyled && this.options.prettyMeta)
        compiled.push(EOL + metaStyled);

    }
    else {

      // Push message if has value.
      if (event.message && event.message.length)
        compiled.push(event.message);

      // Add metadata.
      if (metaStyled) {
        metaStyled = this.options.prettyMeta ? EOL + metaStyled : metaStyled;
        compiled.push(metaStyled);
      }

    }

    event.compiled = compiled;

    // Check for user defined before write method after compiling.
    if (this.options.beforeWrite) {
      event.message = this.options.beforeWrite(event);
      event.compiled = [event.message];
    }

    return event;

  }

  /**
   * Logger
   * Common logger method which calls .parse();
   *
   * @param type the type of message to be logged.
   * @param args the arguments to be logged.
   */
  logger(type: string, ...args: any[]) {

    const stream = this.options.stream;
    const event = this.parse(type, ...args);
    const eventClone = clone<ITimbrParsedEvent>(event);

    delete eventClone.fn;

    // If debugOnly and we are debugging ensure is debug level.
    if (this.options.debugOnly && isDebug())
      return;

    if (event.index > event.activeIndex)
      return this;

    let msg = event.compiled.join(' ');

    if (event.level.contentSytles && event.level.contentSytles.length)
      msg = this.colorize(msg, event.level.contentSytles);

    if (type === 'write') {
      stream.write(msg);
    }
    else {
      stream.write(msg + EOL);
    }

    // Emit the log/debug event.
    this.emit('log', eventClone.message, eventClone);

    // Emit by type only if not null.
    if (event.type)
      this.emit(`log:${event.type}`, eventClone.message, eventClone);

    // Call callback function passing parsed event.
    event.fn(eventClone.message, eventClone);

    if (this.options.errorExit && (event.level as ITimbrLevel).label === this.options.errorLevel)
      process.exit(1);

    return this;

  }

  /**
   * Symbol
   * : Gets known symbol for terminal or returns empty string.
   *
   * @param name the name of the symbol to return.
   */
  symbol(name: string, styles?: AnsiStyles | AnsiStyles[]) {
    if (SYMBOLS[name])
      name = SYMBOLS[name];
    styles = toArray(styles, []);
    return this.colorize(name, styles);
  }

  /**
   * Write
   * : Directly outputs to stream after formatting.
   *
   * @param args arguments to output to stream directly.
   */
  writeLn(...args: any[]) {
    return this.logger('writeLn', ...args);
  }

  /**
   * Concat
   * : Same as write but concats to stream without line return appended.
   *
   * @param args the arguments to format and output.
   */
  write(...args: any[]) {
    return this.logger('write', ...args);
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

/**
 * Create
 * Creates a new instance of Timbr.
 *
 * @param options Timbr options.
 * @param levels the log levels to be used.
 */
export function create<L extends string>(options?: ITimbrOptions, levels?: ITimbrLevels): TimbrUnion<L> {

  const instance = new Timbr(options, levels);

  function Logger(...args: any[]) {
    if (args.length)
      instance.logger('log', ...args);
    return Logger;
  }

  for (const id in instance) {
    Logger[id] = instance[id];
  }

  // logger = intersect(Logger, instance);
  return Logger as TimbrUnion<L>;

}

// Inits a default instance.
export function init(options?: ITimbrOptions): TimbrUnion<LogLevelKeys> {
  return create<LogLevelKeys>(options, LOG_LEVELS as ITimbrLevels);
}

