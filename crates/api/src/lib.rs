use anyhow::Result;
use axum::Json;
use axum::{routing::post, Router};
use errors::ApiError;
use helpers::{verify_git_installed, verify_sui_installed, BuildResult, Code};
use tower_http::cors::{Any, CorsLayer};

use std::net::SocketAddr;

use crate::helpers::{
    test_and_cache_sui_git_deps, verify_prettier_move_installed, BuildRequest, GistUrl,
};

pub(crate) mod errors;
pub(crate) mod helpers;

/// POST `/build` endpoint.
pub async fn build_source(
    Json(payload): Json<BuildRequest>,
) -> Result<Json<BuildResult>, ApiError> {
    match payload
        .code
        .build(payload.build_type, None, payload.network)
        .await
    {
        Ok(response) => Ok(Json(response)),
        Err(e) => {
            eprintln!("Error: {}", e);
            Err(ApiError::InternalServerError(e.to_string()))
        }
    }
}

pub async fn format_source(Json(payload): Json<Code>) -> Result<Json<Code>, ApiError> {
    match payload.format().await {
        Ok(response) => Ok(Json(response)),
        Err(e) => Err(ApiError::InternalServerError(e.to_string())),
    }
}

/// Entrypoint to construct & run the API axum instance.
pub async fn run_server() -> Result<(), std::io::Error> {
    verify_sui_installed().expect("Sui CLI not installed");
    verify_git_installed().expect("Git CLI not installed");
    verify_prettier_move_installed().expect("prettier-move CLI not installed. It can be installed by running `npm i -g prettier @mysten/prettier-plugin-move`");
    test_and_cache_sui_git_deps()
        .await
        .expect("Failed to test and cache sui git deps");

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    // Build the application with a single route
    let app = Router::new()
        .route("/build", post(build_source))
        .route("/format", post(format_source))
        .layer(cors);

    // Specify the address to listen on
    let addr = SocketAddr::from(([0, 0, 0, 0], 8181));

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();

    // Run the server
    println!("Listening on http://{}", addr);

    axum::serve(listener, app.into_make_service()).await
}
