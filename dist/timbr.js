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
    debug: 'blue'
};
var DEFAULTS = {
    stream: undefined,
    level: 'info',
    labelLevels: true,
    padLevels: true,
    colorize: true,
    errorExit: false,
    errorConvert: false,
    errorCapture: false,
    errorLevel: 'error',
    errorConstruct: false,
    stackTrace: true,
    stackDepth: 0,
    prettyStack: false,
    miniStack: false,
    timestamp: 'time',
    debugLevel: 'debug',
    debugAuto: true,
    debugOnly: false // when debugging only show debug level messages.
};
var Timbr = (function (_super) {
    __extends(Timbr, _super);
    function Timbr(options, levels) {
        var _this = _super.call(this) || this;
        _this._debuggers = [];
        _this._symbols = SYMBOLS;
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
        console.log(chek_1.isDebug());
        console.log(process.env);
        if ((chek_1.isDebug() || process.env.DEBUG) && options.debugAuto) {
            var debugLevel = options.debugLevel;
            if (~this._levelKeys.indexOf(debugLevel))
                options.level = debugLevel;
            if (process.env.DEBUG)
                this.addDebugger(process.env.DEBUG);
        }
        // Init methods.
        this._levelKeys.forEach(function (l, i) {
            _this[l] = _this.logger.bind(_this, l);
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
                    symbolPos: 'after'
                };
                this._levels[k] = level_1;
            }
            else {
                var lvl = this._levels[k];
                this._levels[k] = chek_1.extend({}, lvl);
                lvl.label = lvl.label || k;
                lvl.styles = chek_1.toArray(lvl.styles, []);
            }
        }
        var levelKeys = this._levelKeys;
        var level = this.options.level;
        var debugLevel = this.options.debugLevel;
        var errorLevel = this.options.errorLevel;
        var exitLevel = this.options.errorExit;
        var tmpLevel = level;
        if (chek_1.isNumber(level))
            tmpLevel = levelKeys[level] || 'info';
        // ensure a level, if none select last.
        if (!~levelKeys.indexOf(tmpLevel))
            tmpLevel = chek_1.last(levelKeys);
        level = this.options.level = tmpLevel;
        // ensure debug level.
        if (!~levelKeys.indexOf(debugLevel))
            this.options.debugLevel = chek_1.last(this._levelKeys);
        // ensure error level
        if (!~levelKeys.indexOf(errorLevel))
            this.options.errorLevel = chek_1.first(this._levelKeys);
    };
    /**
     * Is Debug
     * Returns true if level matches debug level.
     */
    Timbr.prototype.isDebugging = function () {
        return this.options.level === this.options.debugLevel;
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
     * Colorize If
     * If colors are enabled apply ansi styles to value.
     *
     * @param val the value to be colorized.
     * @param styles the styles to be applied.
     */
    Timbr.prototype.colorizeIf = function (val, styles) {
        if (!this.options.colorize)
            return val;
        return this.colorize(val, styles);
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
        var _this = this;
        prune = prune || 0;
        depth = depth || this.options.stackDepth;
        if (!stack)
            return null;
        var frames = [];
        var traced = [];
        var miniStack;
        stack.split(EOL)
            .slice(prune)
            .forEach(function (s, i) {
            if (i >= depth && depth !== 0)
                return;
            var relativeFile, filename, column, line, method;
            method = s;
            method = s.replace(/^\s*at\s?/, '').split(' ')[0];
            s = s.replace(/^\s+/, '').replace(/^.+\(/, '').replace(/\)$/, '');
            s = s.split(':');
            filename = s[0];
            column = s[1];
            line = s[2];
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
            // const trace = `    at ${this.colorizeIf(method || 'uknown', 'magenta')} (${this.colorizeIf(relativeFile, 'green')}:${this.colorizeIf(line, 'yellow')}:${this.colorizeIf(column, 'yellow')})`;
            var trace = _this.colorizeIf("    at " + method + " (" + relativeFile + ":" + line + ":" + column + ")", 'gray');
            if (i === 0)
                miniStack = _this.colorizeIf("(" + parsedRelative.base + ":" + line + ":" + column + ")", 'gray');
            frames.push(frame);
            traced.push(trace);
        });
        return {
            frames: frames,
            stack: traced,
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
        var config = {
            format: 'time',
            styles: 'gray',
            date: new Date(),
            timestamp: null
        };
        if (chek_1.isPlainObject(format)) {
            chek_1.extend(config, format);
        }
        else {
            config.format = format;
        }
        if (chek_1.isFunction(config.format)) {
            config.timestamp = config.format();
        }
        else {
            var ts = config.date.toISOString();
            var split = ts.replace('Z', '').split('T');
            if (config.format === 'time')
                config.timestamp = split[1];
            else
                config.timestamp = split[0] + " " + split[1];
        }
        return config;
    };
    /**
     * Uncaught Exception
     * Handler for uncaught excrptions.
     *
     * @param err the error caught by process uncaughtException.
     */
    Timbr.prototype.uncaughtException = function (err) {
        var _this = this;
        var errorLevel = this.options.errorLevel;
        if (!this.options.errorCapture || !this.exists(errorLevel))
            throw err;
        var origLevel = errorLevel;
        errorLevel += ':exception';
        this.logger(errorLevel, err, function () {
            _this.toggleExceptionHandler(false);
            process.exit(1); // always exit on uncaught errors.
        });
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
     * Add Debugger
     * : Adds a debugger group if does not already exist.
     *
     * @param group the debugger group to add.
     */
    Timbr.prototype.addDebugger = function (group) {
        if (!~this._debuggers.indexOf(group))
            this._debuggers.push(group);
    };
    /**
     * Remove Debugger
     * : Removes the specified group from debuggers.
     *
     * @param group the debugger group to remove.
     */
    Timbr.prototype.removeDebugger = function (group) {
        this._debuggers = this._debuggers.filter(function (d) { return d !== group; });
    };
    /**
     * Exists Debugger
     * Checks if a debugger exists.
     *
     * @param group the group to be checked.
     */
    Timbr.prototype.existsDebugger = function (group) {
        return ~this._debuggers.indexOf(group);
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
        var i = this._levelKeys.length;
        var padding = '';
        offset = chek_1.isString(offset) ? offset.length : offset;
        offset = offset || 0;
        function pad(l) {
            var s = '';
            while (l--)
                s += ' ';
            return s;
        }
        var debugLevels = (this._debuggers || []).map(function (l) { return "debug-" + l; });
        var levels = this._levelKeys.concat(debugLevels);
        while (i--) {
            //  const diff = this._levelKeys[i].length - len;
            var diff = levels[i].length - len;
            if (diff > 0)
                padding = pad(diff + offset);
        }
        return padding;
    };
    /**
     * Logger
     * : Common logger method.
     *
     * @param type the type of log message to log.
     * @param args the arguments to be logged.
     */
    Timbr.prototype.logger = function (type) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        var clone = args.slice(0);
        var origType = type;
        var splitType = type ? type.split(':') : null;
        type = splitType[0];
        // Flags used internally.
        var isResolve = chek_1.contains(splitType, 'resolve');
        var isException = chek_1.contains(splitType, 'exception');
        var debugGroup = type === 'debug' && splitType[1];
        var knownType = chek_1.contains(this._levelKeys, type);
        var emitType = !debugGroup ? splitType[0] : origType;
        var stackTrace;
        var err, errMsg, meta, metaFormatted, tsFmt, tsDate, msg, normalized, rawMsg, errType;
        var event;
        var fn = chek_1.noop;
        var result = [];
        var suffix = [];
        var pruneTrace = 1;
        // Converts to error if first arg is instance of Error.
        if ((clone[0] instanceof Error) && this.options.errorConvert)
            type = this.options.errorLevel;
        if (type === this.options.errorLevel && this.options.errorConstruct && chek_1.isString(clone[0])) {
            clone[0] = new Error(clone[0]);
            pruneTrace = 2;
        }
        var level = (knownType ? this._levels[type] : null);
        var idx = this.getIndex(type);
        var activeIdx = this.getIndex(this.options.level);
        // If debugOnly and we are debugging ensure is debug level.
        if (this.options.debugOnly &&
            this.isDebugging() &&
            type !== this.options.level)
            return this;
        // Check if is loggable level.
        if (!isResolve && (idx > activeIdx))
            return this;
        if (chek_1.isFunction(chek_1.last(clone))) {
            fn = clone.pop();
            args.pop();
        }
        meta = chek_1.isPlainObject(chek_1.last(clone)) ? clone.pop() : null;
        err = chek_1.isError(chek_1.first(clone)) ? clone.shift() : null;
        stackTrace = err ?
            this.parseStack(err.stack, pruneTrace) :
            this.parseStack((new Error('get stack')).stack, 2);
        // Add optional timestamp.
        if (this.options.timestamp) {
            var ts = this.getTimestamp();
            tsFmt = ts.timestamp;
            tsDate = ts.date;
            result.push(this.colorizeIf("[" + tsFmt + "]", ts.styles));
        }
        // Add error type if not generic 'Error'.
        errType = err && err.name !== 'Error' ? ":" + err.name : '';
        // Add log label type.
        if (knownType && this.options.labelLevels) {
            var styledType = this.colorizeIf(type, level.styles);
            var styledDebugType = void 0;
            var unstyledDebugType = '-' + debugGroup;
            var padType = type;
            if (debugGroup) {
                styledDebugType = this.colorizeIf(unstyledDebugType, 'gray');
                styledType += styledDebugType;
            }
            var padding = this.pad(type);
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
                    rawMsg = util_1.format(clone[0], clone.slice(1));
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
            metaFormatted = util_1.format(util_1.inspect(meta, null, null, this.options.colorize));
            result.push(metaFormatted);
        }
        // Add ministack.
        if (this.options.miniStack && stackTrace)
            result.push(this.colorizeIf(stackTrace.miniStack, 'gray'));
        // Add stack trace if error.
        if (err && stackTrace) {
            if (this.options.prettyStack)
                suffix.push(util_1.format(util_1.inspect(stackTrace.frames, null, null, this.options.colorize)));
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
        this.emit("log:" + emitType, event);
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
    };
    /**
     * Exists
     * : Checks if level exists in levels.
     *
     * @param level the key to check.
     */
    Timbr.prototype.exists = function (level) {
        return !!~this.getIndex(level);
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
     * : Creates a new grouped debugger.
     *
     * @param group enables debugging by active group.
     */
    Timbr.prototype.debugger = function (group) {
        // If no debuggers yet add unless explicitly disabled.
        // if ((!this._debuggers.length && enabled !== false) || enabled === true)
        //   this.addDebugger(group);
        var _this = this;
        // if (enabled === false)
        //   this.removeDebugger(group);
        if (this.existsDebugger(group))
            this.removeDebugger(group);
        else
            this.addDebugger(group);
        return {
            log: function () {
                var args = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    args[_i] = arguments[_i];
                }
                if (!~_this._debuggers.indexOf(group))
                    return;
                _this.logger.apply(_this, ["debug:" + group].concat(args));
            },
            write: function () {
                var args = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    args[_i] = arguments[_i];
                }
                if (!~_this._debuggers.indexOf(group))
                    return;
                _this.write.apply(_this, args);
            },
            exit: this.exit
            // enable: this.addDebugger.bind(this, group),
            // disable: this.removeDebugger.bind(this, group)
        };
    };
    /**
     * Debuggers
     * : Returns list of debuggers.
     */
    Timbr.prototype.debuggers = function () {
        return this._debuggers;
    };
    /**
     * Symbol
     * : Gets known symbol for terminal or returns empty string.
     *
     * @param name the name of the symbol to return.
     */
    Timbr.prototype.symbol = function (name, styles) {
        if (this._symbols[name])
            name = this._symbols[name];
        styles = chek_1.toArray(styles, []);
        if (!styles.length)
            return name;
        return colurs.applyAnsi(name, styles);
    };
    /**
     * Write
     * : Directly outputs to stream after formatting.
     *
     * @param args arguments to output to stream directly.
     */
    Timbr.prototype.write = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        var obj = this.logger.apply(this, ['write:resolve'].concat(args));
        this.stream.write(obj.message + EOL);
    };
    /**
     * Concat
     * : Same as write but concats to stream without line return appended.
     *
     * @param args the arguments to format and output.
     */
    Timbr.prototype.concat = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        var obj = this.logger.apply(this, ['write:resolve'].concat(args));
        this.stream.write(obj.message);
        return this;
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
    // DEPRECATED
    /**
     * Get
     * Gets a current option value.
     *
     * @param key the option key to get.
     */
    Timbr.prototype.get = function (key) {
        return this.options[key];
    };
    /**
     * Set
     * Sets options for Logger.
     *
     * @param key the key or options object to be set.
     * @param value the value for the key.
     */
    Timbr.prototype.set = function (key, value) {
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
    return Timbr;
}(events_1.EventEmitter));
exports.Timbr = Timbr;
function intersect(first, second) {
    var result = {};
    for (var id in first) {
        result[id] = first[id];
    }
    for (var id in second) {
        if (!result.hasOwnProperty(id)) {
            result[id] = second[id];
        }
    }
    return result;
}
/**
 * Create
 * Creates a new instance of Timbr.
 *
 * @param options Timbr options.
 * @param levels the log levels to be used.
 */
function create(options, levels) {
    var logger;
    var instance = new Timbr(options, levels);
    function Logger() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        if (args.length) {
            var obj = instance.logger.apply(instance, ['log:resolve'].concat(args));
            instance.stream.write(obj.message + EOL);
        }
        return logger;
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