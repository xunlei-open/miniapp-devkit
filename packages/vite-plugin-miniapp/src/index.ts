import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, isAbsolute, relative, resolve, sep, win32 } from 'node:path'
import type { Plugin, UserConfig } from 'vite'

const DEFAULT_EVENT_EXTENSIONS = ['.ts', '.js'] as const

export interface MiniappOptions {
	/** Build only sandbox entries, without the page or manifest assets. */
	eventsOnly?: boolean
	/** @default 'src/events' */
	eventsDir?: string
	/**
	 * Event source file extensions to include.
	 * @default ['.ts', '.js']
	 */
	eventsExtensions?: string[]
	/** @default 'manifest.json' */
	manifestFile?: string
}

function getEventEntries(eventsDir: string, extensions: readonly string[]) {
	if (!existsSync(eventsDir)) {
		return {}
	}

	return Object.fromEntries(
		readdirSync(eventsDir, { withFileTypes: true })
			.filter((file) => file.isFile() && !file.name.endsWith('.d.ts'))
			.map((file) => file.name)
			.filter((file) => extensions.some((ext) => file.endsWith(ext)))
			.map((file) => {
				const ext = extensions.find((e) => file.endsWith(e))
				const name = ext ? file.slice(0, -ext.length) : file
				return [`events/${name}`, resolve(eventsDir, file)]
			}),
	)
}

function resolveExistingInput(config: UserConfig) {
	const input =
		config.build?.rollupOptions?.input ?? config.build?.rolldownOptions?.input

	if (typeof input === 'object' && !Array.isArray(input)) {
		return input
	}

	return {}
}

function copyRelativeFile(projectRoot: string, outDir: string, relativePath: string) {
	const normalized = relativePath.replace(/^\.[\\/]/, '')
	if (isAbsolute(normalized) || win32.isAbsolute(normalized)) {
		console.warn(`[vite-plugin-miniapp] static asset must use a relative path: ${relativePath}`)
		return
	}
	const src = resolve(projectRoot, normalized)
	const projectRelativePath = relative(projectRoot, src)
	if (
		projectRelativePath === '..' ||
		projectRelativePath.startsWith(`..${sep}`)
	) {
		console.warn(`[vite-plugin-miniapp] static asset is outside project root: ${relativePath}`)
		return
	}
	if (!existsSync(src)) {
		console.warn(`[vite-plugin-miniapp] static asset not found: ${normalized}`)
		return
	}
	const dest = resolve(projectRoot, outDir, normalized)
	mkdirSync(dirname(dest), { recursive: true })
	copyFileSync(src, dest)
}

function copyManifestStaticAssets(projectRoot: string, outDir: string, manifestFile: string) {
	const manifestPath = resolve(projectRoot, manifestFile)
	if (!existsSync(manifestPath)) return
	let manifest: unknown
	try {
		manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
	} catch (error) {
		console.warn(`[vite-plugin-miniapp] failed to parse ${manifestFile} for static assets:`, error)
		return
	}
	if (typeof manifest !== 'object' || manifest === null) return
	const icon = (manifest as { icon?: unknown }).icon
	if (typeof icon === 'string' && icon.trim()) copyRelativeFile(projectRoot, outDir, icon.trim())
}

export default function miniapp(options: MiniappOptions = {}): Plugin {
	const {
		eventsOnly = false,
		eventsDir: eventsDirOption = 'src/events',
		eventsExtensions = DEFAULT_EVENT_EXTENSIONS,
		manifestFile = 'manifest.json',
	} = options

	let projectRoot = process.cwd()
	let outDir = 'dist'

	return {
		name: 'vite-plugin-miniapp',
		apply: 'build',

		config(config) {
			projectRoot = config.root ?? process.cwd()
			outDir = config.build?.outDir ?? 'dist'

			const eventsDir = resolve(projectRoot, eventsDirOption)
			const manifest = eventsOnly ? undefined : JSON.parse(
				readFileSync(resolve(projectRoot, manifestFile), 'utf8'),
			) as { entry?: { type?: string; url: string } } | undefined
			const page = manifest?.entry && (manifest.entry.type ?? 'miniapp') === 'miniapp'
				? manifest.entry.url : undefined

			return {
				build: {
					rollupOptions: {
						input: {
							...(!eventsOnly ? {
								...resolveExistingInput(config),
								...(page ? { main: resolve(projectRoot, page) } : {}),
							} : {}),
							...getEventEntries(eventsDir, eventsExtensions),
						},
						output: {
							...(eventsOnly ? {
								format: 'es' as const,
							} : {}),
							entryFileNames(chunkInfo) {
								if (chunkInfo.name.startsWith('events/')) {
									return `${chunkInfo.name}.js`
								}
								return 'assets/[name]-[hash].js'
							},
						},
					},
				},
			}
		},

		closeBundle() {
			if (eventsOnly) return
			copyFileSync(
				resolve(projectRoot, manifestFile),
				resolve(projectRoot, outDir, 'manifest.json'),
			)
			copyManifestStaticAssets(projectRoot, outDir, manifestFile)
		},
	}
}
