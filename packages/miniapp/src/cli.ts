import { parseArgs } from 'node:util'
import { packageMiniapp } from './package.js'
import { buildMiniapp, devMiniapp, validateBuiltMiniapp } from './vite.js'

const HELP = `Xunlei Miniapp CLI

Usage:
  xunlei-miniapp [root] [options]
  xunlei-miniapp dev [root] [options]
  xunlei-miniapp build [root] [options]
  xunlei-miniapp package [root] [options]
  xunlei-miniapp validate [root]

Options:
  --mode <mode>      Set the Vite mode
  --host <host>      Set the dev server host
  --port <port>      Set the dev server port
  --out <file>       Set the package output ZIP
  --no-build         Package the existing build output
  -h, --help         Show this help
`

function readPort(value: string | undefined): number | undefined {
  if (value === undefined) return undefined
  const port = Number(value)
  if (!Number.isInteger(port) || port <= 0 || port > 65_535) {
    throw new Error(`Invalid port: ${value}`)
  }
  return port
}

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      help: { type: 'boolean', short: 'h' },
      mode: { type: 'string' },
      host: { type: 'string' },
      port: { type: 'string' },
      out: { type: 'string' },
      'no-build': { type: 'boolean' },
    },
  })

  if (values.help) {
    console.log(HELP)
    return
  }

  const knownCommands = new Set(['dev', 'build', 'package', 'validate'])
  const first = positionals[0]
  const command = first && knownCommands.has(first) ? first : 'dev'
  const root = command === 'dev' && first !== 'dev' ? first : positionals[1]

  if (command === 'dev') {
    await devMiniapp({
      root,
      mode: values.mode,
      host: values.host,
      port: readPort(values.port),
    })
    return
  }
  if (command === 'build') {
    const result = await buildMiniapp({ root, mode: values.mode })
    console.log(`Miniapp built: ${result.outDir}`)
    return
  }
  if (command === 'package') {
    const result = await packageMiniapp({
      root,
      mode: values.mode,
      outFile: values.out,
      build: !values['no-build'],
    })
    console.log(`Miniapp packaged: ${result.outFile}`)
    return
  }

  const result = await validateBuiltMiniapp({ root, mode: values.mode })
  console.log(`Miniapp package is valid: ${result.directory}`)
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`\n✖ ${message}\n`)
  process.exitCode = 1
})
