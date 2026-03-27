mod api;
mod config;
mod engine;
mod models;
mod source;

use std::{net::SocketAddr, sync::Arc};

use api::{router, AppState};
use config::AppConfig;
use engine::RecommendationEngine;
use tokio::{
    net::TcpListener,
    sync::RwLock,
    time::{interval, Duration},
};
use tracing::{error, info, warn};

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "recomendation_engine=info,axum=info".into()),
        )
        .init();

    let config = AppConfig::from_env();
    let source = source::SnapshotSource::new(config.data_source.clone());
    let engine = Arc::new(RwLock::new(RecommendationEngine::empty()));

    match source.load().await {
        Ok(versioned) => {
            let trained = RecommendationEngine::train(versioned.snapshot, versioned.version);
            *engine.write().await = trained;
        }
        Err(error) => {
            warn!("failed to load initial snapshot: {error}");
        }
    }

    let state = AppState {
        engine: engine.clone(),
    };

    spawn_retraining_loop(engine.clone(), source.clone(), config.poll_interval_secs);

    let app = router(state);
    let bind_addr: SocketAddr = config.bind_addr.parse().unwrap_or_else(|_| {
        "127.0.0.1:8090"
            .parse()
            .expect("fallback bind addr is valid")
    });
    let listener = TcpListener::bind(bind_addr)
        .await
        .expect("bind address should be available");

    info!("recomendation engine listening on http://{}", bind_addr);

    axum::serve(listener, app)
        .await
        .expect("server should start");
}

fn spawn_retraining_loop(
    engine: Arc<RwLock<RecommendationEngine>>,
    source: source::SnapshotSource,
    poll_interval_secs: u64,
) {
    tokio::spawn(async move {
        let mut ticker = interval(Duration::from_secs(poll_interval_secs.max(3)));

        loop {
            ticker.tick().await;

            let latest = match source.load().await {
                Ok(snapshot) => snapshot,
                Err(error) => {
                    warn!("snapshot sync failed: {error}");
                    continue;
                }
            };

            let current_version = {
                let current = engine.read().await;
                current.view().data_version
            };

            if latest.version == current_version {
                continue;
            }

            info!("new snapshot detected, retraining model");
            let version = latest.version.clone();
            let snapshot = latest.snapshot.clone();

            let trained = match tokio::task::spawn_blocking(move || {
                RecommendationEngine::train(snapshot, version)
            })
            .await
            {
                Ok(model) => model,
                Err(error) => {
                    error!("training task failed: {error}");
                    continue;
                }
            };

            *engine.write().await = trained;
            info!("model retrained successfully");
        }
    });
}
