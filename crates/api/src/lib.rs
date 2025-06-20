use anyhow::Result;
use axum::Json;
use axum::{routing::post, Router};
use errors::ApiError;
use helpers::{verify_git_installed, verify_sui_installed, BuildResult, Code};
use tower_http::cors::{Any, CorsLayer};

use std::net::SocketAddr;

pub(crate) mod errors;
pub(crate) mod helpers;

/// POST `/build` endpoint.
pub async fn build_source(Json(payload): Json<Code>) -> Result<Json<BuildResult>, ApiError> {
    match payload.build().await {
        Ok(response) => Ok(Json(response)),
        Err(e) => {
            eprintln!("Error: {}", e);
            Err(ApiError::InternalServerError(e.to_string()))
        }
    }
}

/// Entrypoint to construct & run the API axum instance.
pub async fn run_server() -> Result<(), std::io::Error> {
    verify_sui_installed().expect("Sui CLI not installed");
    verify_git_installed().expect("Git CLI not installed");

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    // Build the application with a single route
    let app = Router::new()
        .route("/build", post(build_source))
        .layer(cors);

    // Specify the address to listen on
    let addr = SocketAddr::from(([127, 0, 0, 1], 8181));

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();

    // Run the server
    println!("Listening on http://{}", addr);

    axum::serve(listener, app.into_make_service()).await
}
