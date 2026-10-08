---
'@squawk/notams': patch
---

### Fixed

- `parseNotam` no longer throws `Unable to parse NOTAM Item E (text)` when a NOTAM has no `D)` item but its `E)` text contains a token such as `(CAT D)`, `TWY A TO D)`, or a line-wrapped `D)`. An optional `C)` or `D)` is now only recognised when it starts before the `E)` item. 17 of the 26,082 non-US NOTAMs in a public worldwide dataset failed this way.
- `parseNotam` no longer returns the multi-part marker in `locationCodes`: `A) EDGG PART 10 OF 11` now yields `["EDGG"]` instead of `["EDGG", "PART", "10", "OF", "11"]`.
