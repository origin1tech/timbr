"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var timbr_1 = require("./timbr");
var log = timbr_1.init({ miniStack: true });
var debug = log.debugger('custom', { styles: ['magenta'] });
log
    .writeLn('---')
    .warn('a warn message.')
    .writeLn('---');
// log.info('some message.', { key: 'value' }, () => {
//   // console.log('called back.');
// });
//# sourceMappingURL=debug.js.map