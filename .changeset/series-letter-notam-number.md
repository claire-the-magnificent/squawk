---
'@squawk/notams': minor
---

### Fixed

- `parseFaaNotam` now accepts military NOTAM numbers that carry a series letter in place of the month/sequence pair (`!KGRF V0395/26 GRF ...`, `!KGRF M0554/26 GRF ...`) instead of throwing `Unable to parse FAA NOTAM number`. The number is returned verbatim in `notamNumber`.
- `parseFaaNotam` accepts the long-form `AERODROME` keyword used by those military NOTAMs and reports it as the `AD` keyword.
