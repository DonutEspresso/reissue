'use strict';

// core modules
var events = require('events');
var util = require('util');

// external modules
var assert = require('assert-plus');

// internal files
var bind = require('./bind');


//------------------------------------------------------------------------------
// class constructor
//------------------------------------------------------------------------------


/**
 * Reissue object. Wraps context for setTimeout and behavior
 * @class
 * @constructor
 * @param {Object} opts an options object
 * @param {Object} opts.func an the function to execute
 * @param {Object | Function} opts.interval the interval to execute at, or a
 * function that returns an interval. function allows for dynamic intervals.
 * @param {Object} [opts.context] the context to bind the function to
 * @param {Object} [opts.args] any arguments to pass to the function
 */
function Reissue(opts) {

    // assert options
    assert.object(opts, 'opts');
    assert.func(opts.func, 'func');
    assert.optionalObject(opts.context, 'context');
    assert.optionalArray(opts.args, 'args');

    // assert options of different types
    var typeofInterval = typeof opts.interval;
    assert.equal(typeofInterval === 'function' || typeofInterval === 'number',
                 true);

    var self = this;

    //--------------------------------------------------------------------------
    // user supplied properties
    //--------------------------------------------------------------------------
    /**
     * the function to execute
     * @type {Function}
     */
    self._func = opts.func;

    /**
     * the interval to execute at. if user passed in static value, wrap it in
     * a function to normalize the dynamic interval scenario.
     * @type {Number | Function}
     * @return {Number}
     */
    self._interval = (typeofInterval === 'number') ?
                        function _returnInterval() {
                            return opts.interval;
                        } : opts.interval;

    /**
     * `this` context for the function
     * @type {Object}
     */
    self._funcContext = opts.context || null;

    /**
     * arguments to pass to the function. append the internal done callback.
     * @type {Array}
     */
    var boundDone = bind(self._done, self);
    self._funcArgs = (opts.args) ?
                        opts.args.concat(boundDone) : [boundDone];


    //--------------------------------------------------------------------------
    // internal properties
    //--------------------------------------------------------------------------


    /**
     * internal flag used to determine if the process is active.
     * @type {Boolean}
     */
    self._active = false;

    /**
     * keeps track of time elapsed since last invocation.
     * @type {Number}
     */
    self._startTime = 0;
}
util.inherits(Reissue, events.EventEmitter);


//------------------------------------------------------------------------------
// private methods
//------------------------------------------------------------------------------


/**
 * run the function.
 * @private
 * @method _execute
 * @return {undefined}
 */
Reissue.prototype._execute = function _execute() {
    var self = this;
    self._startTime = Date.now();
    self._func.apply(self._funcContext, self._funcArgs);
};


/**
 * callback on completion of user supplied function. this is where we determine
 * the timeout of the next invocation based on how long it took.
 * @private
 * @method _done
 * @param {Object} err an error returned by user function
 * @return {undefined}
 */
Reissue.prototype._done = function _done(err) {

    // calculate delta interval
    var self = this;
    var interval = self._interval();
    var elapsedTime = Date.now() - self._startTime;

    // re-emit error
    if (err) {
        self.emit('error', err);
    }

    // if user called stop(), we're done! don't queue up another invocation.
    if (self._active === false) {
        return;
    }

    // start invocation immediately if: the elapsedTime is greater than the
    // interval, which means the last execution took longer than the interval
    // itself.  otherwise, subtract the time the previous invocation took.
    var timeToInvocation = (elapsedTime >= interval) ?
                                0 :
                                (interval - elapsedTime);

    // assign the handler to ensure that consumers can't call start() again
    // while we're waiting for the next invocation.
    setTimeout(function _nextInvocation() {
        // this last invocation might have been scheduled before user called
        // stop(). ensure we're still active before invocation.
        if (self._active !== false) {
            self._execute();
        }
    }, timeToInvocation);
};


//------------------------------------------------------------------------------
// public methods
//------------------------------------------------------------------------------


/**
 * start the interval execution.
 * @public
 * @method start
 * @param {Number} [delay] optional delay in ms before starting interval
 * @return {undefined}
 */
Reissue.prototype.start = function start(delay) {
    var self = this;
    assert.optionalNumber(delay);

    // before starting, see if reissue is already active. if so, throw an
    // error.
    if (self._active === true) {
        throw new Error('cannot reissue, function already active!');
    }

    // set the flag and off we go!
    self._active = true;

    if (typeof delay === 'number') {
        setTimeout(function _nextInvocation() {
            self._execute();
        }, delay);
    } else {
        self._execute();
    }
};


/**
 * manually stop the exeuction queue.
 * @public
 * @method stop
 * @return {undefined}
 */
Reissue.prototype.stop = function stop() {
    var self = this;
    self._active = false;
};



// export a factory function
module.exports.create = function create(opts) {
    return new Reissue(opts);
};
