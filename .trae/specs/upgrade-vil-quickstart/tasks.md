# Tasks: Upgrade VIL and Quickstart Modernization

- [ ] **Task 1: Update Cargo Dependencies**
  - Remove all scattered `vil_*` v0.1 crates from `Cargo.toml`.
  - Add the `vil = { version = "0.2", features = ["web", "log", "ai", "db-sqlite"] }` meta-crate. (Verify whether sqlite or postgres is needed).
  - Add `vil_migrate = "0.2"` to handle database migrations.
  - Run `cargo check` and note broken imports.

- [ ] **Task 2: Refactor Imports in Source Code**
  - Update `src/main.rs` to use `vil::prelude::*` instead of `vil_server::prelude::*`.
  - Update `src/main.rs` to import `VilJwt` and `vil_log::*` from the `vil` crate (e.g., `vil::auth::VilJwt`, `vil::log::*`).
  - Update `src/services/*.rs` to use the new `vil::*` paths (e.g., `vil::ai::*`, `vil::auth::*`).
  - Fix any API changes introduced in v0.2 for `VilApp::new`, `ServiceProcess::new`, `VilResponse`, etc.

- [ ] **Task 3: Refactor Database Migrations**
  - Update `src/db.rs` to use `vil_migrate::*` for handling migrations.
  - Ensure the custom manual migration logic is replaced with the new `up`/`down` supported `vil_migrate` framework.

- [ ] **Task 4: Update Documentation**
  - Revise `README.md` to reflect the new `vil = "0.2"` usage and features.
  - Update `docs-dev/VIL_COMPREHENSIVE_REVIEW.md`, `docs-dev/DEPLOYMENT_GUIDE.md`, etc., to document the new `vil` CLI commands (`vil run`, `vil bench`, `vil metrics`, `vil registry`, `vil server new`).
  - Ensure the Quick Start section is aligned with the official VIL v0.2.1 quickstart guide.

- [ ] **Task 5: Final Testing & Verification**
  - Run `cargo build` to ensure the project compiles successfully.
  - Run `cargo test` (if applicable) or verify the API starts up properly with `vil run` or `cargo run`.
  - Verify database migrations run correctly on startup.
