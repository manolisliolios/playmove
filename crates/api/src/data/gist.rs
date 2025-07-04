use std::collections::HashMap;

use anyhow::{bail, Result};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use tracing::debug;

use crate::data::Code;

#[derive(Serialize, Deserialize, Debug)]
pub struct GistUrl {
    pub id: String,
    pub url: String,
}

pub async fn publish_gist(code: &Code) -> Result<GistUrl> {
    let Some(token) = std::env::var("GITHUB_TOKEN").ok() else {
        bail!("Sharing is not enabled on this instance.");
    };

    let client = Client::new();

    let mut formatted_sources: HashMap<String, Value> = code
        .sources
        .iter()
        .map(|(name, source)| ((name.to_string() + ".move"), json!({ "content": source })))
        .collect();

    // Add tests to the formatted sources
    code.tests.iter().for_each(|(name, source)| {
        formatted_sources.insert(name.to_string() + ".move", json!({ "content": source }));
    });

    let body = json!({
        "description": "A gist created by playmove.dev -- the Move Browser Playground!",
        "public": false,
        "files": formatted_sources
    });

    let response = client
        .post("https://api.github.com/gists")
        .bearer_auth(token)
        .header("User-Agent", "playmove-api")
        .header("Accept", "application/vnd.github+json")
        .json(&body)
        .send()
        .await?;

    if let Some(remaining) = response.headers().get("X-RateLimit-Remaining") {
        debug!(
            "API requests remaining for gist creation: {}",
            remaining.to_str().unwrap_or_default()
        );
    }

    if let Some(reset) = response.headers().get("X-RateLimit-Reset") {
        debug!(
            "Rate limit resets at (UTC timestamp): {:?}",
            reset.to_str().unwrap_or_default()
        );
    }

    if response.status().is_success() {
        let json_response: serde_json::Value = response.json().await?;

        Ok(GistUrl {
            id: json_response["id"].as_str().unwrap_or_default().to_string(),
            url: json_response["html_url"]
                .as_str()
                .unwrap_or_default()
                .to_string(),
        })
    } else {
        debug!("ERROR: Failed to create gist: {}", response.text().await?);
        bail!("Failed to create gist. Try again later.")
    }
}
