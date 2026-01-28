# FTP Browser CLI

Interactive terminal FTP browser (React/Ink). Browse directories, search, preview, and download files with multi-select support.

## Requirements

- **Node.js** >= 18
- **npm**

## Build

```bash
npm install
npm run build
```

Full build (including offline package):

```bash
BUILD_SKIP_EXECUTABLE=1 ./scripts/build-complete.sh
```

See [BUILD.md](BUILD.md) for details.

## Usage

```bash
npm start -- <host> [options]
# or after build:
node dist/cli.js <host> [options]
```

### Examples

```bash
npm start -- 172.17.201.151
npm start -- ftp.example.com -u admin -p secret -d ./downloads
npm start -- --help
npm start -- --version
```

### Options

| Option | Description |
|--------|-------------|
| `-u, --user` | FTP username (default: anonymous) |
| `-p, --password` | FTP password |
| `-P, --port` | FTP port (default: 21) |
| `-d, --download-dir` | Download directory (default: ./downloads) |
| `-s, --secure` | Use FTPS |
| `--timeout` | Connection timeout (ms) |
| `-h, --help` | Show help |
| `-v, --version` | Show version |

## Keyboard Shortcuts

### Browse Mode

| Key | Action |
|-----|--------|
| `Up` / `k` | Move cursor up |
| `Down` / `j` | Move cursor down |
| `Left` / `Backspace` | Go back (parent directory) |
| `Right` / `Enter` | Enter directory (DIR/LINK) |
| `Enter` (on FILE) | Toggle selection |
| `Space` | Toggle selection on current item |
| `d` | Download selected items (or current if none selected) |
| `p` | Preview file |
| `i` | Show file info (full path, size, permissions) |
| `/` | Search files |
| `r` | Refresh directory |
| `?` / `h` | Show help panel |
| `n` / `PageDown` | Next page |
| `PageUp` | Previous page |
| `g` | First page |
| `G` | Last page |
| `1-9` | Quick move cursor to item N on current page |
| `Esc` | Clear selection (if any) / Go back |
| `q` | Quit application |

### Multi-Select Workflow

1. Navigate to files using arrow keys or `j`/`k`
2. Press `Space` or `Enter` (on files) to toggle selection — a `[checkmark]` appears
3. Select multiple items across pages (selections persist)
4. Press `d` to download all selected items at once
5. Press `Esc` to clear all selections

## Offline Install (target server without internet)

1. On a machine with internet: run `BUILD_SKIP_EXECUTABLE=1 ./scripts/build-complete.sh`.
2. Copy `releases/ftp-browser-cli-offline-1.1.0-x64.tar.gz` to the target.
3. On target: `tar -xzf ftp-browser-cli-offline-*.tar.gz`, then `cd ftp-browser-cli-offline-*`, `./install.sh`.
4. Run `ftp-browser --help` or `ftp-browser <host>`.

Target machine needs Node.js >= 18. Use `./uninstall.sh` to remove.

## Project Layout

```
ftp-browser-cli/
├── src/           # App source
├── scripts/       # Build scripts
├── package.json
├── tsconfig.json
├── BUILD.md       # Build & deploy details
└── README.md
```

## License

MIT
