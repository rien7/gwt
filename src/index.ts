import { cac } from 'cac'
import { readFileSync } from 'node:fs'
import { registerCompletionCommand } from './commands/completion'
import { registerGetCommand } from './commands/get'
import { registerInitCommand } from './commands/init'
import { registerLsCommand } from './commands/ls'
import { registerNewCommand } from './commands/new'
import { registerPruneCommand } from './commands/prune'
import { registerPullCommand } from './commands/pull'
import { registerRmCommand } from './commands/rm'
import { registerSyncCommand } from './commands/sync'
import { formatCliUsageError, isCliUsageError, showCliUsageError } from './utils/cli'
import { maybeShowCompletionInstallHint, tryHandleCompletionQuery } from './utils/completion'

if (tryHandleCompletionQuery(process.argv.slice(2))) {
  process.exit(0)
}

const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as {
  version: string
}
const cli = cac('gwt')
const argv = process.argv
const cliArgs = argv.slice(2)
const topLevelCommand = cliArgs[0]
const isKnownCommandHelpRequest = wantsHelp(cliArgs) && isKnownCommand(topLevelCommand)

registerCompletionCommand(cli)
registerInitCommand(cli)
registerNewCommand(cli)
registerGetCommand(cli)
registerRmCommand(cli)
registerSyncCommand(cli)
registerPullCommand(cli)
registerLsCommand(cli)
registerPruneCommand(cli)

cli.usage('<command> [options]')
cli.option('-v, --version', 'Display version number')
cli.help((sections) =>
  sections.filter((section) => {
    if (!section.title) {
      return false
    }

    return section.title !== 'Examples' && !section.title.startsWith('For more info')
  }),
)

cli.addEventListener('command:*', (event) => {
  if (isKnownCommandHelpRequest) {
    return
  }

  const command = String(event.detail ?? '').trim()
  maybeShowCompletionInstallHint(cliArgs)
  showCliUsageError(cli, `Unknown command \`${command}\`.`)
  process.exit(1)
})

if (argv.length <= 2) {
  maybeShowCompletionInstallHint(cliArgs)
  cli.outputHelp()
  process.exit(0)
}

if (isVersionRequest(cliArgs)) {
  process.stdout.write(`${packageJson.version}\n`)
  process.exit(0)
}

if (isKnownCommandHelpRequest || wantsHelp(cliArgs)) {
  maybeShowCompletionInstallHint(cliArgs)
}

try {
  cli.parse(argv)
} catch (error) {
  if (isCliUsageError(error)) {
    maybeShowCompletionInstallHint(cliArgs)
    showCliUsageError(cli, formatCliUsageError(error))
    process.exit(1)
  }

  throw error
}

function wantsHelp(args: string[]): boolean {
  return args.includes('--help') || args.includes('-h')
}

function isVersionRequest(args: string[]): boolean {
  return args.length === 1 && (args[0] === '--version' || args[0] === '-v')
}

function isKnownCommand(command: string | undefined): boolean {
  return (
    command === 'completion' ||
    command === 'init' ||
    command === 'new' ||
    command === 'get' ||
    command === 'rm' ||
    command === 'sync' ||
    command === 'pull' ||
    command === 'ls' ||
    command === 'prune'
  )
}
