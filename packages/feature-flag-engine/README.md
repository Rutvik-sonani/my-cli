# @mycli/feature-flag-engine

Enterprise feature flag platform for MyCLI (Phase 10).

## CLI

```bash
my add feature-flags
my add feature-flags --provider database
my add feature-flags --provider launchdarkly
my add feature-flags --provider unleash
```

## Providers

- **database** — local JSON / in-memory rules (default)
- **launchdarkly** — LaunchDarkly SDK adapter stub
- **unleash** — Unleash client adapter stub

## Features

- Boolean flags
- Percentage rollout
- User targeting
- Environment targeting
- Country targeting

## Generated layout

```
src/feature-flags/
  providers/
  targeting/
tests/feature-flags/
FEATURE_FLAGS.md
```
