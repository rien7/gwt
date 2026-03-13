import { intro, log, outro, spinner } from '@clack/prompts'
import type { CAC } from 'cac'
import ansis from 'ansis'
import { errorMessage, runCliAction } from '../utils/cli'
import { runGit, tryGit } from '../utils/git'
import { runConfiguredHook } from '../utils/hooks'
import {
  assertValidBranchName,
  branchToDir,
  ensureMissingPath,
  localBranchExists,
  remoteBranchExistsOnOrigin,
  resolveWorkspaceContext,
} from '../utils/workspace'

type GetOptions = {
  fetch?: boolean
  printPath?: boolean
}

export function registerGetCommand(cli: CAC) {
  cli
    .command('get <branch>', 'Checkout an existing remote branch as a local worktree')
    .option('--no-fetch', 'Skip git fetch --all before checkout')
    .option('--print-path', 'Print the created worktree path only')
    .example('gwt get feature/my-thing')
    .example('cd "$(gwt get feature/my-thing --print-path)"')
    .action((branch: string, options: GetOptions) =>
      runCliAction(async () => {
        assertValidBranchName(branch)

        const context = resolveWorkspaceContext()
        const printPathOnly = options.printPath === true
        const worktreeDir = branchToDir(branch)
        const worktreePath = `${context.workspaceRoot}/${worktreeDir}`
        const s = spinner()
        const warn = (message: string) => {
          if (printPathOnly) {
            process.stderr.write(`${message}\n`)
            return
          }

          log.warn(message)
        }

        if (!printPathOnly) {
          intro(ansis.bold('gwt get'))
        }
        ensureMissingPath(worktreePath, 'Worktree directory')

        if (options.fetch !== false) {
          if (!printPathOnly) {
            s.start('Fetching remote branches')
          }
          runGit(['fetch', '--all'], context.workspaceRoot)
          if (!printPathOnly) {
            s.stop('Remote branches fetched')
          }
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
          if (!printPathOnly) {
            s.start(`Attaching worktree ${worktreeDir}`)
          }
          runGit(['worktree', 'add', worktreeDir, branch], context.workspaceRoot)
          if (!printPathOnly) {
            s.stop(`Worktree ${worktreeDir} attached`)
          }

          const upstreamResult = tryGit(
            ['branch', '--set-upstream-to', `origin/${branch}`, branch],
            worktreePath,
          )
          if (upstreamResult.status !== 0) {
            warn(`Failed to set upstream for ${branch}; continue manually if needed.`)
          }
        } else {
          if (!printPathOnly) {
            s.start(`Creating local branch ${branch}`)
          }
          runGit(['worktree', 'add', '-b', branch, worktreeDir, `origin/${branch}`], context.workspaceRoot)
          if (!printPathOnly) {
            s.stop(`Local branch ${branch} created`)
          }
        }

        try {
          if (printPathOnly) {
            process.stderr.write('Running post_get hook...\n')
          } else {
            log.info('Running post_get hook...')
          }

          await runConfiguredHook(
            context,
            'post_get',
            {
              branch,
              path: worktreePath,
            },
            {
              printPathOnly,
            },
          )
        } catch (error) {
          warn(`post_get hook failed: ${errorMessage(error)}`)
        }

        if (printPathOnly) {
          process.stdout.write(`${worktreePath}\n`)
          return
        }

        outro([ansis.green(`Worktree ready: ${worktreePath}`), `Branch: ${branch}`].join('\n'))
      }),
    )
}
