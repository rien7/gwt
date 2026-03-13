# @rien7/gwt

`gwt` is a CLI for managing Git worktrees with a bare-repo workspace layout.

Install it from npm as `@rien7/gwt`. The installed command is `gwt`.

The goal is to make multi-branch Git work more predictable:

- one workspace root per repository
- one shared `.bare/` Git database
- one directory per active branch
- one command surface for the common worktree flows

## Install

Install globally with npm:

```bash
npm install -g @rien7/gwt
```

Or with pnpm:

```bash
pnpm add -g @rien7/gwt
```

After installation, check the command:

```bash
gwt --help
```

If you use zsh, install completion once:

```bash
gwt completion install zsh
```

For bash or fish:

```bash
gwt completion install bash
gwt completion install fish
```

If you install `gwt` from npm, the package includes a shell-aware completion hint. Some npm setups hide lifecycle script output; in that case `gwt` prints the same hint once on first interactive run.

## Workspace Layout

After `gwt init`, a workspace looks like this:

```text
my-project/
├── .bare/
├── .git
├── main/
├── feature-auth/
└── bugfix-login-crash/
```

How it works:

- `.bare/` contains the shared Git repository
- `.git` points Git to `.bare/`
- each worktree lives as a sibling directory in the workspace root
- branch names map to directory names by replacing `/` with `-`

Branch names map to directory names like this:

| Branch | Directory |
| --- | --- |
| `main` | `main` |
| `feature/auth` | `feature-auth` |
| `bugfix/login-crash` | `bugfix-login-crash` |

## Quick Start

Initialize a workspace from a remote repository:

```bash
gwt init git@github.com:owner/repo.git
```

Create a new local branch worktree:

```bash
cd my-project/main
gwt new feature/example
```

Attach a worktree for an existing branch:

```bash
gwt get feature/existing
```

List active worktrees:

```bash
gwt ls
```

Update shared remote tracking branches:

```bash
gwt sync
```

## Commands

### `gwt init <repoUrl> [dirName]`

Create a new bare-repo workspace.

Useful options:

- `-b, --branch <name>`: use a default branch other than `main`

Examples:

```bash
gwt init git@github.com:owner/repo.git
gwt init git@github.com:owner/repo.git my-project --branch master
```

### `gwt new <branch>`

Create a new local branch and its worktree from `origin/<default-branch>`.

Useful options:

- `-p, --push`: push the new branch and set upstream
- `--from <ref>`: start from a custom ref
- `--no-fetch`: skip `git fetch --all`
- `--print-path`: print the created worktree path only

Examples:

```bash
gwt new feature/example
gwt new feature/example --from origin/release/1.0
gwt new feature/example --push
cd "$(gwt new feature/example --print-path)"
```

### `gwt get <branch>`

Create or attach a worktree for an existing branch. If the local branch already exists, `gwt get` attaches a worktree to it. Otherwise it creates the local branch from `origin/<branch>`.

Useful options:

- `--no-fetch`: skip `git fetch --all`
- `--print-path`: print the created worktree path only

Example:

```bash
gwt get feature/existing
cd "$(gwt get feature/existing --print-path)"
```

### `gwt rm <branch>`

Remove a worktree and delete its local branch.

Useful options:

- `-f, --force`: force removal when the worktree has local changes
- `-r, --remote`: also delete the remote branch

### `gwt completion [shell]`

Print a shell completion script for `zsh`, `bash`, or `fish`.

### `gwt completion install [shell]`

Install the completion file for `zsh`, `bash`, or `fish` and update shell config when needed.

### `gwt sync`

Run `git fetch --all --prune` for the shared workspace.

Useful option:

- `--rebase`: after fetching, rebase the current worktree branch onto its remote

### `gwt pull`

Fetch and update the current worktree branch from origin.

Useful option:

- `--merge`: use merge instead of rebase

### `gwt ls`

List active worktrees using paths relative to the workspace root.

### `gwt prune`

Clean stale worktree metadata after directories were removed manually.

## Configuration

You can configure workspace defaults in either:

- `<workspace-root>/.gwtrc`
- `<workspace-root>/.bare/config`

Supported keys under `[gwt]`:

```toml
[gwt]
default_branch = "main"
protected_branches = ["main", "develop"]
auto_push = false
post_new = "code {path}"
post_get = "cd \"$1\" && npm install"
```

Meaning:

- `default_branch`: base branch used by `gwt new`
- `protected_branches`: branches that `gwt rm` refuses to delete
- `auto_push`: whether `gwt new` should push by default
- `post_new`: shell command to run after `gwt new`
- `post_get`: shell command to run after `gwt get`

Hook placeholders:

- `{path}`: absolute path to the created worktree
- `{branch}`: branch name
- `{workspace_root}`: workspace root
- `{event}`: `post_new` or `post_get`

Hook positional arguments:

- `$1`: absolute worktree path
- `$2`: branch name
- `$3`: workspace root
- `$4`: event name

The same values are also exported as environment variables:

- `GWT_HOOK_PATH`
- `GWT_HOOK_BRANCH`
- `GWT_HOOK_WORKSPACE_ROOT`
- `GWT_HOOK_EVENT`

If a hook exits non-zero, `gwt` prints a warning but keeps the created worktree.

Hooks run in a child shell rooted at the workspace root, so `cd "$1"` only affects the hook itself, not your current shell.
For example, `post_get = "cd \"$1\" && npm install"` runs dependency installation inside the new worktree. Hook output streams live to the terminal; with `--print-path`, the path stays on `stdout` and hook logs go to `stderr`.

## Shell Completion

Install completion:

```bash
gwt completion install zsh
gwt completion install bash
gwt completion install fish
```

Completion includes:

- command completion
- option completion
- dynamic branch completion for `gwt get`, excluding branches that already have a worktree
- dynamic removable branch completion for `gwt rm`
- dynamic ref completion for `gwt new --from`

Dynamic branch and ref candidates only appear when the current directory is inside a `gwt` workspace.

## Development

Install dependencies and build locally:

```bash
pnpm install
pnpm build
```

During local development you can run:

```bash
node dist/index.mjs --help
```

Or link the package globally:

```bash
pnpm link --global
```
