#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

mkdir -p .codex/automation

# Ensure skill mount exists.
if [[ ! -L .codex/skills ]]; then
  rm -rf .codex/skills
  ln -s ../.agents/skills .codex/skills
fi

cat > .codex/automation/roles.json <<'JSON'
{
  "version": 1,
  "mode": "autonomous",
  "roles": {
    "phase_0": ["platform_engineer", "qa_guardian"],
    "phase_1": ["payments_engineer", "qa_guardian"],
    "phase_2": ["security_engineer", "backend_engineer"],
    "phase_3": ["content_security_engineer", "backend_engineer"],
    "phase_4": ["sre_engineer", "backend_engineer"],
    "phase_5": ["operations_engineer", "support_admin"],
    "phase_6": ["release_engineer", "sre_engineer"],
    "phase_7": ["performance_engineer", "reliability_engineer"]
  }
}
JSON

cat > .codex/automation/skills.json <<'JSON'
{
  "version": 1,
  "required": [
    "fix-ci",
    "quick-review",
    "security-scan-lite",
    "verify-node"
  ],
  "sources": {
    "fix-ci": ".agents/skills/fix-ci/SKILL.md",
    "quick-review": ".agents/skills/quick-review/SKILL.md",
    "security-scan-lite": ".agents/skills/security-scan-lite/SKILL.md",
    "verify-node": ".agents/skills/verify-node/SKILL.md"
  }
}
JSON

for skill in fix-ci quick-review security-scan-lite verify-node; do
  path=".agents/skills/$skill/SKILL.md"
  if [[ ! -f "$path" ]]; then
    echo "ERROR: required skill missing: $path" >&2
    exit 1
  fi
done

# Compact long session mode enforcement.
if ! rg -q '^long_session_compact = true$' .codex/config.toml; then
  if rg -q '^\[asdev.model_routing\]$' .codex/config.toml; then
    awk '{print} /^\[asdev.model_routing\]$/ {in_section=1; next} in_section==1 && /^\[/ {if(!inserted){print "long_session_compact = true"; inserted=1} in_section=0} END{if(in_section==1 && !inserted) print "long_session_compact = true"}' .codex/config.toml > /tmp/codex-config.new
    mv /tmp/codex-config.new .codex/config.toml
  else
    cat >> .codex/config.toml <<'TOML'

[asdev.model_routing]
long_session_compact = true
TOML
  fi
fi

echo "AUTO_ROLES_SKILLS_OK"
