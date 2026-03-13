import { cancel } from '@clack/prompts'
import type { CAC } from 'cac'

export function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  return String(error)
}

export async function runCliAction(action: () => Promise<void> | void) {
  try {
    await action()
  } catch (error) {
    cancel(errorMessage(error))
    process.exit(1)
  }
}

export function isCliUsageError(error: unknown): error is Error {
  return error instanceof Error && error.name === 'CACError'
}

export function formatCliUsageError(error: Error): string {
  const message = error.message

  if (message.startsWith('missing required args for command `')) {
    const command = message.slice('missing required args for command `'.length, -1)
    return `Missing required arguments for \`${command}\`.`
  }

  if (message.startsWith('Unknown option `')) {
    return message
  }

  if (message.startsWith('Unused args: ')) {
    return `Unexpected arguments: ${message.slice('Unused args: '.length)}.`
  }

  return message
}

export function showCliUsageError(cli: CAC, message: string) {
  process.stderr.write(`gwt: ${message}\n\n`)
  cli.outputHelp()
}
