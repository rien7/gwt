const supportedShells = new Set(['zsh', 'bash', 'fish'])

if (!process.stdout.isTTY || process.env.CI) {
  process.exit(0)
}

const shell = process.env.SHELL?.split('/').pop()
if (!shell || !supportedShells.has(shell)) {
  process.exit(0)
}

const packageManager = detectPackageManager(process.env.npm_config_user_agent)
const installCommand = buildInstallCommand(shell, packageManager, process.env.npm_config_global === 'true')

console.log('')
console.log(`[gwt] Shell completion is available for ${shell}.`)
console.log(`[gwt] Run \`${installCommand}\` to enable it.`)

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
