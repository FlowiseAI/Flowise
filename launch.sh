#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_USER="$(id -un)"
SERVICE_GROUP="$(id -gn)"

export PATH="$HOME/.local/bin:$PATH"

ENABLE_SYSTEMD=1
for arg in "$@"; do
    case "$arg" in
        --no-systemd) ENABLE_SYSTEMD=0 ;;
        --systemd) ENABLE_SYSTEMD=1 ;;
    esac
done

if ! command -v corepack >/dev/null 2>&1; then
    echo "corepack not found in PATH. Install Node.js (with corepack) and retry." >&2
    exit 1
fi
COREPACK_BIN="$(command -v corepack)"

port_in_use() {
    local port="$1"
    if command -v rg >/dev/null 2>&1; then
        ss -ltn 2>/dev/null | rg -q ":${port}\\b"
    else
        ss -ltn 2>/dev/null | grep -Eq ":${port}\\b"
    fi
}

install_caddy() {
    if command -v caddy >/dev/null 2>&1; then
        return 0
    fi

    local arch
    arch="$(uname -m)"
    case "$arch" in
        x86_64|amd64) arch="amd64" ;;
        aarch64|arm64) arch="arm64" ;;
        *)
            echo "Unsupported architecture for Caddy download: $arch" >&2
            exit 1
            ;;
    esac

    echo "Installing Caddy into ~/.local/bin..."
    mkdir -p "$HOME/.local/bin"
    curl -fsSL "https://caddyserver.com/api/download?os=linux&arch=${arch}" -o "$HOME/.local/bin/caddy"
    chmod +x "$HOME/.local/bin/caddy"
}

setup_caddy_config() {
    mkdir -p "$HOME/.config/flowise-caddy"
    cat > "$HOME/.config/flowise-caddy/Caddyfile" <<'CADDYFILE'
{
    auto_https disable_redirects
}

https://localhost:8443 {
    bind 127.0.0.1
    tls internal
    reverse_proxy 127.0.0.1:3000
}
CADDYFILE
}

start_caddy() {
    if port_in_use 8443; then
        echo "Port 8443 already in use; skipping Caddy start."
        return 0
    fi

    echo "Starting Caddy on https://localhost:8443..."
    caddy start --config "$HOME/.config/flowise-caddy/Caddyfile"
}

trust_caddy_ca() {
    echo "Installing local CA into trust stores (sudo required)..."
    sudo "$HOME/.local/bin/caddy" trust
}

ensure_pnpm_shim() {
    local tmp_bin
    tmp_bin="$(mktemp -d)"
    trap 'rm -rf "$tmp_bin"' EXIT

    cat > "$tmp_bin/pnpm" <<'PNPMSHIM'
#!/usr/bin/env bash
exec corepack pnpm "$@"
PNPMSHIM
    chmod +x "$tmp_bin/pnpm"

    export PATH="$tmp_bin:$PATH"
}

install_deps_if_needed() {
    if [ ! -d "$ROOT_DIR/node_modules" ]; then
        echo "Installing dependencies..."
        (cd "$ROOT_DIR" && corepack pnpm install)
    fi
}

build_if_needed() {
    if [ ! -d "$ROOT_DIR/packages/server/dist" ]; then
        echo "Building Flowise..."
        (cd "$ROOT_DIR" && corepack pnpm build)
    fi
}

start_flowise() {
    if port_in_use 3000; then
        echo "Port 3000 already in use; skipping Flowise start."
        return 0
    fi

    echo "Starting Flowise on http://localhost:3000..."
    (cd "$ROOT_DIR" && nohup corepack pnpm start > /tmp/flowise.log 2>&1 &)
    echo "Flowise logs: /tmp/flowise.log"
}

setup_systemd_units() {
    echo "Installing systemd units..."
    sudo tee /etc/systemd/system/flowise-caddy.service >/dev/null <<EOF
[Unit]
Description=Flowise Local Caddy Reverse Proxy
After=network.target

[Service]
Type=simple
User=$SERVICE_USER
Group=$SERVICE_GROUP
Environment=PATH=$HOME/.local/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
ExecStart=$HOME/.local/bin/caddy run --config $HOME/.config/flowise-caddy/Caddyfile
ExecReload=$HOME/.local/bin/caddy reload --config $HOME/.config/flowise-caddy/Caddyfile
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

    sudo tee /etc/systemd/system/flowise-local.service >/dev/null <<EOF
[Unit]
Description=Flowise Local Server
After=network.target

[Service]
Type=simple
User=$SERVICE_USER
Group=$SERVICE_GROUP
WorkingDirectory=$ROOT_DIR
Environment=HOME=$HOME
Environment=PATH=$HOME/.local/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
ExecStart=$COREPACK_BIN pnpm start
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
}

start_systemd_services() {
    sudo systemctl daemon-reload
    sudo systemctl enable --now flowise-caddy.service
    sudo systemctl enable --now flowise-local.service
}

install_caddy
setup_caddy_config

ensure_pnpm_shim
install_deps_if_needed
build_if_needed

if [ "$ENABLE_SYSTEMD" -eq 1 ] && command -v systemctl >/dev/null 2>&1; then
    setup_systemd_units
    start_systemd_services
else
    start_caddy
    start_flowise
fi

trust_caddy_ca

echo "Flowise: http://localhost:3000"
echo "Flowise via HTTPS: https://localhost:8443"
