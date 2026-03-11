import { readFileSync } from 'node:fs'
import { tryGit } from './git'
import { tryResolveWorkspaceContext, type WorkspaceContext } from './workspace'

type CompletionQueryKind = 'remote-branches' | 'local-branches' | 'removable-branches' | 'refs'
type SupportedShell = 'zsh'

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

  throw new Error(`Unsupported shell: ${resolvedShell}`)
}

function resolveShell(shell?: string): SupportedShell {
  if (shell === 'zsh') {
    return shell
  }

  if (!shell) {
    const currentShell = process.env.SHELL?.split('/').pop()
    if (currentShell === 'zsh') {
      return 'zsh'
    }
  }

  throw new Error('Only zsh completion is supported right now. Run "gwt completion zsh".')
}

function getCompletionValues(kind: CompletionQueryKind): string[] {
  const context = tryResolveWorkspaceContext()
  if (!context) {
    return []
  }

  if (kind === 'remote-branches') {
    return uniqueSorted(listRemoteBranches(context))
  }

  if (kind === 'local-branches') {
    return uniqueSorted(listLocalBranches(context))
  }

  if (kind === 'removable-branches') {
    const protectedBranches = new Set(context.config.protectedBranches)
    return uniqueSorted(listLocalBranches(context).filter((branch) => !protectedBranches.has(branch)))
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
