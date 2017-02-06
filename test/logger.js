'use strict';
/* eslint-disable no-shadow */

const { test } = require('ava');
const sinon = require('sinon');

const logger = require('../index');

const stdoutWrite = process.stdout.write;

test.beforeEach(t => {
    process.stdout.write = () => {
    };
});

test.afterEach(t => {
    process.stdout.write = stdoutWrite;
});

test('A logger instance should have levels function and isEnabled function', t => {
    const log = logger();
    t.is(typeof log.trace, 'function');
    t.is(typeof log.debug, 'function');
    t.is(typeof log.info, 'function');
    t.is(typeof log.warn, 'function');
    t.is(typeof log.error, 'function');
    t.is(typeof log.isEnabled, 'function');
});

test('A logger instance should log if level and namespace are enabled', t => {
    logger.setNamespaces('*');
    logger.setLevel('info');

    const log = logger();
    const spy = sinon.spy(logger.internals, 'write');

    log.info(null);
    t.true(spy.calledOnce);

    logger.internals.write.restore();
});

test("A logger instance shouldn't log if level is lower than enabled level", t => {
    logger.setNamespaces('*');
    logger.setLevel('info');

    const log = logger();
    const spy = sinon.spy(logger.internals, 'write');

    log.debug(null, 'test');

    t.is(spy.callCount, 0);

    logger.internals.write.restore();
});

test("A logger instance shouldn't log if namespace is not enabled", t => {
    logger.setNamespaces('test:*');

    logger.setLevel('info');

    const log = logger();
    const spy = sinon.spy(logger.internals, 'write');

    log.info(null, 'test');

    t.is(spy.callCount, 0);

    logger.internals.write.restore();
});

test('A logger should write a Json Object with expected data and an \\n to stdout if enabled', t => {
    logger.setNamespaces('test:*');
    logger.setLevel('info');

    const now = new Date();

    const log = logger('test:subTest');
    const spy = sinon.spy(process.stdout, 'write');
    const timersStub = sinon.useFakeTimers(now.getTime());

    log.warn('ctxId', 'test', { someData: 'someValue' });

    t.true(spy.calledTwice);

    const firstCall = spy.firstCall.args[0];
    const secondCall = spy.secondCall.args[0];
    const parsedObject = JSON.parse(firstCall);

    t.is(parsedObject.level, 'warn');
    t.is(parsedObject.time, now.toISOString());
    t.is(parsedObject.contextId, 'ctxId');
    t.is(parsedObject.message, 'test');
    t.deepEqual(parsedObject.data, { someData: 'someValue' });
    t.is(secondCall, '\n');

    process.stdout.write.restore();
    timersStub.restore();
});

test('A logger contextId arg should be an an optional argument', t => {
    logger.setNamespaces('ns1:*');
    logger.setLevel('info');

    const now = new Date();

    const log = logger('ns1:subns1');
    const spy = sinon.spy(process.stdout, 'write');
    const timersStub = sinon.useFakeTimers(now.getTime());

    log.warn('msg1', { key1: 'value1' });

    t.true(spy.calledTwice);

    const firstCall = spy.firstCall.args[0];
    const secondCall = spy.secondCall.args[0];
    const parsedObject = JSON.parse(firstCall);

    t.is(parsedObject.level, 'warn');
    t.is(parsedObject.time, now.toISOString());
    t.is(typeof parsedObject.contextId, 'string');
    t.is(parsedObject.message, 'msg1');
    t.deepEqual(parsedObject.data, { key1: 'value1' });
    t.is(secondCall, '\n');

    process.stdout.write.restore();
    timersStub.restore();
});

test("A logger should not log if it's namespace is disabled after call to setNamespaces", t => {
    logger.setNamespaces('*');
    logger.setLevel('info');

    const log = logger('ns1');
    const spy = sinon.spy(logger.internals, 'write');

    log.info(null, 'msg1');
    logger.setNamespaces('ns2:*,ns3:*');
    log.info(null, 'msg2');

    t.true(spy.calledOnce);
    t.is(spy.args[0][0].message, 'msg1');

    logger.internals.write.restore();
});

test('A logger should not log if log level is not upper after call to setLevel', t => {
    logger.setNamespaces('*');
    logger.setLevel('info');

    const log = logger('ns1');
    const spy = sinon.spy(logger.internals, 'write');

    log.info(null, 'msg1');
    logger.setLevel('warn');
    log.info(null, 'msg2');

    t.true(spy.calledOnce);
    t.is(spy.args[0][0].message, 'msg1');

    logger.internals.write.restore();
});

test('A logger should not log if upper namespace was enabled, but sub namespace was disabled', t => {
    logger.setNamespaces('ns1:*,-ns1:subns1');
    logger.setLevel('info');

    const log = logger('ns1:subns1');
    const spy = sinon.spy(logger.internals, 'write');

    log.info(null, 'msg1');

    t.is(spy.callCount, 0);

    logger.internals.write.restore();
});

test('A logger should return true for a call to isEnabled if level and namespace is enabled', t => {
    logger.setNamespaces('ns1:*,-ns1:subns1');
    logger.setLevel('info');

    const log = logger('ns1:subns2');
    t.true(log.isEnabled('warn'));
});

test('A logger should return false for a call to isEnabled if level is enabled but not namespace', t => {
    logger.setNamespaces('ns1:*,-ns1:subns1');
    logger.setLevel('info');

    const log = logger('ns1:subns1');
    t.false(log.isEnabled('warn'));
});

test('A logger should return true for a call to isEnabled if level is not enabled but namespace is', t => {
    logger.setNamespaces('ns1:*,-ns1:subns1');
    logger.setLevel('error');

    const log = logger('ns1:subns2');
    t.false(log.isEnabled('warn'));
});

test('loggers should be equal if they are for the same namespace', t => {
    logger.setNamespaces('ns1:*,-ns1:subns1');
    logger.setLevel('error');

    const log1 = logger('ns1:subns2');
    const log2 = logger('ns1:subns2');
    t.is(log1, log2);
});
