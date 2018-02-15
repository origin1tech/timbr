import { init, create } from './timbr';

const LEVELS = {
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

type LevelKeys = keyof typeof LEVELS;

const log = create<LevelKeys>({ miniStack: true, level: 'verbose' }, LEVELS);

