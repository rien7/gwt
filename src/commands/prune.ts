import { intro, outro, spinner } from '@clack/prompts'
import type { CAC } from 'cac'
import ansis from 'ansis'
import { runCliAction } from '../utils/cli'
import { runGit } from '../utils/git'
import { resolveWorkspaceContext } from '../utils/workspace'

export function registerPruneCommand(cli: CAC) {
  cli.command('prune', 'Clean up stale git worktree metadata').action(() =>
    runCliAction(() => {
      const context = resolveWorkspaceContext()
      const s = spinner()

      intro(ansis.bold('gwt prune'))
      s.start('Pruning stale worktree metadata')
      runGit(['worktree', 'prune'], context.workspaceRoot)
      s.stop('Stale worktree metadata removed')
      outro(ansis.green('Workspace metadata is clean'))
    }),
  )
}
