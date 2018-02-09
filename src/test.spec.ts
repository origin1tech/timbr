import * as chai from 'chai';
import * as mocha from 'mocha';

const expect = chai.expect;
const should = chai.should;
const assert = chai.assert;

import { ITimbrEventData, init, create } from './';
import * as MuteStream from 'mute-stream';

// Just create custom levels no config needed for testing.
const levels = {
  emergency: null,
  alert: null,
  critical: null,
  notify: null
};

// Mute the output stream so we don't clutter test output.
const ms = new MuteStream();
ms.pipe(process.stderr);
ms.mute();

const log = init({
  stream: ms
});
const logUser = create(null, levels);

describe('Timbr', () => {

  it('should test formatting of "my name is %s."', () => {
    const result = log.parse('info', 'my name is %s.', 'joe') as ITimbrEventData;
    assert.equal(result.type, 'info');
    assert.equal(result.message, 'my name is joe.');
  });

  it('should test user defined logger formatting of "my name is %s."', () => {
    const result = logUser.parse('critical', 'my name is %s.', 'joe') as ITimbrEventData;
    assert.equal(result.type, 'critical');
    assert.equal(result.message, 'my name is joe.');
  });

  it('should log then callback.', (done) => {
    log.info('log then callback.', (message, event) => {
      assert.equal(message, 'log then callback.');
      done();
    });
  });

  it('should emit result on logged message', (done) => {
    function handler(message, event) {
      assert.equal(message, 'there was violence on "many sides".');
      log.removeListener('log:info', handler);
      done();
    }
    log.addListener('log:info', handler);
    log.info('there was violence on "many sides".');
  });

  it('should log with metadata.', () => {
    const ts = new Date();
    const meta = { timestamp: ts, server: 'Deadpool' };
    const result = log.parse('info', 'the user %s could not be found.', 'jabernathy', meta) as ITimbrEventData;
    assert.deepEqual(result.meta, meta);
  });

  it('should handle logging an error.', () => {
    const err = new Error('just some error.');
    const result = log.parse('info', err) as ITimbrEventData;
    assert.deepEqual(result.error, err);
  });

  it('should test write method.', () => {
    const result = log.parse('write', 'some write message.') as ITimbrEventData;
    assert.equal(result.message, 'some write message.');
  });

  it('should handle converting message to an error.', () => {
    log.setOption('errorConstruct', true);
    const result = log.parse('error', 'converted to error.') as ITimbrEventData;
    log.setOption('errorConstruct', false);
    assert.instanceOf(result.error, Error);
  });

  it('should get warn symbol', () => {
    const sym = log.symbol('warn');
    assert.equal(sym, '⚠');
  });

});