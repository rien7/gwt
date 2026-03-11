import { spawnSync } from 'node:child_process'

export type CommandResult = {
  status: number
  stdout: string
  stderr: string
}

function normalizeOutput(value: string | null | undefined): string {
  return (value ?? '').replace(/\s+$/, '')
}

function formatCommand(command: string, args: string[]) {
  return [command, ...args].join(' ')
}

export function runCommand(command: string, args: string[], cwd: string, allowFailure = false): CommandResult {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    stdio: 'pipe',
  })

  if (result.error) {
    throw result.error
  }

  const response = {
    status: result.status ?? 1,
    stdout: normalizeOutput(result.stdout),
    stderr: normalizeOutput(result.stderr),
  }

  if (!allowFailure && response.status !== 0) {
    throw new Error(response.stderr || response.stdout || `${formatCommand(command, args)} failed`)
  }

  return response
}

export function runGit(args: string[], cwd: string): CommandResult {
  return runCommand('git', args, cwd)
}

export function tryGit(args: string[], cwd: string): CommandResult {
  return runCommand('git', args, cwd, true)
}
