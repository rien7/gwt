import { chmodSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig } from 'tsdown'

const shebang = '#!/usr/bin/env node\n'

export default defineConfig({
  copy: [
    {
      from: 'src/completions/gwt.zsh',
      to: 'dist/completions',
    },
    {
      from: 'src/completions/gwt.bash',
      to: 'dist/completions',
    },
    {
      from: 'src/completions/gwt.fish',
      to: 'dist/completions',
    },
  ],
  exports: true,
  hooks: {
    'build:done': async ({ chunks, options }) => {
      for (const chunk of chunks) {
        if (chunk.fileName !== 'index.mjs') {
          continue
        }

        const filePath = resolve(options.outDir, chunk.fileName)
        const current = readFileSync(filePath, 'utf8')

        if (!current.startsWith(shebang)) {
          writeFileSync(filePath, `${shebang}${current}`)
        }

        chmodSync(filePath, 0o755)
      }
    },
  },
})
