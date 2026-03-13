import { intro, log, outro, spinner } from '@clack/prompts'
import type { CAC } from 'cac'
import ansis from 'ansis'
import { errorMessage, runCliAction } from '../utils/cli'
import { runGit, tryGit } from '../utils/git'
import { runConfiguredHook } from '../utils/hooks'
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
  fetch?: boolean
  printPath?: boolean
}

export function registerNewCommand(cli: CAC) {
  cli
    .command('new <branch>', 'Create a new local branch and worktree from origin/main')
    .option('-p, --push', 'Push the branch to origin and set upstream')
    .option('--from <ref>', 'Start from a custom ref')
    .option('--no-fetch', 'Skip git fetch --all before creation')
    .option('--print-path', 'Print the created worktree path only')
    .example('gwt new feature/my-thing')
    .example('gwt new feature/my-thing --from origin/release/1.0')
    .example('cd "$(gwt new feature/my-thing --print-path)"')
    .action((branch: string, options: NewOptions) =>
      runCliAction(async () => {
        assertValidBranchName(branch)

        const context = resolveWorkspaceContext()
        const fromRef = options.from ?? `origin/${context.config.defaultBranch}`
        const shouldPush = options.push ?? context.config.autoPush
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
          intro(ansis.bold('gwt new'))
        }
        ensureMissingPath(worktreePath, 'Worktree directory')

        if (localBranchExists(context.commonDir, branch)) {
          throw new Error(`Local branch ${branch} already exists. Use "gwt get ${branch}" instead.`)
        }

        if (options.fetch !== false) {
          if (!printPathOnly) {
            s.start('Fetching remote branches')
          }
          runGit(['fetch', '--all'], context.workspaceRoot)
          if (!printPathOnly) {
            s.stop('Remote branches fetched')
          }
        }

        assertResolvableRef(context.workspaceRoot, fromRef)

        if (!printPathOnly) {
          s.start(`Creating worktree ${worktreeDir}`)
        }
        runGit(['worktree', 'add', '-b', branch, worktreeDir, fromRef], context.workspaceRoot)
        if (!printPathOnly) {
          s.stop(`Worktree ${worktreeDir} created`)
        }

        tryGit(['branch', '--unset-upstream'], worktreePath)

        if (shouldPush) {
          const pushResult = tryGit(['push', '-u', 'origin', branch], worktreePath)
          if (pushResult.status !== 0) {
            warn(`Branch created locally, but push failed. Run "git -C ${worktreePath} push -u origin ${branch}" manually.`)
          }
        }

        try {
          const hookOutput = runConfiguredHook(context, 'post_new', {
            branch,
            path: worktreePath,
          })
          if (hookOutput) {
            const stream = printPathOnly ? process.stderr : process.stdout
            stream.write(`${hookOutput}\n`)
          }
        } catch (error) {
          warn(`post_new hook failed: ${errorMessage(error)}`)
        }

        if (printPathOnly) {
          process.stdout.write(`${worktreePath}\n`)
          return
        }

        outro([ansis.green(`Worktree ready: ${worktreePath}`), `Branch: ${branch}`, `Base: ${fromRef}`].join('\n'))
      }),
    )
}
