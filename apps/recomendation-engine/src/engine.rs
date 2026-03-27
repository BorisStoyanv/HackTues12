use std::collections::{BTreeMap, HashMap, HashSet};

use chrono::{DateTime, Duration, Utc};

use crate::models::{
    DataSnapshot, FeedQuery, FeedResponse, FundingBehavior, ProposalRecord, ProposalSummary,
    RecommendationEngineView, RecommendationItem, SimilarProposalResponse, SimilarQuery,
    SimilarUser, UserProfileResponse,
};

#[derive(Clone, Debug)]
struct DerivedUserProfile {
    user_id: String,
    display_name: String,
    home_region: String,
    country: String,
    reputation: f32,
    risk_preference: f32,
    risk_tolerance: String,
    category_affinity: BTreeMap<String, f32>,
    region_affinity: BTreeMap<String, f32>,
    funding_behavior: FundingBehavior,
    almost_voted_for: Vec<String>,
    similar_users: Vec<SimilarUser>,
}

#[derive(Clone, Debug)]
pub struct RecommendationEngine {
    view: RecommendationEngineView,
    snapshot: DataSnapshot,
    user_profiles: HashMap<String, DerivedUserProfile>,
    similar_proposals: HashMap<String, Vec<RecommendationItem>>,
}

impl RecommendationEngine {
    pub fn empty() -> Self {
        Self {
            view: RecommendationEngineView {
                data_version: "empty".to_string(),
                trained_at: Utc::now(),
            },
            snapshot: DataSnapshot {
                users: vec![],
                proposals: vec![],
                votes: vec![],
                fundings: vec![],
                impressions: vec![],
                follows: vec![],
            },
            user_profiles: HashMap::new(),
            similar_proposals: HashMap::new(),
        }
    }

    pub fn train(snapshot: DataSnapshot, data_version: String) -> Self {
        let proposal_map = snapshot
            .proposals
            .iter()
            .cloned()
            .map(|proposal| (proposal.proposal_id.clone(), proposal))
            .collect::<HashMap<_, _>>();

        let mut user_profiles = snapshot
            .users
            .iter()
            .map(|user| {
                let category_scores =
                    aggregate_category_scores(&snapshot, &proposal_map, &user.user_id);
                let region_scores =
                    aggregate_region_scores(&snapshot, &proposal_map, &user.user_id);
                let risk_preference =
                    derive_risk_preference(&snapshot, &proposal_map, &user.user_id).unwrap_or(0.5);
                let funding_behavior = derive_funding_behavior(
                    &snapshot,
                    &proposal_map,
                    &user.user_id,
                    &user.home_region,
                );
                let almost_voted_for = derive_almost_voted_for(&snapshot, &user.user_id);

                (
                    user.user_id.clone(),
                    DerivedUserProfile {
                        user_id: user.user_id.clone(),
                        display_name: user.display_name.clone(),
                        home_region: user.home_region.clone(),
                        country: user.country.clone(),
                        reputation: user.reputation,
                        risk_preference,
                        risk_tolerance: classify_risk_tolerance(risk_preference),
                        category_affinity: normalize_scores(category_scores),
                        region_affinity: normalize_scores(region_scores),
                        funding_behavior,
                        almost_voted_for,
                        similar_users: vec![],
                    },
                )
            })
            .collect::<HashMap<_, _>>();

        let user_vectors = user_profiles
            .iter()
            .map(|(user_id, profile)| {
                let mut vector = HashMap::new();
                for (key, value) in &profile.category_affinity {
                    vector.insert(format!("cat:{key}"), *value);
                }
                for (key, value) in &profile.region_affinity {
                    vector.insert(format!("region:{key}"), *value);
                }
                vector.insert("risk".to_string(), profile.risk_preference);
                (user_id.clone(), vector)
            })
            .collect::<HashMap<_, _>>();

        for (user_id, profile) in &mut user_profiles {
            let Some(base_vector) = user_vectors.get(user_id) else {
                continue;
            };

            let mut similar = user_vectors
                .iter()
                .filter(|(other_id, _)| *other_id != user_id)
                .map(|(other_id, other_vector)| SimilarUser {
                    user_id: other_id.clone(),
                    score: cosine_similarity(base_vector, other_vector),
                })
                .filter(|item| item.score > 0.05)
                .collect::<Vec<_>>();

            similar.sort_by(|left, right| right.score.total_cmp(&left.score));
            similar.truncate(5);
            profile.similar_users = similar;
        }

        let similar_proposals = build_similar_proposals(&snapshot);

        Self {
            view: RecommendationEngineView {
                data_version,
                trained_at: Utc::now(),
            },
            snapshot,
            user_profiles,
            similar_proposals,
        }
    }

    pub fn view(&self) -> RecommendationEngineView {
        self.view.clone()
    }

    pub fn health_counts(&self) -> (usize, usize) {
        (self.snapshot.users.len(), self.snapshot.proposals.len())
    }

    pub fn user_profile(&self, user_id: &str) -> Option<UserProfileResponse> {
        self.user_profiles
            .get(user_id)
            .map(|profile| UserProfileResponse {
                user_id: profile.user_id.clone(),
                display_name: profile.display_name.clone(),
                home_region: profile.home_region.clone(),
                country: profile.country.clone(),
                reputation: profile.reputation,
                risk_tolerance: profile.risk_tolerance.clone(),
                top_categories: top_keys(&profile.category_affinity, 3),
                category_affinity: profile.category_affinity.clone(),
                funding_behavior: profile.funding_behavior.clone(),
                almost_voted_for: profile.almost_voted_for.clone(),
                similar_users: profile.similar_users.clone(),
            })
    }

    pub fn feed(&self, user_id: &str, query: FeedQuery) -> Option<FeedResponse> {
        let profile = self.user_profiles.get(user_id)?;
        let already_seen = self
            .snapshot
            .votes
            .iter()
            .filter(|vote| vote.user_id == user_id)
            .map(|vote| vote.proposal_id.as_str())
            .chain(
                self.snapshot
                    .fundings
                    .iter()
                    .filter(|funding| funding.user_id == user_id)
                    .map(|funding| funding.proposal_id.as_str()),
            )
            .collect::<HashSet<_>>();

        let mut items = self
            .snapshot
            .proposals
            .iter()
            .filter(|proposal| !already_seen.contains(proposal.proposal_id.as_str()))
            .filter(|proposal| proposal.status != "Rejected")
            .map(|proposal| {
                let (score, reasons) = self.score_candidate(profile, proposal, &query);
                RecommendationItem {
                    proposal_id: proposal.proposal_id.clone(),
                    score,
                    reasons,
                    proposal: to_summary(proposal),
                }
            })
            .filter(|item| item.score > 0.01)
            .collect::<Vec<_>>();

        items.sort_by(|left, right| right.score.total_cmp(&left.score));
        items.truncate(query.limit.max(1));

        Some(FeedResponse {
            user_id: user_id.to_string(),
            generated_at: Utc::now(),
            mode: query.mode,
            scope: query.scope,
            items,
        })
    }

    pub fn similar(
        &self,
        proposal_id: &str,
        query: SimilarQuery,
    ) -> Option<SimilarProposalResponse> {
        let mut selected = self.similar_proposals.get(proposal_id)?.clone();

        if let Some(user_id) = query.user_id.as_deref() {
            if let Some(profile) = self.user_profiles.get(user_id) {
                for item in &mut selected {
                    if item.proposal.region_tag == profile.home_region {
                        item.score += 0.08;
                        item.reasons.push("Local to your region".to_string());
                    }
                }
                selected.sort_by(|left, right| right.score.total_cmp(&left.score));
            }
        }

        selected.truncate(query.limit.max(1));
        Some(SimilarProposalResponse {
            proposal_id: proposal_id.to_string(),
            items: selected,
        })
    }

    fn score_candidate(
        &self,
        profile: &DerivedUserProfile,
        proposal: &ProposalRecord,
        query: &FeedQuery,
    ) -> (f32, Vec<String>) {
        let mut score = 0.0;
        let mut reasons = vec![];

        let category_score = profile
            .category_affinity
            .get(&proposal.category)
            .copied()
            .unwrap_or(0.0);
        if category_score > 0.0 {
            score += category_score * 0.33;
            reasons.push(format!(
                "Matches your preferred category: {}",
                proposal.category
            ));
        }

        let region_score = profile
            .region_affinity
            .get(&proposal.region_tag)
            .copied()
            .unwrap_or(0.0);
        if region_score > 0.0 {
            score += region_score * 0.22;
            reasons.push(format!("Relevant to your region: {}", proposal.region_tag));
        } else if query.scope.eq_ignore_ascii_case("global") {
            score += 0.06;
        }

        if proposal.country == profile.country {
            score += 0.08;
            reasons.push(format!("In your country: {}", proposal.country));
        }

        let risk_match = 1.0 - (profile.risk_preference - proposal.risk_score).abs();
        if risk_match > 0.4 {
            score += risk_match * 0.12;
            reasons.push("Fits your risk tolerance".to_string());
        }

        let trend = self.trending_score(&proposal.proposal_id);
        if trend > 0.0 {
            score += trend * 0.18;
            if trend > 0.4 {
                reasons.push("Trending now".to_string());
            }
        }

        score += proposal.quality_score * 0.12;
        if proposal.quality_score > 0.8 {
            reasons.push("Strong long-term quality signal".to_string());
        }

        let similar_user_support = self.similar_user_support(profile, &proposal.proposal_id);
        if similar_user_support.count > 0 {
            score += similar_user_support.score;
            reasons.push(format!(
                "{} similar users to you funded this in the last 2 hours",
                similar_user_support.count
            ));
        }

        if let Some(display_name) = self.follow_signal(profile, &proposal.proposal_id) {
            score += 0.12;
            reasons.push(format!("You follow {display_name} and they backed this"));
        }

        if profile.almost_voted_for.contains(&proposal.proposal_id) {
            score += 0.24;
            reasons.push("You almost voted for this earlier".to_string());
        }

        if reasons.is_empty() {
            reasons.push("General discovery candidate".to_string());
        }

        (score, reasons)
    }

    fn trending_score(&self, proposal_id: &str) -> f32 {
        let now = Utc::now();
        let recent_vote_score = self
            .snapshot
            .votes
            .iter()
            .filter(|vote| vote.proposal_id == proposal_id)
            .map(|vote| {
                activity_decay(now, vote.timestamp) * if vote.in_favor { vote.weight } else { 0.0 }
            })
            .sum::<f32>();

        let recent_funding_score = self
            .snapshot
            .fundings
            .iter()
            .filter(|funding| funding.proposal_id == proposal_id)
            .map(|funding| {
                activity_decay(now, funding.timestamp) * (funding.amount / 1000.0).min(2.0)
            })
            .sum::<f32>();

        (recent_vote_score + recent_funding_score).min(1.0)
    }

    fn similar_user_support(
        &self,
        profile: &DerivedUserProfile,
        proposal_id: &str,
    ) -> SupportSignal {
        let recent_cutoff = Utc::now() - Duration::hours(2);
        let similar_ids = profile
            .similar_users
            .iter()
            .filter(|user| user.score >= 0.15)
            .map(|user| user.user_id.as_str())
            .collect::<HashSet<_>>();

        let votes = self
            .snapshot
            .votes
            .iter()
            .filter(|vote| vote.proposal_id == proposal_id)
            .filter(|vote| similar_ids.contains(vote.user_id.as_str()))
            .filter(|vote| vote.in_favor && vote.timestamp >= recent_cutoff)
            .count();

        let fundings = self
            .snapshot
            .fundings
            .iter()
            .filter(|funding| funding.proposal_id == proposal_id)
            .filter(|funding| similar_ids.contains(funding.user_id.as_str()))
            .filter(|funding| funding.timestamp >= recent_cutoff)
            .count();

        let count = votes + fundings;
        SupportSignal {
            count,
            score: (count as f32 * 0.18).min(0.45),
        }
    }

    fn follow_signal(&self, profile: &DerivedUserProfile, proposal_id: &str) -> Option<String> {
        let followed = self
            .snapshot
            .follows
            .iter()
            .filter(|edge| edge.follower_id == profile.user_id)
            .map(|edge| edge.target_id.as_str())
            .collect::<HashSet<_>>();

        let supporter = self
            .snapshot
            .fundings
            .iter()
            .find(|funding| {
                funding.proposal_id == proposal_id && followed.contains(funding.user_id.as_str())
            })
            .map(|funding| funding.user_id.as_str())
            .or_else(|| {
                self.snapshot
                    .votes
                    .iter()
                    .find(|vote| {
                        vote.proposal_id == proposal_id
                            && vote.in_favor
                            && followed.contains(vote.user_id.as_str())
                    })
                    .map(|vote| vote.user_id.as_str())
            })?;

        self.snapshot
            .users
            .iter()
            .find(|user| user.user_id == supporter)
            .map(|user| user.display_name.clone())
    }
}

#[derive(Clone, Copy)]
struct SupportSignal {
    count: usize,
    score: f32,
}

fn aggregate_category_scores(
    snapshot: &DataSnapshot,
    proposal_map: &HashMap<String, ProposalRecord>,
    user_id: &str,
) -> HashMap<String, f32> {
    let mut scores = HashMap::new();

    for vote in &snapshot.votes {
        if vote.user_id != user_id {
            continue;
        }
        if let Some(proposal) = proposal_map.get(&vote.proposal_id) {
            let weight = if vote.in_favor {
                vote.weight.max(0.5)
            } else {
                -0.6
            };
            *scores.entry(proposal.category.clone()).or_insert(0.0) += weight;
        }
    }

    for funding in &snapshot.fundings {
        if funding.user_id != user_id {
            continue;
        }
        if let Some(proposal) = proposal_map.get(&funding.proposal_id) {
            *scores.entry(proposal.category.clone()).or_insert(0.0) +=
                (funding.amount / 1000.0).max(0.8);
        }
    }

    for impression in &snapshot.impressions {
        if impression.user_id != user_id {
            continue;
        }
        if let Some(proposal) = proposal_map.get(&impression.proposal_id) {
            *scores.entry(proposal.category.clone()).or_insert(0.0) +=
                ((impression.dwell_seconds as f32 / 90.0) + impression.intent_score).min(1.4) * 0.5;
        }
    }

    scores
}

fn aggregate_region_scores(
    snapshot: &DataSnapshot,
    proposal_map: &HashMap<String, ProposalRecord>,
    user_id: &str,
) -> HashMap<String, f32> {
    let mut scores = HashMap::new();

    for vote in &snapshot.votes {
        if vote.user_id != user_id || !vote.in_favor {
            continue;
        }
        if let Some(proposal) = proposal_map.get(&vote.proposal_id) {
            *scores.entry(proposal.region_tag.clone()).or_insert(0.0) += 1.0;
        }
    }

    for funding in &snapshot.fundings {
        if funding.user_id != user_id {
            continue;
        }
        if let Some(proposal) = proposal_map.get(&funding.proposal_id) {
            *scores.entry(proposal.region_tag.clone()).or_insert(0.0) +=
                (funding.amount / 1000.0).max(0.5);
        }
    }

    scores
}

fn derive_risk_preference(
    snapshot: &DataSnapshot,
    proposal_map: &HashMap<String, ProposalRecord>,
    user_id: &str,
) -> Option<f32> {
    let mut weighted_sum = 0.0;
    let mut total_weight = 0.0;

    for vote in &snapshot.votes {
        if vote.user_id != user_id || !vote.in_favor {
            continue;
        }
        if let Some(proposal) = proposal_map.get(&vote.proposal_id) {
            weighted_sum += proposal.risk_score * vote.weight.max(0.5);
            total_weight += vote.weight.max(0.5);
        }
    }

    for funding in &snapshot.fundings {
        if funding.user_id != user_id {
            continue;
        }
        if let Some(proposal) = proposal_map.get(&funding.proposal_id) {
            let weight = (funding.amount / 1000.0).max(0.5);
            weighted_sum += proposal.risk_score * weight;
            total_weight += weight;
        }
    }

    if total_weight > 0.0 {
        Some(weighted_sum / total_weight)
    } else {
        None
    }
}

fn derive_funding_behavior(
    snapshot: &DataSnapshot,
    proposal_map: &HashMap<String, ProposalRecord>,
    user_id: &str,
    home_region: &str,
) -> FundingBehavior {
    let user_fundings = snapshot
        .fundings
        .iter()
        .filter(|funding| funding.user_id == user_id)
        .collect::<Vec<_>>();

    if user_fundings.is_empty() {
        return FundingBehavior {
            backs_early: false,
            average_supported_budget: 0.0,
            local_bias: 0.0,
        };
    }

    let mut early = 0usize;
    let mut local = 0usize;
    let mut avg_budget = 0.0;

    for funding in &user_fundings {
        if let Some(proposal) = proposal_map.get(&funding.proposal_id) {
            avg_budget += proposal.funding_goal;
            if proposal.region_tag == home_region {
                local += 1;
            }
            if funding.timestamp - proposal.created_at <= Duration::hours(48) {
                early += 1;
            }
        }
    }

    FundingBehavior {
        backs_early: early * 2 >= user_fundings.len(),
        average_supported_budget: avg_budget / user_fundings.len() as f32,
        local_bias: local as f32 / user_fundings.len() as f32,
    }
}

fn derive_almost_voted_for(snapshot: &DataSnapshot, user_id: &str) -> Vec<String> {
    let voted_or_funded = snapshot
        .votes
        .iter()
        .filter(|vote| vote.user_id == user_id)
        .map(|vote| vote.proposal_id.as_str())
        .chain(
            snapshot
                .fundings
                .iter()
                .filter(|funding| funding.user_id == user_id)
                .map(|funding| funding.proposal_id.as_str()),
        )
        .collect::<HashSet<_>>();

    snapshot
        .impressions
        .iter()
        .filter(|impression| impression.user_id == user_id)
        .filter(|impression| impression.intent_score >= 0.7 || impression.dwell_seconds >= 40)
        .filter(|impression| !voted_or_funded.contains(impression.proposal_id.as_str()))
        .map(|impression| impression.proposal_id.clone())
        .collect::<Vec<_>>()
}

fn normalize_scores(mut scores: HashMap<String, f32>) -> BTreeMap<String, f32> {
    let max = scores
        .values()
        .copied()
        .fold(0.0_f32, |current, value| current.max(value));

    if max > 0.0 {
        for value in scores.values_mut() {
            *value = (*value / max).max(0.0);
        }
    }

    scores.into_iter().collect()
}

fn classify_risk_tolerance(score: f32) -> String {
    if score < 0.35 {
        "safe".to_string()
    } else if score < 0.65 {
        "balanced".to_string()
    } else {
        "experimental".to_string()
    }
}

fn build_similar_proposals(snapshot: &DataSnapshot) -> HashMap<String, Vec<RecommendationItem>> {
    let mut output = HashMap::new();

    for proposal in &snapshot.proposals {
        let mut similar = snapshot
            .proposals
            .iter()
            .filter(|candidate| candidate.proposal_id != proposal.proposal_id)
            .map(|candidate| {
                let (score, reasons) = proposal_similarity(proposal, candidate);
                RecommendationItem {
                    proposal_id: candidate.proposal_id.clone(),
                    score,
                    reasons,
                    proposal: to_summary(candidate),
                }
            })
            .filter(|item| item.score > 0.2)
            .collect::<Vec<_>>();

        similar.sort_by(|left, right| right.score.total_cmp(&left.score));
        similar.truncate(8);
        output.insert(proposal.proposal_id.clone(), similar);
    }

    output
}

fn proposal_similarity(base: &ProposalRecord, candidate: &ProposalRecord) -> (f32, Vec<String>) {
    let mut score = 0.0;
    let mut reasons = vec![];

    if base.category == candidate.category {
        score += 0.35;
        reasons.push("Same category".to_string());
    }

    if base.region_tag == candidate.region_tag {
        score += 0.24;
        reasons.push("Same region".to_string());
    } else if base.country == candidate.country {
        score += 0.12;
        reasons.push("Same country".to_string());
    }

    let tag_overlap = tag_overlap_score(&base.tags, &candidate.tags);
    if tag_overlap > 0.0 {
        score += tag_overlap * 0.18;
        reasons.push("Overlapping tags".to_string());
    }

    let budget_similarity = ratio_similarity(base.funding_goal, candidate.funding_goal);
    score += budget_similarity * 0.11;
    if budget_similarity > 0.75 {
        reasons.push("Similar budget profile".to_string());
    }

    let risk_similarity = 1.0 - (base.risk_score - candidate.risk_score).abs();
    score += risk_similarity.max(0.0) * 0.12;

    (score, reasons)
}

fn tag_overlap_score(left: &[String], right: &[String]) -> f32 {
    if left.is_empty() || right.is_empty() {
        return 0.0;
    }

    let left_set = left
        .iter()
        .map(|value| value.to_lowercase())
        .collect::<HashSet<_>>();
    let right_set = right
        .iter()
        .map(|value| value.to_lowercase())
        .collect::<HashSet<_>>();
    let overlap = left_set.intersection(&right_set).count();
    overlap as f32 / left_set.len().max(right_set.len()) as f32
}

fn ratio_similarity(left: f32, right: f32) -> f32 {
    if left <= 0.0 || right <= 0.0 {
        return 0.0;
    }

    let min = left.min(right);
    let max = left.max(right);
    min / max
}

fn top_keys(scores: &BTreeMap<String, f32>, limit: usize) -> Vec<String> {
    let mut pairs = scores
        .iter()
        .map(|(key, value)| (key.clone(), *value))
        .collect::<Vec<_>>();
    pairs.sort_by(|left, right| right.1.total_cmp(&left.1));
    pairs.into_iter().take(limit).map(|(key, _)| key).collect()
}

fn to_summary(proposal: &ProposalRecord) -> ProposalSummary {
    ProposalSummary {
        proposal_id: proposal.proposal_id.clone(),
        title: proposal.title.clone(),
        category: proposal.category.clone(),
        region_tag: proposal.region_tag.clone(),
        country: proposal.country.clone(),
        funding_goal: proposal.funding_goal,
        funded_amount: proposal.funded_amount,
        status: proposal.status.clone(),
    }
}

fn cosine_similarity(left: &HashMap<String, f32>, right: &HashMap<String, f32>) -> f32 {
    let dot = left
        .iter()
        .filter_map(|(key, left_value)| right.get(key).map(|right_value| left_value * right_value))
        .sum::<f32>();
    let left_norm = left.values().map(|value| value * value).sum::<f32>().sqrt();
    let right_norm = right
        .values()
        .map(|value| value * value)
        .sum::<f32>()
        .sqrt();

    if left_norm == 0.0 || right_norm == 0.0 {
        0.0
    } else {
        (dot / (left_norm * right_norm)).max(0.0)
    }
}

fn activity_decay(now: DateTime<Utc>, timestamp: DateTime<Utc>) -> f32 {
    let age = now - timestamp;
    if age <= Duration::hours(2) {
        1.0
    } else if age <= Duration::hours(24) {
        0.6
    } else if age <= Duration::days(7) {
        0.3
    } else {
        0.05
    }
}

#[cfg(test)]
mod tests {
    use serde_json::from_str;

    use super::RecommendationEngine;
    use crate::models::{DataSnapshot, FeedQuery};

    #[test]
    fn trains_and_returns_feed() {
        let raw = include_str!("../data/bootstrap.json");
        let snapshot: DataSnapshot = from_str(raw).expect("bootstrap data should parse");
        let engine = RecommendationEngine::train(snapshot, "test-version".to_string());

        let feed = engine
            .feed(
                "rkyz5-gnyu5-nx5bb-j3uiy-h6azc-m6oyh-5vi5v-rnvsh-lexq6-pzno4-cqe",
                FeedQuery {
                    limit: 5,
                    scope: "local".to_string(),
                    mode: "blended".to_string(),
                },
            )
            .expect("feed should exist");

        assert!(!feed.items.is_empty());
        assert!(feed.items.iter().any(|item| item.proposal_id == "3"));
    }
}
