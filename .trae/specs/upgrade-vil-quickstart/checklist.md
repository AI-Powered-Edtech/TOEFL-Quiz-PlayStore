# Checklist: Upgrade VIL and Quickstart Modernization

- [ ] Replaced scattered `vil_*` v0.1 crates with `vil = "0.2"` in `Cargo.toml`.
- [ ] Added `vil_migrate = "0.2"` to `Cargo.toml`.
- [ ] Verified correct database feature flag (`db-sqlite` or `db-postgres`) for the `vil` crate.
- [ ] Refactored `vil_server::prelude::*` to `vil::prelude::*` in `src/main.rs` and `src/services/*.rs`.
- [ ] Refactored `vil_server_auth::VilJwt` and `vil_log::*` to their respective `vil::auth::*` and `vil::log::*` paths.
- [ ] Fixed any compilation errors due to `VilApp::new`, `ServiceProcess::new`, `VilResponse`, etc., API changes.
- [ ] Replaced manual database migration logic in `src/db.rs` with `vil_migrate::*`.
- [ ] Updated `README.md` to reflect `vil = "0.2"` usage and features.
- [ ] Updated `docs-dev/VIL_COMPREHENSIVE_REVIEW.md`, `docs-dev/DEPLOYMENT_GUIDE.md`, etc., with the new `vil` CLI commands.
- [ ] Verified the Quick Start section is aligned with the official VIL v0.2.1 quickstart guide.
- [ ] Ran `cargo build` and verified the project compiles successfully.
- [ ] Ran `cargo test` (if applicable) and verified tests pass.
- [ ] Verified the API starts up properly with `vil run` or `cargo run`.
- [ ] Verified database migrations run correctly on startup.
