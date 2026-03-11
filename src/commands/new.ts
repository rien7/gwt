import { intro, log, outro, spinner } from '@clack/prompts'
import type { CAC } from 'cac'
import ansis from 'ansis'
import { runCliAction } from '../utils/cli'
import { runGit, tryGit } from '../utils/git'
import {
  assertResolvableRef,
  assertValidBranchName,
  branchToDir,
  ensureMissingPath,
  localBranchExists,
  resolveWorkspaceContext,
} from '../utils/workspace'

type NewOptions = {
  push?: boolean
  from?: string
  noFetch?: boolean
}

export function registerNewCommand(cli: CAC) {
  cli
    .command('new <branch>', 'Create a new local branch and worktree from origin/main')
    .option('-p, --push', 'Push the branch to origin and set upstream')
    .option('--from <ref>', 'Start from a custom ref')
    .option('--no-fetch', 'Skip git fetch --all before creation')
    .example('gwt new feature/my-thing')
    .example('gwt new feature/my-thing --from origin/release/1.0')
    .action((branch: string, options: NewOptions) =>
      runCliAction(async () => {
        assertValidBranchName(branch)

        const context = resolveWorkspaceContext()
        const fromRef = options.from ?? `origin/${context.config.defaultBranch}`
        const shouldPush = options.push ?? context.config.autoPush
        const worktreeDir = branchToDir(branch)
        const worktreePath = `${context.workspaceRoot}/${worktreeDir}`
        const s = spinner()

        intro(ansis.bold('gwt new'))
        ensureMissingPath(worktreePath, 'Worktree directory')

        if (localBranchExists(context.commonDir, branch)) {
          throw new Error(`Local branch ${branch} already exists. Use "gwt get ${branch}" instead.`)
        }

        if (!options.noFetch) {
          s.start('Fetching remote branches')
          runGit(['fetch', '--all'], context.workspaceRoot)
          s.stop('Remote branches fetched')
        }

        assertResolvableRef(context.workspaceRoot, fromRef)

        s.start(`Creating worktree ${worktreeDir}`)
        runGit(['worktree', 'add', '-b', branch, worktreeDir, fromRef], context.workspaceRoot)
        s.stop(`Worktree ${worktreeDir} created`)

        tryGit(['branch', '--unset-upstream'], worktreePath)

        if (shouldPush) {
          const pushResult = tryGit(['push', '-u', 'origin', branch], worktreePath)
          if (pushResult.status !== 0) {
            log.warn(`Branch created locally, but push failed. Run "git -C ${worktreePath} push -u origin ${branch}" manually.`)
          }
        }

        outro(
          [
            ansis.green(`Worktree ready: ${worktreePath}`),
            `Branch: ${branch}`,
            `Base: ${fromRef}`,
          ].join('\n'),
        )
      }),
    )
}
