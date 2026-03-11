import { intro, log, outro, spinner } from '@clack/prompts'
import type { CAC } from 'cac'
import ansis from 'ansis'
import { runCliAction } from '../utils/cli'
import { runGit, tryGit } from '../utils/git'
import {
  assertValidBranchName,
  branchToDir,
  ensureMissingPath,
  localBranchExists,
  remoteBranchExistsOnOrigin,
  resolveWorkspaceContext,
} from '../utils/workspace'

type GetOptions = {
  noFetch?: boolean
}

export function registerGetCommand(cli: CAC) {
  cli
    .command('get <branch>', 'Checkout an existing remote branch as a local worktree')
    .option('--no-fetch', 'Skip git fetch --all before checkout')
    .example('gwt get feature/my-thing')
    .action((branch: string, options: GetOptions) =>
      runCliAction(async () => {
        assertValidBranchName(branch)

        const context = resolveWorkspaceContext()
        const worktreeDir = branchToDir(branch)
        const worktreePath = `${context.workspaceRoot}/${worktreeDir}`
        const s = spinner()

        intro(ansis.bold('gwt get'))
        ensureMissingPath(worktreePath, 'Worktree directory')

        if (!options.noFetch) {
          s.start('Fetching remote branches')
          runGit(['fetch', '--all'], context.workspaceRoot)
          s.stop('Remote branches fetched')
        }

        if (!remoteBranchExistsOnOrigin(context.workspaceRoot, branch)) {
          const remoteBranches = runGit(['branch', '-r'], context.commonDir).stdout
          throw new Error(
            [
              `Remote branch origin/${branch} does not exist.`,
              remoteBranches ? `Available remote branches:\n${remoteBranches}` : '',
            ]
              .filter(Boolean)
              .join('\n'),
          )
        }

        if (localBranchExists(context.commonDir, branch)) {
          s.start(`Attaching worktree ${worktreeDir}`)
          runGit(['worktree', 'add', worktreeDir, branch], context.workspaceRoot)
          s.stop(`Worktree ${worktreeDir} attached`)

          const upstreamResult = tryGit(
            ['branch', '--set-upstream-to', `origin/${branch}`, branch],
            worktreePath,
          )
          if (upstreamResult.status !== 0) {
            log.warn(`Failed to set upstream for ${branch}; continue manually if needed.`)
          }
        } else {
          s.start(`Creating local branch ${branch}`)
          runGit(['worktree', 'add', '-b', branch, worktreeDir, `origin/${branch}`], context.workspaceRoot)
          s.stop(`Local branch ${branch} created`)
        }

        outro(
          [
            ansis.green(`Worktree ready: ${worktreePath}`),
            `Branch: ${branch}`,
          ].join('\n'),
        )
      }),
    )
}
