# 3.0.0

- BREAKING: remove 0.12 support.
- BREAKING: move to let and const block bindings.
- BREAKING: when calling `stop()`, reissue will cancel the next scheduled
  invocation if it has not yet begun execution.
- NEW: when calling `stop()`, reissue will emit a `stop` event when the current
  invocation successfully calls back.
- NEW: support new `timeout` option. when passed in, reissue will emit a
  `timeout` event when any invocation exceeds the given timeout.

# 2.0.1

- #8: move `active` check into execution path. Ensures that calling `stop()`
  stops even the first invocation.
  [donutespresso/#8](https://github.com/DonutEspresso/reissue/pull/8)

# 2.0.0

- BREAKING: Fix fuzzy behavior around calling `start(0)`. Passing a value of
  zero is always asynchronous now.
  [gcochard/#5](https://github.com/DonutEspresso/reissue/pull/5)
- DOCS: Fix typo in README
  [tgfjt/#3](https://github.com/DonutEspresso/reissue/pull/3)

# 1.0.1

- FIX: Bound functions were not applying partial args, resulting in `error`
  event not actually getting fired. Also fix unit tests not actually catching
  the broken behavior.
  [donutespresso/#6](https://github.com/DonutEspresso/reissue/pull/6)

# 1.0.0

Initial release.
