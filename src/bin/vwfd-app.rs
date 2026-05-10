//! Companion VWFD binary for TOEFL Quiz — runs the workflow-pattern endpoints
//! defined in `workflows/*.yaml` on a separate port (default 8083).
//!
//! The existing imperative `toefl-quiz-backend` (src/main.rs) is unchanged.
//! Both can run side-by-side; the frontend nginx routes `/api/v2/*` to this
//! binary and `/api/*` to the original backend.
//!
//! Build:  cargo build --release --features vwfd --bin vwfd-app
//! Run:    VIL_BIND_ADDR=0.0.0.0:8083 ./target/release/vwfd-app
//!
//! License note: vil_vwfd is VSAL-licensed; running it as part of the TOEFL
//! Quiz product is permitted under §3.6 Significant Business Process Exception
//! (educational/LMS scenario). DO NOT expose runtime workflow upload
//! (`/api/admin/*`) to third-party customers without a commercial agreement.

#[cfg(feature = "vwfd")]
use std::env;

#[cfg(feature = "vwfd")]
#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let workflows_dir = env::var("VIL_WORKFLOWS_DIR")
        .unwrap_or_else(|_| "workflows".to_string());
    let bind_addr = env::var("VIL_BIND_ADDR")
        .unwrap_or_else(|_| "0.0.0.0:8083".to_string());
    let port: u16 = bind_addr
        .rsplit(':')
        .next()
        .and_then(|p| p.parse().ok())
        .unwrap_or(8083);

    tracing_subscriber::fmt()
        .with_env_filter(env::var("RUST_LOG").unwrap_or_else(|_| "info".into()))
        .init();

    tracing::info!(
        workflows = %workflows_dir,
        addr = %bind_addr,
        "Starting TOEFL Quiz VWFD companion (VIL 0.4.0)"
    );

    // Phase 1: declarative-only — all 4 core endpoints + 2 cron + 2 read-only
    // are pure DbExecute / DbQuery / Transform steps that the runtime knows
    // out of the box. We can wire .native() / .sidecar() helpers later when
    // we need to call back into Rust services::* (e.g. for quiz scoring).
    vil_vwfd::app(&workflows_dir, port).run().await;

    Ok(())
}

// Stub when feature is disabled so `cargo build` (no features) still succeeds.
#[cfg(not(feature = "vwfd"))]
fn main() {
    eprintln!("vwfd-app requires --features vwfd. Rebuild with: cargo build --features vwfd --bin vwfd-app");
    std::process::exit(2);
}
