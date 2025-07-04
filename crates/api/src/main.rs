use playmove_api::run_server;

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();
    run_server().await.expect("Failed to run server");
}
