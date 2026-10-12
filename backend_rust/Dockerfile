# ==============================================================================
# 墨枢 · InkVerse — High-Performance Rust Backend Dockerfile
# Multi-stage build using locally cached Ubuntu 22.04 + rsproxy.cn mirror
# ==============================================================================

# Stage 1: Build the Rust binary with Cargo dependency layer caching
FROM ubuntu:22.04 AS builder

ENV DEBIAN_FRONTEND=noninteractive \
    RUSTUP_DIST_SERVER="https://rsproxy.cn" \
    RUSTUP_UPDATE_ROOT="https://rsproxy.cn/rustup" \
    CARGO_HOME="/root/.cargo" \
    RUSTUP_HOME="/root/.rustup" \
    PATH="/root/.cargo/bin:${PATH}"

WORKDIR /usr/src/nov-server

# Switch Ubuntu apt sources to USTC mirror (supports both x86_64 and arm64/ubuntu-ports)
RUN sed -i 's|http://archive.ubuntu.com/ubuntu/|http://mirrors.ustc.edu.cn/ubuntu/|g; s|http://security.ubuntu.com/ubuntu/|http://mirrors.ustc.edu.cn/ubuntu/|g; s|http://ports.ubuntu.com/ubuntu-ports/|http://mirrors.ustc.edu.cn/ubuntu-ports/|g' /etc/apt/sources.list && \
    apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    build-essential \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Rust toolchain via rsproxy.cn and configure sparse index
RUN curl --proto '=https' --tlsv1.2 -sSf https://rsproxy.cn/rustup-init.sh | sh -s -- -y --default-toolchain stable --profile minimal && \
    mkdir -p /root/.cargo && \
    printf '[source.crates-io]\nreplace-with = "rsproxy-sparse"\n[source.rsproxy]\nregistry = "https://rsproxy.cn/crates.io-index"\n[source.rsproxy-sparse]\nregistry = "sparse+https://rsproxy.cn/index/"\n[net]\ngit-fetch-with-cli = true\n' > /root/.cargo/config.toml

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
FROM ubuntu:22.04 AS runtime

ENV DEBIAN_FRONTEND=noninteractive

WORKDIR /app

RUN sed -i 's|http://archive.ubuntu.com/ubuntu/|http://mirrors.ustc.edu.cn/ubuntu/|g; s|http://security.ubuntu.com/ubuntu/|http://mirrors.ustc.edu.cn/ubuntu/|g; s|http://ports.ubuntu.com/ubuntu-ports/|http://mirrors.ustc.edu.cn/ubuntu-ports/|g' /etc/apt/sources.list && \
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
