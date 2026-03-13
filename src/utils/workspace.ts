import { existsSync, readFileSync } from 'node:fs'
import { basename, dirname, resolve } from 'node:path'
import { tryGit } from './git'

export type GwtConfig = {
  defaultBranch: string
  protectedBranches: string[]
  autoPush: boolean
  postNew?: string
  postGet?: string
}

export type WorkspaceContext = {
  cwd: string
  workspaceRoot: string
  commonDir: string
  topLevel: string
  config: GwtConfig
}

const DEFAULT_CONFIG: GwtConfig = {
  defaultBranch: 'main',
  protectedBranches: ['main'],
  autoPush: false,
  postNew: undefined,
  postGet: undefined,
}

export function repoNameFromUrl(repoUrl: string): string {
  const normalized = repoUrl.replace(/\/+$/, '')
  const lastPart = basename(normalized)
  const name = lastPart.endsWith('.git') ? lastPart.slice(0, -4) : lastPart

  if (!name) {
    throw new Error(`Cannot infer directory name from repo url: ${repoUrl}`)
  }

  return name
}

export function branchToDir(branch: string): string {
  return branch.replaceAll('/', '-')
}

export function ensureMissingPath(targetPath: string, label: string) {
  if (existsSync(targetPath)) {
    throw new Error(`${label} already exists: ${targetPath}`)
  }
}

export function assertValidBranchName(branch: string) {
  const result = tryGit(['check-ref-format', '--branch', branch], process.cwd())

  if (result.status !== 0) {
    throw new Error(`Invalid branch name: ${branch}`)
  }
}

export function assertResolvableRef(cwd: string, ref: string) {
  if (!refExists(cwd, ref)) {
    throw new Error(`Ref does not exist: ${ref}`)
  }
}

export function refExists(cwd: string, ref: string): boolean {
  return tryGit(['rev-parse', '--verify', `${ref}^{commit}`], cwd).status === 0
}

export function localBranchExists(commonDir: string, branch: string): boolean {
  return tryGit(['show-ref', '--verify', '--quiet', `refs/heads/${branch}`], commonDir).status === 0
}

export function remoteBranchExistsOnOrigin(cwd: string, branch: string): boolean {
  const result = tryGit(['ls-remote', '--exit-code', '--heads', 'origin', branch], cwd)

  if (result.status === 0) {
    return true
  }

  if (result.status === 2) {
    return false
  }

  throw new Error(result.stderr || result.stdout || `Failed to query origin/${branch}`)
}

export function currentBranchName(cwd: string): string {
  const result = tryGit(['rev-parse', '--abbrev-ref', 'HEAD'], cwd)

  if (result.status !== 0 || !result.stdout || result.stdout === 'HEAD') {
    throw new Error('Current worktree is not on a local branch')
  }

  return result.stdout
}

export function resolveWorkspaceContext(cwd = process.cwd()): WorkspaceContext {
  const probe = tryGit(
    ['rev-parse', '--path-format=absolute', '--show-toplevel', '--git-common-dir'],
    cwd,
  )

  let topLevel: string
  let commonDir: string

  if (probe.status === 0) {
    const lines = probe.stdout.split(/\r?\n/).filter(Boolean)
    if (lines.length < 2) {
      throw new Error('not a gwt workspace')
    }

    ;[topLevel, commonDir] = lines
  } else {
    const fallback = findWorkspaceRoot(cwd)
    if (!fallback) {
      throw new Error('not a gwt workspace')
    }

    topLevel = fallback.workspaceRoot
    commonDir = fallback.commonDir
  }

  const workspaceRoot = dirname(commonDir)
  if (!existsSync(resolve(workspaceRoot, '.git')) || !existsSync(commonDir)) {
    throw new Error('not a gwt workspace')
  }

  const bareProbe = tryGit(['rev-parse', '--is-bare-repository'], commonDir)
  if (bareProbe.status !== 0 || bareProbe.stdout !== 'true') {
    throw new Error('not a gwt workspace')
  }

  return {
    cwd,
    workspaceRoot,
    commonDir,
    topLevel,
    config: loadWorkspaceConfig(workspaceRoot, commonDir),
  }
}

export function tryResolveWorkspaceContext(cwd = process.cwd()): WorkspaceContext | null {
  try {
    return resolveWorkspaceContext(cwd)
  } catch {
    return null
  }
}

export function ensureInsideWorktree(context: WorkspaceContext): string {
  if (context.topLevel === context.workspaceRoot) {
    throw new Error('This command must be run inside a worktree, not the workspace root')
  }

  return context.topLevel
}

export function isPathInside(parentPath: string, targetPath: string): boolean {
  const normalizedParent = resolve(parentPath)
  const normalizedTarget = resolve(targetPath)

  return normalizedTarget === normalizedParent || normalizedTarget.startsWith(`${normalizedParent}/`)
}

function loadWorkspaceConfig(workspaceRoot: string, commonDir: string): GwtConfig {
  const nextConfig = { ...DEFAULT_CONFIG }

  mergeConfigFile(resolve(commonDir, 'config'), nextConfig)
  mergeConfigFile(resolve(workspaceRoot, '.gwtrc'), nextConfig)

  if (!nextConfig.protectedBranches.length) {
    nextConfig.protectedBranches = [nextConfig.defaultBranch]
  }

  return nextConfig
}

function parseTomlString(value: string, key: string): string {
  const normalized = value.trim()
  if (normalized.startsWith('"') && normalized.endsWith('"')) {
    try {
      const parsed = JSON.parse(normalized)
      if (typeof parsed === 'string') {
        return parsed
      }
    } catch {
      throw new Error(`Invalid gwt config value for ${key}`)
    }
  }

  if (/^[A-Za-z0-9._/-]+$/.test(normalized)) {
    return normalized
  }

  throw new Error(`Invalid gwt config value for ${key}`)
}

function parseTomlBoolean(value: string, key: string): boolean {
  const normalized = value.trim()
  if (normalized === 'true') {
    return true
  }

  if (normalized === 'false') {
    return false
  }

  throw new Error(`Invalid gwt config value for ${key}`)
}

function parseTomlStringArray(value: string, key: string): string[] {
  const normalized = value.trim()
  const bracketed = /^\[(.*)\]$/.exec(normalized)
  const body = bracketed ? bracketed[1].trim() : normalized

  if (!body) {
    return []
  }

  return body.split(',').map((item) => parseTomlString(item.trim(), key))
}

function mergeConfigFile(configPath: string, target: GwtConfig) {
  if (!existsSync(configPath)) {
    return
  }

  const content = readFileSync(configPath, 'utf8')
  let inGwtSection = false

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.split('#')[0]?.trim() ?? ''
    if (!line) {
      continue
    }

    if (line.startsWith('[') && line.endsWith(']')) {
      inGwtSection = line === '[gwt]'
      continue
    }

    if (!inGwtSection) {
      continue
    }

    const match = /^([a-z_]+)\s*=\s*(.+)$/.exec(line)
    if (!match) {
      continue
    }

    const [, key, value] = match
    if (key === 'default_branch') {
      target.defaultBranch = parseTomlString(value, 'default_branch')
    } else if (key === 'protected_branches') {
      target.protectedBranches = parseTomlStringArray(value, 'protected_branches')
    } else if (key === 'auto_push') {
      target.autoPush = parseTomlBoolean(value, 'auto_push')
    } else if (key === 'post_new') {
      target.postNew = parseTomlString(value, 'post_new')
    } else if (key === 'post_get') {
      target.postGet = parseTomlString(value, 'post_get')
    }
  }
}

function findWorkspaceRoot(cwd: string): { workspaceRoot: string; commonDir: string } | null {
  let current = resolve(cwd)

  while (true) {
    const bareDir = basename(current) === '.bare' ? current : resolve(current, '.bare')
    const workspaceRoot = basename(current) === '.bare' ? dirname(current) : current
    const dotGitPath = resolve(workspaceRoot, '.git')

    if (existsSync(bareDir) && existsSync(dotGitPath)) {
      const gitPointer = readFileSync(dotGitPath, 'utf8').trim()
      const match = /^gitdir:\s*(.+)$/.exec(gitPointer)
      if (match) {
        const resolvedGitDir = resolve(workspaceRoot, match[1])
        if (resolvedGitDir === bareDir && basename(resolvedGitDir) === '.bare') {
          return {
            workspaceRoot,
            commonDir: bareDir,
          }
        }
      }
    }

    const parent = dirname(current)
    if (parent === current) {
      return null
    }

    current = parent
  }
}
