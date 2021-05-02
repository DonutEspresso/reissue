'use strict';

// core modules
const events = require('events');
const util = require('util');

// external modules
const assert = require('assert-plus');

// internal files
const bind = require('./bind');

//------------------------------------------------------------------------------
// class constructor
//------------------------------------------------------------------------------

/**
 * Reissue object which wraps the context for setTimeout behavior.
 * @class
 * @constructor
 * @private
 * @param {Object} opts an options object
 * @param {Object} opts.func an the function to execute
 * @param {Object | Function} opts.interval the interval to execute at, or a
 * function that returns an interval. function allows for dynamic intervals.
 * @param {Number} [opts.timeout] an optional timeout value that causes the
 * `timeout` event to be fired when a given invocation exceeds this value.
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
    assert.optionalNumber(opts.timeout, 'timeout');
    assert.optionalBool(opts.unref, 'unref');

    // assert options of different types
    const typeofInterval = typeof opts.interval;
    assert.equal(
        typeofInterval === 'function' || typeofInterval === 'number',
        true
    );

    const self = this;

    //--------------------------------------------------------------------------
    // user supplied properties
    //--------------------------------------------------------------------------
    /**
     * the function to execute
     * @private
     * @type {Function}
     */
    self._func = opts.func;

    /**
     * the interval to execute at. if user passed in static value, wrap it in
     * a function to normalize the dynamic interval scenario.
     * @private
     * @type {Number | Function}
     * @return {Number}
     */
    self._interval =
        typeofInterval === 'number'
            ? function _returnInterval() {
                  return opts.interval;
              }
            : opts.interval;

    /**
     * `this` context for the function
     * @private
     * @type {Object}
     */
    self._funcContext = opts.context || null;

    /**
     * arguments to pass to the function. append the internal done callback.
     * @private
     * @type {Array}
     */
    const boundDone = bind(self._done, self);
    self._funcArgs = opts.args ? opts.args.concat(boundDone) : [boundDone];

    /**
     * schedule an optional timeout which will trigger timeout event if a
     * given invocation exceeds this number.
     * @private
     * @type {Number}
     */
    self._timeoutMs = opts.timeout || null;

    /**
     * if true, unref the timeout, which will allow the process to go down if
     * needed without calling stop()
     * @private
     * @type {Boolean}
     */
    self._unref = opts.unref === true ? true : false;

    //--------------------------------------------------------------------------
    // internal properties
    //--------------------------------------------------------------------------

    /**
     * internal flag used to determine if the process is active.
     * @private
     * @type {Boolean}
     */
    self._active = false;

    /**
     * keeps track of time elapsed since last invocation.
     * @private
     * @type {Number}
     */
    self._startTime = 0;

    /**
     * boolean flag set when we are waiting for user supplied function to
     * complete. technically we should know this if self._nextHandlerId had
     * a flag to show whether or not it had already been executed, but this is
     * a safer way to do it.
     * @private
     * @type {Boolean}
     */
    self._inUserFunc = false;

    /**
     * setTimeout handler of next invocation
     * @private
     * @type {Function}
     */
    self._nextHandlerId = null;

    /*
     * setTimeout handler of an internal timeout implementation. used to fire
     * the timeout event if a user supplied function takes too long.
     * @private
     * @type {Function}
     */
    self._timeoutHandlerId = null;
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
    const self = this;

    // start invocation timer
    self._startTime = Date.now();
    // set flag so we know we're currently in user supplied func
    self._inUserFunc = true;
    // execute their func on a setImmediate, such that we can schedule the
    // timeout first. to be clear though, user func could be sync and our
    // timeout may never fire.
    setImmediate(function _executeImmediately() {
        self._func.apply(self._funcContext, self._funcArgs);
    });

    // if timeout option is specified, schedule one here. basically, we
    // execute the next invocation immediately above, then schedule a
    // timeout handler, so we basically have two set timeout functions
    // being scheduled.
    if (self._timeoutMs !== null) {
        // assign timeout to self so that we can cancel it if we complete
        // on time.
        self._timeoutHandlerId = setTimeout(
            bind(self._onTimeout, self),
            self._timeoutMs
        );
        if (self._unref === true) {
            self._timeoutHandlerId.unref();
        }
    }
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
    const self = this;
    const elapsedTime = Date.now() - self._startTime;
    const interval = self._interval(elapsedTime);

    // we're out of user supplied func now
    self._inUserFunc = false;
    // clear out the handler id
    self._nextHandlerId = null;

    // re-emit error
    if (err) {
        self.emit('error', err);
    }

    // in every other case, we're fine, since we've finished before the
    // timeout event has occurred. call _internalDone where we will clear
    // the timeout event.
    return _internalDone();

    // common completion function called by forked code above
    function _internalDone() {
        // clear any timeout handlers
        if (self._timeoutHandlerId) {
            clearTimeout(self._timeoutHandlerId);
            self._timeoutHandlerId = null;
        }

        // if user called stop() sometime during last invocation, we're done!
        // don't queue up another invocation.
        if (self._active === false) {
            self._stop();
        } else {
            // start invocation immediately if: the elapsedTime is greater than
            // the interval, which means the last execution took longer than
            // the interval itself.  otherwise, subtract the time the previous
            // invocation took.
            const timeToInvocation =
                elapsedTime >= interval ? 0 : interval - elapsedTime;

            self._nextHandlerId = setTimeout(function _nextInvocation() {
                self._execute();
            }, timeToInvocation);

            if (self._unref === true) {
                self._nextHandlerId.unref();
            }
        }
    }
};

/**
 * internal implementation of stop. clears all timeout handlers and emits the
 * stop event.
 * @private
 * @method _stop
 * @returns {undefined}
 */
Reissue.prototype._stop = function _stop() {
    const self = this;

    // clear the next invocation if one exists
    if (self._nextHandlerId) {
        clearTimeout(self._nextHandlerId);
        self._nextHandlerId = null;
    }

    //  no need to clear timeout handlers, as they're already cleared
    //  in _done before we get here.

    // emit stop, and we're done!
    self.emit('stop');
};

/**
 * called when the interval function "times out", or in other words takes
 * longer than then specified timeout interval. this blocks the next invocation
 * of the interval function until user calls the callback on the timeout
 * event.
 * @private
 * @method _onTimeout
 * @return {undefined}
 */
Reissue.prototype._onTimeout = function _onTimeout() {
    const self = this;

    // we might have called stop during current invocation. emit timeout event
    // only if we're still active.
    if (self._active === true) {
        self.emit('timeout');
    }
};

//------------------------------------------------------------------------------
// public methods
//------------------------------------------------------------------------------

/**
 * Starts the timer interval. Calling start() while reissue is already active
 * will throw an exception.
 * @public
 * @method Reissue.start
 * @param {Number} [delay] an optional delay in ms before first invocation. if
 * no delay is provided, first invocation is synchronous (no setImmediate, no
 * setTimeout).  Note that `0` is explicitly a valid value, and will be passed
 * to setTimeout.
 * @return {undefined}
 */
Reissue.prototype.start = function start(delay) {
    assert.optionalNumber(delay);

    const self = this;

    // before starting, see if reissue is already active. if so, throw an
    // error.
    if (self._active === true) {
        throw new Error('cannot reissue, function already active!');
    }

    // set the flag and off we go!
    self._active = true;

    // can't to truthy check since 0 is falsy. if a delay is passed in, then
    // schedule it. otherwise, it's synchronous and you can't stop it.
    if (typeof delay === 'number') {
        self._nextHandlerId = setTimeout(function _nextInvocation() {
            self._execute();
        }, delay);

        if (self._unref === true) {
            self._nextHandlerId.unref();
        }
    } else {
        self._execute();
    }
};

/**
 * Stops the interval execution, and clears any queued up invocations.
 * @public
 * @method Reissue.stop
 * @return {undefined}
 */
Reissue.prototype.stop = function stop() {
    const self = this;

    // NOTE: while the below if statements could be collapsed to be more more
    // terse, this logic is easier to read in terms of maintainability.

    // check if we are currently active. if not, we can stop now.
    if (self._active === false) {
        self._stop();
    } else {
        // in the else case, we are still active. there are two possibilities
        // here, we are either:
        // 1) queued up waiting for the next invocation
        // 2) waiting for user supplied function to complete
        if (self._inUserFunc === false) {
            // case #1
            // if we're just waiting for the next invocation, call stop now
            // which will clear out the next invocation.
            self._stop();
        } else {
            // case #2
            // set active flag to false, when we come back from user function
            // we will check this flag and call internal _stop()
            self._active = false;
        }
    }
};

/**
 * This module exposes a create method which takes the following options:
 * @param {Object} opts an options object
 * @param {Object} opts.func the function to execute on an interval. this
 * function is invoked with a callback function as its last parameter.
 * @param {Number} opts.interval the interval in ms to execute the function, or
 * a function that returns an interval, allowing usage of a dynamic interval.
 * @param {Number} [opts.timeout] an optional timeout in ms. if any invocation
 * of the the supplied func exceeds this timeout, the `timeout` event is fired.
 * @param {Object} [opts.context] an optional `this` context for the function
 * invocation. use this in lieu of native `bind()` if you are concerned about
 * performance. reissue uses `apply()` under the hood to do context/arg binding.
 * @param {Array} [opts.args] an optional array of arguments for the function.
 * used in conjunction with the same `apply()` call as the context.
 * @return {Reissue} a Reissue object
 */
function create(opts) {
    return new Reissue(opts);
}

module.exports = {
    create
};
