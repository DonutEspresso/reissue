// jscs:disable maximumLineLength

'use strict';

// external modules
var chai = require('chai');
var assert = chai.assert;

// internal files
var reissue = require('../lib');


describe('Reissue module', function() {

    this.timeout(100000);

    it('should emulate setInterval', function(done) {

        var out = [];
        var i = 0;

        var timer = reissue.create({
            func: function(callback) {
                out.push(i);
                i += 1;
                // if we reached 5, stop the test
                if (i === 5) {
                    assert.deepEqual(out, [0,1,2,3,4]);
                    return done();
                }
                return callback();
            },
            interval: 100
        });
        timer.start();
    });


    it('should accept arguments', function(done) {

        var out = [];
        var i = 0;
        var fooStr = 'hello';

        var timer = reissue.create({
            func: function(argStr, acc, callback) {
                // assert that args were injected
                assert.equal(argStr, fooStr);
                assert.deepEqual(acc, out);

                // increment context
                acc.push(i);
                i += 1;

                // if we reached 5, stop the test
                if (i === 5) {
                    assert.deepEqual(acc, [0,1,2,3,4]);
                    return done();
                }
                return callback();
            },
            args: [fooStr, out],
            interval: 100
        });
        timer.start();
    });


    it('should accept context and arguments', function(done) {

        var out = '';
        var i = 0;
        var fooStr = 'random string';
        var foo = {
            printHi: function printHi() {
                out += 'hi';
            }
        };

        var timer = reissue.create({
            func: function(argStr, callback) {

                i++;

                // assert that args were injected
                assert.equal(argStr, fooStr);

                // assert correct context was bound
                assert.equal(this === foo, true);

                // invoke
                this.printHi();

                // if we reached 5, stop the test
                if (i === 5) {
                    assert.equal(out, 'hihihihihi');
                    return done();
                }

                return callback();
            },
            context: foo,
            args: [fooStr],
            interval: 100
        });
        timer.start();
    });


    it('should stop queue using stop()', function(done) {

        var i = 0;

        var timer = reissue.create({
            func: function(callback) {
                i++;

                // this ensures we're never called a 6th time
                assert.isBelow(i, 6);
                // if we reached 5, stop the test
                if (i === 5) {
                    timer.stop();
                    // delay completion of unit test to make sure we don't
                    // get called a 6th time
                    setTimeout(done, 500);
                }
                return callback();
            },
            interval: 100
        });
        timer.start();
    });


    it('should use dynamic intervals', function(done) {

        var startTime = Date.now();
        var i = 0;

        var timer = reissue.create({
            func: function(callback) {

                // each time we're called, increase i, which will
                // increase the interval.
                i++;

                // if we reached 5, stop. total time spent should be:
                // (1 *100) + (2 * 100) + (3 * 100) + (4 * 100) for a total of
                // 100 + 200 + 300 + 400 = 1000ms
                if (i === 5) {
                    var elapsed = Date.now() - startTime;
                    assert.equal(elapsed >= 1000, true);
                    return done();
                }
                return callback();
            },
            interval: function() {
                return i * 100;
            }
        });
        timer.start();
    });


    it('should handle decreasing intervals', function(done) {

        var startTime = Date.now();
        var i = 5;

        var timer = reissue.create({
            func: function(callback) {

                // each time we're called, decrease the interval
                i--;

                // if we reached 5, stop. total time spent should be:
                // (1 *100) + (2 * 100) + (3 * 100) + (4 * 100) for a total of
                // 100 + 200 + 300 + 400 = 1000ms
                if (i === 0) {
                    var elapsed = Date.now() - startTime;
                    assert.equal(elapsed >= 1000, true);
                    return done();
                }
                return callback();
            },
            interval: function() {
                return i * 100;
            }
        });
        timer.start();
    });


    it('should emit error', function(done) {

        var i = 0;
        var errFired = false;

        var timer = reissue.create({
            func: function(callback) {

                i++;

                if (i === 2) {
                    return callback(new Error('boom'));
                }

                if (i === 5) {
                    assert.isTrue(errFired);
                    return done();
                }

                return callback();
            },
            interval: 100
        });

        timer.on('error', function(err) {
            assert.ok(err);
            assert.equal(err instanceof Error, true);
            assert.equal(err.message, 'boom');
            errFired = true;
        });

        timer.start();
    });


    it('should emit error with context and args', function(done) {

        var out = '';
        var i = 0;
        var fooStr = 'random string';
        var foo = {
            printHi: function printHi() {
                out += 'hi';
            }
        };
        var errFired = false;

        var timer = reissue.create({
            func: function(argStr, callback) {

                i++;

                // assert that args were injected
                assert.equal(argStr, fooStr);

                // assert correct context was bound
                assert.equal(this === foo, true);

                // invoke
                this.printHi();

                // at 2, fire an error!
                if (i === 2) {
                    return callback(new Error('boom'));
                }

                // if we reached 5, stop the test
                if (i === 5) {
                    assert.isTrue(errFired);
                    assert.equal(out, 'hihihihihi');
                    return done();
                }

                return callback();
            },
            context: foo,
            args: [fooStr],
            interval: 100
        });

        timer.on('error', function(err) {
            assert.ok(err);
            assert.equal(err instanceof Error, true);
            assert.equal(err.message, 'boom');
            errFired = true;
        });

        timer.start();
    });


    it('should throw when start() called multiple times', function(done) {

        var out = [];
        var i = 0;

        var timer = reissue.create({
            func: function(callback) {
                out.push(i);
                i += 1;
                // if we reached 5, stop the test
                if (i === 2) {
                    assert.throws(function() {
                        timer.start();
                    });
                }

                if (i === 5) {
                    assert.deepEqual(out, [0,1,2,3,4]);
                    return done();
                }

                return callback();
            },
            interval: 100
        });
        timer.start();
    });


    it('should start after arbitrary delay', function(done) {

        var startTime = Date.now();
        var out = [];
        var i = 0;

        var timer = reissue.create({
            func: function(callback) {

                out.push(i);
                i += 1;

                // ensure elapsed time for first invocation is at least 150ms
                // due to delay.
                if (i === 1) {
                    assert.equal((Date.now() - startTime) >= 150, true);
                }
                // if we reached 5, stop the test
                if (i === 5) {
                    assert.deepEqual(out, [0,1,2,3,4]);
                    return done();
                }
                return callback();
            },
            interval: 100
        });
        timer.start(150);
    });


    it('should not execute first invocation if stop was called',
    function(done) {

        var fired = false;

        var timer = reissue.create({
            func: function(callback) {
                fired = true;
                return callback();
            },
            interval: 300
        });
        timer.start(300);
        timer.stop();

        // because we called stop, reissue should never fire
        setTimeout(function() {
            assert.isFalse(fired);
            return done();
        }, 500);
    });


    it('should emit stop event if reissue is inactive', function(done) {
        var timer = reissue.create({
             func: function(callback) {
                 return callback();
             },
             interval: 100
         });
        timer.on('stop', done);
        timer.stop();
    });


    it('should emit stop, cancelling next invocation', function(done) {

        var out = [];
        var i = 0;

        var timer = reissue.create({
            func: function(callback) {
                out.push(i++);
                return callback();
            },
            interval: 500
        });

        timer.on('stop', function() {
            assert.deepEqual(out, [0,1]);
            return done();
        });

        timer.start();

        // this should allow two invocations, then cancel the third.
        setTimeout(function() {
            timer.stop();
        }, 1000);
    });


    it('should emit stop, never schedules next invocation', function(done) {

        var out = [];
        var i = 0;

        var timer = reissue.create({
            func: function(callback) {
                out.push(i++);

                if (i === 1) {
                    return setTimeout(callback, 600);
                } else {
                    return callback();
                }
            },
            interval: 500
        });

        timer.on('stop', function() {
            assert.deepEqual(out, [0,1]);
            return done();
        });

        timer.start();

        // this should allow two invocations, calling stop while user supplied
        // function is still going on the second time around. once it
        // completes, stop should get emitted and the third invocation is never
        // scheduled.
        setTimeout(function() {
            timer.stop();
        }, 1000);
    });


    it('should emit stop, first invocation and timeout should never fire',
    function(done) {

        var timer = reissue.create({
            func: function(callback) {
                assert.fail('should not get here!');
                return setTimeout(callback, 500);
            },
            interval: 100,
            timeout: 200
        });

        timer.on('timeout', function(callback) {
            assert.fail('should not get here!');
            return callback();
        });

        timer.on('stop', done);

        timer.start();
        timer.stop();
    });


    it('should cancel next invocation via timeout callback', function(done) {

        var timer = reissue.create({
            func: function(callback) {
                return setTimeout(callback, 500);
            },
            interval: 100,
            timeout: 200
        });

        var start = Date.now();

        timer.once('timeout', function(callback) {
            timer.once('timeout', function(cb) {
                // since we've thrown the first one away, and invoked it again
                // immediately, we should be somewhere between 400-500ms
                // elapsed
                var elapsed = Date.now() - start;
                assert.isAtLeast(elapsed, 400);
                assert.isAtMost(elapsed, 500);
                timer.stop();
                return cb();
            });

            // true cancels the timed out invocation and schedules one
            // immediately
            return callback(true);
        });

        timer.on('stop', function() {
            return done();
        });

        timer.start();
    });
});
