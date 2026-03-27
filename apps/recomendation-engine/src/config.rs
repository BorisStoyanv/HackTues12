use std::{env, path::PathBuf};

#[derive(Clone, Debug)]
pub enum DataSourceConfig {
    File(PathBuf),
    Url(String),
}

#[derive(Clone, Debug)]
pub struct AppConfig {
    pub bind_addr: String,
    pub poll_interval_secs: u64,
    pub data_source: DataSourceConfig,
}

impl AppConfig {
    pub fn from_env() -> Self {
        let bind_addr =
            env::var("RECOMMENDER_BIND_ADDR").unwrap_or_else(|_| "127.0.0.1:8090".to_string());
        let poll_interval_secs = env::var("RECOMMENDER_POLL_INTERVAL_SECS")
            .ok()
            .and_then(|value| value.parse().ok())
            .unwrap_or(15);

        let data_source = match env::var("RECOMMENDER_SOURCE_URL") {
            Ok(url) if !url.trim().is_empty() => DataSourceConfig::Url(url),
            _ => DataSourceConfig::File(PathBuf::from(
                env::var("RECOMMENDER_DATA_PATH")
                    .unwrap_or_else(|_| "data/bootstrap.json".to_string()),
            )),
        };

        Self {
            bind_addr,
            poll_interval_secs,
            data_source,
        }
    }
}
