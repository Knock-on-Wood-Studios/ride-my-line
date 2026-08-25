# Security policy

## Supported version

Only the latest production deployment from `main` is supported with security updates.

## Reporting a vulnerability

Use a private GitHub security advisory:

<https://github.com/Knock-on-Wood-Studios/ride-my-line/security/advisories/new>

Include the affected route or build, reproduction steps, impact, and any suggested mitigation. Do not include real player data. Please allow reasonable time for investigation and remediation before public disclosure.

## Current controls

- Same-origin Content Security Policy with no inline executable content.
- No third-party runtime scripts, trackers, or advertising code.
- Same-origin, schema-validated telemetry POSTs capped at 8 KiB and 20 events.
- Cross-origin event submissions rejected.
- Content-hashed executable assets with immutable caching.
- Dependency audit, level validation, unit tests, and multi-browser gameplay tests in CI.
