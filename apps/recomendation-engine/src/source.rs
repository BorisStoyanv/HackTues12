use std::{path::PathBuf, sync::Arc};

use serde_json::from_str;
use sha2::{Digest, Sha256};
use thiserror::Error;
use tokio::fs;

use crate::{config::DataSourceConfig, models::DataSnapshot};

#[derive(Debug, Error)]
pub enum SourceError {
    #[error("failed to read source: {0}")]
    Read(String),
    #[error("failed to parse snapshot json: {0}")]
    Parse(String),
}

#[derive(Clone, Debug)]
pub struct VersionedSnapshot {
    pub version: String,
    pub snapshot: DataSnapshot,
}

#[derive(Clone)]
pub struct SnapshotSource {
    mode: Arc<DataSourceConfig>,
    client: reqwest::Client,
}

impl SnapshotSource {
    pub fn new(mode: DataSourceConfig) -> Self {
        Self {
            mode: Arc::new(mode),
            client: reqwest::Client::new(),
        }
    }

    pub async fn load(&self) -> Result<VersionedSnapshot, SourceError> {
        let raw = match self.mode.as_ref() {
            DataSourceConfig::File(path) => self.load_file(path).await?,
            DataSourceConfig::Url(url) => self.load_url(url).await?,
        };

        let version = checksum(&raw);
        let snapshot = from_str::<DataSnapshot>(&raw)
            .map_err(|error| SourceError::Parse(error.to_string()))?;

        Ok(VersionedSnapshot { version, snapshot })
    }

    async fn load_file(&self, path: &PathBuf) -> Result<String, SourceError> {
        fs::read_to_string(path)
            .await
            .map_err(|error| SourceError::Read(error.to_string()))
    }

    async fn load_url(&self, url: &str) -> Result<String, SourceError> {
        self.client
            .get(url)
            .send()
            .await
            .map_err(|error| SourceError::Read(error.to_string()))?
            .error_for_status()
            .map_err(|error| SourceError::Read(error.to_string()))?
            .text()
            .await
            .map_err(|error| SourceError::Read(error.to_string()))
    }
}

fn checksum(raw: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(raw.as_bytes());
    hex::encode(hasher.finalize())
}
