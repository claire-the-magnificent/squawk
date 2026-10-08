---
'@squawk/notams': minor
---

### Added

- `FaaNotam.state` - the two-letter state code that precedes the keyword on some en-route NOTAMs (e.g. `WA` from `ZSE WA..ROUTE ZSE.`).

### Fixed

- `parseFaaNotam` no longer throws `Unable to parse FAA NOTAM keyword` on FDC and ARTCC-issued NOTAMs whose keyword is preceded by a state prefix (`!FDC 6/9312 ZSE OR..ROUTE ZSE.`, `!FDC 6/6654 ZSE WA..AIRSPACE ...`). These forms made up 10 of the 71 FDC NOTAMs in a live FAA NMS capture for the Seattle area.
