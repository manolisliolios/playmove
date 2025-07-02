FROM rust:1.87.0 AS builder

ARG PROFILE=release
ARG GIT_REVISION
ENV GIT_REVISION=$GIT_REVISION

WORKDIR work

# Copy the crates and the entry
COPY Cargo.lock Cargo.toml ./
COPY crates/ ./crates/
COPY docker/api/entry.sh ./

RUN apt-get update && apt-get install -y build-essential libssl-dev pkg-config curl cmake clang ca-certificates
ENV PATH="/root/.cargo/bin:${PATH}"

RUN cargo build --profile $PROFILE --bin moveplay-api --config net.git-fetch-with-cli=true
# Install Sui CLI pre-requisite at the latest mainnet tag.
RUN cargo install --git https://github.com/Mystenlabs/suiup.git --locked
RUN SUIUP_DEFAULT_BIN_DIR=/work/target/release suiup install sui@mainnet -y

RUN mv /work/target/release/sui /work/target/release/sui_mainnet

# Install sui testnet!
RUN SUIUP_DEFAULT_BIN_DIR=/work/target/release suiup install sui@testnet -y
RUN mv /work/target/release/sui /work/target/release/sui_testnet

# TODO: Install prettier / move-prettier globally!
FROM ubuntu:latest AS runtime

RUN apt-get update
RUN apt-get -y --no-install-recommends install wget \
        iputils-ping procps bind9-host bind9-dnsutils curl iproute2 git ca-certificates libpq-dev

# Install nodejs for the runtime, so we can run `prettier-move`
RUN apt-get update && apt-get install -y curl ca-certificates \
&& curl -fsSL https://deb.nodesource.com/setup_lts.x | bash - \
&& apt-get install -y nodejs \
&& apt-get clean \
&& rm -rf /var/lib/apt/lists/*

RUN npm i -g prettier @mysten/prettier-plugin-move
    

COPY --from=builder /work/target/release/moveplay-api /opt/mysten/bin/
COPY --from=builder /work/target/release/sui_mainnet /opt/mysten/bin/
COPY --from=builder /work/target/release/sui_testnet /opt/mysten/bin/
COPY --from=builder /work/entry.sh .

# Make path available so we can run `sui` commands.
ENV PATH="/opt/mysten/bin:${PATH}"

RUN ["chmod", "+x", "/opt/mysten/bin/moveplay-api"]
RUN ["chmod", "+x", "entry.sh"]


ARG BUILD_DATE
ARG GIT_REVISION
LABEL build-date=$BUILD_DATE
LABEL git-revision=$GIT_REVISION

CMD ["./entry.sh"]
