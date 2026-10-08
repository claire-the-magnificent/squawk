---
'@squawk/notams': minor
---

### Changed

- `Notam.id` and `Notam.action` are now optional. They are undefined when the input has no `A1234/26 NOTAMN` header line. Code that read them as always-present strings needs an `undefined` check.

### Added

- `parseNotam` accepts ICAO text that starts at the `Q)` line without the `A1234/26 NOTAMN` header, which is how the FAA NMS serves its ICAO rendering. The header is still required for any text that does not start at the Q-line, so non-NOTAM input is still rejected with `Unable to parse NOTAM header`.

### Fixed

- `parseNotam` no longer folds a trailing `CREATED: 01 Jan 2002 01:00:00` / `SOURCE: LSSNYNYX` feed footer into the last item (`G)`, or `E)` when it is last).
