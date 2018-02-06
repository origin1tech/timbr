"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var timbr_1 = require("./timbr");
var log = timbr_1.init({ miniStack: true });
var debug = log.debugger('custom');
log.debug('some debug message.');
log.info('some message.');
debug.log('custom debug message.');
//# sourceMappingURL=debug.js.map