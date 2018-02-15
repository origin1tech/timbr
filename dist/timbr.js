"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var events_1 = require("events");
var path_1 = require("path");
var colurs_1 = require("colurs");
var stringifyObj = require("stringify-object");
var chek_1 = require("chek");
var util_1 = require("util");
var IS_SYMBOLS_SUPPORTED = !chek_1.isWindows() || process.env.VSCODE_PID || process.env.CI;
var EOL = '\n';
var colurs = new colurs_1.Colurs();
// Build symbols.
var SYMBOLS = {
    error: IS_SYMBOLS_SUPPORTED ? '✖' : 'x',
    warn: IS_SYMBOLS_SUPPORTED ? '⚠' : '!!',
    info: IS_SYMBOLS_SUPPORTED ? 'ℹ' : 'i',
    trace: IS_SYMBOLS_SUPPORTED ? '◎' : 'o',
    debug: IS_SYMBOLS_SUPPORTED ? '✱' : '*',
    ok: IS_SYMBOLS_SUPPORTED ? '✔' : '√'
};
var PRETTIFY_COLORS = {
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
exports.LOG_LEVELS = {
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
var DEFAULTS = {
    stream: process.stderr,
    level: 'info',
    colorize: true,
    labels: true,
    padding: true,
    prettyMeta: false,
    timestamp: 'time',
    timestampStyles: null,
    timestampLocale: 'en-US',
    timestampTimezone: 'UTC',
    errorLevel: 'error',
    errorExit: false,
    errorConvert: false,
    errorCapture: false,
    errorCaptureExit: true,
    errorConstruct: false,
    stackTrace: true,
    stackDepth: 0,
    miniStack: false,
    debugLevel: 'debug',
    debugOnly: false,
    debugElapsed: true,
    beforeWrite: null // Called before writing to stream for customizing output.
};
var Timbr = /** @class */ (function (_super) {
    __extends(Timbr, _super);
    function Timbr(options, levels) {
        var _this = _super.call(this) || this;
        _this._debuggers = {};
        _this._activeDebuggers = [];
        _this.init(options, levels);
        return _this;
    }
    /**
     * Init
     * Initializes intance using options.
     *
     * @param options Timbr options.
     * @param levels the levels to use for logging.
     */
    Timbr.prototype.init = function (options, levels) {
        var _this = this;
        options = this.options = chek_1.extend({}, DEFAULTS, this.options, options);
        colurs.setOption('enabled', this.options.colorize);
        levels = levels || this._levels;
        if (chek_1.isEmpty(levels))
            throw new Error('Cannot init Timbr using levels of undefined.');
        this._levels = levels;
        this._levelKeys = chek_1.keys(levels);
        this.normalizeLevels();
        // Toggle the exception handler.
        this.toggleExceptionHandler(true);
        this.stream = options.stream || this.stream || process.stdout;
        if (chek_1.isDebug()) {
            var envDebug = process.env.DEBUG;
            var active = envDebug ? chek_1.split(envDebug.trim().replace(/  +/g, ''), [',', ' ']) : [];
            if (!active.length)
                this._activeDebuggers.push('default');
            else
                this._activeDebuggers = active;
            if (process.env.DEBUG_ONLY === 'true')
                this.options.debugOnly = true;
        }
        // Init methods.
        this._levelKeys.forEach(function (l, i) {
            if (l === _this.options.debugLevel) {
                var _debugr = _this.debugger('default', _this._levels[l]);
                _this[l] = _debugr.bind(_this);
            }
            else {
                _this[l] = _this.logger.bind(_this, l);
            }
        });
    };
    /**
     * Normalize Levels
     * Normalizes log levels ensuring error, exit and debug levels as well as styles.
     */
    Timbr.prototype.normalizeLevels = function () {
        var levelDefaults = {
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
        for (var k in this._levels) {
            if (!chek_1.isPlainObject(this._levels[k])) {
                var level = this._levels[k];
                this._levels[k] = chek_1.extend({}, levelDefaults, { label: k, styles: chek_1.toArray(level) });
            }
            else {
                var level = this._levels[k];
                // Extend with defaults.
                level = chek_1.extend({}, levelDefaults, level);
                // Ensure label if not disabled.
                level.label = !chek_1.isValue(level.label) ? k : level.label;
                // Check if known symbol.
                if (level.symbol && SYMBOLS[level.symbol])
                    level.symbol = SYMBOLS[level.symbol];
                // Fallback to level styles if symbol styles not defined.
                if ((level.symbolStyles && !level.symbolStyles.length) || chek_1.isUndefined(level.symbolStyles))
                    level.symbolStyles = level.styles;
                if (chek_1.isNumber(level.indent))
                    level.indent = ' '.repeat(level.indent);
                // Update the level.
                this._levels[k] = level;
            }
        }
        var levelKeys = this._levelKeys;
        var activeLevel = this.options.level;
        var errorLevel = this.options.errorLevel;
        // Ensure a default log level.
        var tmpLevel = activeLevel;
        if (chek_1.isNumber(activeLevel))
            tmpLevel = levelKeys[activeLevel] || 'info';
        // ensure a level, if none select last.
        if (!~levelKeys.indexOf(tmpLevel))
            tmpLevel = chek_1.last(levelKeys);
        activeLevel = this.options.level = tmpLevel;
        // ensure error level
        if (!~levelKeys.indexOf(errorLevel))
            this.options.errorLevel = chek_1.first(this._levelKeys);
        // Ensure default log level config.
        if (!this._levels['log'])
            this._levels['log'] = {
                label: 'log',
                styles: null,
                symbol: null
            };
    };
    /**
     * Get Index
     * Gets the index of a value in an array.
     *
     * @param level the key to get the index for.
     * @param arr the array to be inspected.
     */
    Timbr.prototype.getIndex = function (level) {
        return this._levelKeys.indexOf(level);
    };
    /**
     * Parse Stack
     * Simple stack parser to limit and stylize stacktraces.
     *
     * @param stack the stacktrace to be parsed.
     * @param prune number of stack frames to prune.
     * @param depth the depth to trace.
     */
    Timbr.prototype.parseStack = function (stack, prune, depth) {
        prune = chek_1.isEmpty(prune) ? 0 : prune;
        depth = chek_1.isEmpty(depth) ? this.options.stackDepth : depth;
        if (!stack)
            return null;
        var frames = [];
        var traced = [];
        var miniStack;
        stack = stack.split(EOL);
        var first = stack.shift();
        stack = stack.slice(prune);
        stack.unshift(first);
        stack
            .forEach(function (s, i) {
            if (i >= depth && depth !== 0)
                return;
            var relativeFile, filename, column, line, method;
            var orig = s;
            method = s;
            method = s.replace(/^\s*at\s?/, '').split(' ')[0];
            s = s.replace(/^\s+/, '').replace(/^.+\(/, '').replace(/\)$/, '');
            s = s.split(':');
            filename = s[0];
            line = s[1];
            column = s[2];
            var isModule = /^module/.test(filename);
            relativeFile = filename;
            // Make path relative to cwd if not
            // module.js, bootstrap_node.js etc.
            if (/^\//.test(filename) && !isModule)
                relativeFile = "/" + path_1.relative(process.cwd(), filename);
            var parsedRelative = isModule ? filename : path_1.parse(relativeFile);
            var frame = {
                method: method,
                filename: filename,
                relative: relativeFile,
                line: chek_1.toInteger(line, 0),
                column: chek_1.toInteger(column, 0)
            };
            // const trace = `    at ${method} (${relativeFile}:${line}:${column})`;
            if (i === 1)
                miniStack = "(" + parsedRelative.base + ":" + line + ":" + column + ")";
            frames.push(frame);
            traced.push(orig);
        });
        return {
            stackFrames: frames,
            stackTrace: traced,
            miniStack: miniStack
        };
    };
    /**
     * Get Timestamp
     * Gets a timestamp by format.
     *
     * @param format the format to return.
     */
    Timbr.prototype.getTimestamp = function (format) {
        format = !chek_1.isValue(format) ? this.options.timestamp : format;
        if (!format)
            return null;
        var date = new Date();
        var dt = date.toLocaleString(this.options.timestampLocale, { timeZone: this.options.timestampTimezone, hour12: false });
        var result;
        dt = dt.replace(' ', '').split(',');
        var localeDate = dt[0];
        var localeTime = dt[1];
        localeDate = localeDate
            .split('/')
            .map(function (v) { return v.length < 2 ? '0' + v : v; })
            .join('-');
        if (chek_1.isFunction(format))
            result = format();
        else if (format === 'epoch')
            result = date.getTime() + '';
        else if (format === 'iso')
            result = date.toISOString();
        else if (format === 'time')
            result = localeTime;
        else if (format === 'datetime')
            result = localeDate + ' ' + localeTime;
        return result;
    };
    /**
     * Uncaught Exception
     * Handler for uncaught excrptions.
     *
     * @param err the error caught by process uncaughtException.
     */
    Timbr.prototype.uncaughtException = function (err) {
        var errorLevel = this.options.errorLevel;
        var exists = ~this.getIndex(errorLevel);
        if (!this.options.errorCapture || !exists)
            throw err;
        // Disable to prevent loops will exit after catching.
        this.toggleExceptionHandler(false);
        this.logger(errorLevel, err);
        if (this.options.errorCaptureExit)
            process.exit(1);
    };
    /**
     * Toggle Exception Handler
     * Toggles uncaughtException listener.
     *
     * @param capture whether to capture uncaught exceptions or not.
     */
    Timbr.prototype.toggleExceptionHandler = function (capture) {
        if (!capture)
            process.removeListener('uncaughtException', this.uncaughtException.bind(this));
        else
            process.on('uncaughtException', this.uncaughtException.bind(this));
    };
    /**
     * Pad
     * : Gets padding for level type.
     *
     * @param type the log level type.
     * @param offset additional offset.
     */
    Timbr.prototype.pad = function (type, offset) {
        if (!this.options.padding)
            return '';
        var max = 0;
        var len = type.length;
        var i;
        var padding = '';
        offset = chek_1.isString(offset) ? offset.length : offset;
        offset = offset || 0;
        var debugLevels = (this._activeDebuggers || []).map(function (l) {
            if (l === 'default')
                return 'debug';
            return l;
        });
        var levels = [];
        for (var k in this._levels) {
            var level = this._levels[k];
            if (level.label)
                levels.push(level.label);
        }
        i = levels.length;
        while (i--) {
            var diff = levels[i].length - len;
            var t = levels[i];
            if (diff > 0 && (padding.length < diff + offset))
                padding = ' '.repeat(diff + offset);
        }
        return padding;
    };
    /**
     * Prettify Object
     * Formats an object for display in terminal.
     *
     * @param obj the object to be prettified.
     */
    Timbr.prototype.prettifyObject = function (obj, padding) {
        var self = this;
        var colorKeys = chek_1.keys(PRETTIFY_COLORS);
        function transform(obj, prop, orig) {
            var val = obj[prop];
            var typed = chek_1.getType(val);
            if (~colorKeys.indexOf(typed)) {
                var color = PRETTIFY_COLORS[typed];
                return self.colorize(val, color);
            }
            else {
                return orig;
            }
        }
        var result = stringifyObj(obj, {
            indent: '  ',
            transform: transform
        });
        if (padding) {
            var pad_1 = this.pad('', 2);
            result = result
                .split('\n')
                .map(function (v) { return pad_1 + v; })
                .join('\n');
        }
        return result;
    };
    /**
     * Get
     * Gets a current option value.
     *
     * @param key the option key to get.
     */
    Timbr.prototype.getOption = function (key) {
        return this.options[key];
    };
    /**
     * Set
     * Sets options for Logger.
     *
     * @param key the key or options object to be set.
     * @param value the value for the key.
     */
    Timbr.prototype.setOption = function (key, value) {
        var toggleExceptionHandler = key === 'errorCapture';
        if (chek_1.isPlainObject(key)) {
            var _keys = chek_1.keys(key);
            this.options = chek_1.extend({}, this.options, key);
            if (chek_1.contains(_keys, 'errorCapture'))
                toggleExceptionHandler = true;
        }
        else {
            this.options[key] = value;
        }
        if (toggleExceptionHandler)
            this.toggleExceptionHandler(this.options.errorCapture);
    };
    /**
     * Colorize
     * Applies ansi styles to value.
     *
     * @param val the value to be colorized.
     * @param styles the styles to be applied.
     */
    Timbr.prototype.colorize = function (val, styles) {
        if (!styles || !styles.length)
            return val;
        return colurs.applyAnsi(val, styles);
    };
    /**
     * Debugger
     * Creates a new debugger instance.
     *
     * @param namespace creates a debugger by namespace.
     * @param options debugger options.
     */
    Timbr.prototype.debugger = function (namespace, options) {
        var self = this;
        var previous, debug;
        if (chek_1.isPlainObject(namespace)) {
            options = namespace;
            namespace = undefined;
        }
        namespace = namespace || 'default';
        var DEBUG_DEFAULTS = {
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
        if (this._debuggers[namespace])
            return this._debuggers[namespace];
        options = chek_1.extend({}, DEBUG_DEFAULTS, options);
        debug = function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            if (!chek_1.isDebug() || (!~self._activeDebuggers.indexOf(namespace) && !~self._activeDebuggers.indexOf('*')))
                return self;
            var current = +new Date();
            var elapsed = current - (previous || current);
            debug.set('previous', previous);
            debug.set('current', current);
            debug.set('elapsed', elapsed);
            previous = current;
            var event = self.parse.apply(self, ["debug:" + debug.namespace].concat(args));
            var msg = event.compiled.join(' ');
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
            self.emit("debug:" + event.type, event.message, event);
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
        if (chek_1.isUndefined(debug.symbolStyles) || (debug.symbolStyles && !debug.symbolStyles.length))
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
        this._debuggers[namespace] = debug;
        return debug;
    };
    Object.defineProperty(Timbr.prototype, "debuggers", {
        get: function () {
            var _this = this;
            function toNamespace(instance) {
                if (chek_1.isString(instance)) {
                    return instance.replace(/^debug:/, '');
                }
                return instance.namespace;
            }
            var methods = {
                /**
                 * Get
                 * Gets a debugger.
                 */
                get: function (namespace) {
                    var ns = toNamespace(namespace);
                    return _this._debuggers[ns];
                },
                /**
                 * Set
                 * Sets a value on an existing debugger.
                 */
                set: function (namespace, key, val) {
                    var ns = toNamespace(namespace);
                    if (_this._debuggers[ns])
                        _this._debuggers[ns][key] = val;
                    return methods;
                },
                /**
                 * Get All
                 * Gets an object containing all debuggers.
                 */
                getAll: function () {
                    return _this._debuggers;
                },
                /**
                 * Create
                 * Creates a debugger.
                 *
                 * @param namespace the namespace of the debugger to be created.
                 */
                create: function (namespace, options) {
                    var ns = toNamespace(namespace);
                    var instance = _this.debugger(ns, options);
                    _this._debuggers[ns] = instance;
                },
                /**
                 * Enabled
                 * Checks if namespace or instance is enabled.
                 *
                 * @param namespaceOrInstnace the ns or instance to check.
                 */
                enabled: function (namespaceOrInstance) {
                    var ns = toNamespace(namespaceOrInstance);
                    return !!~_this._activeDebuggers.indexOf(ns);
                },
                /**
                 * Enable
                 * Enables a namespace, instance or array of namespaces or instances.
                 *
                 * @param namespaceOrInstnace the ns or instance to enable.
                 */
                enable: function (namespaceOrInstance) {
                    namespaceOrInstance = chek_1.toArray(namespaceOrInstance);
                    namespaceOrInstance.forEach(function (ns) {
                        ns = toNamespace(ns);
                        if (!~_this._activeDebuggers.indexOf(ns))
                            _this._activeDebuggers.push(ns);
                    });
                },
                /**
                 * Disable
                 * Disables a namespace, instance or array of namespaces or instances.
                 *
                 * @param namespaceOrInstnace the ns or instance to disable.
                 */
                disable: function (namespaceOrInstance) {
                    namespaceOrInstance = chek_1.toArray(namespaceOrInstance);
                    namespaceOrInstance.forEach(function (ns) {
                        ns = toNamespace(ns);
                        _this._activeDebuggers.splice(_this._activeDebuggers.indexOf(ns), 1);
                    });
                },
                /**
                 * Destroy
                 * Destroys a namespace, instance or array of namespaces or instances.
                 *
                 * @param namespaceOrInstnace the ns or instance to destroy.
                 */
                destroy: function (namespaceOrInstance) {
                    namespaceOrInstance = chek_1.toArray(namespaceOrInstance);
                    namespaceOrInstance.forEach(function (ns) {
                        ns = toNamespace(ns);
                        delete _this._debuggers[ns];
                    });
                }
            };
            return methods;
        },
        enumerable: true,
        configurable: true
    });
    /**
     * Parse
     * Parses log arguments and compiles event.
     *
     * @param type the type of log message to log.
     * @param args the arguments to be logged.
     */
    Timbr.prototype.parse = function (type) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        var baseType = type || '';
        var clone = args.slice(0);
        clone[0] = clone[0] || '';
        var subTypes = baseType.split(':');
        baseType = subTypes.length ? subTypes.shift() : null;
        var knownType = chek_1.contains(this._levelKeys, baseType);
        var debugr = baseType === 'debug' ? this.debuggers.get(subTypes.join(':')) : null;
        var stack = {};
        var err, meta, ts, msg;
        var event = {};
        var fn = chek_1.noop;
        var prune = 0;
        var pruneGen = debugr ? 2 : 2;
        // Check if should convert to error level.
        if (chek_1.isError(clone[0]) && baseType !== this.options.errorLevel && this.options.errorConvert && !debugr) {
            baseType = this.options.errorLevel;
            type = subTypes.length ? baseType + ':' + subTypes.join(':') : baseType;
        }
        // Convert first arg to error.
        if (baseType === this.options.errorLevel && this.options.errorConstruct && chek_1.isString(clone[0])) {
            clone[0] = new Error(clone[0]);
            prune = 2;
        }
        var level = debugr ? debugr : this._levels[baseType] || null;
        var idx = this.getIndex(type);
        var activeIdx = this.getIndex(this.options.level);
        // Check if last is callback.
        if (chek_1.isFunction(chek_1.last(clone))) {
            fn = clone.pop();
            args.pop();
        }
        var tmpMeta = {};
        // Shift first arg as message.
        msg = clone.shift();
        // Only metadata was logged.
        if (chek_1.isPlainObject(msg)) {
            tmpMeta = msg;
            msg = '';
        }
        // Inspect for formatters.
        var fmtrs = (chek_1.isString(msg) && msg.match(/(%s|%d|%j|%%)/g)) || [];
        var fmtArgs = clone.slice(0, fmtrs.length);
        var suffixArgs = clone.slice(fmtrs.length);
        // Check if first arge is an Error.
        err = chek_1.isError(msg) ? msg : null;
        // Get stacktrace from error or fake it.
        stack = err ?
            this.parseStack(err.stack, prune) :
            this.parseStack((new Error('get stack')).stack, pruneGen);
        // Check if message should be formatted.
        if (fmtArgs.length)
            msg = util_1.format.apply(void 0, [msg].concat(fmtArgs));
        // Inspect suffix args for metadata.
        suffixArgs.forEach(function (v, i) {
            if (chek_1.isPlainObject(v))
                tmpMeta = chek_1.extend(tmpMeta, v);
        });
        suffixArgs = suffixArgs.filter(function (v) { return !chek_1.isPlainObject(v); });
        if (suffixArgs.length)
            msg += (' ' + suffixArgs.join(' '));
        // Check if last is metadata.
        meta = !chek_1.isEmpty(tmpMeta) ? tmpMeta : null;
        if (err) {
            var origMsg = msg;
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
            message: msg,
            timestamp: this.getTimestamp(level && level.timestamp),
            meta: meta,
            args: args,
            error: err || null,
            stack: stack,
            fn: fn
        };
        var compiled = [];
        var metaStyled, elapsedStyled;
        // Style metadata.
        if (meta) {
            if (!this.options.prettyMeta)
                metaStyled = util_1.inspect(meta, { colors: this.options.colorize });
            else
                metaStyled = this.prettifyObject(meta, level.padding);
        }
        // Styled debug elapsed time.
        if (debugr) {
            elapsedStyled = this.colorize("(" + debugr.elapsed + "ms)", debugr.styles);
        }
        // Ignore for write, writeLn and log levels.
        if (!/^write/.test(baseType) && baseType !== 'log') {
            // Check for indent.
            if (level.indent && level.indent.length)
                compiled.push(level.indent);
            // Add timestamp.
            if (this.options.timestamp && event.timestamp)
                compiled.push(this.colorize("[" + event.timestamp + "]", this.options.timestampStyles));
            // Add log level label.
            if (level.label && event.type) {
                var label = level.label;
                var padding = '';
                if (debugr && label === 'default')
                    label = 'debug';
                if (level.padding)
                    padding = this.pad(label || '', null);
                if (label && label.length) {
                    label = this.colorize(padding + label + ':', level.styles);
                    compiled.push(label);
                }
            }
            else {
                // need to offset if using labels.
                var offset = this.options.labels ? 1 : 0;
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
    };
    /**
     * Logger
     * Common logger method which calls .parse();
     *
     * @param type the type of message to be logged.
     * @param args the arguments to be logged.
     */
    Timbr.prototype.logger = function (type) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        var stream = this.options.stream;
        var event = this.parse.apply(this, [type].concat(args));
        var eventClone = chek_1.clone(event);
        delete eventClone.fn;
        // If debugOnly and we are debugging ensure is debug level.
        if (this.options.debugOnly && chek_1.isDebug())
            return;
        if (event.index > event.activeIndex)
            return this;
        var msg = event.compiled.join(' ');
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
            this.emit("log:" + event.type, eventClone.message, eventClone);
        // Call callback function passing parsed event.
        event.fn(eventClone.message, eventClone);
        if (this.options.errorExit && event.level.label === this.options.errorLevel)
            process.exit(1);
        return this;
    };
    /**
     * Symbol
     * : Gets known symbol for terminal or returns empty string.
     *
     * @param name the name of the symbol to return.
     */
    Timbr.prototype.symbol = function (name, styles) {
        if (SYMBOLS[name])
            name = SYMBOLS[name];
        styles = chek_1.toArray(styles, []);
        return this.colorize(name, styles);
    };
    /**
     * Write
     * : Directly outputs to stream after formatting.
     *
     * @param args arguments to output to stream directly.
     */
    Timbr.prototype.writeLn = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        return this.logger.apply(this, ['writeLn'].concat(args));
    };
    /**
     * Concat
     * : Same as write but concats to stream without line return appended.
     *
     * @param args the arguments to format and output.
     */
    Timbr.prototype.write = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        return this.logger.apply(this, ['write'].concat(args));
    };
    /**
     * Exit
     * : Causes immediate exit.
     *
     * @param code the exit code if any.
     */
    Timbr.prototype.exit = function (code) {
        process.exit(code || 0);
    };
    return Timbr;
}(events_1.EventEmitter));
exports.Timbr = Timbr;
/**
 * Create
 * Creates a new instance of Timbr.
 *
 * @param options Timbr options.
 * @param levels the log levels to be used.
 */
function create(options, levels) {
    var instance = new Timbr(options, levels);
    function Logger() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        if (args.length)
            instance.logger.apply(instance, ['log'].concat(args));
        return Logger;
    }
    for (var id in instance) {
        Logger[id] = instance[id];
    }
    // logger = intersect(Logger, instance);
    return Logger;
}
exports.create = create;
// Inits a default instance.
function init(options) {
    return create(options, exports.LOG_LEVELS);
}
exports.init = init;
//# sourceMappingURL=timbr.js.map