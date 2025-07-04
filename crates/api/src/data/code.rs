use std::{collections::HashMap, fs::File};
use tempfile::TempDir;
use tokio::time::Instant;

use anyhow::{bail, Result};
use serde::{Deserialize, Serialize};
use std::{
    fs::create_dir,
    io::{Read, Write},
};
use tracing::debug;

use crate::data::{
    base_toml_file,
    gist::{publish_gist, GistUrl},
    sandboxed::run_sandboxed,
    Network, PRETTIER_DEFAULT_CONFIG,
};

/// The default timeout for the build process in seconds.
const DEFAULT_TIMEOUT: u64 = 20;

/// The default timeout for the format process in seconds.
const DEFAULT_FORMAT_TIMEOUT: u64 = 2;

#[derive(Serialize, Deserialize)]
pub struct Code {
    pub sources: HashMap<String, String>,
    pub tests: HashMap<String, String>,
    pub name: String,
}

#[derive(Serialize, Deserialize, PartialEq, Eq)]
pub enum BuildType {
    Build,
    Test,
}

#[derive(Serialize, Deserialize)]
pub struct BuildRequest {
    #[serde(flatten)]
    pub code: Code,
    pub build_type: BuildType,
    pub network: Option<Network>,
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
        self.validate_file_names()?;

        let start = Instant::now();
        let temp_dir = self.create_temp_project()?;
        debug!("Time taken to create temp project: {:?}", start.elapsed());

        let start = Instant::now();

        let result = run_sandboxed(
            &network.unwrap_or(Network::Mainnet).binary_name(),
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
        self.validate_file_names()?;

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

    pub async fn share(&self) -> Result<GistUrl> {
        self.validate_file_names()?;
        publish_gist(self).await
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

    fn validate_file_names(&self) -> Result<()> {
        // We might need to change this in the future or make this dynamic.
        // For now, we only support one file (as the web also allows!)
        if self.number_of_files() > 1 {
            bail!("Only one file is supported at the moment");
        }

        for (file_name, _) in &self.sources {
            if file_name.is_empty() {
                bail!("File name is empty: {}", file_name);
            }

            if !sanitize_filename::is_sanitized(file_name) {
                bail!("File name is not valid: {}", file_name);
            }
        }

        for (file_name, _) in &self.tests {
            if file_name.is_empty() {
                bail!("File name is empty: {}", file_name);
            }

            if !sanitize_filename::is_sanitized(file_name) {
                bail!("File name is not valid: {}", file_name);
            }
        }

        Ok(())
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
