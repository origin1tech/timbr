import { init } from './timbr';

const log = init({ miniStack: true });
const debug = log.debugger('custom');

log.debug('some debug message.');
log.info('some message.');
debug.log('custom debug message.');
