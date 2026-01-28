#!/bin/bash
#===============================================================================
# Build Complete - FTP_Browser-CLI
# Orchestrates clean, typecheck, build, executable, and offline package.
# Usage: ./scripts/build-complete.sh
#===============================================================================

set -o pipefail

#-------------------------------------------------------------------------------
# Configuration
#-------------------------------------------------------------------------------
SCRIPT_DIR="$(cd -P "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd -P "$SCRIPT_DIR/.." && pwd)"
ERR_GENERAL=1
ERR_BUILD=2
ERR_TYPECHECK=3
ERR_EXECUTABLE=4
ERR_PACKAGE=5

#-------------------------------------------------------------------------------
# Colors
#-------------------------------------------------------------------------------
if [ -t 1 ]; then
    RED='\033[0;31m'
    GREEN='\033[0;32m'
    YELLOW='\033[1;33m'
    BLUE='\033[0;34m'
    NC='\033[0m'
else
    RED='' GREEN='' YELLOW='' BLUE='' NC=''
fi

#-------------------------------------------------------------------------------
# Logging
#-------------------------------------------------------------------------------
log_info() { echo -e "${BLUE}[INFO]${NC} $*"; }
log_ok()   { echo -e "${GREEN}[OK]${NC} $*"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
log_err()  { echo -e "${RED}[ERROR]${NC} $*" >&2; }
log_step() { echo -e "\n${BLUE}==>${NC} $*"; }

#-------------------------------------------------------------------------------
# Steps
#-------------------------------------------------------------------------------
run_clean() {
    log_step "Cleaning previous builds..."
    rm -rf "$ROOT/dist" "$ROOT/releases"
    log_ok "Cleaned dist/ and releases/"
}

run_install() {
    log_step "Installing dependencies..."
    (cd "$ROOT" && npm install) || { log_err "npm install failed"; exit $ERR_GENERAL; }
    log_ok "Dependencies ready"
}

run_typecheck() {
    log_step "Type checking..."
    (cd "$ROOT" && npm run typecheck) || { log_err "Type check failed"; exit $ERR_TYPECHECK; }
    log_ok "Type check passed"
}

run_build() {
    log_step "Building application..."
    (cd "$ROOT" && npm run build) || { log_err "Build failed"; exit $ERR_BUILD; }
    log_ok "Build done"
}

run_executable() {
    if [ -n "${BUILD_SKIP_EXECUTABLE:-}" ]; then
        log_info "Skipping executable (BUILD_SKIP_EXECUTABLE=1). Node-based package will be used."
        return
    fi
    log_step "Creating standalone executable (pkg)..."
    if (cd "$ROOT" && npm run build:executable 2>/dev/null); then
        log_ok "Executable created"
    else
        log_warn "Executable build failed (pkg; deps may use top-level await). Using node-based offline package."
    fi
}

run_package() {
    log_step "Creating offline package..."
    (cd "$ROOT" && npm run build:package) || { log_err "Offline package failed"; exit $ERR_PACKAGE; }
    log_ok "Offline package created"
}

run_summary() {
    log_step "Summary"
    echo ""
    [ -f "$ROOT/dist/cli.js" ] && log_ok "  dist/cli.js"
    [ -f "$ROOT/releases/ftp-browser-linux-x64" ] && log_ok "  releases/ftp-browser-linux-x64"
    local pkg
    pkg="$(ls "$ROOT"/releases/ftp-browser-cli-offline-*.tar.gz 2>/dev/null | head -1)"
    [ -n "$pkg" ] && [ -f "$pkg" ] && log_ok "  $pkg"
    echo ""
    log_ok "Build complete. Run ./scripts/build-complete.sh again to rebuild."
}

#-------------------------------------------------------------------------------
# Main
#-------------------------------------------------------------------------------
main() {
    log_info "FTP_Browser-CLI full build"
    run_clean
    run_install
    run_typecheck
    run_build
    run_executable
    run_package
    run_summary
}

main "$@"
