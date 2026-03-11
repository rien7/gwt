import { resolve } from 'node:path'
import { intro, log, outro, spinner } from '@clack/prompts'
import type { CAC } from 'cac'
import ansis from 'ansis'
import { runCliAction } from '../utils/cli'
import { runGit, tryGit } from '../utils/git'
import {
  assertValidBranchName,
  branchToDir,
  isPathInside,
  resolveWorkspaceContext,
} from '../utils/workspace'

type RmOptions = {
  remote?: boolean
  force?: boolean
}

export function registerRmCommand(cli: CAC) {
  cli
    .command('rm <branch>', 'Remove a worktree and its local branch')
    .option('-r, --remote', 'Delete the remote branch as well')
    .option('-f, --force', 'Force removal even with uncommitted changes')
    .example('gwt rm feature/my-thing')
    .example('gwt rm feature/my-thing --remote --force')
    .action((branch: string, options: RmOptions) =>
      runCliAction(() => {
        assertValidBranchName(branch)

        const context = resolveWorkspaceContext()
        const protectedBranches = new Set(context.config.protectedBranches)
        if (protectedBranches.has(branch)) {
          throw new Error(`Refusing to remove protected branch: ${branch}`)
        }

        const worktreeDir = branchToDir(branch)
        const worktreePath = resolve(context.workspaceRoot, worktreeDir)
        const s = spinner()

        if (isPathInside(worktreePath, process.cwd())) {
          process.chdir(context.workspaceRoot)
        }

        intro(ansis.bold('gwt rm'))
        const removeResult = tryGit(['worktree', 'remove', worktreePath], context.workspaceRoot)
        if (removeResult.status !== 0) {
          if (!options.force) {
            throw new Error(
              `${removeResult.stderr || removeResult.stdout || `Failed to remove ${worktreePath}`}\nRetry with --force if the worktree has uncommitted changes.`,
            )
          }

          s.start(`Force removing ${worktreeDir}`)
          runGit(['worktree', 'remove', '--force', worktreePath], context.workspaceRoot)
          s.stop(`${worktreeDir} removed`)
        } else {
          log.info(`Removed worktree ${worktreeDir}`)
        }

        s.start(`Deleting local branch ${branch}`)
        runGit(['branch', '-D', branch], context.workspaceRoot)
        s.stop(`Local branch ${branch} deleted`)

        if (options.remote) {
          const remoteDelete = tryGit(['push', 'origin', '--delete', branch], context.workspaceRoot)
          if (remoteDelete.status !== 0) {
            const details = `${remoteDelete.stderr}\n${remoteDelete.stdout}`
            if (/remote ref does not exist|unable to delete|remote branch .* not found/i.test(details)) {
              log.warn(`Remote branch origin/${branch} does not exist.`)
            } else {
              throw new Error(remoteDelete.stderr || remoteDelete.stdout || `Failed to delete remote branch ${branch}`)
            }
          } else {
            log.info(`Deleted remote branch origin/${branch}`)
          }
        }

        outro(ansis.green(`Branch ${branch} removed`))
      }),
    )
}
