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
        process.stdout.write(`${output}\n`)
      }
    }),
  )
}
