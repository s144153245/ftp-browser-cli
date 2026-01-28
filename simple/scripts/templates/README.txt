FTP_Browser-CLI Offline Package
================================

This package contains a standalone executable for FTP_Browser-CLI, plus
installation and uninstallation scripts.

Requirements
------------
- Linux x64 (glibc)
- No Node.js or internet required on target machine

Installation
------------
1. Extract:  tar -xzf ftp-browser-cli-offline-<version>-x64.tar.gz
2. Enter:    cd ftp-browser-cli-offline-<version>-x64
3. Install:
   - User (recommended):   ./install.sh
   - System-wide:          sudo ./install.sh

Uninstallation
--------------
Run from this directory (or any) with same privilege as install:
- User:   ./uninstall.sh
- System: sudo ./uninstall.sh

Usage
-----
  ftp-browser <host> [options]
  ftp-browser --help
  ftp-browser --version

Examples
--------
  ftp-browser 172.17.201.151
  ftp-browser ftp.example.com -u admin -p secret -d ./downloads

See --help for all options.
