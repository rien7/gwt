import { cac } from 'cac'
import { readFileSync } from 'node:fs'
import { registerGetCommand } from './commands/get'
import { registerInitCommand } from './commands/init'
import { registerLsCommand } from './commands/ls'
import { registerNewCommand } from './commands/new'
import { registerPruneCommand } from './commands/prune'
import { registerPullCommand } from './commands/pull'
import { registerRmCommand } from './commands/rm'
import { registerSyncCommand } from './commands/sync'

const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as {
  version: string
}
const cli = cac('gwt')

registerInitCommand(cli)
registerNewCommand(cli)
registerGetCommand(cli)
registerRmCommand(cli)
registerSyncCommand(cli)
registerPullCommand(cli)
registerLsCommand(cli)
registerPruneCommand(cli)

cli.help()
cli.version(packageJson.version)
cli.parse()
