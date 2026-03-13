import { spawn } from 'node:child_process'
import type { WorkspaceContext } from './workspace'

export type HookEventName = 'post_new' | 'post_get'

type HookPayload = {
  branch: string
  path: string
}

type RunHookOptions = {
  printPathOnly?: boolean
}

export async function runConfiguredHook(
  context: WorkspaceContext,
  event: HookEventName,
  payload: HookPayload,
  options: RunHookOptions = {},
): Promise<void> {
  const command = getHookCommand(context, event)
  if (!command) {
    return
  }

  const resolvedCommand = interpolateHookCommand(command, {
    branch: payload.branch,
    event,
    path: payload.path,
    workspaceRoot: context.workspaceRoot,
  })

  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      process.env.SHELL || '/bin/sh',
      ['-lc', resolvedCommand, '--', payload.path, payload.branch, context.workspaceRoot, event],
      {
        cwd: context.workspaceRoot,
        env: {
          ...process.env,
          GWT_HOOK_BRANCH: payload.branch,
          GWT_HOOK_EVENT: event,
          GWT_HOOK_PATH: payload.path,
          GWT_HOOK_WORKSPACE_ROOT: context.workspaceRoot,
        },
        stdio: options.printPathOnly ? ['ignore', 'pipe', 'pipe'] : 'inherit',
      },
    )

    let bufferedOutput = ''

    if (options.printPathOnly) {
      child.stdout?.on('data', (chunk) => {
        const text = chunk.toString()
        bufferedOutput += text
        process.stderr.write(text)
      })

      child.stderr?.on('data', (chunk) => {
        const text = chunk.toString()
        bufferedOutput += text
        process.stderr.write(text)
      })
    }

    child.on('error', reject)
    child.on('close', (code, signal) => {
      if (code === 0) {
        resolve()
        return
      }

      const summary = bufferedOutput.trim()
      if (signal) {
        reject(new Error(summary || `Hook terminated by signal ${signal}: ${resolvedCommand}`))
        return
      }

      reject(new Error(summary || `Hook exited with status ${code ?? 1}: ${resolvedCommand}`))
    })
  })
}

export function hasConfiguredHook(context: WorkspaceContext, event: HookEventName): boolean {
  return Boolean(getHookCommand(context, event))
}

function getHookCommand(context: WorkspaceContext, event: HookEventName): string | undefined {
  if (event === 'post_new') {
    return context.config.postNew
  }

  if (event === 'post_get') {
    return context.config.postGet
  }

  return undefined
}

function interpolateHookCommand(
  command: string,
  values: {
    branch: string
    event: HookEventName
    path: string
    workspaceRoot: string
  },
): string {
  return command
    .replaceAll('{branch}', shellEscape(values.branch))
    .replaceAll('{event}', shellEscape(values.event))
    .replaceAll('{path}', shellEscape(values.path))
    .replaceAll('{workspace_root}', shellEscape(values.workspaceRoot))
}

function shellEscape(value: string): string {
  return `'${value.replaceAll("'", `'\"'\"'`)}'`
}
