import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, expect, test } from 'vitest'
import createMiniappPackage from '../package.json'
import { generateProject } from '../src/generator'
import type { CreateOptions, Framework, Variant } from '../src/types'

const projectName = 'test-app'

let tempDir = ''
let previousCwd = ''

const CORE_FILES: Record<Framework, Record<Variant, string[]>> = {
  vanilla: {
    javascript: [
      '.gitignore',
      'index.html',
      'jsconfig.json',
      'manifest.json',
      'miniapp.config.js',
      'package.json',
      'src',
    ],
    typescript: [
      '.gitignore',
      'index.html',
      'manifest.json',
      'miniapp.config.ts',
      'package.json',
      'src',
      'tsconfig.json',
    ],
  },
  vue: {
    javascript: [
      '.gitignore',
      'index.html',
      'jsconfig.json',
      'manifest.json',
      'miniapp.config.js',
      'package.json',
      'src',
    ],
    typescript: [
      '.gitignore',
      'index.html',
      'manifest.json',
      'miniapp.config.ts',
      'package.json',
      'src',
      'tsconfig.app.json',
      'tsconfig.json',
      'tsconfig.node.json',
    ],
  },
  react: {
    javascript: [
      '.gitignore',
      'index.html',
      'jsconfig.json',
      'manifest.json',
      'miniapp.config.js',
      'package.json',
      'src',
    ],
    typescript: [
      '.gitignore',
      'index.html',
      'manifest.json',
      'miniapp.config.ts',
      'package.json',
      'src',
      'tsconfig.app.json',
      'tsconfig.json',
      'tsconfig.node.json',
    ],
  },
}

function baseOptions(overrides: Partial<CreateOptions> = {}): CreateOptions {
  return {
    projectName,
    packageName: 'test-app',
    framework: 'vue',
    variant: 'typescript',
    features: [],
    packageManager: 'pnpm',
    install: false,
    ...overrides,
  }
}

function projectPath(name = projectName): string {
  return path.resolve(name)
}

function listProjectRoot(name = projectName): string[] {
  return fs
    .readdirSync(projectPath(name))
    .filter((file) => file !== '.DS_Store')
    .sort()
}

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'create-miniapp-'))
  previousCwd = process.cwd()
  process.chdir(tempDir)
})

afterEach(() => {
  process.chdir(previousCwd)
  fs.rmSync(tempDir, { recursive: true, force: true })
})

for (const framework of ['vanilla', 'vue', 'react'] as const) {
  for (const variant of ['javascript', 'typescript'] as const) {
    test.each(['npm', 'pnpm', 'yarn'] as const)(`scaffolds ${framework}-${variant} with %s`, async (packageManager) => {
      const targetDir = await generateProject(baseOptions({ framework, variant, packageManager }))

      expect(targetDir).toBe(projectPath())
      expect(listProjectRoot()).toEqual([...CORE_FILES[framework][variant], 'README.md'].sort())
      const readme = fs.readFileSync(path.join(targetDir, 'README.md'), 'utf-8')
      expect(readme).toContain('# test-app')
      expect(readme).not.toContain('<%=')
      expect(readme.includes(`${packageManager} run typecheck`)).toBe(variant === 'typescript')
      expect(readme).toContain(`${packageManager} install`)
      for (const command of ['dev', 'build', 'package']) {
        expect(readme).toContain(`${packageManager} run ${command}`)
      }
      const manifest = JSON.parse(fs.readFileSync(path.join(targetDir, 'manifest.json'), 'utf-8')) as Record<
        string,
        unknown
      >
      expect(manifest.entry).toEqual({
        url: 'index.html',
      })
      expect(manifest.window).toEqual({ width: 900, height: 600 })
      expect(manifest.permissions).toEqual(['tasks.create'])
      expect(manifest.scripts).toBeUndefined()
      expect(fs.existsSync(path.join(targetDir, 'src/events'))).toBe(false)

      const appEntry =
        framework === 'vanilla'
          ? variant === 'typescript'
            ? 'src/main.ts'
            : 'src/main.js'
          : framework === 'vue'
            ? 'src/App.vue'
            : variant === 'typescript'
              ? 'src/App.tsx'
              : 'src/App.jsx'
      const appSource = fs.readFileSync(path.join(targetDir, appEntry), 'utf-8')
      expect(appSource).toContain('xunlei.tasks.create')
      expect(appSource).not.toContain('counter')
      const pkg = JSON.parse(fs.readFileSync(path.join(targetDir, 'package.json'), 'utf-8')) as {
        scripts: Record<string, string>
        devDependencies: Record<string, string>
      }
      expect(pkg.scripts.dev).toBe('xunlei-miniapp')
      expect(pkg).not.toHaveProperty('packageManager')
      expect(pkg.scripts.build).toBe('xunlei-miniapp build')
      if (variant === 'typescript') {
        expect(pkg.scripts.typecheck).toBeTruthy()
      } else {
        expect(pkg.scripts.typecheck).toBeUndefined()
      }
      if (framework !== 'vanilla') {
        expect(pkg.devDependencies[`@xunlei-open/miniapp-module-${framework}`]).toBe(`^${createMiniappPackage.version}`)
        expect(pkg.devDependencies[`@vitejs/plugin-${framework}`]).toBeUndefined()
      }
      expect(pkg.scripts.package).toBe('xunlei-miniapp package')
      expect(pkg.devDependencies['@xunlei-open/miniapp']).toBe(`^${createMiniappPackage.version}`)
      expect(pkg.devDependencies['@xunlei-open/vite-plugin-miniapp']).toBeUndefined()

      const configFile = variant === 'typescript' ? 'miniapp.config.ts' : 'miniapp.config.js'
      expect(fs.readFileSync(path.join(targetDir, configFile), 'utf-8')).toContain('defineConfig')
      expect(fs.existsSync(path.join(targetDir, configFile))).toBe(true)
      expect(fs.existsSync(path.join(targetDir, variant === 'typescript' ? 'vite.config.ts' : 'vite.config.js'))).toBe(
        false,
      )
    })
  }
}

test('renders package.json with package name', async () => {
  const options = baseOptions({
    packageName: 'my-vue-plugin',
    projectName: 'my-custom-app',
  })

  await generateProject(options)

  const pkg = JSON.parse(fs.readFileSync(path.join(projectPath(options.projectName), 'package.json'), 'utf-8')) as {
    name: string
    scripts: Record<string, string>
    devDependencies: Record<string, string>
  }

  expect(pkg.name).toBe('my-vue-plugin')
  expect(pkg.scripts.dev).toBe('xunlei-miniapp')
  expect(pkg.scripts.package).toBe('xunlei-miniapp package')
  expect(pkg.devDependencies['@xunlei-open/miniapp']).toBe(`^${createMiniappPackage.version}`)
  expect(pkg.devDependencies['@xunlei-open/vite-plugin-miniapp']).toBeUndefined()
})

test('omits vitest files when feature is not selected', async () => {
  await generateProject(baseOptions({ features: [] }))

  expect(fs.existsSync(path.join(projectPath(), 'tests'))).toBe(false)

  const pkg = JSON.parse(fs.readFileSync(path.join(projectPath(), 'package.json'), 'utf-8')) as {
    scripts?: Record<string, string>
  }

  expect(pkg.scripts?.test).toBeUndefined()
})

test('includes vitest files when feature is selected', async () => {
  await generateProject(baseOptions({ features: ['vitest'] }))

  expect(fs.existsSync(path.join(projectPath(), 'tests'))).toBe(true)

  const pkg = JSON.parse(fs.readFileSync(path.join(projectPath(), 'package.json'), 'utf-8')) as {
    scripts?: Record<string, string>
  }

  expect(pkg.scripts?.test).toBe('vitest run')
})

test('restores .gitignore from the npm-safe template name', async () => {
  await generateProject(baseOptions())

  expect(fs.existsSync(path.join(projectPath(), '.gitignore'))).toBe(true)
  expect(fs.existsSync(path.join(projectPath(), '_gitignore'))).toBe(false)
})

test('adds lint scripts and configuration when lint is selected', async () => {
  await generateProject(baseOptions({ features: ['lint'] }))

  const pkg = JSON.parse(fs.readFileSync(path.join(projectPath(), 'package.json'), 'utf-8')) as {
    scripts?: Record<string, string>
  }

  expect(pkg.scripts?.lint).toBe('eslint .')
  expect(pkg.scripts?.format).toBe('prettier --write .')
  expect(fs.existsSync(path.join(projectPath(), 'eslint.config.js'))).toBe(true)
  expect(fs.existsSync(path.join(projectPath(), '.prettierrc'))).toBe(true)
})

test('rejects non-empty target directory', async () => {
  fs.mkdirSync(projectPath(), { recursive: true })
  fs.writeFileSync(path.join(projectPath(), 'package.json'), '{}')

  await expect(generateProject(baseOptions())).rejects.toThrow('Target directory is not empty')
})
