import { cac } from 'cac'
import { registerCompletionCommand } from './commands/completion'
import { registerGetCommand } from './commands/get'
import { registerInitCommand } from './commands/init'
import { registerLsCommand } from './commands/ls'
import { registerNewCommand } from './commands/new'
import { registerPruneCommand } from './commands/prune'
import { registerPullCommand } from './commands/pull'
import { registerRmCommand } from './commands/rm'
import { registerSyncCommand } from './commands/sync'
import { tryHandleCompletionQuery } from './utils/completion'

if (tryHandleCompletionQuery(process.argv.slice(2))) {
  process.exit(0)
}

const cli = cac('gwt')

registerCompletionCommand(cli)
registerInitCommand(cli)
registerNewCommand(cli)
registerGetCommand(cli)
registerRmCommand(cli)
registerSyncCommand(cli)
registerPullCommand(cli)
registerLsCommand(cli)
registerPruneCommand(cli)

cli.help()
cli.version('1.0.0')
cli.parse()
