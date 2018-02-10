"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var timbr_1 = require("./timbr");
var log = timbr_1.init({ miniStack: true, level: 'verbose' });
// const debug = log.debugger('custom', { styles: ['magenta'] });
log.debug('format %s times', 'msg');
log('test');
log('other');
//# sourceMappingURL=debug.js.map