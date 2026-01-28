#!/bin/bash
#==============================================================================
# FTP_Browser-CLI Offline Package Builder
# 在有網路的機器上執行，生成完整離線安裝包
# Usage: ./build_offline_package.sh [--with-node]
#==============================================================================

set -euo pipefail

# Configuration
APP_NAME="FTP_Browser-CLI"
VERSION="1.0.0"
BUILD_DIR="$(pwd)/offline-build"
OUTPUT_DIR="$(pwd)/releases"
PACKAGE_NAME="ftp-browser-cli-offline"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'
BOLD='\033[1m'

# Options
INCLUDE_NODE=false
NODE_VERSION="20.10.0"  # LTS version

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --with-node)
            INCLUDE_NODE=true
            shift
            ;;
        --node-version)
            NODE_VERSION="$2"
            shift 2
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --with-node          Include portable Node.js runtime"
            echo "  --node-version VER   Specify Node.js version (default: $NODE_VERSION)"
            echo "  -h, --help           Show this help"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

#==============================================================================
# Functions
#==============================================================================

log_header() {
    echo ""
    echo -e "${BOLD}${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}${BLUE}  $1${NC}"
    echo -e "${BOLD}${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

log_step() {
    echo -e "${CYAN}→ $1${NC}"
}

log_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

log_error() {
    echo -e "${RED}✗ $1${NC}"
}

cleanup() {
    log_step "Cleaning up temporary files..."
    rm -rf "$BUILD_DIR"
}

#==============================================================================
# Pre-flight Checks
#==============================================================================

log_header "FTP_Browser-CLI Offline Package Builder v${VERSION}"

echo -e "${CYAN}Build Configuration:${NC}"
echo "  Include Node.js: $INCLUDE_NODE"
if [ "$INCLUDE_NODE" = true ]; then
    echo "  Node.js version: $NODE_VERSION"
fi
echo "  Output directory: $OUTPUT_DIR"
echo ""

# Check required tools
log_step "Checking required tools..."

REQUIRED_TOOLS=("node" "npm" "tar" "gzip")
for tool in "${REQUIRED_TOOLS[@]}"; do
    if ! command -v "$tool" &> /dev/null; then
        log_error "$tool is required but not installed"
        exit 1
    fi
done

# Check Node.js version
NODE_MAJOR=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_MAJOR" -lt 18 ]; then
    log_error "Node.js 18+ is required for building (found: $(node -v))"
    exit 1
fi

log_success "All required tools available"

#==============================================================================
# Prepare Build Directory
#==============================================================================

log_header "Preparing Build Environment"

# Clean previous build
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"
mkdir -p "$OUTPUT_DIR"

# Create package structure
PACKAGE_DIR="$BUILD_DIR/$PACKAGE_NAME"
mkdir -p "$PACKAGE_DIR"/{bin,lib,scripts,docs}

log_success "Build directory created: $BUILD_DIR"

#==============================================================================
# Build Application
#==============================================================================

log_header "Building Application"

# Check if we're in the project directory
if [ ! -f "package.json" ]; then
    log_error "package.json not found. Run this script from the project root."
    exit 1
fi

# Install dependencies
log_step "Installing dependencies..."
npm ci --production=false 2>&1 | tail -5

# Build the application
log_step "Building TypeScript..."
npm run build 2>&1 | tail -3

log_success "Application built successfully"

#==============================================================================
# Create Standalone Binary (Option A)
#==============================================================================

log_header "Creating Standalone Binary"

# Check if pkg is available
if ! command -v pkg &> /dev/null; then
    log_step "Installing pkg globally..."
    npm install -g pkg
fi

# Determine target architectures
TARGETS="node18-linux-x64"
if [ "$(uname -m)" = "aarch64" ]; then
    TARGETS="$TARGETS,node18-linux-arm64"
fi

log_step "Creating standalone executables..."
pkg . --targets "$TARGETS" --output "$PACKAGE_DIR/bin/ftp-browser" 2>&1 | tail -5

# Verify binary was created
if [ -f "$PACKAGE_DIR/bin/ftp-browser" ] || [ -f "$PACKAGE_DIR/bin/ftp-browser-linux" ]; then
    # Rename if needed
    for f in "$PACKAGE_DIR/bin/ftp-browser"*; do
        if [ -f "$f" ]; then
            chmod +x "$f"
            log_success "Binary created: $(basename $f)"
        fi
    done
else
    log_warning "pkg binary creation may have failed, falling back to npm package"
fi

#==============================================================================
# Package npm Modules (Option B - Fallback)
#==============================================================================

log_header "Packaging npm Modules (Fallback)"

log_step "Copying production dependencies..."

# Create a clean production install
PROD_DIR="$BUILD_DIR/production"
mkdir -p "$PROD_DIR"

cp package.json package-lock.json "$PROD_DIR/"
cp -r dist "$PROD_DIR/"

cd "$PROD_DIR"
npm ci --production --ignore-scripts 2>&1 | tail -3
cd - > /dev/null

# Copy to package
cp -r "$PROD_DIR"/* "$PACKAGE_DIR/lib/"

log_success "npm modules packaged"

#==============================================================================
# Include Portable Node.js (Optional)
#==============================================================================

if [ "$INCLUDE_NODE" = true ]; then
    log_header "Including Portable Node.js Runtime"
    
    NODE_DIR="$PACKAGE_DIR/node"
    mkdir -p "$NODE_DIR"
    
    # Download Node.js
    ARCH=$(uname -m)
    if [ "$ARCH" = "x86_64" ]; then
        NODE_ARCH="x64"
    elif [ "$ARCH" = "aarch64" ]; then
        NODE_ARCH="arm64"
    else
        NODE_ARCH="x64"
    fi
    
    NODE_URL="https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-${NODE_ARCH}.tar.xz"
    NODE_TAR="$BUILD_DIR/node.tar.xz"
    
    log_step "Downloading Node.js v${NODE_VERSION} (${NODE_ARCH})..."
    curl -L -o "$NODE_TAR" "$NODE_URL" 2>&1 | tail -1
    
    log_step "Extracting Node.js..."
    tar -xf "$NODE_TAR" -C "$NODE_DIR" --strip-components=1
    
    # Keep only essential files
    log_step "Optimizing Node.js bundle..."
    rm -rf "$NODE_DIR"/{share,include,lib/node_modules/npm/docs,lib/node_modules/npm/man}
    
    NODE_SIZE=$(du -sh "$NODE_DIR" | cut -f1)
    log_success "Node.js v${NODE_VERSION} included (${NODE_SIZE})"
fi

#==============================================================================
# Create Installation Scripts
#==============================================================================

log_header "Creating Installation Scripts"

# Main install script
cat > "$PACKAGE_DIR/install.sh" << 'INSTALL_SCRIPT'
#!/bin/bash
#==============================================================================
# FTP_Browser-CLI Offline Installer
#==============================================================================

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'
BOLD='\033[1m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTALL_DIR="${INSTALL_DIR:-/usr/local}"
USER_INSTALL_DIR="${HOME}/.local"

echo -e "${BOLD}${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${BLUE}║${NC}          ${BOLD}FTP_Browser-CLI Offline Installer${NC}                ${BOLD}${BLUE}║${NC}"
echo -e "${BOLD}${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Detect installation mode
if [ "$(id -u)" -eq 0 ]; then
    echo -e "${CYAN}Running as root - will install to ${INSTALL_DIR}${NC}"
    TARGET_BIN="${INSTALL_DIR}/bin"
    TARGET_LIB="${INSTALL_DIR}/lib/ftp-browser"
else
    echo -e "${CYAN}Running as user - will install to ${USER_INSTALL_DIR}${NC}"
    TARGET_BIN="${USER_INSTALL_DIR}/bin"
    TARGET_LIB="${USER_INSTALL_DIR}/lib/ftp-browser"
    INSTALL_DIR="$USER_INSTALL_DIR"
fi

echo ""

# Create directories
mkdir -p "$TARGET_BIN" "$TARGET_LIB"

# Check for standalone binary first
if [ -f "$SCRIPT_DIR/bin/ftp-browser" ]; then
    echo -e "${GREEN}→ Installing standalone binary...${NC}"
    cp "$SCRIPT_DIR/bin/ftp-browser" "$TARGET_BIN/"
    chmod +x "$TARGET_BIN/ftp-browser"
    echo -e "${GREEN}✓ Installed to ${TARGET_BIN}/ftp-browser${NC}"
    
elif [ -f "$SCRIPT_DIR/bin/ftp-browser-linux" ]; then
    echo -e "${GREEN}→ Installing standalone binary...${NC}"
    cp "$SCRIPT_DIR/bin/ftp-browser-linux" "$TARGET_BIN/ftp-browser"
    chmod +x "$TARGET_BIN/ftp-browser"
    echo -e "${GREEN}✓ Installed to ${TARGET_BIN}/ftp-browser${NC}"

else
    # Fall back to Node.js based installation
    echo -e "${YELLOW}→ Standalone binary not found, using Node.js package...${NC}"
    
    # Check for bundled Node.js
    if [ -d "$SCRIPT_DIR/node" ]; then
        echo -e "${CYAN}→ Using bundled Node.js...${NC}"
        NODE_BIN="$SCRIPT_DIR/node/bin/node"
        cp -r "$SCRIPT_DIR/node" "$TARGET_LIB/"
        NODE_BIN="$TARGET_LIB/node/bin/node"
    else
        # Check system Node.js
        if command -v node &> /dev/null; then
            NODE_BIN=$(which node)
            NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
            if [ "$NODE_VERSION" -lt 18 ]; then
                echo -e "${RED}✗ Node.js 18+ is required (found: v${NODE_VERSION})${NC}"
                echo "  Please install Node.js 18+ or use the --with-node build option"
                exit 1
            fi
            echo -e "${GREEN}✓ Using system Node.js: $NODE_BIN${NC}"
        else
            echo -e "${RED}✗ Node.js not found and not bundled${NC}"
            echo "  Please install Node.js 18+ or rebuild package with --with-node"
            exit 1
        fi
    fi
    
    # Copy library files
    echo -e "${CYAN}→ Installing library files...${NC}"
    cp -r "$SCRIPT_DIR/lib/"* "$TARGET_LIB/"
    
    # Create wrapper script
    cat > "$TARGET_BIN/ftp-browser" << EOF
#!/bin/bash
exec "$NODE_BIN" "$TARGET_LIB/dist/cli.js" "\$@"
EOF
    chmod +x "$TARGET_BIN/ftp-browser"
    echo -e "${GREEN}✓ Wrapper script created${NC}"
fi

# Verify installation
echo ""
if "$TARGET_BIN/ftp-browser" --version &> /dev/null; then
    echo -e "${GREEN}${BOLD}✓ Installation successful!${NC}"
else
    # Try to run it anyway for error message
    "$TARGET_BIN/ftp-browser" --version 2>&1 || true
fi

echo ""

# Check PATH
if [[ ":$PATH:" != *":$TARGET_BIN:"* ]]; then
    echo -e "${YELLOW}Note: ${TARGET_BIN} is not in your PATH${NC}"
    echo ""
    echo "Add to your ~/.bashrc or ~/.zshrc:"
    echo -e "  ${CYAN}export PATH=\"${TARGET_BIN}:\$PATH\"${NC}"
    echo ""
    echo "Then run:"
    echo -e "  ${CYAN}source ~/.bashrc${NC}"
    echo ""
fi

echo -e "${GREEN}Usage:${NC}"
echo "  ftp-browser <host> [options]"
echo ""
echo "Examples:"
echo "  ftp-browser 172.17.201.151"
echo "  ftp-browser ftp.example.com -u admin -p secret"
echo ""
echo -e "Run ${CYAN}ftp-browser --help${NC} for more options."
INSTALL_SCRIPT

chmod +x "$PACKAGE_DIR/install.sh"
log_success "install.sh created"

# Uninstall script
cat > "$PACKAGE_DIR/uninstall.sh" << 'UNINSTALL_SCRIPT'
#!/bin/bash
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

echo "Uninstalling FTP_Browser-CLI..."

# Try both locations
rm -f /usr/local/bin/ftp-browser 2>/dev/null || true
rm -rf /usr/local/lib/ftp-browser 2>/dev/null || true
rm -f ~/.local/bin/ftp-browser 2>/dev/null || true
rm -rf ~/.local/lib/ftp-browser 2>/dev/null || true

echo -e "${GREEN}✓ FTP_Browser-CLI uninstalled${NC}"
UNINSTALL_SCRIPT

chmod +x "$PACKAGE_DIR/uninstall.sh"
log_success "uninstall.sh created"

#==============================================================================
# Copy Documentation and Scripts
#==============================================================================

log_header "Adding Documentation"

# Copy check scripts
cp "$(dirname "$0")/target_host_check.sh" "$PACKAGE_DIR/scripts/" 2>/dev/null || true
cp "$(dirname "$0")/ftp_server_check.sh" "$PACKAGE_DIR/scripts/" 2>/dev/null || true

# Create README
cat > "$PACKAGE_DIR/README.txt" << EOF
===============================================================================
FTP_Browser-CLI v${VERSION} - Offline Installation Package
===============================================================================

This package contains everything needed to install FTP_Browser-CLI on a
Linux system without internet access.

CONTENTS
--------
  bin/              - Standalone binary (if available)
  lib/              - Node.js package and dependencies
  node/             - Portable Node.js runtime (if included)
  scripts/          - Utility scripts
  install.sh        - Installation script
  uninstall.sh      - Uninstallation script

QUICK INSTALL
-------------
  chmod +x install.sh
  ./install.sh                    # Install to ~/.local/bin (user)
  sudo ./install.sh               # Install to /usr/local/bin (system)

BEFORE INSTALLATION
-------------------
  1. Check target system compatibility:
     chmod +x scripts/target_host_check.sh
     ./scripts/target_host_check.sh

  2. Check FTP server features:
     chmod +x scripts/ftp_server_check.sh
     ./scripts/ftp_server_check.sh <ftp_host> [user] [password]

USAGE
-----
  ftp-browser <host> [options]

  Options:
    -u, --user <username>      FTP username (default: anonymous)
    -p, --password <password>  FTP password
    -P, --port <port>          FTP port (default: 21)
    -d, --download-dir <path>  Download directory (default: ./downloads)
    -s, --secure               Use FTPS
    --help                     Show help

  Examples:
    ftp-browser 172.17.201.151
    ftp-browser ftp.example.com -u admin -p secret

KEYBOARD SHORTCUTS
------------------
  ↑/k         Move up
  ↓/j         Move down
  Enter       Open directory / Download file
  b           Go back (parent directory)
  /           Search files
  d           Download selected
  r           Refresh
  ?           Show help
  q           Quit

TROUBLESHOOTING
---------------
  If the binary doesn't work:
    - Check glibc version: ldd --version
    - Requires glibc 2.28+ for Node.js 18 binaries
    - Use portable Node.js: rebuild with --with-node

  If terminal display is corrupted:
    - Ensure TERM is set: export TERM=xterm-256color
    - Ensure UTF-8 locale: export LANG=en_US.UTF-8

BUILD INFO
----------
  Built on: $(date)
  Node.js: $(node -v)
  Architecture: $(uname -m)
  
===============================================================================
EOF

log_success "README.txt created"

#==============================================================================
# Create Final Package
#==============================================================================

log_header "Creating Final Package"

cd "$BUILD_DIR"

# Calculate size before compression
UNCOMPRESSED_SIZE=$(du -sh "$PACKAGE_NAME" | cut -f1)
log_step "Package size (uncompressed): $UNCOMPRESSED_SIZE"

# Create tarball
TARBALL="${PACKAGE_NAME}-${VERSION}-$(uname -m).tar.gz"
log_step "Creating $TARBALL..."

tar -czvf "$OUTPUT_DIR/$TARBALL" "$PACKAGE_NAME" 2>&1 | tail -5

# Get final size
COMPRESSED_SIZE=$(du -sh "$OUTPUT_DIR/$TARBALL" | cut -f1)

log_success "Package created: $OUTPUT_DIR/$TARBALL"
log_success "Compressed size: $COMPRESSED_SIZE"

#==============================================================================
# Summary
#==============================================================================

log_header "Build Complete!"

echo -e "${GREEN}${BOLD}Package ready for offline installation:${NC}"
echo ""
echo "  $OUTPUT_DIR/$TARBALL"
echo ""
echo -e "${CYAN}To install on target machine:${NC}"
echo ""
echo "  1. Copy the tarball to target machine"
echo "  2. Extract: tar -xzvf $TARBALL"
echo "  3. Run: cd $PACKAGE_NAME && ./install.sh"
echo ""

# Cleanup
cleanup

log_success "Done!"
