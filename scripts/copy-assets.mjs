import { copyFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const assets = [
  {
    from: resolve('src/completions/gwt.zsh'),
    to: resolve('dist/completions/gwt.zsh'),
  },
]

for (const asset of assets) {
  mkdirSync(dirname(asset.to), { recursive: true })
  copyFileSync(asset.from, asset.to)
}
