# 05 Content Protection

## Access Model
- Content can be downloaded only if:
  - token is valid and unexpired
  - content is published
  - requester has active membership for content creator

## Security Controls
- token verification is server-side
- storage path resolution blocks path traversal
- audit events are written for token issue and download

## Operational Controls
- monitor high-rate token issuance in ops summary findings
- clean retention artifacts via worker maintenance jobs
