import { init } from './timbr';

const log = init({ miniStack: true, level: 'verbose' });

// const debug = log.debugger('custom', { styles: ['magenta'] });
log.debug('format %s times', 'msg');
log('test');
log('other');

