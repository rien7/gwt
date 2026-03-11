import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { intro, outro, spinner } from '@clack/prompts'
import type { CAC } from 'cac'
import ansis from 'ansis'
import { runCliAction } from '../utils/cli'
import { runGit } from '../utils/git'
import {
  assertValidBranchName,
  ensureMissingPath,
  localBranchExists,
  refExists,
  repoNameFromUrl,
} from '../utils/workspace'

type InitOptions = {
  branch: string
}

export function registerInitCommand(cli: CAC) {
  cli
    .command('init <repoUrl> [dirName]', 'Initialize a bare repo workspace')
    .option('-b, --branch <name>', 'Default branch name', {
      default: 'main',
    })
    .example('gwt init git@github.com:owner/repo.git')
    .example('gwt init git@github.com:owner/repo.git my-project -b master')
    .action((repoUrl: string, dirName: string | undefined, options: InitOptions) =>
      runCliAction(async () => {
        assertValidBranchName(options.branch)

        const workspaceName = dirName ?? repoNameFromUrl(repoUrl)
        const workspaceRoot = resolve(process.cwd(), workspaceName)
        const s = spinner()

        intro(ansis.bold('gwt init'))
        ensureMissingPath(workspaceRoot, 'Target directory')

        s.start('Creating workspace directory')
        mkdirSync(workspaceRoot, { recursive: false })
        s.stop('Workspace directory created')

        s.start('Cloning bare repository')
        runGit(['clone', '--bare', repoUrl, '.bare'], workspaceRoot)
        s.stop('Bare repository cloned')

        s.start('Writing .git indirection file')
        writeFileSync(resolve(workspaceRoot, '.git'), 'gitdir: ./.bare\n')
        s.stop('.git file written')

        s.start('Configuring fetch refspec')
        runGit(['config', 'remote.origin.fetch', '+refs/heads/*:refs/remotes/origin/*'], workspaceRoot)
        s.stop('Fetch refspec configured')

        s.start('Configuring relative worktree paths')
        runGit(['config', 'worktree.useRelativePaths', 'true'], workspaceRoot)
        s.stop('Relative worktree paths configured')

        s.start('Fetching remote branches')
        runGit(['fetch', '--all'], workspaceRoot)
        s.stop('Remote branches fetched')

        if (!refExists(workspaceRoot, `refs/remotes/origin/${options.branch}`)) {
          throw new Error(
            `Remote branch origin/${options.branch} does not exist. Use --branch to specify the default branch.`,
          )
        }

        s.start(`Creating ${options.branch} worktree`)
        if (localBranchExists(resolve(workspaceRoot, '.bare'), options.branch)) {
          runGit(['worktree', 'add', options.branch, options.branch], workspaceRoot)
        } else {
          runGit(
            ['worktree', 'add', '-b', options.branch, options.branch, `origin/${options.branch}`],
            workspaceRoot,
          )
        }
        s.stop(`${options.branch} worktree created`)

        outro(
          [
            ansis.green(`Workspace ready: ${workspaceRoot}`),
            `Main worktree: ${resolve(workspaceRoot, options.branch)}`,
          ].join('\n'),
        )
      }),
    )
}
