use std::{
    collections::HashMap,
    env,
    net::SocketAddr,
    sync::Arc,
};

use axum::{
    extract::{Query, State},
    http::{HeaderMap, Method, StatusCode},
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use chrono::Utc;
use dotenvy::dotenv;
use hmac::{Hmac, Mac};
use reqwest::header::{HeaderMap as ReqwestHeaderMap, HeaderValue, CONTENT_TYPE};
use serde::{Deserialize, Serialize};
use serde_json::json;
use sha2::Sha256;
use tokio::{net::TcpListener, sync::RwLock};
use tower_http::{cors::{Any, CorsLayer}, trace::TraceLayer};
use tracing::{error, info};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

type HmacSha256 = Hmac<Sha256>;
type SessionStore = Arc<RwLock<HashMap<String, SessionRecord>>>;

#[derive(Clone)]
struct AppState {
    client: reqwest::Client,
    veriff_api_key: String,
    veriff_shared_secret: String,
    veriff_api_base_url: String,
    sessions: SessionStore,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CreateSessionRequest {
    callback: String,
    first_name: String,
    last_name: String,
    vendor_data: String,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct SessionRecord {
    session_id: String,
    vendor_data: Option<String>,
    end_user_id: Option<String>,
    status: String,
    code: Option<i64>,
    reason: Option<String>,
    reason_code: Option<String>,
    decision_time: Option<String>,
    updated_at: String,
    url: Option<String>,
}

#[derive(Debug, Deserialize)]
struct SessionStatusQuery {
    #[serde(rename = "sessionId")]
    session_id: String,
}

#[derive(Debug, Serialize)]
struct StatusResponse {
    session: Option<SessionRecord>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct CreateSessionResponse {
    session_id: String,
    url: String,
    status: String,
}

#[derive(Debug, Serialize)]
struct ErrorResponse {
    error: String,
}

#[derive(Debug, Serialize)]
struct HealthResponse {
    status: &'static str,
}

#[derive(Debug, Serialize)]
struct VeriffCreateSessionEnvelope {
    verification: VeriffCreateSessionPayload,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct VeriffCreateSessionPayload {
    callback: String,
    person: VeriffCreateSessionPerson,
    vendor_data: String,
    timestamp: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct VeriffCreateSessionPerson {
    first_name: String,
    last_name: String,
}

#[derive(Debug, Deserialize)]
struct VeriffCreateSessionApiResponse {
    verification: Option<VeriffVerificationApiResponse>,
    code: Option<String>,
    message: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct VeriffVerificationApiResponse {
    id: String,
    url: String,
    status: String,
}

#[derive(Debug, Deserialize)]
struct VeriffWebhookEnvelope {
    verification: Option<VeriffWebhookVerification>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct VeriffWebhookVerification {
    id: String,
    vendor_data: Option<String>,
    end_user_id: Option<String>,
    status: String,
    code: Option<i64>,
    reason: Option<String>,
    reason_code: Option<String>,
    decision_time: Option<String>,
}

#[tokio::main]
async fn main() {
    dotenv().ok();

    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into()))
        .with(tracing_subscriber::fmt::layer())
        .init();

    let veriff_api_key = required_env("VERIFF_API_KEY");
    let veriff_shared_secret = required_env("VERIFF_SHARED_SECRET_KEY");
    let veriff_api_base_url = env::var("VERIFF_API_BASE_URL")
        .unwrap_or_else(|_| "https://api.veriff.me".to_string())
        .trim_end_matches('/')
        .to_string();
    let port = env::var("PORT")
        .ok()
        .and_then(|value| value.parse::<u16>().ok())
        .unwrap_or(8787);

    let state = AppState {
        client: reqwest::Client::new(),
        veriff_api_key,
        veriff_shared_secret,
        veriff_api_base_url,
        sessions: Arc::new(RwLock::new(HashMap::new())),
    };

    let app = Router::new()
        .route("/healthz", get(healthcheck))
        .route("/api/veriff/sessions", post(create_veriff_session))
        .route("/api/veriff/status", get(get_veriff_status))
        .route("/api/veriff/webhook", post(handle_veriff_webhook))
        .layer(
            CorsLayer::new()
                .allow_origin(Any)
                .allow_methods([Method::GET, Method::POST])
                .allow_headers(Any),
        )
        .layer(TraceLayer::new_for_http())
        .with_state(state);

    let address = SocketAddr::from(([127, 0, 0, 1], port));
    let listener = TcpListener::bind(address)
        .await
        .expect("failed to bind veriff server listener");

    info!("veriff-server listening on http://{}", address);

    axum::serve(listener, app)
        .await
        .expect("veriff-server stopped unexpectedly");
}

async fn healthcheck() -> impl IntoResponse {
    Json(HealthResponse { status: "ok" })
}

async fn create_veriff_session(
    State(state): State<AppState>,
    Json(payload): Json<CreateSessionRequest>,
) -> impl IntoResponse {
    if !payload.callback.starts_with("https://") {
        return error_response(StatusCode::BAD_REQUEST, "callback must start with https://");
    }

    if payload.first_name.trim().is_empty() || payload.last_name.trim().is_empty() {
        return error_response(
            StatusCode::BAD_REQUEST,
            "firstName and lastName are required",
        );
    }

    let mut headers = ReqwestHeaderMap::new();
    headers.insert(
        "x-auth-client",
        HeaderValue::from_str(&state.veriff_api_key).expect("invalid veriff api key header value"),
    );
    headers.insert(CONTENT_TYPE, HeaderValue::from_static("application/json"));

    let request_body = VeriffCreateSessionEnvelope {
        verification: VeriffCreateSessionPayload {
            callback: payload.callback,
            person: VeriffCreateSessionPerson {
                first_name: payload.first_name,
                last_name: payload.last_name,
            },
            vendor_data: payload.vendor_data.clone(),
            timestamp: Utc::now().to_rfc3339(),
        },
    };

    let response = match state
        .client
        .post(format!("{}/v1/sessions", state.veriff_api_base_url))
        .headers(headers)
        .json(&request_body)
        .send()
        .await
    {
        Ok(response) => response,
        Err(error) => {
            error!("failed to reach veriff api: {error}");
            return error_response(StatusCode::BAD_GATEWAY, "failed to reach veriff api");
        }
    };

    let status = response.status();
    let body = match response.json::<VeriffCreateSessionApiResponse>().await {
        Ok(body) => body,
        Err(error) => {
            error!("failed to decode veriff response: {error}");
            return error_response(StatusCode::BAD_GATEWAY, "invalid response from veriff");
        }
    };

    if !status.is_success() {
        let message = body
            .message
            .or(body.code.map(|code| format!("veriff error code {code}")))
            .unwrap_or_else(|| "veriff rejected the session request".to_string());

        return error_response(status, &message);
    }

    let verification = match body.verification {
        Some(verification) => verification,
        None => {
            return error_response(
                StatusCode::BAD_GATEWAY,
                "veriff response did not include a verification object",
            );
        }
    };

    let record = SessionRecord {
        session_id: verification.id.clone(),
        vendor_data: Some(payload.vendor_data),
        end_user_id: None,
        status: verification.status.clone(),
        code: None,
        reason: None,
        reason_code: None,
        decision_time: None,
        updated_at: Utc::now().to_rfc3339(),
        url: Some(verification.url.clone()),
    };

    state
        .sessions
        .write()
        .await
        .insert(record.session_id.clone(), record.clone());

    (
        StatusCode::CREATED,
        Json(CreateSessionResponse {
            session_id: record.session_id,
            url: verification.url,
            status: verification.status,
        }),
    )
        .into_response()
}

async fn get_veriff_status(
    State(state): State<AppState>,
    Query(query): Query<SessionStatusQuery>,
) -> impl IntoResponse {
    let session = state.sessions.read().await.get(&query.session_id).cloned();
    Json(StatusResponse { session })
}

async fn handle_veriff_webhook(
    State(state): State<AppState>,
    headers: HeaderMap,
    body: String,
) -> impl IntoResponse {
    let auth_client = headers
        .get("x-auth-client")
        .and_then(|value| value.to_str().ok())
        .unwrap_or_default();
    let signature = headers
        .get("x-hmac-signature")
        .and_then(|value| value.to_str().ok())
        .unwrap_or_default();

    if auth_client != state.veriff_api_key {
        return error_response(StatusCode::UNAUTHORIZED, "invalid veriff client header");
    }

    let expected_signature = match create_signature(&body, &state.veriff_shared_secret) {
        Ok(signature) => signature,
        Err(error) => {
            error!("failed to create webhook signature: {error}");
            return error_response(StatusCode::INTERNAL_SERVER_ERROR, "failed to validate webhook");
        }
    };

    if normalize_signature(signature) != expected_signature {
        return error_response(StatusCode::UNAUTHORIZED, "invalid veriff signature");
    }

    let payload = match serde_json::from_str::<VeriffWebhookEnvelope>(&body) {
        Ok(payload) => payload,
        Err(error) => {
            error!("invalid webhook payload: {error}");
            return error_response(StatusCode::BAD_REQUEST, "invalid json payload");
        }
    };

    let verification = match payload.verification {
        Some(verification) => verification,
        None => return error_response(StatusCode::BAD_REQUEST, "verification object is required"),
    };

    let mut sessions = state.sessions.write().await;
    let existing_url = sessions
        .get(&verification.id)
        .and_then(|record| record.url.clone());

    sessions.insert(
        verification.id.clone(),
        SessionRecord {
            session_id: verification.id,
            vendor_data: verification.vendor_data,
            end_user_id: verification.end_user_id,
            status: verification.status,
            code: verification.code,
            reason: verification.reason,
            reason_code: verification.reason_code,
            decision_time: verification.decision_time,
            updated_at: Utc::now().to_rfc3339(),
            url: existing_url,
        },
    );

    (StatusCode::OK, Json(json!({ "received": true }))).into_response()
}

fn create_signature(payload: &str, shared_secret: &str) -> Result<String, String> {
    let mut mac = HmacSha256::new_from_slice(shared_secret.as_bytes())
        .map_err(|error| format!("invalid hmac key: {error}"))?;
    mac.update(payload.as_bytes());
    let digest = mac.finalize().into_bytes();

    Ok(digest.iter().map(|byte| format!("{byte:02x}")).collect())
}

fn normalize_signature(signature: &str) -> String {
    signature.trim().trim_start_matches("sha256=").to_lowercase()
}

fn required_env(key: &str) -> String {
    env::var(key).unwrap_or_else(|_| panic!("{key} is required"))
}

fn error_response(status: StatusCode, message: &str) -> axum::response::Response {
    (status, Json(ErrorResponse {
        error: message.to_string(),
    }))
        .into_response()
}
