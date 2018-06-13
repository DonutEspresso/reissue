# reissue

[![NPM Version](https://img.shields.io/npm/v/reissue.svg)](https://npmjs.org/package/reissue)
[![Build Status](https://travis-ci.org/DonutEspresso/reissue.svg?branch=master)](https://travis-ci.org/DonutEspresso/reissue)
[![Coverage Status](https://coveralls.io/repos/github/DonutEspresso/reissue/badge.svg?branch=master)](https://coveralls.io/github/DonutEspresso/reissue?branch=master)
[![Dependency Status](https://david-dm.org/DonutEspresso/reissue.svg)](https://david-dm.org/DonutEspresso/reissue)
[![devDependency Status](https://david-dm.org/DonutEspresso/reissue/dev-status.svg)](https://david-dm.org/DonutEspresso/reissue#info=devDependencies)

> setInterval with setTimeout semantics

Often you want to execute an operation at certain intervals, pending
completion of the operation. For asynchronous operations, `setInterval()` is
not sufficient for this scenario, as it can execute the operation a second
time even if the first one is still in flight. A refresh like operation is a
common use case.

Instead, reissue uses `setTimeout()` under the hood, queuing up a second
execution only after the first exeuction has completed. If the time elapsed
exceeds that of the specified interval, the second execution will be invoked
immediately.  This means that the behavior of reissue may _not_ be identical to
that of `setInterval()` for asynchronous operations. This is intended behavior.


## Getting Started

Install the module with: `npm install reissue`

## Usage

To begin, create a reissue object, which will return you an handler object:

```js
var reissue = require('reissue');

var handler = reissue.create({
    func: function print(callback) {
        console.log('hi');
        return callback();
    },
    interval: 1000
});

handler.start();
```

Calling `start()`  on the handler will begin the interval, and now reissue will
log 'hi' to the console once every second. Note the callback parameter passed
to the function - this callback _must_ be called in order for the next
invocation to proceed.


## API

### reissue.create()

reissue takes the following options to its `create()` method:

* `opts.func` {Function} the function to execute. This function is invoked with
a callback function as it's last parameter.
* `opts.interval` {Number | Function} the interval in ms to execute the
function, or a function that returns an interval, allowing usage of a dynamic
interval.
* `[opts.timeout]` {Number} an optional timeout in ms. if any invocation of the
the supplied func exceeds this timeout, the `timeout` event is fired.
* `[opts.context]` {Context} an optional `this` context for the function. use
this in lieu of native `bind()` if you are concerned about performance. reissue
uses `apply()` under the hood to do context/arg binding.
* `[opts.args]` {Array} an optional array of arguments for the function. used in
conjunction with the same `apply()` call as the context.

__Returns__: {Object} returns a handler object


The returned handler object exposes the following methods:

### handler.start(delay)

Starts the timer interval. Calling `start()` while reissue is already active
will throw an exception.

* `delay` {Number} an optional delay in ms before first invocation. if no delay
is provided, first invocation is synchronous (no setImmediate, no setTimeout).
Note that `0` is explicitly a valid value, and will be passed to setTimeout.

__Returns__: {undefined} returns nothing

### handler.stop()

Stops the timer interval. Takes no parameters. This will stop all further
invocations of the function, even if they have already been scheduled.

__Returns__: {undefined} returns nothing


The handler object also emits the following events:

### handler.on('error', function(err) {...})
If your function returns an error to the callback, this event will be emitted.
The subscribed function will receive an error as it's only parameter.

### handler.on('stop', function() {...})
When the `stop()` method is called, this event is emitted when either the
current invocation is successfully completed, or when the next scheduled
invocation is successfully cancelled. If the current invocation is "stuck" in
the sense that the callback never returns, the stop event will never fire.

### handler.on('timeout', function() {...})
If a `timeout` value is specified, this event will be fired when any given
invocation of the function exceeds the specified value. However, if your user
supplied function is synchronous, and never gives up the event loop, it is
possible that this event may never get fired.


## Contributing

Add unit tests for any new or changed functionality. Ensure that lint and style
checks pass.

To start contributing, install the git prepush hooks:

```sh
make githooks
```

Before committing, run the prepush hook:

```sh
make prepush
```


## License

Copyright (c) 2018 Alex Liu

Licensed under the MIT license.
