// jscs:disable maximumLineLength

'use strict';

// external modules
const chai = require('chai');
const assert = chai.assert;

// internal files
const reissue = require('../lib');

describe('Reissue module', function() {
    this.timeout(100000);

    it('should emulate setInterval', function(done) {
        let i = 0;

        const out = [];
        const timer = reissue.create({
            func: function(callback) {
                out.push(i);
                i += 1;
                // if we reached 5, stop the test
                if (i === 5) {
                    assert.deepEqual(out, [0, 1, 2, 3, 4]);
                    return done();
                }
                return callback();
            },
            interval: 100
        });
        timer.start();
    });

    it('should accept arguments', function(done) {
        let i = 0;

        const out = [];
        const fooStr = 'hello';
        const timer = reissue.create({
            func: function(argStr, acc, callback) {
                // assert that args were injected
                assert.equal(argStr, fooStr);
                assert.deepEqual(acc, out);

                // increment context
                acc.push(i);
                i += 1;

                // if we reached 5, stop the test
                if (i === 5) {
                    assert.deepEqual(acc, [0, 1, 2, 3, 4]);
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
        let i = 0;
        let out = '';

        const fooStr = 'hello';
        const foo = {
            printHi: function printHi() {
                out += 'hi';
            }
        };
        const timer = reissue.create({
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
        let i = 0;

        const timer = reissue.create({
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
        let i = 0;

        const startTime = Date.now();
        const timer = reissue.create({
            func: function(callback) {
                // each time we're called, increase i, which will
                // increase the interval.
                i++;

                // if we reached 5, stop. total time spent should be:
                // (1 *100) + (2 * 100) + (3 * 100) + (4 * 100) for a total of
                // 100 + 200 + 300 + 400 = 1000ms
                if (i === 5) {
                    const elapsed = Date.now() - startTime;
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
        let i = 5;

        const startTime = Date.now();
        const timer = reissue.create({
            func: function(callback) {
                // each time we're called, decrease the interval
                i--;

                // if we reached 5, stop. total time spent should be:
                // (1 *100) + (2 * 100) + (3 * 100) + (4 * 100) for a total of
                // 100 + 200 + 300 + 400 = 1000ms
                if (i === 0) {
                    const elapsed = Date.now() - startTime;
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
        let i = 0;
        let errFired = false;

        const timer = reissue.create({
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
        let i = 0;
        let errFired = false;
        let out = '';

        const fooStr = 'random string';
        const foo = {
            printHi: function printHi() {
                out += 'hi';
            }
        };
        const timer = reissue.create({
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
        let i = 0;

        const out = [];
        const timer = reissue.create({
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
                    assert.deepEqual(out, [0, 1, 2, 3, 4]);
                    return done();
                }

                return callback();
            },
            interval: 100
        });
        timer.start();
    });

    it('should start after arbitrary delay', function(done) {
        const startTime = Date.now();
        const out = [];
        let i = 0;

        const timer = reissue.create({
            func: function(callback) {
                out.push(i);
                i += 1;

                // ensure elapsed time for first invocation is at least 150ms
                // due to delay.
                if (i === 1) {
                    assert.equal(Date.now() - startTime >= 150, true);
                }
                // if we reached 5, stop the test
                if (i === 5) {
                    assert.deepEqual(out, [0, 1, 2, 3, 4]);
                    return done();
                }
                return callback();
            },
            interval: 100
        });
        timer.start(150);
    });

    it(
        'should not execute first invocation if started with delay and stop ' +
            'was called',
        function(done) {
            let fired = false;

            const timer = reissue.create({
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
        }
    );

    it(
        'should execute first invocation synchronously if start had no delay ' +
            'and stop was called',
        function(done) {
            let fired = false;

            const timer = reissue.create({
                func: function(callback) {
                    fired = true;
                    return callback();
                },
                interval: 300
            });
            timer.start();
            timer.stop();

            // because we called start synchronously, we'll have at least one
            // invocation (first one).
            setTimeout(function() {
                assert.isTrue(fired);
                return done();
            }, 500);
        }
    );

    it('should emit stop event if reissue is inactive', function(done) {
        const timer = reissue.create({
            func: function(callback) {
                return callback();
            },
            interval: 100
        });
        timer.on('stop', done);
        timer.stop();
    });

    it('should emit stop, cancelling next invocation', function(done) {
        let i = 0;

        const out = [];
        const timer = reissue.create({
            func: function(callback) {
                out.push(i++);
                return setTimeout(callback, 400);
            },
            interval: 500
        });

        timer.on('stop', function() {
            assert.deepEqual(out, [0, 1]);
            return done();
        });

        timer.start();

        // this should allow two invocations, then cancel the third.
        setTimeout(function() {
            timer.stop();
        }, 900);
    });

    it('should emit stop, never schedules next invocation', function(done) {
        let i = 0;

        const out = [];
        const timer = reissue.create({
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

        timer.start();

        // this should allow two invocations, calling stop while user supplied
        // function is still going on the second time around. once it
        // completes, stop should get emitted and the third invocation is never
        // scheduled.
        setTimeout(function() {
            timer.on('stop', function() {
                assert.deepEqual(out, [0, 1]);
                return done();
            });
            timer.stop();
        }, 1000);
    });

    it('should emit timeout event', function(done) {
        let callCount = 0;
        let timeoutFired = false;

        const timer = reissue.create({
            func: function(callback) {
                callCount++;
                return setTimeout(callback, 300);
            },
            interval: 1000,
            timeout: 150
        });

        timer.on('timeout', function() {
            timeoutFired = true;
        });

        timer.start();

        // call stop after first invocation completes but before next
        // one is fired
        setTimeout(function() {
            timer.on('stop', function() {
                assert.isTrue(timeoutFired);
                assert.equal(callCount, 1);
                return done();
            });
            timer.stop();
        }, 400);
    });

    it('should stop during invocation, and timeout event should not fire', function(done) {
        let callCount = 0;
        let timeoutFired = false;

        const timer = reissue.create({
            func: function(callback) {
                callCount++;
                return setTimeout(callback, 250);
            },
            interval: 200,
            timeout: 100
        });

        timer.on('timeout', function() {
            timeoutFired = true;
        });

        timer.start();

        // first invocation should fire, and while we're waiting for it, we
        // call stop. we should not invoke it a second time, and should not
        // fire the timeout event.
        setTimeout(function() {
            timer.on('stop', function() {
                assert.isFalse(timeoutFired);
                assert.equal(callCount, 1);
                return done();
            });
            timer.stop();
        }, 0);
    });

    it(
        'call stop during invocation, and timeout fires before invocation ' +
            'completes',
        function(done) {
            const timer = reissue.create({
                func: function(callback) {
                    return setTimeout(callback, 250);
                },
                interval: 200,
                timeout: 400
            });

            timer.on('timeout', function(callback) {
                assert.fail('should not get here!');
                return callback();
            });

            timer.start();

            // first invocation should fire, and while we're waiting for it to
            // complete (250ms) stop is called. timeout event should not fire.
            setTimeout(function() {
                timer.on('stop', done);
                timer.stop();
            }, 100);
        }
    );

    it('should unref timer', function(done) {
        // mocha is set not to exit automatically - so this test should hang
        // the test runner if the functionality isn't working as expected.
        const timer = reissue.create({
            interval: 100,
            unref: true,
            func: function(callback) {
                return callback();
            }
        });

        timer.start();

        return done();
    });

    it('should unref timer when it times out', function(done) {
        // mocha is set not to exit automatically - so this test should hang
        // the test runner if the functionality isn't working as expected.
        const timer = reissue.create({
            interval: 500,
            unref: true,
            timeout: 100,
            func: function(callback) {
                setTimeout(callback, 200);
            }
        });

        timer.start();

        return done();
    });

    it('should unref timer when calling start with delay', function(done) {
        // mocha is set not to exit automatically - so this test should hang
        // the test runner if the functionality isn't working as expected.
        const timer = reissue.create({
            interval: 500,
            unref: true,
            func: function(callback) {
                return callback();
            }
        });

        timer.start(10);

        return done();
    });

    it('GH-4: should pass elapsed time to custom interval function', function(done) {
        let i = 1;

        const timer = reissue.create({
            func: function(callback) {
                setTimeout(function() {
                    i++;
                    return callback();
                }, i * 100);
                return setTimeout(callback, 250);
            },
            interval: function(elapsedTime) {
                assert.isNumber(elapsedTime);

                if (i === 2) {
                    assert.isAtLeast(elapsedTime, 100);
                } else {
                    assert.isAtLeast(elapsedTime, 200);
                }
                return 100;
            }
        });

        setTimeout(function() {
            timer.on('stop', done);
            timer.stop();
        }, 200);
    });
});
