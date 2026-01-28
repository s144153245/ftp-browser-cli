# Build & Deploy

Build scripts and offline package for FTP_Browser-CLI.

## Requirements

- **Node.js** >= 18
- **npm** (comes with Node)
- **Linux** (primary build target; WSL2 works)

## Build Process

### Quick Build

```bash
npm run build
```

Produces `dist/cli.js` (ESM bundle with external npm packages). Run with `node dist/cli.js` or `npm start`; `node_modules` must be present.

### Full Build (executable + offline package)

```bash
./scripts/build-complete.sh
```

To skip the pkg step (avoids long run when deps use top-level await):

```bash
BUILD_SKIP_EXECUTABLE=1 ./scripts/build-complete.sh
```

Or step by step:

```bash
npm install
npm run typecheck
npm run build
npm run build:executable
npm run build:package
```

### Pre-release Verification

```bash
npm run pre-release
```

Runs typecheck, build, and verifies executable and offline package.

## Build Options

| Script | Description |
|--------|-------------|
| `npm run build` | Bundle app to `dist/cli.js` (esbuild, packages external) |
| `npm run build:executable` | Create `releases/ftp-browser-linux-x64` via pkg |
| `npm run build:package` | Create `releases/ftp-browser-cli-offline-{version}-x64.tar.gz` |
| `npm run build:complete` | Clean, install, typecheck, build, executable, package |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run pre-release` | Verification checklist |

## Output Files

| File | Description |
|------|-------------|
| `dist/cli.js` | Bundled CLI (requires `node_modules`) |
| `releases/ftp-browser-linux-x64` | Standalone Linux x64 executable |
| `releases/ftp-browser-cli-offline-{version}-x64.tar.gz` | Offline install package |

## Offline Package Contents

**With standalone executable (pkg):**

```
ftp-browser-cli-offline-{version}-x64/
├── bin/
│   └── ftp-browser    # Standalone executable
├── install.sh
├── uninstall.sh
├── README.txt
└── VERSION
```

**Node-based (when pkg fails):**

```
ftp-browser-cli-offline-{version}-x64/
├── bin/
│   └── ftp-browser    # Wrapper: node app/dist/cli.js
├── app/
│   ├── dist/cli.js
│   └── node_modules/
├── .node-based        # Marker for install script
├── install.sh
├── uninstall.sh
├── README.txt
└── VERSION
```

Install copies the package to `~/.local/share/ftp-browser` (or `/usr/local/share`) and adds a launcher in `~/.local/bin` (or `/usr/local/bin`).

## Installation (from offline package)

1. Transfer `ftp-browser-cli-offline-*.tar.gz` to target machine.
2. Extract: `tar -xzf ftp-browser-cli-offline-*.tar.gz`
3. Enter: `cd ftp-browser-cli-offline-*`
4. Install:
   - User: `./install.sh`
   - System: `sudo ./install.sh`
5. Verify: `ftp-browser --version` and `ftp-browser <host>`

## Uninstallation

Run from any directory with same privilege as install:

- User: `./uninstall.sh`
- System: `sudo ./uninstall.sh`

## Troubleshooting

### Build fails with "Cannot find package"

Run `npm install` in the project root.

### "Dynamic require of X is not supported"

The app uses `packages: 'external'`; do not bundle npm deps. Ensure you run `node dist/cli.js` from the project root (where `node_modules` exists) or use the standalone executable.

### pkg executable fails (Babel parse / top-level await)

- Current deps (e.g. yoga-layout, ink) use top-level `await`; pkg’s Babel parse fails.
- Use the **node-based offline package** instead: run `npm run build:package` (without `build:executable`). The package will include `dist/` + `node_modules` + a wrapper. Install same as usual.

### pkg executable fails on target

- Ensure target is Linux x64 (glibc).
- Test in a minimal container: `docker run --rm -v $(pwd)/releases:/out -i ubuntu:22.04 /out/ftp-browser-linux-x64 --version`

### Typecheck fails

Run `npm run typecheck` and fix reported TypeScript errors.

### install.sh "Executable not found"

Run `install.sh` from inside the extracted package directory (same folder as `bin/`, `install.sh`).

## Version Management

Version is read from `package.json`. `scripts/version.ts` writes a `VERSION` file for the offline package. Keep `package.json` version and `src/utils/constants.ts` version in sync (or use a single source of truth).
