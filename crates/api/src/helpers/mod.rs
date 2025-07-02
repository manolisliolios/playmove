mod sandboxed;

use anyhow::{bail, Result};
use serde::{Deserialize, Serialize};
use std::{
    collections::HashMap,
    fs::{create_dir, File},
    io::{Read, Write},
    process::Command,
};
use tempfile::TempDir;
use tokio::time::Instant;
use tracing::debug;

use crate::helpers::sandboxed::run_sandboxed;

/// The default timeout for the build process in seconds.
const DEFAULT_TIMEOUT: u64 = 20;

/// The default timeout for the format process in seconds.
const DEFAULT_FORMAT_TIMEOUT: u64 = 2;

#[derive(Serialize, Deserialize, PartialEq, Eq)]
pub enum BuildType {
    Build,
    Test,
}

#[derive(Serialize, Deserialize, PartialEq, Eq)]
pub enum Network {
    Mainnet,
    Testnet,
}

#[derive(Serialize, Deserialize)]
pub struct BuildRequest {
    #[serde(flatten)]
    pub code: Code,
    pub build_type: BuildType,
    pub network: Option<Network>,
}

#[derive(Serialize, Deserialize)]
pub struct Code {
    pub sources: HashMap<String, String>,
    pub tests: HashMap<String, String>,
    pub name: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct BuildResult {
    pub stdout: String,
    pub stderr: String,
}

impl Code {
    pub async fn build(
        &self,
        build_type: BuildType,
        timeout: Option<u64>,
        network: Option<Network>,
    ) -> Result<BuildResult> {
        if self.number_of_files() > 1 {
            bail!("Only one file is supported at the moment");
        }

        let start = Instant::now();
        let temp_dir = self.create_temp_project()?;
        debug!("Time taken to create temp project: {:?}", start.elapsed());

        let start = Instant::now();

        let result = run_sandboxed(
            network.unwrap_or(Network::Mainnet).binary_name(),
            &vec![
                "move",
                if build_type == BuildType::Test {
                    "test"
                } else {
                    "build"
                },
                "--path",
                temp_dir.path().join("temp").to_str().unwrap(),
                "--skip-fetch-latest-git-deps",
            ],
            timeout.unwrap_or(DEFAULT_TIMEOUT),
        )
        .await;

        debug!("Time taken to build: {:?}", start.elapsed());

        Ok(BuildResult {
            stdout: result.stdout,
            stderr: if result.timed_out {
                "Request has timed out. Please try again with a smaller project.".to_string()
            } else {
                result.stderr
            },
        })
    }

    /// Endpoint to format the codebase.
    pub async fn format(&self) -> Result<Code> {
        if self.number_of_files() > 1 {
            bail!("Only one file is supported at the moment");
        }

        let temp_dir = self.create_temp_project()?;

        let prettier_config = temp_dir.path().join(".prettierrc");
        let mut file = File::create(prettier_config.clone())?;
        file.write_all(PRETTIER_DEFAULT_CONFIG.as_bytes())?;

        run_sandboxed(
            "prettier-move",
            &vec![
                "--config",
                prettier_config.to_str().unwrap(),
                "--write",
                temp_dir
                    .path()
                    .join("temp")
                    .join("sources")
                    .to_str()
                    .unwrap(),
            ],
            DEFAULT_FORMAT_TIMEOUT,
        )
        .await;

        Ok(self.read_formatted_files(&temp_dir)?)
    }

    fn create_temp_project(&self) -> anyhow::Result<TempDir> {
        let temp_dir = tempfile::tempdir()?;
        let temp_dir_path = temp_dir.path();

        let project_path = temp_dir_path.join("temp");
        create_dir(&project_path)?;

        let sources_path = project_path.join("sources");
        create_dir(&sources_path)?;

        let tests_path = project_path.join("tests");
        create_dir(&tests_path)?;

        let mut toml_file = File::create(project_path.join("Move.toml"))?;
        toml_file.write_all(base_toml_file(&self.name).as_bytes())?;

        for (name, source) in &self.sources {
            let mut move_file = File::create(sources_path.join(format!("{}.move", name)))?;
            move_file.write_all(source.as_bytes())?;
        }

        for (name, source) in &self.tests {
            let mut move_file = File::create(tests_path.join(format!("{}.move", name)))?;
            move_file.write_all(source.as_bytes())?;
        }

        Ok(temp_dir)
    }

    fn read_formatted_files(&self, temp_dir: &TempDir) -> Result<Self> {
        let sources_path = temp_dir.path().join("temp").join("sources");
        let tests_path = temp_dir.path().join("temp").join("tests");

        let mut sources = HashMap::new();
        let mut tests = HashMap::new();

        for (name, _) in &self.sources {
            let mut move_file = File::open(sources_path.join(format!("{}.move", name)))?;
            let mut source = String::new();
            move_file.read_to_string(&mut source)?;
            sources.insert(name.clone(), source);
        }

        for (name, _) in &self.tests {
            let mut move_file = File::open(tests_path.join(format!("{}.move", name)))?;
            let mut source = String::new();
            move_file.read_to_string(&mut source)?;
            tests.insert(name.clone(), source);
        }

        Ok(Self {
            sources,
            tests,
            name: self.name.clone(),
        })
    }

    pub fn number_of_files(&self) -> usize {
        self.sources.len() + self.tests.len()
    }
}

impl Network {
    pub fn binary_name(&self) -> &str {
        match self {
            Network::Mainnet => "sui_mainnet",
            Network::Testnet => "sui_testnet",
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
        Err(anyhow::anyhow!("git CLI not installed"))
    }
}

pub fn verify_prettier_move_installed() -> anyhow::Result<()> {
    let output = Command::new("prettier-move").arg("--version").output()?;

    if output.status.success() {
        Ok(())
    } else {
        Err(anyhow::anyhow!("prettier CLI not installed"))
    }
}

pub async fn test_and_cache_sui_git_deps() -> Result<()> {
    debug!("Running a move build when initializing the crate, in order to cache the git deps.");

    let code = Code {
        sources: HashMap::new(),
        tests: HashMap::new(),
        name: "test".to_string(),
    };

    // TODO: change Sui dep fetching based on the network it's running on as well!
    let build_result = code.build(BuildType::Test, Some(120), None).await?;

    debug!("Build result: {:?}", build_result);
    Ok(())
}

fn base_toml_file(name: &str) -> String {
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

const PRETTIER_DEFAULT_CONFIG: &str = r#"
{
	"printWidth": 100,
	"tabWidth": 4,
	"useModuleLabel": true,
	"autoGroupImports": "module",
}
"#;
