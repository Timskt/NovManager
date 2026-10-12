# ==============================================================================
# 墨枢 · InkVerse — High-Performance Rust 2.0 Backend Dockerfile
# Multi-stage build: Rust 1.85+ (Edition 2024) -> Debian Bookworm Slim Runtime
# ==============================================================================

# Stage 1: Build the Rust binary with Cargo dependency layer caching
FROM rust:1.85-bookworm AS builder

WORKDIR /usr/src/nov-server

# Configure rsproxy sparse index for fast crate downloads
RUN mkdir -p /usr/local/cargo && \
    printf '[source.crates-io]\nreplace-with = "rsproxy-sparse"\n[source.rsproxy]\nregistry = "https://rsproxy.cn/crates.io-index"\n[source.rsproxy-sparse]\nregistry = "sparse+https://rsproxy.cn/index/"\n[net]\ngit-fetch-with-cli = true\n' > /usr/local/cargo/config.toml

RUN sed -i 's/deb.debian.org/mirrors.ustc.edu.cn/g' /etc/apt/sources.list.d/debian.sources 2>/dev/null || true && \
    apt-get update && apt-get install -y --no-install-recommends \
    pkg-config \
    libssl-dev \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Cache dependencies first
COPY Cargo.toml Cargo.lock* ./
RUN mkdir -p src && \
    echo "pub fn dummy() {}" > src/lib.rs && \
    echo "fn main() {}" > src/main.rs && \
    cargo build --release --bin nov-server && \
    rm -rf src

# Copy actual Rust source code and build release binary
COPY src ./src
RUN touch src/lib.rs src/main.rs && \
    cargo build --release --bin nov-server

# Stage 2: Minimal production runtime with Git VCS and SQLite WAL support
FROM debian:bookworm-slim AS runtime

WORKDIR /app

RUN sed -i 's/deb.debian.org/mirrors.ustc.edu.cn/g' /etc/apt/sources.list.d/debian.sources 2>/dev/null || true && \
    apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    libssl3 \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Configure default git identity for silent manuscript snapshots (GitVcsManager)
RUN git config --global user.name "InkVerse Auto-VCS" && \
    git config --global user.email "vcs@inkverse.local" && \
    git config --global init.defaultBranch main && \
    mkdir -p /app/data /app/manuscripts && \
    git init /app/manuscripts

COPY --from=builder /usr/src/nov-server/target/release/nov-server /app/nov-server

ENV PORT=8000 \
    NOV_DB_PATH=/app/data/novmanager_local.db \
    NOV_REPO_DIR=/app/manuscripts \
    RUST_LOG=nov_server=info,tower_http=info

EXPOSE 8000

HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=5 \
    CMD curl -fsS http://127.0.0.1:8000/api/health || exit 1

CMD ["/app/nov-server"]
