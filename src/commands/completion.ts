import { intro, outro } from '@clack/prompts'
import type { CAC } from 'cac'
import ansis from 'ansis'
import { runCliAction, showCliUsageError } from '../utils/cli'
import { emitCompletionScript, installCompletion } from '../utils/completion'

type CompletionOptions = Record<string, never>

export function registerCompletionCommand(cli: CAC) {
  cli
    .command('completion [...args]', 'Generate or install shell completion scripts')
    .example('gwt completion install zsh')
    .example('gwt completion install bash')
    .example('gwt completion zsh')
    .action((args: string[], _options: CompletionOptions) =>
      runCliAction(() => {
        const [subcommand, shellArg, extraArg] = args

        if (subcommand === 'install') {
          if (extraArg) {
            showCliUsageError(cli, 'Unexpected arguments for `gwt completion install`.')
            process.exit(1)
          }

          const result = installCompletion(shellArg)

          intro(ansis.bold('gwt completion install'))
          outro(
            [
              ansis.green(`Installed completion script: ${result.installPath}`),
              ...(result.shellConfigPath ? [`Updated shell config: ${result.shellConfigPath}`] : []),
              ...result.notes,
            ].join('\n'),
          )
          return
        }

        if (shellArg) {
          showCliUsageError(cli, 'Unexpected arguments for `gwt completion`.')
          process.exit(1)
        }

        process.stdout.write(emitCompletionScript(subcommand))
      }),
    )
}
