import { intro, outro } from '@clack/prompts'
import type { CAC } from 'cac'
import ansis from 'ansis'
import { runCliAction } from '../utils/cli'
import { emitCompletionScript, installCompletion } from '../utils/completion'

type CompletionOptions = Record<string, never>

export function registerCompletionCommand(cli: CAC) {
  cli
    .command('completion [...args]', 'Generate or install shell completion scripts')
    .example('gwt completion install zsh')
    .example('gwt completion zsh')
    .action((args: string[], _options: CompletionOptions) =>
      runCliAction(() => {
        const [subcommand, shellArg, extraArg] = args

        if (subcommand === 'install') {
          if (extraArg) {
            throw new Error('Usage: gwt completion install [shell]')
          }

          const result = installCompletion(shellArg)

          intro(ansis.bold('gwt completion install'))
          outro(
            [
              ansis.green(`Installed completion script: ${result.installPath}`),
              ...result.notes,
            ].join('\n'),
          )
          return
        }

        if (shellArg) {
          throw new Error('Usage: gwt completion [shell]')
        }

        process.stdout.write(emitCompletionScript(subcommand))
      }),
    )
}
