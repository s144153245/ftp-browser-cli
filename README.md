# FTP Browser CLI

Interactive terminal FTP browser (React/Ink). Browse directories, search, preview, and download files.

## Requirements

- **Node.js** >= 18
- **npm**

## Build

```bash
cd ftp-browser-cli
npm install
npm run build
```

Full build (including offline package):

```bash
cd ftp-browser-cli
BUILD_SKIP_EXECUTABLE=1 ./scripts/build-complete.sh
```

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

## Offline Install (target server without internet)

1. On a machine with internet: run `BUILD_SKIP_EXECUTABLE=1 ./scripts/build-complete.sh`.
2. Copy `releases/ftp-browser-cli-offline-{version}-x64.tar.gz` (or the `ftp-browser-cli-offline-*` folder) to the target.
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
└── README.md
```

## License

MIT
