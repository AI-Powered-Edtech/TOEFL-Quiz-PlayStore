#!/usr/bin/env bash
# Idempotent migration helper VIL 0.1/0.2 → 0.4.
# Run from repo root: ./scripts/migrate-vil-0.4.sh [--dry-run] [--check]
set -euo pipefail
cd "$(dirname "$0")/.."

DRY_RUN=false
RUN_CHECK=false
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    --check)   RUN_CHECK=true ;;
  esac
done

log() { echo "[migrate-vil-0.4] $*"; }

log "Step 1/4: Cargo.toml version bumps"
if $DRY_RUN; then
  log "  (dry-run) would patch Cargo.toml"
  grep -nE '^vil(_[a-z_]+)? *=' Cargo.toml | head -20
else
  cp -n Cargo.toml Cargo.toml.bak.pre-0.4 || true
  sed -i -E \
    -e 's/^vil = \\{ version = "0\\.2\\.1"/vil = { version = "0.4"/' \
    -e 's/^vil_migrate = "0\\.2\\.0"/vil_migrate = "0.4"/' \
    -e 's/^vil_server = "0\\.1\\.14"/vil_server = "0.4"/' \
    -e 's/^vil_server_core = "0\\.1\\.14"/vil_server_core = "0.4"/' \
    -e 's/^vil_json = "0\\.1"$/vil_json = "0.4"/' \
    -e 's/^vil_orm = "0\\.1"$/vil_orm = "0.4"/' \
    -e 's/^vil_orm_derive = "0\\.1"$/vil_orm_derive = "0.4"/' \
    -e 's/^vil_server_macros = "0\\.1"$/vil_server_macros = "0.4"/' \
    -e 's/^vil_server_test = "0\\.1"$/vil_server_test = "0.4"/' \
    Cargo.toml
fi

log "Step 2/4: import-path patches (best-effort, may need manual review)"
# Known potentially-renamed re-exports between 0.1/0.2 → 0.4. Add patterns here
# as the actual breakage surfaces during cargo check.
if $DRY_RUN; then
  log "  (dry-run) skipping in-place edits"
else
  # Example placeholder: rename hypothetical 0.1 path → 0.4 path
  # find src -name '*.rs' -type f | xargs sed -i 's|use vil::old_path|use vil::new_path|g'
  log "  (no patches needed yet — populate this section after cargo check\n        identifies broken imports)"
fi

log "Step 3/4: cargo update -p vil"
if $DRY_RUN; then
  log "  (dry-run) skipping cargo update"
else
  cargo update -p vil 2>&1 | tail -20 || true
fi

if $RUN_CHECK; then
  log "Step 4/4: cargo check (this can take 5+ min on first run)"
  cargo check 2>&1 | tail -80
else
  log "Step 4/4: skipped (pass --check to run cargo check)"
fi

log "Done. Backup at Cargo.toml.bak.pre-0.4 (if created)."
log "Next: cargo check, fix any 'unresolved import' / 'method not found' errors,\n      then bump CHANGELOG and commit."
