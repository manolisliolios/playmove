pub mod code;
pub mod gist;
mod sandboxed;

use anyhow::{bail, Result};
use serde::{Deserialize, Serialize};
use std::{collections::HashMap, process::Command};
use tracing::debug;

use crate::data::code::Code;

#[derive(Serialize, Deserialize, PartialEq, Eq)]
pub enum Network {
    Mainnet,
    Testnet,
}

impl Network {
    pub fn binary_name(&self) -> String {
        match self {
            Network::Mainnet => std::env::var("SUI_MAINNET_BINARY").unwrap_or("sui".to_string()),
            Network::Testnet => std::env::var("SUI_TESTNET_BINARY").unwrap_or("sui".to_string()),
        }
    }
}

pub fn verify_sui_installed() -> anyhow::Result<()> {
    let mainnet_output = Command::new(Network::Mainnet.binary_name())
        .arg("--version")
        .output()?;

    let testnet_output = Command::new(Network::Testnet.binary_name())
        .arg("--version")
        .output()?;

    if mainnet_output.status.success() && testnet_output.status.success() {
        Ok(())
    } else if mainnet_output.status.success() {
        Err(anyhow::anyhow!("sui testnet CLI not installed"))
    } else if testnet_output.status.success() {
        Err(anyhow::anyhow!("sui mainnet CLI not installed"))
    } else {
        Err(anyhow::anyhow!("sui CLI not installed on any network."))
    }
}

pub fn verify_git_installed() -> anyhow::Result<()> {
    let output = Command::new("git").arg("--version").output()?;

    if output.status.success() {
        Ok(())
    } else {
        bail!("git CLI not installed");
    }
}

pub fn verify_prettier_move_installed() -> anyhow::Result<()> {
    let output = Command::new("prettier-move").arg("--version").output()?;

    if output.status.success() {
        Ok(())
    } else {
        bail!("prettier CLI not installed");
    }
}

pub fn verify_github_token_set() -> anyhow::Result<()> {
    let token = std::env::var("GITHUB_TOKEN");
    if token.is_err() {
        bail!("GITHUB_TOKEN environment variable not set");
    }
    Ok(())
}

pub async fn test_and_cache_sui_git_deps() -> Result<()> {
    debug!("Running a move build when initializing the crate, in order to cache the git deps.");

    let code = Code {
        sources: HashMap::new(),
        tests: HashMap::new(),
        name: "test".to_string(),
    };

    // TODO: change Sui dep fetching based on the network it's running on as well!
    let build_result = code.build(code::BuildType::Test, Some(120), None).await?;

    debug!("Build result: {:?}", build_result);
    Ok(())
}

pub(crate) fn base_toml_file(name: &str) -> String {
    format!(
        r#"[package]
name = "{name}"
edition = "2024.beta"

[dependencies]

[addresses]
{name} = "0x0"
        "#
    )
}

pub(crate) const PRETTIER_DEFAULT_CONFIG: &str = r#"
{
	"printWidth": 100,
	"tabWidth": 4,
	"useModuleLabel": true,
	"autoGroupImports": "module",
}
"#;
