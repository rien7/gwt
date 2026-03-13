import { spawnSync } from 'node:child_process'
import type { WorkspaceContext } from './workspace'

export type HookEventName = 'post_new' | 'post_get'

type HookPayload = {
  branch: string
  path: string
}

export function runConfiguredHook(context: WorkspaceContext, event: HookEventName, payload: HookPayload): string | null {
  const command = getHookCommand(context, event)
  if (!command) {
    return null
  }

  const resolvedCommand = interpolateHookCommand(command, {
    branch: payload.branch,
    event,
    path: payload.path,
    workspaceRoot: context.workspaceRoot,
  })
  const result = spawnSync(
    process.env.SHELL || '/bin/sh',
    ['-lc', resolvedCommand, '--', payload.path, payload.branch, context.workspaceRoot, event],
    {
      cwd: context.workspaceRoot,
      encoding: 'utf8',
      env: {
        ...process.env,
        GWT_HOOK_BRANCH: payload.branch,
        GWT_HOOK_EVENT: event,
        GWT_HOOK_PATH: payload.path,
        GWT_HOOK_WORKSPACE_ROOT: context.workspaceRoot,
      },
      stdio: 'pipe',
    },
  )

  if (result.error) {
    throw result.error
  }

  const output = [result.stdout, result.stderr].filter(Boolean).join('').trim()
  if ((result.status ?? 1) !== 0) {
    throw new Error(output || `Hook failed: ${resolvedCommand}`)
  }

  return output || null
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
