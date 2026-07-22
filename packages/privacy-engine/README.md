# @mycli/privacy-engine

Enterprise privacy management for MyCLI (Phase 9).

## CLI

```bash
my add privacy
my privacy export --user user-1
my privacy delete --user user-1
```

## Features

- **PrivacyService** — export / delete user data
- **Consent management** — grant, deny, withdraw
- **Cookie tracking** — necessary / analytics / marketing / preferences
- **Data processing records** — purpose + legal basis ledger

## Generated layout

```
src/privacy/
  consent/
  cookies/
  processing/
  export/
  deletion/
tests/privacy/
PRIVACY.md
```
