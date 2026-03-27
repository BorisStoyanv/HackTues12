use std::sync::Arc;

use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    routing::get,
    Json, Router,
};
use tokio::sync::RwLock;

use crate::{
    engine::RecommendationEngine,
    models::{FeedQuery, HealthResponse, SimilarQuery},
};

#[derive(Clone)]
pub struct AppState {
    pub engine: Arc<RwLock<RecommendationEngine>>,
}

pub fn router(state: AppState) -> Router {
    Router::new()
        .route("/health", get(health))
        .route("/api/recommendations/profile/:user_id", get(profile))
        .route("/api/recommendations/feed/:user_id", get(feed))
        .route("/api/recommendations/similar/:proposal_id", get(similar))
        .with_state(state)
}

async fn health(State(state): State<AppState>) -> impl IntoResponse {
    let engine = state.engine.read().await;
    let view = engine.view();
    let (users, proposals) = engine.health_counts();
    Json(HealthResponse {
        status: "ok",
        data_version: view.data_version,
        trained_at: view.trained_at,
        users,
        proposals,
    })
}

async fn profile(
    State(state): State<AppState>,
    Path(user_id): Path<String>,
) -> Result<impl IntoResponse, StatusCode> {
    let engine = state.engine.read().await;
    engine
        .user_profile(&user_id)
        .map(Json)
        .ok_or(StatusCode::NOT_FOUND)
}

async fn feed(
    State(state): State<AppState>,
    Path(user_id): Path<String>,
    Query(query): Query<FeedQuery>,
) -> Result<impl IntoResponse, StatusCode> {
    let engine = state.engine.read().await;
    engine
        .feed(&user_id, query)
        .map(Json)
        .ok_or(StatusCode::NOT_FOUND)
}

async fn similar(
    State(state): State<AppState>,
    Path(proposal_id): Path<String>,
    Query(query): Query<SimilarQuery>,
) -> Result<impl IntoResponse, StatusCode> {
    let engine = state.engine.read().await;
    engine
        .similar(&proposal_id, query)
        .map(Json)
        .ok_or(StatusCode::NOT_FOUND)
}
