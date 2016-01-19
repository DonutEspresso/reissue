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


    it('should emulate setInterval and kick off immediately', function(done) {

        var out = [];
        var i = 0;

        reissue.create({
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
            interval: 100,
            immediate: true
        });
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
                assert.equal(i <= 5, true);
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

        var timer = reissue.create({
            func: function(callback) {

                i++;

                if (i === 2) {
                    return callback(new Error('boom'));
                }

                if (i === 5) {
                    return done();
                }

                return callback();
            },
            interval: 100
        });

        timer.on('error', function(err) {
            if (i === 2) {
                assert.ok(err);
                assert.equal(err instanceof Error, true);
                assert.equal(err.msg, 'boom');
            }
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


});
