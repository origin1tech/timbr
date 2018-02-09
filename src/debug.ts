import { init } from './timbr';

const log = init({ miniStack: true });

const debug = log.debugger('custom', { styles: ['magenta'] });
log
  .writeLn('---')
  .warn('a warn message.')
  .writeLn('---');

// log.info('some message.', { key: 'value' }, () => {
//   // console.log('called back.');
// });

