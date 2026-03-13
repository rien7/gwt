import { closeSync, openSync, writeSync } from 'node:fs'

const supportedShells = new Set(['zsh', 'bash', 'fish'])

if (process.env.CI) {
  process.exit(0)
}

const shell = detectShell()
const packageManager = detectPackageManager(process.env.npm_config_user_agent)
const isGlobalInstall = process.env.npm_config_global === 'true'
const lines = shell && supportedShells.has(shell)
  ? renderShellMessage(shell, packageManager, isGlobalInstall)
  : renderGenericMessage(packageManager, isGlobalInstall)

writeNotice(`\n${lines.join('\n')}\n\n`)

function detectShell() {
  const shell = process.env.npm_config_script_shell || process.env.SHELL || ''
  return shell.split('/').pop()
}

function detectPackageManager(userAgent = '') {
  if (userAgent.startsWith('pnpm/')) {
    return 'pnpm'
  }

  if (userAgent.startsWith('yarn/')) {
    return 'yarn'
  }

  if (userAgent.startsWith('bun/')) {
    return 'bun'
  }

  return 'npm'
}

function renderShellMessage(shell, packageManager, isGlobalInstall) {
  const installCommand = buildInstallCommand(shell, packageManager, isGlobalInstall)
  const reloadCommand = buildReloadCommand(shell)

  return [
    `[gwt] Installed successfully.`,
    `[gwt] Detected shell: ${shell}`,
    `[gwt] Enable completion:`,
    `[gwt]   ${installCommand}`,
    `[gwt] Reload your shell:`,
    `[gwt]   ${reloadCommand}`,
    `[gwt] Help:`,
    `[gwt]   gwt --help`,
  ]
}

function renderGenericMessage(packageManager, isGlobalInstall) {
  return [
    `[gwt] Installed successfully.`,
    `[gwt] Shell completion is available for zsh, bash, and fish.`,
    `[gwt] Enable it with one of:`,
    `[gwt]   ${buildInstallCommand('zsh', packageManager, isGlobalInstall)}`,
    `[gwt]   ${buildInstallCommand('bash', packageManager, isGlobalInstall)}`,
    `[gwt]   ${buildInstallCommand('fish', packageManager, isGlobalInstall)}`,
    `[gwt] Help:`,
    `[gwt]   gwt --help`,
  ]
}

function buildInstallCommand(shell, packageManager, isGlobalInstall) {
  if (isGlobalInstall) {
    return `gwt completion install ${shell}`
  }

  if (packageManager === 'pnpm') {
    return `pnpm exec gwt completion install ${shell}`
  }

  if (packageManager === 'yarn') {
    return `yarn gwt completion install ${shell}`
  }

  if (packageManager === 'bun') {
    return `bunx gwt completion install ${shell}`
  }

  return `npx gwt completion install ${shell}`
}

function buildReloadCommand(shell) {
  if (shell === 'bash') {
    return '. ~/.bashrc'
  }

  return `exec ${shell}`
}

function writeNotice(message) {
  try {
    const ttyFd = openSync('/dev/tty', 'w')
    writeSync(ttyFd, message)
    closeSync(ttyFd)
    return
  } catch {
    process.stderr.write(message)
  }
}
