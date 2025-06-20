mod sandboxed;

use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::{
    collections::HashMap,
    fs::{create_dir, File},
    io::Write,
    process::Command,
};
use tempfile::TempDir;
use tokio::time::Instant;

use crate::helpers::sandboxed::run_sandboxed;

const DEFAULT_TIMEOUT: u64 = 5;

#[derive(Serialize, Deserialize, PartialEq, Eq)]
pub enum BuildType {
    Build,
    Test,
}

#[derive(Serialize, Deserialize)]
pub struct Code {
    pub sources: HashMap<String, String>,
    pub tests: HashMap<String, String>,
    pub name: String,
    pub build_type: BuildType,
}

#[derive(Serialize, Deserialize)]
pub struct BuildResult {
    pub stdout: String,
    pub stderr: String,
}

impl Code {
    pub async fn build(&self) -> Result<BuildResult> {
        let start = Instant::now();
        let temp_dir = self.create_temp_project()?;
        eprintln!("Time taken to create temp project: {:?}", start.elapsed());

        let start = Instant::now();

        let result = run_sandboxed(
            "sui",
            &vec![
                "move",
                if self.is_test() { "test" } else { "build" },
                "--path",
                temp_dir.path().join("temp").to_str().unwrap(),
            ],
            DEFAULT_TIMEOUT,
        )
        .await;

        eprintln!("Time taken to build: {:?}", start.elapsed());

        Ok(BuildResult {
            stdout: result.stdout,
            stderr: if result.timed_out {
                "Request has timed out. Please try again with a smaller project.".to_string()
            } else {
                result.stderr
            },
        })
    }

    fn is_test(&self) -> bool {
        self.build_type == BuildType::Test
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

        // let mut lock_file = File::create(project_path.join("Move.lock"))?;
        // lock_file.write_all(BASE_LOCK_FILE.as_bytes())?;

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
}

pub fn verify_sui_installed() -> anyhow::Result<()> {
    let output = Command::new("sui").arg("--version").output()?;

    if output.status.success() {
        Ok(())
    } else {
        Err(anyhow::anyhow!("sui CLI not installed"))
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
