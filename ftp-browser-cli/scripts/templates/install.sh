#!/bin/bash
#===============================================================================
# FTP_Browser-CLI Offline Installer
# Installs ftp-browser to ~/.local/bin (user) or /usr/local/bin (system).
# Usage: ./install.sh [user install] | sudo ./install.sh [system install]
#===============================================================================

set -o pipefail

#-------------------------------------------------------------------------------
# Configuration
#-------------------------------------------------------------------------------
BIN_NAME="ftp-browser"
USER_BIN_DIR="${HOME}/.local/bin"
SYSTEM_BIN_DIR="/usr/local/bin"

#-------------------------------------------------------------------------------
# Error Codes
#-------------------------------------------------------------------------------
ERR_GENERAL=1
ERR_NOT_FOUND=20
ERR_PERMISSION=21

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

#-------------------------------------------------------------------------------
# Helpers
#-------------------------------------------------------------------------------
get_script_dir() {
    local src="${BASH_SOURCE[0]}"
    while [ -h "$src" ]; do
        local d
        d="$(cd -P "$(dirname "$src")" && pwd)"
        src="$(readlink "$src")"
        [[ $src != /* ]] && src="$d/$src"
    done
    printf '%s' "$(cd -P "$(dirname "$src")" && pwd)"
}

#-------------------------------------------------------------------------------
# Install
#-------------------------------------------------------------------------------
USER_APP_DIR="${HOME}/.local/share/ftp-browser"
SYSTEM_APP_DIR="/usr/local/share/ftp-browser"

do_install_binary() {
    local script_dir bin_dir exe_src
    script_dir="$(get_script_dir)"
    exe_src="${script_dir}/bin/${BIN_NAME}"
    if [ "$(id -u)" -eq 0 ]; then
        bin_dir="$SYSTEM_BIN_DIR"
        log_info "System installation -> $bin_dir"
    else
        bin_dir="$USER_BIN_DIR"
        log_info "User installation -> $bin_dir"
    fi
    mkdir -p "$bin_dir" || { log_err "Failed to create $bin_dir"; exit $ERR_PERMISSION; }
    cp -f "$exe_src" "${bin_dir}/${BIN_NAME}" || { log_err "Failed to copy executable"; exit $ERR_GENERAL; }
    chmod 755 "${bin_dir}/${BIN_NAME}" || { log_err "Failed to set permissions"; exit $ERR_GENERAL; }
    log_ok "Installed ${BIN_NAME} to ${bin_dir}/${BIN_NAME}"
}

do_install_nodebased() {
    local script_dir app_dir bin_dir launcher
    script_dir="$(get_script_dir)"
    if [ "$(id -u)" -eq 0 ]; then
        app_dir="$SYSTEM_APP_DIR"
        bin_dir="$SYSTEM_BIN_DIR"
        log_info "System installation (node-based) -> $app_dir, $bin_dir"
    else
        app_dir="$USER_APP_DIR"
        bin_dir="$USER_BIN_DIR"
        log_info "User installation (node-based) -> $app_dir, $bin_dir"
    fi
    mkdir -p "$bin_dir" "$app_dir" || { log_err "Failed to create directories"; exit $ERR_PERMISSION; }
    cp -rf "$script_dir"/* "$app_dir/" || { log_err "Failed to copy package"; exit $ERR_GENERAL; }
    launcher="${bin_dir}/${BIN_NAME}"
    printf '%s\n' '#!/bin/bash' "exec node \"$app_dir/app/dist/cli.js\" \"\$@\"" > "$launcher"
    chmod 755 "$launcher" || { log_err "Failed to set permissions"; exit $ERR_GENERAL; }
    log_ok "Installed ${BIN_NAME} (node-based) to ${bin_dir}/${BIN_NAME}"
}

do_install() {
    local script_dir exe_src
    script_dir="$(get_script_dir)"
    exe_src="${script_dir}/bin/${BIN_NAME}"
    if [ ! -f "$exe_src" ]; then
        log_err "Executable not found: $exe_src"
        exit $ERR_NOT_FOUND
    fi
    if [ -f "${script_dir}/.node-based" ] || [ -d "${script_dir}/app" ]; then
        do_install_nodebased
    else
        do_install_binary
    fi
    if [ "$(id -u)" -ne 0 ] && [[ ":$PATH:" != *":${USER_BIN_DIR}:"* ]]; then
        log_warn "Ensure ${USER_BIN_DIR} is in your PATH (e.g. add to .bashrc or .profile)."
    fi
    log_ok "Installation complete. Run '${BIN_NAME} --help' to verify."
}

do_install
exit 0
