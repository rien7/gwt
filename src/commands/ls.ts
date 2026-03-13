import { relative } from 'node:path'
import type { CAC } from 'cac'
import { runCliAction } from '../utils/cli'
import { runGit } from '../utils/git'
import { resolveWorkspaceContext } from '../utils/workspace'

export function registerLsCommand(cli: CAC) {
  cli.command('ls', 'List all active worktrees').action(() =>
    runCliAction(() => {
      const context = resolveWorkspaceContext()
      const output = runGit(['worktree', 'list'], context.workspaceRoot).stdout

      if (output) {
        const formatted = output
          .split(/\r?\n/)
          .map((line) => formatWorktreeListLine(line, context.workspaceRoot))
          .join('\n')

        process.stdout.write(`${formatted}\n`)
      }
    }),
  )
}

function formatWorktreeListLine(line: string, workspaceRoot: string): string {
  const trimmed = line.trim()
  if (!trimmed) {
    return line
  }

  const match = /^(\S+)(\s+.*)?$/.exec(line)
  if (!match) {
    return line
  }

  const [, worktreePath, rest = ''] = match
  const relativePath = relative(workspaceRoot, worktreePath) || '.'
  return `${relativePath}${rest}`
}
