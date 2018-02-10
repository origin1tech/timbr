# Timbr

Logger that supports custom stream, events, handy helper methods and built in debugger creation.

## Installation

```sh
$ npm install timbr
```

OR

```sh
$ npm install timbr --production
```

## Quick Start

Require or import

```ts
import * as timbr from 'timbr';
const log = timbr.init({ /* your options here */ })
```

OR

```ts
import * as timbr from 'timbr';
const LOG_LEVELS = {
  emerg: ['bgRed', 'yellow'],
  alert: ['underline', 'bold', 'red'],
  crit: {
    label: 'critical'
    styles: ['underline', 'red']
  },
  error: 'red',
  warn: {
    label: 'warning',
    styles: 'yellow'
  },
  notice: 'green',
  info: 'blue'
}

const LogLevelKeys = keyof typeof LOG_LEVELS;
const log = timbr.create<LogLevelKeys>({ /* your options */}, methods);

// NOTE: When NOT using Typescript you can create your logger instance
// by simply passing your options and log levels/methods (see below).

const log = timbr.create({ /* options */}, methods);
```

#### Log a Message

```ts
log.warn('some warning.');
```

### Default Levels

When calling the <code>.init()</code> method Timbr will initialize with the following default log levels:

error, warn, info, trace, verbose, debug

**NOTE:** the "debug" method by default is a debugger. A debugger behaves much like a typical log level but emits its events to debug listeners instead of log.

This behavior allows for simple debugging without additional libs or instantiating a debugger. Good for simple projects. If you need multiple debuggers, simply disable and create as many debuggers as needed. See [below](#Debuggers) for creating custom debuggers.

You can change this behavior by setting "debugLevel" in options to another level or false to disable. This allows for custom methods WITHOUT a built in debug method.

```ts
const options = {
  debugLevel: false
};
```

### Custom Levels

When initializing using the <code>.create()</code> method to create a custom instance you must pass an object containing your desired log levels and their respective configurations.

```ts
const LOG_LEVELS = {
  info: 'blue'
}

// OR

const LOG_LEVELS = {
  info: ['bgBlue', 'white']
}

const LOG_LEVELS = {
  info: {
    label: 'information', // when null the key is used or false to disable label for this level.
    styles: ['blue'] // string or array of string matching colurs styles.,
    symbol: 'info' // a named known symbol or a string,
    symbolPos: 'after' // or 'before',
    symbolStyles: null // same as above 'styles',
    indent: 10 // a number of spaces to indent or a string.
  }
}
```

## Logging Messages

A few logging examples.

#### Default Behavior

```ts
log('just some message.');
```

#### Using Formatting

```ts
log.warn('expected value to be of type %s', 'number');
```

#### Logging Metadata

```ts
log.trace('starting server...', { host: 'localhost', port: 1337 });
```

#### Logging Error

```ts
log.error(new Error('Whoops you can\'t do that!'));
```

#### Log & Exit

```ts
log.info('just some important message.').exit();
```

#### Log Line

Writes "----" before and after log message using the .write() method.

```ts
log
  .writeLn('----')
  .info('just some important message.')
  .writeLn('----');
```

#### Log Inline

Continually outputs to stream without line return.

Results in 'one, two'.

```ts
log.write('one, ').write('two');
```

## Helper Methods

Timbr supports a few useful methods by default.

<table>
  <thead>
    <tr><td>Method</td><td>Description</td></tr>
  </thead>
  <tbody>
    <tr><td>write</td><td>writes to output stream inline without line returns.</td></tr>
    <tr><td>writeLn</td><td>same as above but with line return.</td></tr>
    <tr><td>symbol</td><td>generates a symbol or gets known symbol.</td></tr>
    <tr><td>exit</td><td>allows for exiting process ex: log.info().exit(code).</td></tr>
  </tbody>
</table>

## Debuggers

Timbr has built in support for creating debuggers.

#### Default Debugger

```ts
const debug = log.debugger();
// OR
const debug = log.debugger({ /* your options */ });
debug('my debug message.');
```

#### Log Level Debugger

You can use one of your log levels for the default debugger. When initializing Timbr options set:

```ts
const options {
  debugLevel: 'debug'
}
```

When using .init() or when passing log levels and creating an instance using .create() a
log level of 'debug' will be wired up to the default debugger.

```ts
log.debug('your debug message.');
// same as instantiating
// const debug = log.debugger();
// debug('your debug message.')
```

#### Custom Debugger

```ts
const debugSvr = log.debugger('server', { /* options here */ });
debugSvr('some debug message for %s', 'server');
```

#### Activating Deubgger

When Node debug is detected the "default" debugger is automatically enabled. To enable specific debuggers
you can pass the debuggers in the "DEBUG" environment variable.

```sh
$ DEBUG="debugger1,debugger2" node index.js
````
NOTE: the above will not work in Windows use the "set" command.

Additionally you can manually enable a debugger in your code.

```ts
const debugSvr = log.debugger('server');
debugSvr.enable();
```

#### Logic w/ Debuggers

Some times it's useful to check if a debugger is active before firing off some logic.

```ts
if (debugSvr.enabled()) {
  // do something the server debugger is active.
}
```

#### Show ONlY Debuggers

You can pass an environment variable to show ONLY debug messages and skip other messages.
This can be handy during development time.

You can also set this in your initialization options using property "debugOnly".

```sh
$ DEBUG_ONLY="true" node index.js
```

## Log Symbols

To use symbols you can get a known symbol to Timbr and manually add it to your log message or
you can specify that known type in your log level config.

By default the following symbols are included: error, warn, info, trace, debug, ok.

**Get Warn Symbol**

```ts
const warnSymbol = log.symbol('warn');
log.warn('some message %s', warnSymbol);
```

**Symbol in Options**

Known Symbols

```ts
const SYMBOLS = {
  error: '✖',
  warn: '⚠',
  info: 'ℹ',
  trace: '◎',
  debug: '✱',
  ok: '✔'
};
```

```ts
const LOG_LEVELS = {
  warn: {
    symbol: 'warn', // a known symbol name (see above) to Timbr or custom string.
    symbolPos: 'after', // (before or after, default is after)
    symbolStyles: undefined // (if undefined above "styles" used)
  }
};
```

## Event Emitter

Timbr extends Event Emitter allowing you to listen to log or debug events.

#### Timbr Event Object

Both event listeners and callbacks provide access to the TimbrEventData object which is created
when log arguments are parsed.

```ts
const event = {
  type: 'the primary type like error, warn, info etc',
  subTypes: 'debug:server would result in sub types of ['server'],
  level: 'this is the log level or debug configuration options',
  index: 'the integer or index of the log level being logged',
  activeIndex: 'the integer of the active level, what you passed in your init options as the active level',
  message: msg, // this gets updated after compile.
  timestamp: 'the current timestamp',
  meta: 'any metadata or object that was passed in the log message',
  args: 'array containing the original arguments.',
  error: 'when an error is logged the error instance will be stored here',
  stack: 'the stack trace for the message being logged when no error present a stack is generated'
};
```


#### On Log

```ts
log.on('log', (message, event) => {
  // do something
})
```

// Or by type

```ts
log.on('log:info', (message, event) => {
  // do something
})
```

#### On Debug

```ts
log.on('debug', (message, event) => {
  // do something
})
```

// Or by type

```ts
log.on('debug:default', (message, event) => {
  // do something
})
```

## Options

<table>
  <thead>
    <tr><th>**Option**</th><th>**Description**</th><th>**Type**</th><th>**Default**</th></tr>
  </thead>
  <tbody>
    <tr><td>stream</td><td>stream to output to.</td><td>WriteableStream</td><td>process.stderr</td></tr>
    <tr><td>level</td><td>active log level.</td><td>string | number</td><td>info</td></tr>
    <tr><td>colorize</td><td>enables/disables colors.</td><td>boolean</td><td>true</td></tr>
    <tr><td>labelLevels</td><td>when true log messages prefixed with level label.</td><td>boolean</td><td>true</td></tr>
    <tr><td>padLevels</td><td>pads left of level.</td><td>boolean</td><td>true</td></tr>
    <tr><td>timestamp</td><td>enables/disables or defines timestamp type.</td><td>false | time | datetime | iso | Function</td><td>time</td></tr>
    <tr><td>timestampStyles</td><td>colors/styles for stylizing timestamp</td><td>string | string[]</td><td>null</td></tr>
    <tr><td>timestampLocale</td><td>the timestamp locale</td><td>string</td><td>en-US</td></tr>
    <tr><td>timestampTimezone</td><td>IANA timezone string</td><td>string</td><td>UTC</td></tr>
    <tr><td>errorLevel</td><td>the error level name.</td><td>string</td><td>error</td></tr>
    <tr><td>errorExit</td><td>when true exits on errors.</td><td>boolean</td><td>false</td></tr>
    <tr><td>errorConvert</td><td>if first arg Error instance convet to error log level.</td><td>boolean</td><td>false</td></tr>
    <tr><td>errorCapture</td><td>capture uncaught exceptions.</td><td>boolean</td><td>false</td></tr>
    <tr><td>errorConstruct</td><td>when true on error level and is string convert to Error instance.</td><td>boolean</td><td>false</td></tr>
    <tr><td>stackTrace</td><td>when true full stack trace shown on errors.</td><td>boolean</td><td>true</td></tr>
    <tr><td>stackDepth</td><td>depth of stack trace to display.</td><td>number</td><td>0</td></tr>
    <tr><td>miniStack</td><td>when true file, line & column shown on all messages.</td><td>boolean</td><td>true</td></tr>
    <tr><td>debugLevel</td><td>the log level to use for default debugger.</td><td>string | false</td><td>debug</td></tr>
    <tr><td>debugOnly</td><td>when true show only debug messages</td><td>boolean</td><td>false</td></tr>
    <tr><td>beforeWrite</td><td>callback for customizing log output before writing to stream.</td><td>Function</td><td>null</td></tr>
  <tbody>
</table>

### Get Option

Gets the timestamp format.

```ts
const currentLogLevel = log.getOption('level');
```

### Set Option

Sets the timestamp format false disabling it from log messages.

```ts
log.setOption('timestamp', false);
```

## Change

See [CHANGE.md](CHANGE.md)

## License

See [LICENSE.md](LICENSE.md)


