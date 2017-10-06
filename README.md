# Timbr

Minimalistic logger that accepts custom stream and supports event emitter. Timbr supports error, warn, info, debug, write and exit methods. Log events may contain strings with format arguments, metadata objects and/or instances of an Error.

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
import { Timbr } from 'timbr';
const log = new Timbr({ level: 'info' });
log.info('some message.');
```

OR

```ts
const Timbr = require('timbr').Timbr;
const log = new Timbr(/* options */);
log.warn('some warning.');
```

#### Custom Levels

In order to create custom log levels you must specify each level in the order of worse to least in severity. Meaning errors would be 0 with debug type levels at the highest.

Timbr will try to automatically pick the **errorLevel**, **debugLevel** based on the provided custom levels. Timbr will also try to automatically pick colors based on severity or choose a random color. If you wish to provide your own ansi styles you may do so in the **options.styles** property. Style keys should match the levels you provided in the Timbr constructor. Styles may be strings or arrays of strings. For valid styles you can import **AnsiStyles** when using TypeScript.

Below example uses **syslog** levels.

```ts
import { Timbr } from 'timbr';
const log = new Timbr(/* options or null */, 'EMERGENCY', 'ALERT', 'CRITICAL', 'ERROR', 'WARNING', 'NOTICE', 'INFO', 'DEBUG');
```

## Log Levels

Timbr supports the following log methods by default.

+ **error** - outputs when level is higher than or equal to error.
+ **warn** - outputs when level is higher than or equal to warn.
+ **info** - the default level, outputs when level is higher than or equal to info.
+ **trace** - the default level, outputs when level is higher than or equal to trace.
+ **debug** - outputs when level is higher than or equal to debug or node is in debug mode.

Additionally a write method which allows you to take advantage of Timbr's formatting but directly outputs to the stream. There is also an exit method when used with chaining allows you to easily exit after logging any log level type if desired.

+ **write** - supports formatting but directly outputs to stream.
+ **exit** - immediately exits the process.

## Logging Messages

A few logging examples.

#### Using Formatting

```ts
log.warn('expected value to be of type %s', 'number');
```

#### Logging Metadata

```ts
log.debug('starting server...', { host: 'localhost', port: 1337 });
```

#### Logging Error

```ts
log.error(new Error('Whoops you can\'t do that!'));
```

#### Log & Exit

```ts
log.info('just some important message.').exit();
```

#### Log & Wrap

Writes "----" before and after log message.

```ts
log
  .write('----')
  .info('just some important message.')
  .write('----');
```

#### Debuggers

The following will only output when the "server" debug group is active. By default if no debuggers are active the first debugger created will be activated.

```ts
const serverDebug = log.debugger('server'); // create the grouped debugger.

serverDebug.debug('some debug message for %s', 'server');

serverDebug.enable(); // enables the debugger.

serverDebug.disable() // disables the debugger.

const enabledDebug = log.debugger('posts', true) // creates and ensures enabled.

const disabledDebug = log.debugger('puts', false) // creates and ensures disabled.

```

## Advanced Usage

Getting and setting options as well as using the event emitter.

#### Get Option

Gets the timestamp format.

```ts
const tsFormat = log.get('timestamp');
```

#### Set Option

Sets the timestamp format false disabling it from log messages.

```ts
const tsFormat = log.set('timestamp', false);
```

#### Event Emitter

The Event Emitter callback returns the following arguments.

+ **timestamp** - the timestamp.
+ **type** - the type of message that was logged.
+ **message** - the formatted log message
+ **meta** - any metadata objects.
+ **args** - the source arguments.
+ **error** - instance of Error if present.
+ **stackTrace** - the stack trace.

```ts
log.on('log', (type, msg, meta, data) => {
  // do something
})
```

You can also listen for specific log events. Error, warn, info and debug are supported.

```ts
log.on('log:info', (type, msg, meta, data) => {
  // do something
})
```

## Options

<table>
  <thead>
    <tr><th>**Option**</th><th>**Description**</th><th>**Type**</th><th>**Default**</th></tr>
  </thead>
  <tbody>
    <tr><td>stream</td><td>stream to output to.</td><td>WriteableStream</td><td>process.stdout</td></tr>
    <tr><td>level</td><td>active log level.</td><td>string | number</td><td>info</td></tr>
    <tr><td>padLevels</td><td>pads left of level.</td><td>boolean</td><td>true</td></tr>
    <tr><td>labelLevels</td><td>when true log messages prefixed with level label.</td><td>boolean</td><td>true</td></tr>
    <tr><td>colorize</td><td>enables/disables colors.</td><td>boolean</td><td>true</td></tr>
    <tr><td>errorExit</td><td>when true exits on errors.</td><td>boolean</td><td>false</td></tr>
    <tr><td>errorCapture</td><td>capture uncaught exceptions.</td><td>boolean</td><td>false</td></tr>
    <tr><td>errorConvert</td><td>if first arg Error instance convet to error log level.</td><td>boolean</td><td>false</td></tr>
    <tr><td>errorLevel</td><td>the error level name.</td><td>string</td><td>error</td></tr>
    <tr><td>stackTrace</td><td>when true full stack trace shown on errors.</td><td>boolean</td><td>true</td></tr>
    <tr><td>stackDepth</td><td>depth of stack trace to display.</td><td>number</td><td>0</td></tr>
    <tr><td>prettyStack</td><td>when true stack trace is formated output as object.</td><td>boolean</td><td>false</td></tr>
    <tr><td>miniStack</td><td>when true file, line & column shown on all messages.</td><td>boolean</td><td>true</td></tr>
    <tr><td>timestamp</td><td>enables/disables or defines timestamp type.</td><td>boolean | time | datetime</td><td>time</td></tr>
    <tr><td>debugLevel</td><td>the log level used for debugging</td><td>string</td><td>debug</td></tr>
    <tr><td>debuggers</td><td>array of active debuggers</td><td>string | string[]</td><td>[]</td></tr>
    <tr><td>debugAuto</td><td>when true if node debug set level as same</td><td>boolean</td><td>true</td></tr>
    <tr><td>enabled</td><td>initialize as enabled or disabled.</td><td>boolean</td><td>true</td></tr>
    <tr>
      <td>colors</td>
      <td colspan="2">
        <table>
          <tr><td>error</td><td>string | string[]</td><td>[bold, underline, red]</td></tr>
          <tr><td>warn</td><td>string | string[]</td><td>yellow</td></tr>
          <tr><td>info</td><td>string | string[]</td><td>green</td></tr>
          <tr><td>trace</td><td>string | string[]</td><td>cyan</td></tr>
          <tr><td>debug</td><td>string | string[]</td><td>blue</td></tr>
        </table>
      </td>
    </tr>
  <tbody>
</table>

## Change

See [CHANGE.md](CHANGE.md)

## License

See [LICENSE.md](LICENSE.md)


