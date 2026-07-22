# @mycli/compliance-engine

Enterprise compliance engine for MyCLI (Phase 8).

## CLI

```bash
my add compliance
my add compliance --frameworks gdpr,soc2
my add compliance --frameworks gdpr,hipaa,soc2,iso27001
```

## Frameworks

- **GDPR** — data retention, privacy policy, subject rights
- **HIPAA** — PHI access controls, audit logging, breach readiness
- **SOC2** — access control, change management, monitoring
- **ISO27001** — ISMS policy, risk assessment, asset inventory

## Generated layout

```
src/compliance/
  policies/
  checks/
  reports/
  documentation/
tests/compliance/
COMPLIANCE.md
```

## Features

- Data retention rules
- Privacy policies
- Security checklist
- Compliance reports
