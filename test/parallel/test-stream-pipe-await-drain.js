"use strict";

/*<replacement>*/
var bufferShim = require('safe-buffer').Buffer;
/*</replacement>*/


var common = require('../common');

var stream = require('../../');

var assert = require('assert/'); // This is very similar to test-stream-pipe-cleanup-pause.js.


var reader = new stream.Readable();
var writer1 = new stream.Writable();
var writer2 = new stream.Writable();
var writer3 = new stream.Writable(); // 560000 is chosen here because it is larger than the (default) highWaterMark
// and will cause `.write()` to return false
// See: https://github.com/nodejs/node/issues/5820

var buffer = bufferShim.allocUnsafe(560000);

reader._read = function () {};

writer1._write = common.mustCall(function (chunk, encoding, cb) {
  this.emit('chunk-received');
  cb();
}, 1);
writer1.once('chunk-received', function () {
  assert.strictEqual(reader._readableState.awaitDrain, 0, 'awaitDrain initial value should be 0, actual is ' + reader._readableState.awaitDrain);
  setImmediate(function () {
    // This one should *not* get through to writer1 because writer2 is not
    // "done" processing.
    reader.push(buffer);
  });
}); // A "slow" consumer:

writer2._write = common.mustCall(function (chunk, encoding, cb) {
  assert.strictEqual(reader._readableState.awaitDrain, 1, 'awaitDrain should be 1 after first push, actual is ' + reader._readableState.awaitDrain); // Not calling cb here to "simulate" slow stream.
  // This should be called exactly once, since the first .write() call
  // will return false.
}, 1);
writer3._write = common.mustCall(function (chunk, encoding, cb) {
  assert.strictEqual(reader._readableState.awaitDrain, 2, 'awaitDrain should be 2 after second push, actual is ' + reader._readableState.awaitDrain); // Not calling cb here to "simulate" slow stream.
  // This should be called exactly once, since the first .write() call
  // will return false.
}, 1);
reader.pipe(writer1);
reader.pipe(writer2);
reader.pipe(writer3);
reader.push(buffer);
;

require('tap').pass('sync run');

var _list = process.listeners('uncaughtException');

process.removeAllListeners('uncaughtException');

_list.pop();

_list.forEach(function (e) {
  return process.on('uncaughtException', e);
});