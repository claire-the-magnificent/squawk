---
'@squawk/notams': minor
---

### Changed

- `NotamQualifier.coordinates` and `NotamQualifier.radiusNm` are now optional. They are undefined when the Q-line's last field is empty or carries only the radius. Code that read them as always-present values needs an `undefined` check.

### Fixed

- `parseNotam` no longer drops the whole `qualifier` when the Q-line has empty values, such as `KZSE/QXXXX////000/999/` (empty traffic, purpose, scope, and coordinates) or `KFDC/QARCH/IV/BO/E/000/999/` (empty coordinates), as the FAA NMS emits for ARTCC route NOTAMs. The FIR, Q-code, and altitude limits are now returned; a malformed non-empty coordinates field still leaves `qualifier` undefined.
