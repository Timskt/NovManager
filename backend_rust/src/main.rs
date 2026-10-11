#![recursion_limit = "256"]

use nov_server::api::{self, AppState};
use nov_server::context_packer::ContextPacker;
use nov_server::git_vcs::GitVcsManager;
use nov_server::self_iteration::PromptSelfTuner;
use nov_server::storage::SqliteStorage;
use std::net::SocketAddr;
use std::sync::Arc;
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;
use tracing::info;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "nov_server=info,tower_http=info".into()),
        )
        .init();

    println!(
        r#"
================================================================================
  _   _             __  __                                   
 | \ | |           |  \/  |                                  
 |  \| | _____   __| \  / | __ _ _ __   __ _  __ _  ___ _ __ 
 | . ` |/ _ \ \ / /| |\/| |/ _` | '_ \ / _` |/ _` |/ _ \ '__|
 | |\  | (_) \ V / | |  | | (_| | | | | (_| | (_| |  __/ |   
 |_| \_|\___/ \_/  |_|  |_|\__,_|_| |_|\__,_|\__, |\___|_|   
                                              __/ |          
                                             |___/           
 NovManager High-Performance Rust Backend (v1.0.0)
================================================================================
"#
    );

    let storage = Arc::new(SqliteStorage::new()?);
    let git = Arc::new(GitVcsManager::new());
    let tuner = Arc::new(PromptSelfTuner::new());
    let context_packer = Arc::new(ContextPacker::new(4000));
    let http_client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(120))
        .build()?;

    let state = Arc::new(AppState {
        storage,
        git,
        tuner,
        context_packer,
        http_client,
    });

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = api::create_router(state)
        .layer(cors)
        .layer(TraceLayer::new_for_http());

    let port: u16 = std::env::var("PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(8000);

    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    info!("🚀 NovManager Rust Backend listening on http://{}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
