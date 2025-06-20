use axum::{
    http::{Response, StatusCode},
    response::IntoResponse,
    Json,
};
use serde::Serialize;

use thiserror::Error;

#[derive(Debug, Error, Clone, Hash, Eq, PartialEq)]
pub enum ApiError {
    #[error("Invalid input: {0}")]
    BadRequest(String),

    #[error("Internal server error: {0}")]
    InternalServerError(String),

    #[error("Resource not found: {0}")]
    NotFound(String),
}

#[derive(Serialize)]
struct ErrorResponse {
    message: String,
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response<axum::body::Body> {
        let (status, message) = match self {
            ApiError::BadRequest(msg) => (StatusCode::BAD_REQUEST, msg),
            ApiError::InternalServerError(msg) => (StatusCode::INTERNAL_SERVER_ERROR, msg),
            ApiError::NotFound(msg) => (StatusCode::NOT_FOUND, msg),
        };

        let body = Json(ErrorResponse { message });
        (status, body).into_response()
    }
}
