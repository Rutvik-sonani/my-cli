# @mycli-cli/governance-engine

Enterprise company governance for MyCLI (Phase 15).

## CLI

```bash
my governance setup
my governance check
```

## Company policy rules

Required by default:

- PostgreSQL (database)
- Docker
- Authentication / RBAC
- Security
- Audit logs
- Tests
- CI/CD
- Documentation

## Generated layout

```
src/governance/
  policy/
  rules/
  checker/
tests/governance/
company-policy.json
GOVERNANCE.md
```
