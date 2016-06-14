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
