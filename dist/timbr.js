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
exports.LOG_LEVELS = {
    error: ['bold', 'red'],
    warn: 'yellow',
    info: 'green',
    trace: 'cyan',
    verbose: 'magenta',
    debug: 'blue'
};
var DEBUG_DEFAULTS = {
    styles: 'blue'
};
var DEFAULTS = {
    stream: process.stderr,
    level: 'info',
    colorize: true,
    labelLevels: true,
    padLevels: true,
    timestamp: 'time',
    timestampStyles: null,
    timestampLocale: 'en-US',
    timestampTimezone: 'UTC',
    errorLevel: 'error',
    errorExit: false,
    errorConvert: false,
    errorCapture: false,
    errorConstruct: false,
    stackTrace: true,
    stackDepth: 0,
    miniStack: false,
    debugLevel: 'debug',
    debugOnly: false,
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
            console.log(process.env.DEBUG_ONLY);
            if (!active.length)
                this._activeDebuggers.push('default');
            else
                this._activeDebuggers = active;
            if (process.env.DEBUG_ONLY)
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
        for (var k in this._levels) {
            if (!chek_1.isPlainObject(this._levels[k])) {
                var level_1 = this._levels[k];
                level_1 = {
                    label: k,
                    styles: chek_1.toArray(level_1, []),
                    symbol: null,
                    symbolPos: 'after',
                    symbolStyles: []
                };
                this._levels[k] = level_1;
            }
            else {
                var lvl = this._levels[k];
                lvl.label = lvl.label !== null ? lvl.label || k : null;
                lvl.styles = chek_1.toArray(lvl.styles, []);
                lvl.symbol = lvl.symbol || null;
                lvl.symbolPos = lvl.symbolPos || 'after';
                lvl.symbolStyles = lvl.symbolStyles;
                // Check if known symbol.
                if (SYMBOLS[lvl.symbol])
                    lvl.symbol = SYMBOLS[lvl.symbol];
                if ((lvl.symbolStyles !== null || !lvl.symbolStyles.length) && lvl.styles)
                    lvl.symbolStyles = lvl.styles;
                this._levels[k] = lvl;
            }
        }
        var levelKeys = this._levelKeys;
        var level = this.options.level;
        var errorLevel = this.options.errorLevel;
        // Ensure a default log level.
        var tmpLevel = level;
        if (chek_1.isNumber(level))
            tmpLevel = levelKeys[level] || 'info';
        // ensure a level, if none select last.
        if (!~levelKeys.indexOf(tmpLevel))
            tmpLevel = chek_1.last(levelKeys);
        level = this.options.level = tmpLevel;
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
        format = format || this.options.timestamp;
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
        if (!this.options.padLevels)
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
            return "debug:" + l;
        });
        var levels = [];
        for (var k in this._levels) {
            var level = this._levels[k];
            if (level.label !== null)
                levels.push(level.label);
        }
        levels = levels.concat(debugLevels);
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
     * Debugger
     * Creates a new debugger instance.
     *
     * @param namespace creates a debugger by namespace.
     * @param options debugger options.
     */
    Timbr.prototype.debugger = function (namespace, options) {
        var self = this;
        var previous;
        if (chek_1.isPlainObject(namespace)) {
            options = namespace;
            namespace = undefined;
        }
        namespace = namespace || 'default';
        // Check if debugger exists.
        if (this._debuggers[namespace])
            return this._debuggers[namespace];
        options = chek_1.extend({}, DEBUG_DEFAULTS, options);
        var debug = function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            if (!chek_1.isDebug() || !~self._activeDebuggers.indexOf(namespace))
                return self;
            var current = +new Date();
            var elapsed = current - (previous || current);
            debug.previous = previous;
            debug.current = current;
            debug.elasped = elapsed;
            previous = current;
            var event = self.parse.apply(self, ["debug:" + namespace].concat(args));
            var msg = event.compiled.join(' ');
            self.options.stream.write(msg + self.colorize(" (" + elapsed + "ms)", debug.styles) + EOL);
            self.emit('debug', event.message, event);
            self.emit("" + event.type, event.message, event);
            event.fn(event.message, event);
            return self;
        };
        debug.namespace = namespace;
        debug.styles = options.styles;
        debug.symbol = options.symbol || null;
        debug.symbolPos = options.symbolPos || 'after';
        debug.symbolStyles = options.symbolStyles !== null ? options.symbolStyles || debug.styles || [] : null;
        debug.enabled = self.debuggers.enabled.bind(self, namespace);
        debug.enable = self.debuggers.enable.bind(self, namespace);
        debug.disable = self.debuggers.disable.bind(self, namespace);
        debug.destroy = self.debuggers.destroy.bind(self, namespace);
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
        var subTypes = baseType.split(':');
        baseType = subTypes.length ? subTypes.shift() : null;
        var knownType = chek_1.contains(this._levelKeys, baseType);
        var debugr = baseType === 'debug' ? this.debuggers.get(subTypes[0]) : null;
        var stack;
        var err, meta, ts, msg;
        var event;
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
        // When debug ensure label is the type.
        if (debugr)
            level.label = type;
        // Check if last is callback.
        if (chek_1.isFunction(chek_1.last(clone))) {
            fn = clone.pop();
            args.pop();
        }
        // Check if last is metadata.
        meta = chek_1.isPlainObject(chek_1.last(clone)) ? clone.pop() : null;
        // Check if first arge is an Error.
        err = chek_1.isError(chek_1.first(clone)) ? clone.shift() : null;
        // Get stacktrace from error or fake it.
        stack = err ?
            this.parseStack(err.stack, prune) :
            this.parseStack((new Error('get stack')).stack, pruneGen);
        // Format the message.
        if (clone.length) {
            if (clone.length > 1) {
                if (/(%s|%d|%i|%f|%j|%o|%O|%%)/g.test(clone[0])) {
                    msg = util_1.format(clone[0], clone.slice(1));
                }
                else {
                    msg = clone.join(' ');
                }
            }
            else {
                msg = clone[0];
            }
        }
        else {
            msg = '';
        }
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
            subTypes: subTypes,
            level: level,
            index: idx,
            activeIndex: activeIdx,
            message: msg,
            timestamp: this.getTimestamp(),
            meta: meta,
            args: args,
            error: err || null,
            stack: stack,
            fn: fn
        };
        var compiled = [];
        // Ignore for write, writeLn and log levels.
        if (!/^write/.test(baseType) && baseType !== 'log') {
            // Add timestamp.
            if (this.options.timestamp)
                compiled.push(this.colorize("[" + event.timestamp + "]", this.options.timestampStyles));
            // Add log level label.
            if (this.options.labelLevels && event.type) {
                var label = level.label;
                var padding = '';
                if (label === 'debug:default')
                    label = 'debug';
                if (this.options.padLevels)
                    padding = this.pad(label || '');
                if (label && label.length) {
                    label = this.colorize(padding + label + ':', level.styles);
                    compiled.push(label);
                }
            }
            // Check for Symbol.
            if (level && level.symbol && level.symbolPos === 'before')
                compiled.push(this.colorize(level.symbol, level.symbolStyles));
            compiled.push(event.message);
            // Add metadata.
            if (event.meta)
                compiled.push(util_1.inspect(event.meta, { colors: this.options.colorize }));
            // Add ministack if not error.
            if (this.options.miniStack) {
                if (!event.error || (event.error && !this.options.stackTrace))
                    compiled.push(this.colorize(event.stack.miniStack, 'gray'));
            }
            // Check for Symbol after.
            if (level && level.symbol && level.symbolPos === 'after')
                compiled.push(this.colorize(level.symbol, level.symbolStyles));
        }
        else {
            compiled = [event.message];
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