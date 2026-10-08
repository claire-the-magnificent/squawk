---
'@squawk/notams': minor
---

### Added

- `parseFaaNotam` accepts the 12-digit `YYYYMMDDHHMM` effective-period timestamps that FAA NOTAM Search emits (`202102061252-202103081252`, `...-202103152111EST`, `...-PERM`). The four-digit year is reduced to its last two digits so `NotamDateTime.year` keeps its existing two-digit meaning.
- `parseFaaNotam` accepts lowercase input. Accountability, location code, keyword, and the `EST`/`PERM` markers are matched case-insensitively and returned in uppercase; the body text is left as written.

### Fixed

- 12-digit effective periods no longer fail with `Unable to parse FAA NOTAM effective period`.
