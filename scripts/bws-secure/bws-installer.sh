#!/bin/sh

##################################################
# Custom installer for bws CLI in a project repo #
##################################################

DEFAULT_BWS_VERSION="0.5.0"
BWS_VERSION="${BWS_VERSION:-$DEFAULT_BWS_VERSION}"

main() {
  case "$1" in
  -u | --uninstall)
    uninstall_bws
    ;;
  *)
    check_required

    # Check if BWS_VERSION is valid or fall back to default
    platform_detect
    arch_detect
    check_version_availability

    download_bws
    validate_checksum
    install_bws
    ;;
  esac
}

error() {
  echo "$1" >&2
  echo "Exiting..." >&2
  exit 1
}

check_required() {
  if ! command -v curl >/dev/null && ! command -v wget >/dev/null; then
    error "curl or wget is required to download bws."
  fi

  if ! command -v unzip >/dev/null; then
    error "unzip is required to install bws."
  fi
}

platform_detect() {
  if [ "$(uname -s)" = "Linux" ]; then
    PLATFORM="unknown-linux-gnu"
  elif [ "$(uname -s)" = "Darwin" ]; then
    PLATFORM="apple-darwin"
  elif [ "$(expr substr "$(uname -s)" 1 10)" = "MINGW32_NT" ] || [ "$(expr substr "$(uname -s)" 1 10)" = "MINGW64_NT" ]; then
    PLATFORM="pc-windows-msvc"
  else
    error "Unsupported platform: $(uname -s)"
  fi
}

arch_detect() {
  if [ "$(uname -m)" = "x86_64" ]; then
    ARCH="x86_64"
  elif [ "$(uname -m)" = "aarch64" ]; then
    ARCH="aarch64"
  elif [ "$(uname -m)" = "arm64" ]; then
    ARCH="aarch64"
  else
    error "Unsupported architecture: $(uname -m)"
  fi
}

checksum() {
  if command -v sha256sum >/dev/null; then
    sha256sum "$1"
  else
    shasum -a 256 "$1"
  fi
}

downloader() {
  if command -v curl >/dev/null; then
    curl -L -o "$2" "$1"
  else
    wget -O "$2" "$1"
  fi
}

extract() {
  unzip -o "$1" -d "$2"
}

download_bws() {
  bws_url="https://github.com/bitwarden/sdk/releases/download/bws-v${BWS_VERSION}/bws-${ARCH}-${PLATFORM}-${BWS_VERSION}.zip"
  echo "Downloading bws from: $bws_url"
  tmp_dir="$(mktemp -d)"
  downloader "$bws_url" "$tmp_dir/bws.zip"
}

validate_checksum() {
  checksum_url="https://github.com/bitwarden/sdk/releases/download/bws-v${BWS_VERSION}/bws-sha256-checksums-${BWS_VERSION}.txt"
  echo "Downloading checksum file from: $checksum_url"
  checksum_file="$tmp_dir/bws-checksums.txt"
  downloader "$checksum_url" "$checksum_file"

  expected_checksum="$(grep "bws-${ARCH}-${PLATFORM}-${BWS_VERSION}.zip" "$checksum_file" | awk '{print $1}')"
  actual_checksum="$(checksum "$tmp_dir/bws.zip" | awk '{print $1}')"

  if [ "$actual_checksum" != "$expected_checksum" ]; then
    error "Checksum validation failed. Expected: $expected_checksum, Actual: $actual_checksum"
  else
    echo "Checksum validation successful."
  fi
}

install_bws() {
  echo "Installing bws into node_modules/.bin directory..."
  extract "$tmp_dir/bws.zip" "$(pwd)/node_modules/.bin"

  # Skip chmod for Windows
  if [ "$PLATFORM" != "pc-windows-msvc" ]; then
    chmod +x "$(pwd)/node_modules/.bin/bws"
  fi

  # Add installation to NVM binary directory only if not Windows
  if [ "$PLATFORM" != "pc-windows-msvc" ]; then
    NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
    if [ -d "$NVM_DIR" ]; then
      NODE_VERSION=$(node -v)
      NVM_BIN_DIR="$NVM_DIR/versions/node/$NODE_VERSION/bin"
      if [ -d "$NVM_BIN_DIR" ]; then
        echo "Installing bws into NVM binary directory..."
        cp "$(pwd)/node_modules/.bin/bws" "$NVM_BIN_DIR/bws"
        chmod +x "$NVM_BIN_DIR/bws"
        echo "bws installed globally to $NVM_BIN_DIR/bws"
      else
        echo "Warning: NVM binary directory not found at $NVM_BIN_DIR"
      fi
    else
      echo "Warning: NVM directory not found at $NVM_DIR"
    fi
  fi

  echo "bws installed to node_modules/.bin/bws"
  echo "To use bws, run either:"
  echo "  ./node_modules/.bin/bws <command>"
  echo "  bws <command> (if it is on your PATH)"
}

uninstall_bws() {
  NODE_BIN_DIR="$(pwd)/node_modules/.bin"

  if [ -f "$NODE_BIN_DIR/bws" ]; then
    echo "Removing bws binary at $NODE_BIN_DIR/bws"
    rm -f "$NODE_BIN_DIR/bws"
  fi

  # Remove from NVM binary directory
  NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
  if [ -d "$NVM_DIR" ]; then
    NODE_VERSION=$(node -v)
    NVM_BIN_DIR="$NVM_DIR/versions/node/$NODE_VERSION/bin"
    
    if [ -f "$NVM_BIN_DIR/bws" ]; then
      echo "Removing bws binary at $NVM_BIN_DIR/bws"
      rm -f "$NVM_BIN_DIR/bws"
    fi
  fi

  echo "bws uninstalled successfully."
  exit 0
}

check_version_availability() {
  # Attempt a simple HEAD request to see if the requested version URL exists
  test_url="https://github.com/bitwarden/sdk/releases/download/bws-v${BWS_VERSION}/bws-${ARCH}-${PLATFORM}-${BWS_VERSION}.zip"

  if command -v curl >/dev/null; then
    if ! curl --head --silent --fail "$test_url" >/dev/null; then
      echo "Version bws-v${BWS_VERSION} not found. Falling back to default ${DEFAULT_BWS_VERSION}..."
      BWS_VERSION="$DEFAULT_BWS_VERSION"
    fi
  else
    # Fallback if wget is used
    if ! wget --spider -q "$test_url"; then
      echo "Version bws-v${BWS_VERSION} not found. Falling back to default ${DEFAULT_BWS_VERSION}..."
      BWS_VERSION="$DEFAULT_BWS_VERSION"
    fi
  fi
}

main "$@"
