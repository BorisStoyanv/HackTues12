use std::collections::BTreeMap;

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct DataSnapshot {
    pub users: Vec<UserRecord>,
    pub proposals: Vec<ProposalRecord>,
    #[serde(default)]
    pub votes: Vec<VoteRecord>,
    #[serde(default)]
    pub fundings: Vec<FundingRecord>,
    #[serde(default)]
    pub impressions: Vec<ImpressionRecord>,
    #[serde(default)]
    pub follows: Vec<FollowRecord>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct UserRecord {
    pub user_id: String,
    pub display_name: String,
    pub home_region: String,
    pub country: String,
    #[serde(default)]
    pub reputation: f32,
    #[serde(default)]
    pub verified: bool,
    #[serde(default)]
    pub investor: bool,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ProposalRecord {
    pub proposal_id: String,
    pub title: String,
    pub category: String,
    pub region_tag: String,
    pub country: String,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(default)]
    pub risk_score: f32,
    #[serde(default)]
    pub funding_goal: f32,
    #[serde(default)]
    pub funded_amount: f32,
    #[serde(default)]
    pub quality_score: f32,
    pub status: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct VoteRecord {
    pub user_id: String,
    pub proposal_id: String,
    pub in_favor: bool,
    pub weight: f32,
    pub timestamp: DateTime<Utc>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct FundingRecord {
    pub user_id: String,
    pub proposal_id: String,
    pub amount: f32,
    pub timestamp: DateTime<Utc>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ImpressionRecord {
    pub user_id: String,
    pub proposal_id: String,
    #[serde(default)]
    pub dwell_seconds: u32,
    #[serde(default)]
    pub intent_score: f32,
    pub timestamp: DateTime<Utc>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct FollowRecord {
    pub follower_id: String,
    pub target_id: String,
    pub timestamp: DateTime<Utc>,
}

#[derive(Clone, Debug, Serialize)]
pub struct HealthResponse {
    pub status: &'static str,
    pub data_version: String,
    pub trained_at: DateTime<Utc>,
    pub users: usize,
    pub proposals: usize,
}

#[derive(Clone, Debug, Serialize)]
pub struct RecommendationEngineView {
    pub data_version: String,
    pub trained_at: DateTime<Utc>,
}

#[derive(Clone, Debug, Serialize)]
pub struct FundingBehavior {
    pub backs_early: bool,
    pub average_supported_budget: f32,
    pub local_bias: f32,
}

#[derive(Clone, Debug, Serialize)]
pub struct SimilarUser {
    pub user_id: String,
    pub score: f32,
}

#[derive(Clone, Debug, Serialize)]
pub struct UserProfileResponse {
    pub user_id: String,
    pub display_name: String,
    pub home_region: String,
    pub country: String,
    pub reputation: f32,
    pub risk_tolerance: String,
    pub top_categories: Vec<String>,
    pub category_affinity: BTreeMap<String, f32>,
    pub funding_behavior: FundingBehavior,
    pub almost_voted_for: Vec<String>,
    pub similar_users: Vec<SimilarUser>,
}

#[derive(Clone, Debug, Serialize)]
pub struct ProposalSummary {
    pub proposal_id: String,
    pub title: String,
    pub category: String,
    pub region_tag: String,
    pub country: String,
    pub funding_goal: f32,
    pub funded_amount: f32,
    pub status: String,
}

#[derive(Clone, Debug, Serialize)]
pub struct RecommendationItem {
    pub proposal_id: String,
    pub score: f32,
    pub reasons: Vec<String>,
    pub proposal: ProposalSummary,
}

#[derive(Clone, Debug, Serialize)]
pub struct FeedResponse {
    pub user_id: String,
    pub generated_at: DateTime<Utc>,
    pub mode: String,
    pub scope: String,
    pub items: Vec<RecommendationItem>,
}

#[derive(Clone, Debug, Serialize)]
pub struct SimilarProposalResponse {
    pub proposal_id: String,
    pub items: Vec<RecommendationItem>,
}

#[derive(Clone, Debug, Deserialize)]
pub struct FeedQuery {
    #[serde(default = "default_limit")]
    pub limit: usize,
    #[serde(default = "default_scope")]
    pub scope: String,
    #[serde(default = "default_mode")]
    pub mode: String,
}

#[derive(Clone, Debug, Deserialize)]
pub struct SimilarQuery {
    #[serde(default)]
    pub user_id: Option<String>,
    #[serde(default = "default_similar_limit")]
    pub limit: usize,
}

fn default_limit() -> usize {
    10
}

fn default_scope() -> String {
    "blended".to_string()
}

fn default_mode() -> String {
    "blended".to_string()
}

fn default_similar_limit() -> usize {
    6
}
