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
var os_1 = require("os");
var SYMBOLS_SUPPORTED = !chek_1.isWindows() || process.env.VSCODE_PID || process.env.CI;
var STYLES = {
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
    debuggers: [],
    debugAuto: true,
    debugOnly: false,
    styles: STYLES,
    enabled: true,
};
var TimbrInstance = /** @class */ (function (_super) {
    __extends(TimbrInstance, _super);
    function TimbrInstance(options) {
        var levels = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            levels[_i - 1] = arguments[_i];
        }
        var _this = _super.call(this) || this;
        _this._debuggers = [];
        _this.options = chek_1.extend({}, DEFAULTS, options);
        // Normalizes when custom.
        _this._levels = levels;
        _this.normalizeLevels();
        if (_this.options.errorCapture)
            _this.toggleExceptionHandler(true);
        _this.stream = _this.options.stream || process.stdout;
        _this._colurs = new colurs_1.Colurs({ enabled: _this.options.colorize });
        // initialized with debuggers set them.
        if (_this.options.debuggers.length)
            _this._debuggers = chek_1.isString(_this.options.debuggers) ? [_this.options.debuggers] : _this.options.debuggers;
        if ((chek_1.isDebug() || process.env.DEBUG) && _this.options.debugAuto) {
            var debugLevel = _this.options.debugLevel;
            if (~levels.indexOf(debugLevel))
                _this.options.level = debugLevel;
            if (process.env.DEBUG)
                _this.addDebugger(process.env.DEBUG);
        }
        // Init methods.
        levels.forEach(function (l, i) {
            _this[l] = _this.logger.bind(_this, l);
            return _this;
        });
        // Build symbols.
        _this._symbols = {
            info: SYMBOLS_SUPPORTED ? 'ℹ' : 'i',
            success: SYMBOLS_SUPPORTED ? '✔' : '√',
            warning: SYMBOLS_SUPPORTED ? '⚠' : '!!',
            alert: SYMBOLS_SUPPORTED ? '✖' : 'x'
        };
        return _this;
    }
    /**
     * Normalize Levels
     * : Normalizes log levels ensuring error, exit and debug levels as well as styles.
     *
     * @param levels custom log levels if provided.
     */
    TimbrInstance.prototype.normalizeLevels = function () {
        var _this = this;
        var levels = this._levels;
        var baseStyles = [
            'red',
            'yellow',
            'green',
            'cyan',
            'blue',
            'magenta',
            'gray'
        ];
        var level = this.options.level;
        var debugLevel = this.options.debugLevel;
        var errorLevel = this.options.errorLevel;
        var exitLevel = this.options.errorExit;
        var tmpLevel = level;
        if (chek_1.isNumber(level))
            tmpLevel = levels[level] || 'info';
        if (!~levels.indexOf(tmpLevel))
            tmpLevel = chek_1.last(levels);
        level = this.options.level = tmpLevel;
        // ensure debug level.
        if (!~levels.indexOf(debugLevel))
            this.options.debugLevel = chek_1.last(this._levels);
        // ensure error level
        if (!~levels.indexOf(errorLevel))
            this.options.errorLevel = chek_1.first(this._levels);
        levels.forEach(function (l, i) {
            if (!_this.options.styles[l])
                _this.options.styles[l] = baseStyles[i] || (Math.floor(Math.random() * 6) + 1);
        });
    };
    /**
     * Is Debug
     * Returns true if level matches debug level.
     */
    TimbrInstance.prototype.isDebugging = function () {
        return this.options.level === this.options.debugLevel;
    };
    /**
     * Get Index
     * Gets the index of a value in an array.
     *
     * @param level the key to get the index for.
     * @param arr the array to be inspected.
     */
    TimbrInstance.prototype.getIndex = function (level) {
        return this._levels.indexOf(level);
    };
    /**
     * Colorize
     * Applies ansi styles to value.
     *
     * @param val the value to be colorized.
     * @param styles the styles to be applied.
     */
    TimbrInstance.prototype.colorize = function (val, styles) {
        if (!styles || !styles.length)
            return val;
        return this._colurs.applyAnsi(val, styles);
    };
    /**
     * Colorize If
     * If colors are enabled apply ansi styles to value.
     *
     * @param val the value to be colorized.
     * @param styles the styles to be applied.
     */
    TimbrInstance.prototype.colorizeIf = function (val, styles) {
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
    TimbrInstance.prototype.parseStack = function (stack, prune, depth) {
        var _this = this;
        prune = prune || 0;
        depth = depth || this.options.stackDepth;
        if (!stack)
            return null;
        var frames = [];
        var traced = [];
        var miniStack;
        stack.split(os_1.EOL)
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
    TimbrInstance.prototype.getTimestamp = function (format) {
        format = format || this.options.timestamp;
        var timestamp = (new Date()).toISOString();
        var split = timestamp.replace('Z', '').split('T');
        if (format === true)
            return timestamp;
        if (format === 'time')
            return split[1];
        return split[0] + " " + split[1];
    };
    /**
     * Uncaught Exception
     * Handler for uncaught excrptions.
     *
     * @param err the error caught by process uncaughtException.
     */
    TimbrInstance.prototype.uncaughtException = function (err) {
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
    TimbrInstance.prototype.toggleExceptionHandler = function (capture) {
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
    TimbrInstance.prototype.addDebugger = function (group) {
        if (!~this._debuggers.indexOf(group))
            this._debuggers.push(group);
    };
    /**
     * Remove Debugger
     * : Removes the specified group from debuggers.
     *
     * @param group the debugger group to remove.
     */
    TimbrInstance.prototype.removeDebugger = function (group) {
        this._debuggers = this._debuggers.filter(function (d) { return d !== group; });
    };
    /**
     * Pad
     * : Gets padding for level type.
     *
     * @param type the log level type.
     * @param offset additional offset.
     */
    TimbrInstance.prototype.pad = function (type, offset) {
        if (!this.options.padLevels)
            return '';
        var max = 0;
        var len = type.length;
        var i = this._levels.length;
        var padding = '';
        offset = chek_1.isString(offset) ? offset.length : offset;
        offset = offset || 0;
        function pad(l) {
            var s = '';
            while (l--)
                s += ' ';
            return s;
        }
        while (i--) {
            var diff = this._levels[i].length - len;
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
    TimbrInstance.prototype.logger = function (type) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        if (!this.options.enabled)
            return this;
        var clone = args.slice(0);
        var origType = type;
        var splitType = type.split(':');
        type = splitType[0];
        // Flags used internally.
        var isResolve = chek_1.contains(splitType, 'resolve');
        var isException = chek_1.contains(splitType, 'exception');
        var debugGroup = type === 'debug' && splitType[1];
        var knownType = chek_1.contains(this._levels, type);
        var emitType = !debugGroup ? splitType[0] : origType;
        var stackTrace;
        var err, errMsg, meta, metaFormatted, tsFmt, ts, msg, normalized, rawMsg, errType;
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
        var level = this.getIndex(type);
        var activeLevel = this.getIndex(this.options.level);
        // If debugOnly and we are debugging ensure is debug level.
        if (this.options.debugOnly &&
            this.isDebugging() &&
            type !== this.options.level)
            return this;
        // Check if is loggable level.
        if (!isResolve && (level > activeLevel))
            return this;
        if (chek_1.isFunction(chek_1.last(clone))) {
            fn = clone.pop();
            args.pop();
        }
        meta = chek_1.isPlainObject(chek_1.last(clone)) ? clone.pop() : null;
        err = chek_1.isError(chek_1.first(clone)) ? clone.shift() : null;
        stackTrace = err ?
            this.parseStack(err.stack, pruneTrace) :
            this.parseStack((new Error('get stack')).stack, 3);
        // Add optional timestamp.
        if (this.options.timestamp) {
            tsFmt = "" + this.getTimestamp();
            ts = "" + this.getTimestamp(true);
            result.push(this.colorizeIf("[" + tsFmt + "]", 'magenta'));
        }
        // Add error type if not generic 'Error'.
        errType = err && err.name !== 'Error' ? ":" + err.name : '';
        // Add log label type.
        if (knownType && this.options.labelLevels) {
            var styles = this.options.styles;
            var styledType = this.colorizeIf(type, styles[type]);
            var styledDebugType = void 0;
            if (debugGroup) {
                styledDebugType = this.colorizeIf(':' + debugGroup, 'gray');
                styledType += styledDebugType;
            }
            var padding = this.pad(type);
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
                suffix.push(stackTrace.stack.join(os_1.EOL));
        }
        msg = result.join(' ');
        msg = (suffix.length ? msg + os_1.EOL + suffix.join(os_1.EOL) : msg) + os_1.EOL;
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
    TimbrInstance.prototype.exists = function (level) {
        return !!~this.getIndex(level);
    };
    /**
     * Get
     * Gets a current option value.
     *
     * @param key the option key to get.
     */
    TimbrInstance.prototype.get = function (key) {
        return this.options[key];
    };
    /**
     * Set
     * Sets options for Logger.
     *
     * @param key the key or options object to be set.
     * @param value the value for the key.
     */
    TimbrInstance.prototype.set = function (key, value) {
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
     * @param enabled when true disables group.
     */
    TimbrInstance.prototype.debugger = function (group, enabled) {
        var _this = this;
        // If no debuggers yet add unless explicitly disabled.
        if ((!this._debuggers.length && enabled !== false) || enabled === true)
            this.addDebugger(group);
        if (enabled === false)
            this.removeDebugger(group);
        return {
            log: function () {
                var args = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    args[_i] = arguments[_i];
                }
                if (!~_this._debuggers.indexOf(group))
                    return;
                _this.logger.apply(_this, ["debug:" + group].concat(args));
                return _this;
            },
            write: function () {
                var args = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    args[_i] = arguments[_i];
                }
                if (!~_this._debuggers.indexOf(group))
                    return;
                _this.write.apply(_this, args);
                return _this;
            },
            exit: this.exit,
            enable: this.addDebugger.bind(this, group),
            disable: this.removeDebugger.bind(this, group)
        };
    };
    /**
     * Debuggers
     * : Returns list of debuggers.
     */
    TimbrInstance.prototype.debuggers = function () {
        return this._debuggers;
    };
    /**
     * Symbol
     * : Gets known symbol for terminal or returns empty string.
     *
     * @param name the name of the symbol to return.
     */
    TimbrInstance.prototype.symbol = function (name, styles) {
        if (this._symbols[name])
            name = this._symbols[name];
        styles = chek_1.toArray(styles, []);
        return this._colurs.applyAnsi(name, styles);
    };
    /**
     * Write
     * : Directly outputs to stream after formatting.
     *
     * @param args arguments to output to stream directly.
     */
    TimbrInstance.prototype.write = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        var obj = this.logger.apply(this, ['write:resolve'].concat(args));
        this.stream.write(obj.message + os_1.EOL);
    };
    /**
     * Concat
     * : Same as write but concats to stream without line return appended.
     *
     * @param args the arguments to format and output.
     */
    TimbrInstance.prototype.concat = function () {
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
    TimbrInstance.prototype.exit = function (code) {
        process.exit(code || 0);
    };
    return TimbrInstance;
}(events_1.EventEmitter));
exports.TimbrInstance = TimbrInstance;
var Timbr = /** @class */ (function (_super) {
    __extends(Timbr, _super);
    function Timbr(options) {
        return _super.call(this, options, 'error', 'warn', 'info', 'trace', 'debug') || this;
    }
    /**
     * Error
     * : Used for logging application errors.
     *
     * @param args arguments to be logged.
     */
    Timbr.prototype.error = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        this.logger.apply(this, ['error'].concat(args));
        return this;
    };
    /**
     * Warn
     * : Used for logging application warning.
     *
     * @param args arguments to be logged.
     */
    Timbr.prototype.warn = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        this.logger.apply(this, ['warn'].concat(args));
        return this;
    };
    /**
     * Info
     * : Used for logging application information.
     *
     * @param args arguments to be logged.
     */
    Timbr.prototype.info = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        this.logger.apply(this, ['info'].concat(args));
        return this;
    };
    /**
     * Trace
     * : Used for logging application tracing.
     *
     * @param args arguments to be logged.
     */
    Timbr.prototype.trace = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        this.logger.apply(this, ['trace'].concat(args));
        return this;
    };
    /**
     * Debug
     * : Used for debugging application.
     *
     * @param args arguments to be logged.
     */
    Timbr.prototype.debug = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        this.logger.apply(this, ['debug'].concat(args));
        return this;
    };
    /**
     * Factory
     * : Factory to create custom instance of Timbr.
     *
     * @param options the Timbr options.
     * @param levels the custom log levels to extend Timbr with.
     */
    Timbr.prototype.create = function (options) {
        var levels = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            levels[_i - 1] = arguments[_i];
        }
        return (new (TimbrInstance.bind.apply(TimbrInstance, [void 0, options].concat(levels)))());
    };
    return Timbr;
}(TimbrInstance));
exports.Timbr = Timbr;
exports.create = function (options) {
    var levels = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        levels[_i - 1] = arguments[_i];
    }
    return (new (TimbrInstance.bind.apply(TimbrInstance, [void 0, options].concat(levels)))());
};
exports.get = exports.create;
//# sourceMappingURL=timbr.js.map