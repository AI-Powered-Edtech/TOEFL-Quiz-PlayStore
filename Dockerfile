FROM rust:1-alpine AS builder

WORKDIR /app

RUN apk add --no-cache build-base libssl1.1-compat

COPY Cargo.toml Cargo.lock ./
COPY src ./src

RUN cargo build --release

FROM alpine:3.19

RUN apk add --no-cache libssl3 ca-certificates

WORKDIR /app

COPY --from=builder /app/target/release/toefl-quiz-backend .

EXPOSE 8082

CMD ["./toefl-quiz-backend"]