import type { CAC } from 'cac'
import { emitCompletionScript } from '../utils/completion'
import { runCliAction } from '../utils/cli'

type CompletionOptions = {
  shell?: string
}

export function registerCompletionCommand(cli: CAC) {
  cli
    .command('completion [shell]', 'Generate shell completion scripts')
    .example('gwt completion zsh')
    .action((shell: string | undefined, _options: CompletionOptions) =>
      runCliAction(() => {
        process.stdout.write(emitCompletionScript(shell))
      }),
    )
}
