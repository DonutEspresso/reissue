'use strict';

// external modules
var assert = require('assert-plus');


/**
 * a simple bind function. takes a function and a context, and returns a
 * bound function to that context. replicates native `bind()`.
 * @param {Function} fn function to bind
 * @param {Object} context context to bind
 * @param {Object} [args] arguments to bind to the function
 * @returns {Function}
 */
function bind(fn, context, args) {

    assert.func(fn, 'fn');
    assert.object(context, 'context');
    assert.optionalArray(args, 'args');

    return function boundFn() {
        fn.apply(context || null, args || []);
    };
}


module.exports = bind;
