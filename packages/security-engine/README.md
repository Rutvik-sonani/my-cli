# @mycli-cli/security-engine

Enterprise security platform for MyCLI (Phase 12).

## CLI

```bash
my security setup
my security scan
my add security
```

## Generated layout

```
src/security/
  headers/
  cors/
  csrf/
  rate-limit/
  sanitization/
  validation/
tests/security/
SECURITY.md
```

## Scanner

`my security scan` analyzes:

- Dependencies
- Secrets
- Configuration
- OWASP risks
- License issues

Output: `security-report.md`
