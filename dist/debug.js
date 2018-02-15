"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var timbr_1 = require("./timbr");
var LEVELS = {
    fatal: {
        label: 'FATAL',
        styles: ['bold', 'red']
    },
    warn: {
        label: 'WARNING',
        styles: 'yellow'
    },
    create: {
        label: 'CREATE',
        styles: 'green'
    }
};
var log = timbr_1.create({ miniStack: true, level: 'verbose' }, LEVELS);
//# sourceMappingURL=debug.js.map