import { cancel } from '@clack/prompts'

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
