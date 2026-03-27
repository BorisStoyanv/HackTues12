use std::{collections::HashMap, env, net::SocketAddr, sync::Arc, time::Duration};

use axum::{
    Json, Router,
    extract::{Query, State},
    http::{HeaderMap, Method, StatusCode},
    response::IntoResponse,
    routing::{get, post},
};
use chrono::Utc;
use dotenvy::dotenv;
use hmac::{Hmac, Mac};
use reqwest::header::{CONTENT_TYPE, HeaderMap as ReqwestHeaderMap, HeaderValue};
use roxmltree::Document;
use serde::{Deserialize, Serialize};
use serde_json::json;
use sha2::Sha256;
use tokio::{net::TcpListener, sync::RwLock};
use tower_http::{
    cors::{Any, CorsLayer},
    trace::TraceLayer,
};
use tracing::{error, info};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

type HmacSha256 = Hmac<Sha256>;
type SessionStore = Arc<RwLock<HashMap<String, SessionRecord>>>;
type ViesCacheStore = Arc<RwLock<HashMap<String, ViesCacheEntry>>>;

const DEFAULT_VIES_API_URL: &str =
    "https://ec.europa.eu/taxation_customs/vies/services/checkVatService";
const VIES_CACHE_TTL_SECONDS: i64 = 15 * 60;

#[derive(Clone)]
struct AppState {
    client: reqwest::Client,
    veriff_api_key: String,
    veriff_shared_secret: String,
    veriff_api_base_url: String,
    vies_api_url: String,
    sessions: SessionStore,
    vies_cache: ViesCacheStore,
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

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ViesValidationQuery {
    country_code: String,
    vat_number: String,
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

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct ViesValidationResponse {
    valid: bool,
    country_code: String,
    vat_number: String,
    name: Option<String>,
    address: Option<String>,
}

#[derive(Debug, Clone)]
struct ViesCacheEntry {
    response: ViesValidationResponse,
    cached_at: chrono::DateTime<Utc>,
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
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    let veriff_api_key = required_env("VERIFF_API_KEY");
    let veriff_shared_secret = required_env("VERIFF_SHARED_SECRET_KEY");
    let veriff_api_base_url = env::var("VERIFF_API_BASE_URL")
        .unwrap_or_else(|_| "https://api.veriff.me".to_string())
        .trim_end_matches('/')
        .to_string();
    let vies_api_url = env::var("VIES_API_URL")
        .unwrap_or_else(|_| DEFAULT_VIES_API_URL.to_string())
        .trim_end_matches('/')
        .to_string();
    let port = env::var("PORT")
        .ok()
        .and_then(|value| value.parse::<u16>().ok())
        .unwrap_or(8787);

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(20))
        .user_agent("open-ft-kyc-proxy/1.0")
        .build()
        .expect("failed to build reqwest client");

    let state = AppState {
        client,
        veriff_api_key,
        veriff_shared_secret,
        veriff_api_base_url,
        vies_api_url,
        sessions: Arc::new(RwLock::new(HashMap::new())),
        vies_cache: Arc::new(RwLock::new(HashMap::new())),
    };

    let app = Router::new()
        .route("/healthz", get(healthcheck))
        .route("/api/vies/validate", get(validate_vies))
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

async fn validate_vies(
    State(state): State<AppState>,
    Query(query): Query<ViesValidationQuery>,
) -> impl IntoResponse {
    let country_code = normalize_country_code(&query.country_code);
    let vat_number = normalize_vat_number(&query.vat_number);

    if country_code.len() != 2 || !country_code.chars().all(|ch| ch.is_ascii_alphabetic()) {
        return error_response(
            StatusCode::BAD_REQUEST,
            "countryCode must be a 2-letter ISO country code",
        );
    }

    if vat_number.len() < 2 || !vat_number.chars().all(|ch| ch.is_ascii_alphanumeric()) {
        return error_response(
            StatusCode::BAD_REQUEST,
            "vatNumber must contain only letters and digits",
        );
    }

    let cache_key = format!("{country_code}:{vat_number}");
    if let Some(cached_response) = read_cached_vies_response(&state, &cache_key).await {
        return (StatusCode::OK, Json(cached_response)).into_response();
    }

    let soap_payload = build_vies_soap_envelope(&country_code, &vat_number);

    let response = match state
        .client
        .post(&state.vies_api_url)
        .header(CONTENT_TYPE, "text/xml; charset=utf-8")
        .header("Accept", "text/xml")
        .header("SOAPAction", "\"checkVat\"")
        .body(soap_payload)
        .send()
        .await
    {
        Ok(response) => response,
        Err(error) => {
            error!("failed to reach VIES: {error}");
            return error_response(StatusCode::BAD_GATEWAY, "failed to reach VIES");
        }
    };

    let status = response.status();
    let body = match response.text().await {
        Ok(body) => body,
        Err(error) => {
            error!("failed to read VIES response: {error}");
            return error_response(StatusCode::BAD_GATEWAY, "invalid response from VIES");
        }
    };

    if !status.is_success() {
        error!("VIES returned status {status}: {body}");
        return error_response(StatusCode::BAD_GATEWAY, "VIES returned an upstream error");
    }

    let parsed = match parse_vies_response(&body) {
        Ok(response) => response,
        Err(message) => {
            error!("failed to parse VIES response: {message}");
            return error_response(StatusCode::BAD_GATEWAY, &message);
        }
    };

    state.vies_cache.write().await.insert(
        cache_key,
        ViesCacheEntry {
            response: parsed.clone(),
            cached_at: Utc::now(),
        },
    );

    (StatusCode::OK, Json(parsed)).into_response()
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
            return error_response(
                StatusCode::INTERNAL_SERVER_ERROR,
                "failed to validate webhook",
            );
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
    signature
        .trim()
        .trim_start_matches("sha256=")
        .to_lowercase()
}

async fn read_cached_vies_response(
    state: &AppState,
    cache_key: &str,
) -> Option<ViesValidationResponse> {
    let cache = state.vies_cache.read().await;
    let entry = cache.get(cache_key)?;
    let age_seconds = Utc::now()
        .signed_duration_since(entry.cached_at)
        .num_seconds();

    if age_seconds >= VIES_CACHE_TTL_SECONDS {
        return None;
    }

    Some(entry.response.clone())
}

fn build_vies_soap_envelope(country_code: &str, vat_number: &str) -> String {
    format!(
        concat!(
            r#"<?xml version="1.0" encoding="UTF-8"?>"#,
            r#"<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" "#,
            r#"xmlns:urn="urn:ec.europa.eu:taxud:vies:services:checkVat:types">"#,
            r#"<soapenv:Header/>"#,
            r#"<soapenv:Body>"#,
            r#"<urn:checkVat>"#,
            r#"<urn:countryCode>{country_code}</urn:countryCode>"#,
            r#"<urn:vatNumber>{vat_number}</urn:vatNumber>"#,
            r#"</urn:checkVat>"#,
            r#"</soapenv:Body>"#,
            r#"</soapenv:Envelope>"#
        ),
        country_code = country_code,
        vat_number = vat_number,
    )
}

fn parse_vies_response(xml: &str) -> Result<ViesValidationResponse, String> {
    let document =
        Document::parse(xml).map_err(|error| format!("invalid XML from VIES: {error}"))?;

    if let Some(fault) = find_node_text(&document, "faultstring") {
        return Err(format!("VIES fault: {fault}"));
    }

    let country_code = find_node_text(&document, "countryCode")
        .ok_or_else(|| "VIES response did not include countryCode".to_string())?;
    let vat_number = find_node_text(&document, "vatNumber")
        .ok_or_else(|| "VIES response did not include vatNumber".to_string())?;
    let valid = find_node_text(&document, "valid")
        .ok_or_else(|| "VIES response did not include valid".to_string())?;

    Ok(ViesValidationResponse {
        valid: valid.eq_ignore_ascii_case("true"),
        country_code,
        vat_number,
        name: normalize_vies_field(find_node_text(&document, "name")),
        address: normalize_vies_field(find_node_text(&document, "address")),
    })
}

fn find_node_text(document: &Document<'_>, tag_name: &str) -> Option<String> {
    document
        .descendants()
        .find(|node| node.is_element() && node.tag_name().name() == tag_name)
        .and_then(|node| node.text())
        .map(|text| text.trim().to_string())
        .filter(|text| !text.is_empty())
}

fn normalize_country_code(value: &str) -> String {
    value
        .trim()
        .chars()
        .filter(|ch| ch.is_ascii_alphabetic())
        .flat_map(|ch| ch.to_uppercase())
        .collect()
}

fn normalize_vat_number(value: &str) -> String {
    value
        .trim()
        .chars()
        .filter(|ch| ch.is_ascii_alphanumeric())
        .flat_map(|ch| ch.to_uppercase())
        .collect()
}

fn normalize_vies_field(value: Option<String>) -> Option<String> {
    let value = value?;
    let normalized = value.trim();

    if normalized.is_empty() || normalized == "---" {
        return None;
    }

    Some(normalized.split_whitespace().collect::<Vec<_>>().join(" "))
}

fn required_env(key: &str) -> String {
    env::var(key).unwrap_or_else(|_| panic!("{key} is required"))
}

fn error_response(status: StatusCode, message: &str) -> axum::response::Response {
    (
        status,
        Json(ErrorResponse {
            error: message.to_string(),
        }),
    )
        .into_response()
}
