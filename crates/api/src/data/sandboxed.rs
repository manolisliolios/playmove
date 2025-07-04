use std::process::Stdio;
use tokio::io::{AsyncReadExt, BufReader};
use tokio::process::Command;
use tokio::time::{timeout, Duration};

pub struct SandboxResult {
    pub status: Option<std::process::ExitStatus>,
    pub stdout: String,
    pub stderr: String,
    pub timed_out: bool,
    pub error: Option<String>,
}

pub async fn run_sandboxed(program: &str, args: &[&str], timeout_secs: u64) -> SandboxResult {
    let mut command = Command::new(program);
    command.args(args);
    command.stdout(Stdio::piped());
    command.stderr(Stdio::piped());

    let mut child = match command.spawn() {
        Ok(c) => c,
        Err(e) => {
            return SandboxResult {
                status: None,
                stdout: String::new(),
                stderr: String::new(),
                timed_out: false,
                error: Some(format!("Failed to spawn process: {}", e)),
            };
        }
    };

    let stdout = child.stdout.take().unwrap();
    let stderr = child.stderr.take().unwrap();

    let mut stdout_reader = BufReader::new(stdout);
    let mut stderr_reader = BufReader::new(stderr);

    let stdout_buf = Vec::new();
    let stderr_buf = Vec::new();

    let read_and_wait = async {
        let stdout_task = tokio::spawn(async move {
            let mut buf = Vec::new();
            let _ = stdout_reader.read_to_end(&mut buf).await;
            buf
        });

        let stderr_task = tokio::spawn(async move {
            let mut buf = Vec::new();
            let _ = stderr_reader.read_to_end(&mut buf).await;
            buf
        });

        let status = child.wait().await;
        let stdout_buf = stdout_task.await.unwrap_or_default();
        let stderr_buf = stderr_task.await.unwrap_or_default();
        (status, stdout_buf, stderr_buf)
    };

    let result = timeout(Duration::from_secs(timeout_secs), read_and_wait).await;

    match result {
        Ok((status, stdout_buf, stderr_buf)) => SandboxResult {
            status: status.ok(),
            stdout: String::from_utf8_lossy(&stdout_buf).into_owned(),
            stderr: String::from_utf8_lossy(&stderr_buf).into_owned(),
            timed_out: false,
            error: None,
        },
        Err(e) => {
            let _ = child.kill().await;
            SandboxResult {
                status: None,
                stdout: String::from_utf8_lossy(&stdout_buf).into_owned(),
                stderr: String::from_utf8_lossy(&stderr_buf).into_owned(),
                timed_out: true,
                error: Some(format!("Error waiting for process: {}", e)),
            }
        }
    }
}
