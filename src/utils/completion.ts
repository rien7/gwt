import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { resolve } from 'node:path'
import { tryGit } from './git'
import { tryResolveWorkspaceContext, type WorkspaceContext } from './workspace'

type CompletionQueryKind = 'remote-branches' | 'local-branches' | 'removable-branches' | 'refs'
type SupportedShell = 'zsh' | 'bash' | 'fish'

export type CompletionInstallResult = {
  installPath: string
  shellConfigPath?: string
  notes: string[]
}

const ZSH_COMPLETION_BLOCK_START = '# >>> gwt completion >>>'
const ZSH_COMPLETION_BLOCK_END = '# <<< gwt completion <<<'
const ZSH_COMPLETION_BLOCK = [
  ZSH_COMPLETION_BLOCK_START,
  'fpath=("$HOME/.zsh/completions" ${fpath[@]})',
  ZSH_COMPLETION_BLOCK_END,
].join('\n')
const ZSH_COMPLETION_BOOTSTRAP_BLOCK = [
  ZSH_COMPLETION_BLOCK_START,
  'fpath=("$HOME/.zsh/completions" ${fpath[@]})',
  'autoload -Uz compinit',
  'compinit',
  ZSH_COMPLETION_BLOCK_END,
].join('\n')
const BASH_COMPLETION_BLOCK_START = '# >>> gwt completion >>>'
const BASH_COMPLETION_BLOCK_END = '# <<< gwt completion <<<'
const BASH_COMPLETION_BLOCK = [
  BASH_COMPLETION_BLOCK_START,
  'if [ -f "$HOME/.local/share/bash-completion/completions/gwt" ]; then',
  '  . "$HOME/.local/share/bash-completion/completions/gwt"',
  'fi',
  BASH_COMPLETION_BLOCK_END,
].join('\n')
const COMPLETION_HINT_MARKER_DIR = resolve(
  process.env.XDG_STATE_HOME || resolve(homedir(), '.local', 'state'),
  'gwt',
)

export function tryHandleCompletionQuery(argv: string[]): boolean {
  if (argv[0] !== '__complete') {
    return false
  }

  const kind = argv[1] as CompletionQueryKind | undefined
  const values = kind ? getCompletionValues(kind) : []
  if (values.length) {
    process.stdout.write(`${values.join('\n')}\n`)
  }

  return true
}

export function emitCompletionScript(shell?: string): string {
  const resolvedShell = resolveShell(shell)
  if (resolvedShell === 'zsh') {
    return loadCompletionTemplate('gwt.zsh').replaceAll('{{COMMAND_NAME}}', 'gwt')
  }
  if (resolvedShell === 'bash') {
    return loadCompletionTemplate('gwt.bash').replaceAll('{{COMMAND_NAME}}', 'gwt')
  }
  if (resolvedShell === 'fish') {
    return loadCompletionTemplate('gwt.fish').replaceAll('{{COMMAND_NAME}}', 'gwt')
  }

  throw new Error(`Unsupported shell: ${resolvedShell}`)
}

export function installCompletion(shell?: string, home = homedir()): CompletionInstallResult {
  const resolvedShell = resolveShell(shell)
  if (resolvedShell === 'zsh') {
    return installZshCompletion(home)
  }
  if (resolvedShell === 'bash') {
    return installBashCompletion(home)
  }
  if (resolvedShell === 'fish') {
    return installFishCompletion(home)
  }

  throw new Error(`Unsupported shell: ${resolvedShell}`)
}

export function maybeShowCompletionInstallHint(argv: string[], home = homedir()) {
  if (!process.stderr.isTTY || process.env.CI || argv[0] === 'completion') {
    return
  }

  const shell = detectCurrentShell()
  if (!shell || hasInstalledCompletion(shell, home) || hasSeenCompletionHint(shell)) {
    return
  }

  process.stderr.write(
    [
      '',
      `[gwt] Shell completion is available for ${shell}.`,
      `[gwt] Run \`gwt completion install ${shell}\` to enable it.`,
      '',
    ].join('\n'),
  )

  mkdirSync(COMPLETION_HINT_MARKER_DIR, { recursive: true })
  writeFileSync(completionHintMarkerPath(shell), `${new Date().toISOString()}\n`)
}

function resolveShell(shell?: string): SupportedShell {
  if (shell === 'zsh' || shell === 'bash' || shell === 'fish') {
    return shell
  }

  if (!shell) {
    const currentShell = detectCurrentShell()
    if (currentShell === 'zsh' || currentShell === 'bash' || currentShell === 'fish') {
      return currentShell
    }
  }

  throw new Error('Supported shells: zsh, bash, fish. Run "gwt completion install <shell>".')
}

function getCompletionValues(kind: CompletionQueryKind): string[] {
  const context = tryResolveWorkspaceContext()
  if (!context) {
    return []
  }

  const worktreeBranches = new Set(listWorktreeBranches(context))

  if (kind === 'remote-branches') {
    return uniqueSorted(listRemoteBranches(context).filter((branch) => !worktreeBranches.has(branch)))
  }

  if (kind === 'local-branches') {
    return uniqueSorted(listLocalBranches(context))
  }

  if (kind === 'removable-branches') {
    const protectedBranches = new Set(context.config.protectedBranches)
    return uniqueSorted([...worktreeBranches].filter((branch) => !protectedBranches.has(branch)))
  }

  if (kind === 'refs') {
    return uniqueSorted(listRefs(context))
  }

  return []
}

function listLocalBranches(context: WorkspaceContext): string[] {
  return gitLines(context.commonDir, ['for-each-ref', '--format=%(refname:short)', 'refs/heads'])
}

function listRemoteBranches(context: WorkspaceContext): string[] {
  return gitLines(context.commonDir, ['for-each-ref', '--format=%(refname:short)', 'refs/remotes/origin'])
    .filter((branch) => branch !== 'origin/HEAD' && branch !== 'origin')
    .map((branch) => branch.replace(/^origin\//, ''))
}

function listRefs(context: WorkspaceContext): string[] {
  return gitLines(context.commonDir, [
    'for-each-ref',
    '--format=%(refname:short)',
    'refs/heads',
    'refs/remotes/origin',
    'refs/tags',
  ]).filter((ref) => ref !== 'origin/HEAD' && ref !== 'origin')
}

function listWorktreeBranches(context: WorkspaceContext): string[] {
  const result = tryGit(['worktree', 'list', '--porcelain'], context.workspaceRoot)
  if (result.status !== 0 || !result.stdout) {
    return []
  }

  return uniqueSorted(
    result.stdout
    .split(/\n\s*\n/)
      .map((entry) =>
        entry
          .split(/\r?\n/)
          .find((line) => line.startsWith('branch refs/heads/'))
          ?.replace('branch refs/heads/', ''),
      )
      .filter((branch): branch is string => Boolean(branch)),
  )
}

function gitLines(cwd: string, args: string[]): string[] {
  const result = tryGit(args, cwd)
  if (result.status !== 0 || !result.stdout) {
    return []
  }

  return result.stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort()
}

function loadCompletionTemplate(fileName: string): string {
  const templateUrl = new URL(`./completions/${fileName}`, import.meta.url)
  return readFileSync(templateUrl, 'utf8')
}

function installZshCompletion(home: string): CompletionInstallResult {
  const completionDir = resolve(home, '.zsh', 'completions')
  const installPath = resolve(completionDir, '_gwt')
  const zshrcPath = resolve(home, '.zshrc')

  mkdirSync(completionDir, { recursive: true })
  writeFileSync(installPath, emitCompletionScript('zsh'))

  const existing = existsSync(zshrcPath) ? readFileSync(zshrcPath, 'utf8') : ''
  const next = renderZshrcWithCompletion(existing)
  if (next !== existing) {
    writeFileSync(zshrcPath, next)
  }

  return {
    installPath,
    shellConfigPath: zshrcPath,
    notes: ['Open a new zsh session, or run `exec zsh` to reload completion.'],
  }
}

function installBashCompletion(home: string): CompletionInstallResult {
  const completionDir = resolve(home, '.local', 'share', 'bash-completion', 'completions')
  const installPath = resolve(completionDir, 'gwt')
  const bashrcPath = resolve(home, '.bashrc')

  mkdirSync(completionDir, { recursive: true })
  writeFileSync(installPath, emitCompletionScript('bash'))

  const existing = existsSync(bashrcPath) ? readFileSync(bashrcPath, 'utf8') : ''
  const next = renderManagedBlock(existing, BASH_COMPLETION_BLOCK_START, BASH_COMPLETION_BLOCK_END, BASH_COMPLETION_BLOCK)
  if (next !== existing) {
    writeFileSync(bashrcPath, next)
  }

  return {
    installPath,
    shellConfigPath: bashrcPath,
    notes: ['Open a new bash session, or run `. ~/.bashrc` to reload completion.'],
  }
}

function installFishCompletion(home: string): CompletionInstallResult {
  const configHome = process.env.XDG_CONFIG_HOME || resolve(home, '.config')
  const completionDir = resolve(configHome, 'fish', 'completions')
  const installPath = resolve(completionDir, 'gwt.fish')

  mkdirSync(completionDir, { recursive: true })
  writeFileSync(installPath, emitCompletionScript('fish'))

  return {
    installPath,
    notes: ['Open a new fish session, or run `exec fish` to reload completion.'],
  }
}

function renderZshrcWithCompletion(content: string): string {
  const normalized = stripManagedBlock(content, ZSH_COMPLETION_BLOCK_START, ZSH_COMPLETION_BLOCK_END)
  const compinitMatch = /(^|\n)[^\n]*\bcompinit\b[^\n]*/.exec(normalized)
  const block = compinitMatch ? ZSH_COMPLETION_BLOCK : ZSH_COMPLETION_BOOTSTRAP_BLOCK

  if (compinitMatch && typeof compinitMatch.index === 'number') {
    const insertAt = compinitMatch.index + (compinitMatch[1] ? compinitMatch[1].length : 0)
    const prefix = normalized.slice(0, insertAt)
    const suffix = normalized.slice(insertAt)
    return joinZshrcParts(prefix, block, suffix)
  }

  return joinZshrcParts(normalized, block)
}

function renderManagedBlock(content: string, blockStart: string, blockEnd: string, block: string): string {
  const normalized = stripManagedBlock(content, blockStart, blockEnd)
  return joinZshrcParts(normalized, block)
}

function stripManagedBlock(content: string, blockStart: string, blockEnd: string): string {
  const pattern = new RegExp(
    `${escapeRegExp(blockStart)}[\\s\\S]*?${escapeRegExp(blockEnd)}\\n?`,
    'g',
  )
  return content.replace(pattern, '').trimEnd()
}

function joinZshrcParts(...parts: string[]): string {
  const filtered = parts.map((part) => part.trim()).filter(Boolean)
  return filtered.length ? `${filtered.join('\n\n')}\n` : ''
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function detectCurrentShell(): SupportedShell | null {
  const currentShell = process.env.SHELL?.split('/').pop()
  if (currentShell === 'zsh' || currentShell === 'bash' || currentShell === 'fish') {
    return currentShell
  }

  return null
}

function hasInstalledCompletion(shell: SupportedShell, home: string): boolean {
  if (shell === 'zsh') {
    return existsSync(resolve(home, '.zsh', 'completions', '_gwt'))
  }

  if (shell === 'bash') {
    return existsSync(resolve(home, '.local', 'share', 'bash-completion', 'completions', 'gwt'))
  }

  return existsSync(resolve(process.env.XDG_CONFIG_HOME || resolve(home, '.config'), 'fish', 'completions', 'gwt.fish'))
}

function hasSeenCompletionHint(shell: SupportedShell): boolean {
  return existsSync(completionHintMarkerPath(shell))
}

function completionHintMarkerPath(shell: SupportedShell): string {
  return resolve(COMPLETION_HINT_MARKER_DIR, `${shell}-completion-hint-seen`)
}
