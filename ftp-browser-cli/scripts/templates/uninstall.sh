#!/bin/bash
#===============================================================================
# FTP_Browser-CLI Offline Uninstaller
# Removes ftp-browser from ~/.local/bin or /usr/local/bin.
# Usage: ./uninstall.sh [user] | sudo ./uninstall.sh [system]
#===============================================================================

set -o pipefail

#-------------------------------------------------------------------------------
# Configuration
#-------------------------------------------------------------------------------
BIN_NAME="ftp-browser"
USER_BIN_DIR="${HOME}/.local/bin"
SYSTEM_BIN_DIR="/usr/local/bin"
USER_APP_DIR="${HOME}/.local/share/ftp-browser"
SYSTEM_APP_DIR="/usr/local/share/ftp-browser"

#-------------------------------------------------------------------------------
# Error Codes
#-------------------------------------------------------------------------------
ERR_GENERAL=1

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
log_err()  { echo -e "${RED}[ERROR]${NC} $*" >&2; }

#-------------------------------------------------------------------------------
# Uninstall
#-------------------------------------------------------------------------------
do_uninstall() {
    local removed=0
    local bin_dir app_dir

    if [ "$(id -u)" -eq 0 ]; then
        bin_dir="$SYSTEM_BIN_DIR"
        app_dir="$SYSTEM_APP_DIR"
    else
        bin_dir="$USER_BIN_DIR"
        app_dir="$USER_APP_DIR"
    fi

    if [ -f "${bin_dir}/${BIN_NAME}" ]; then
        rm -f "${bin_dir}/${BIN_NAME}"
        log_ok "Removed ${bin_dir}/${BIN_NAME}"
        removed=1
    else
        log_info "Not installed in ${bin_dir}; skipping."
    fi

    if [ -d "$app_dir" ]; then
        rm -rf "$app_dir"
        log_ok "Removed $app_dir"
        removed=1
    fi

    if [ "$removed" -eq 1 ]; then
        log_ok "Uninstallation complete."
    else
        log_info "No installation found. Nothing to remove."
    fi
}

do_uninstall
exit 0
