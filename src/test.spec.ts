import * as chai from 'chai';
import * as mocha from 'mocha';

const expect = chai.expect;
const should = chai.should;
const assert = chai.assert;

import { Timbr, ITimbrEventData } from './';

const log = new Timbr();
const logUser = log.create(null, 'emergency', 'alert', 'critical', 'notify');

describe('Timbr', () => {

  it('should test formatting of "my name is %s."', () => {
    const result = log.logger('info:resolve', 'my name is %s.', 'joe') as ITimbrEventData;
    assert.equal(result.type, 'info');
    assert.equal(result.message, 'my name is joe.');
  });

  it('should test user defined logger formatting of "my name is %s."', () => {
    const result = logUser.logger('critical:resolve', 'my name is %s.', 'joe') as ITimbrEventData;
    assert.equal(result.type, 'critical');
    assert.equal(result.message, 'my name is joe.');
  });

  it('should emit result on logged message', (done) => {
    log.on('logged:info:resolve:emit', (result) => {
      assert.equal(result.message, 'there was violence on "many sides".');
      done();
    });
    log.logger('info:resolve:emit', 'there was violence on "many sides".');
  });

  it('should log with metadata.', () => {
    const ts = new Date();
    const meta = { timestamp: ts, server: 'Deadpool' };
    const result = log.logger('info:resolve', 'the user %s could not be found.', 'jabernathy', meta) as ITimbrEventData;
    assert.deepEqual(result.meta, meta);
  });

  it('should log then callback.', (done) => {
    const result = log.logger('info:resolve', 'log then callback.', (result) => {
      assert.equal(result.message, 'log then callback.');
      done();
    }) as ITimbrEventData;
  });

  it('should handle logging an error.', () => {
    const err = new Error('just some error.');
    const result = log.logger('info:resolve', err) as ITimbrEventData;
    assert.deepEqual(result.error, err);
  });

  it('should handle converting message to an error.', () => {
    log.set('errorConstruct', true);
    const result = log.logger('error:resolve', 'converted to error.') as ITimbrEventData;
    log.set('errorConstruct', false);
    assert.instanceOf(result.error, Error);
  });

});