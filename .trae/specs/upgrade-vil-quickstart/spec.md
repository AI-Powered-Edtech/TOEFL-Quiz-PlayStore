# VIL v0.2 Upgrade and Quickstart Modernization

## Overview
The codebase currently uses `vil_server` v0.1 and various scattered `vil_*` crates (`vil_server_auth`, `vil_llm`, `vil_log`, `vil_trigger_cron`). VIL has recently been consolidated into a Pythonic meta-crate `vil` v0.2.1, with a feature-flag-based architecture (`web`, `log`, `db-sqlite`, `db-postgres`, `ai`). 

Additionally, a new `vil_migrate` crate (v0.2.0) has been introduced for database migrations, replacing scattered custom DB initialization logic.

This spec outlines the plan to upgrade the project to use the `vil` v0.2 meta-crate, update the documentation to reflect the new `vil` quickstart and CLI commands (`vil new`, `vil run`, `vil server new`, etc.), and refactor imports across the application.

## Goals
1. **Dependency Modernization**: Replace `vil_server`, `vil_server_auth`, `vil_llm`, `vil_log`, `vil_trigger_cron`, and `vil_db_sqlx` with the single `vil = "0.2"` crate using appropriate feature flags. Add `vil_migrate = "0.2"`.
2. **Codebase Refactor**: Update all `vil_*` imports to use the consolidated `vil::prelude::*` and other `vil::*` modules.
3. **Database Migration Modernization**: Adopt `vil_migrate` to handle up/down migrations instead of the manual migration code found in `src/db.rs`.
4. **Documentation Updates**: Revise `VIL_COMPREHENSIVE_REVIEW.md`, `DEPLOYMENT_GUIDE.md`, and the `README.md` to document the new `vil` CLI tools (`vil bench`, `vil metrics`, `vil registry`, `vil server new`) and the v0.2 crate structure.

## Technical Details

### 1. Cargo.toml Changes
Remove:
```toml
vil_server = "0.1"
vil_server_auth = "0.1"
vil_llm = "0.1"
vil_trigger_cron = "0.1"
vil_log = "0.1"
```

Add:
```toml
vil = { version = "0.2", features = ["web", "log", "ai", "db-sqlite"] } # Adjust db feature based on actual DB used
vil_migrate = "0.2"
```

### 2. Import Refactoring
- `vil_server::prelude::*` -> `vil::prelude::*`
- `vil_server_auth::VilJwt` -> `vil::auth::VilJwt` (or equivalent in v0.2)
- `vil_llm::*` -> `vil::ai::*`
- `vil_log::*` -> `vil::log::*`

### 3. Database Migration Integration
Refactor `src/db.rs` to use `vil_migrate::*` for handling migrations. Ensure that `up` and `down` capabilities are supported if required.

### 4. Documentation
- **README.md**: Update the Quick Start section to reflect `vil = { version = "0.2" }`.
- **docs-dev/**: Update any mention of scattered crates to refer to the VIL meta-crate. Add clear usage examples of the `vil` CLI tools as found in the official VIL v0.2.1 quickstart guide.

## Risks & Mitigations
- **API Breakages**: Moving from v0.1 to v0.2 might introduce breaking changes in the API (e.g., `VilApp::new`, `ServiceProcess::new`, `VilResponse`). We will need to address these compilation errors incrementally.
- **Feature Flag Mismatch**: Ensure the correct database feature flag (`db-sqlite` vs `db-postgres`) is enabled based on the project's requirements.
