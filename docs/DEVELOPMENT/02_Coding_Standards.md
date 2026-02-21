# 02 Coding Standards

## General
- strict TypeScript for API code
- explicit error codes for API failures
- input normalization at route boundaries

## API Rules
- keep handlers deterministic and idempotent where needed
- write audit/payment events for sensitive state changes
- avoid hidden side effects in callback handlers

## Documentation Rules
- every new endpoint/job/runbook must update docs index and related architecture/runbook docs
