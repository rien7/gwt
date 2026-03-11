import { intro, outro, spinner } from '@clack/prompts'
import type { CAC } from 'cac'
import ansis from 'ansis'
import { runCliAction } from '../utils/cli'
import { runGit } from '../utils/git'
import { currentBranchName, ensureInsideWorktree, resolveWorkspaceContext } from '../utils/workspace'

type SyncOptions = {
  rebase?: boolean
}

export function registerSyncCommand(cli: CAC) {
  cli
    .command('sync', 'Fetch all remote updates into the shared bare repo')
    .option('--rebase', 'Rebase the current worktree after fetching')
    .action((options: SyncOptions) =>
      runCliAction(() => {
        const context = resolveWorkspaceContext()
        const s = spinner()

        intro(ansis.bold('gwt sync'))
        s.start('Fetching all remotes and pruning stale refs')
        runGit(['fetch', '--all', '--prune'], context.workspaceRoot)
        s.stop('Remote tracking branches updated')

        if (options.rebase) {
          const worktreeRoot = ensureInsideWorktree(context)
          const branch = currentBranchName(worktreeRoot)
          const targetRef = `origin/${branch}`

          s.start(`Rebasing onto ${targetRef}`)
          runGit(['rebase', targetRef], worktreeRoot)
          s.stop(`Rebased onto ${targetRef}`)
        }

        outro(ansis.green('Workspace sync complete'))
      }),
    )
}
