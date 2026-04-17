use vil_server::axum::http::{
    header::{
        HeaderValue, CONTENT_SECURITY_POLICY, STRICT_TRANSPORT_SECURITY, X_CONTENT_TYPE_OPTIONS,
        X_FRAME_OPTIONS, X_XSS_PROTECTION,
    },
    Response,
};

pub struct SecurityHeaders;

impl SecurityHeaders {
    pub fn add_to_response(response: Response) -> Response {
        let mut res = response;
        res.headers_mut().insert(
            STRICT_TRANSPORT_SECURITY,
            HeaderValue::from_static("max-age=31536000; includeSubDomains"),
        );
        res.headers_mut()
            .insert(X_CONTENT_TYPE_OPTIONS, HeaderValue::from_static("nosniff"));
        res.headers_mut()
            .insert(X_FRAME_OPTIONS, HeaderValue::from_static("DENY"));
        res.headers_mut()
            .insert(X_XSS_PROTECTION, HeaderValue::from_static("1; mode=block"));
        res.headers_mut().insert(
            CONTENT_SECURITY_POLICY,
            HeaderValue::from_static("default-src 'self'"),
        );
        res
    }
}
