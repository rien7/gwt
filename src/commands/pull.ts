import { intro, outro, spinner } from '@clack/prompts'
import type { CAC } from 'cac'
import ansis from 'ansis'
import { runCliAction } from '../utils/cli'
import { runGit } from '../utils/git'
import { currentBranchName, ensureInsideWorktree, resolveWorkspaceContext } from '../utils/workspace'

type PullOptions = {
  merge?: boolean
}

export function registerPullCommand(cli: CAC) {
  cli
    .command('pull', 'Fetch remote updates and rebase the current worktree branch')
    .option('--merge', 'Use merge instead of rebase')
    .action((options: PullOptions) =>
      runCliAction(() => {
        const context = resolveWorkspaceContext()
        const worktreeRoot = ensureInsideWorktree(context)
        const branch = currentBranchName(worktreeRoot)
        const targetRef = `origin/${branch}`
        const s = spinner()

        intro(ansis.bold('gwt pull'))
        s.start('Fetching remote branches')
        runGit(['fetch', '--all'], context.workspaceRoot)
        s.stop('Remote branches fetched')

        s.start(options.merge ? `Merging ${targetRef}` : `Rebasing onto ${targetRef}`)
        runGit([options.merge ? 'merge' : 'rebase', targetRef], worktreeRoot)
        s.stop(options.merge ? `Merged ${targetRef}` : `Rebased onto ${targetRef}`)

        outro(ansis.green(`Current branch is up to date with ${targetRef}`))
      }),
    )
}
