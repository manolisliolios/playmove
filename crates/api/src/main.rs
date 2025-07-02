use moveplay_api::run_server;

#[tokio::main]
async fn main() {
    run_server().await.expect("Failed to run server");
}
