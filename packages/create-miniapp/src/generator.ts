import path from "node:path";
import { fileURLToPath } from "node:url";
import ejs from "ejs";
import fs from "fs-extra";
import { green, red } from "kolorist";
import type { CreateOptions, TemplateContext } from "./types.js";
import {
	hasFeature,
	PNPM_PACKAGE_MANAGER,
	pmDevCommand,
	pmInstallCommand,
	pmTestCommand,
	resolveTemplateId,
} from "./utils.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function getTemplatesRoot(): string {
	// dist/index.mjs -> ../templates ; dev tsx -> ../templates
	return path.resolve(__dirname, "../templates");
}

function shouldSkip(relPath: string, options: CreateOptions): boolean {
	const normalized = relPath.replace(/\\/g, "/");
	const { features } = options;

	if (!hasFeature(features, "vitest")) {
		if (
			normalized.startsWith("tests/") ||
			normalized.includes("/tests/") ||
			normalized.includes("vitest.config") ||
			normalized.startsWith("src/test/")
		) {
			return true;
		}
	}
	if (!hasFeature(features, "lint")) {
		if (
			normalized.endsWith("eslint.config.js") ||
			normalized.endsWith("eslint.config.js.ejs")
		) {
			return true;
		}
		if (relPath.endsWith(".prettierrc.ejs")) return true;
		if (relPath.endsWith(".prettierignore")) return true;
	}
	if (!hasFeature(features, "biome")) {
		if (normalized === "biome.json" || normalized.endsWith("/biome.json")) {
			return true;
		}
		if (
			normalized === ".vscode/settings.json" ||
			normalized.endsWith("/.vscode/settings.json")
		) {
			return true;
		}
	}
	if (
		relPath.endsWith("pnpm-lock.yaml") ||
		relPath.endsWith("package-lock.json") ||
		relPath.endsWith("yarn.lock")
	) {
		return true;
	}
	return false;
}

async function renderFile(
	src: string,
	dest: string,
	context: TemplateContext,
): Promise<void> {
	const content = await fs.readFile(src, "utf-8");
	const rendered = ejs.render(content, context, { rmWhitespace: false });
	await fs.ensureDir(path.dirname(dest));
	await fs.writeFile(dest, rendered, "utf-8");
}

async function copyTemplateDir(
	templateDir: string,
	targetDir: string,
	context: TemplateContext,
	options: CreateOptions,
	relBase = "",
): Promise<void> {
	const entries = await fs.readdir(templateDir, { withFileTypes: true });

	for (const entry of entries) {
		const srcPath = path.join(templateDir, entry.name);
		const relPath = relBase ? `${relBase}/${entry.name}` : entry.name;

		if (shouldSkip(relPath, options)) continue;

		if (entry.isDirectory()) {
			await copyTemplateDir(
				srcPath,
				path.join(targetDir, entry.name),
				context,
				options,
				relPath,
			);
			continue;
		}

		const isEjs = entry.name.endsWith(".ejs");
		const templateName = isEjs ? entry.name.slice(0, -4) : entry.name;
		// npm excludes .gitignore files from published tarballs, so templates
		// store the file under a portable name and restore it during generation.
		const outName = templateName === "_gitignore" ? ".gitignore" : templateName;
		const destPath = path.join(targetDir, outName);

		if (isEjs) {
			await renderFile(srcPath, destPath, context);
		} else {
			await fs.ensureDir(path.dirname(destPath));
			await fs.copy(srcPath, destPath);
		}
	}
}

export async function generateProject(options: CreateOptions): Promise<string> {
	const templateId = resolveTemplateId(options.framework, options.variant);
	const templateDir = path.join(getTemplatesRoot(), templateId);

	if (!(await fs.pathExists(templateDir))) {
		throw new Error(
			`Template "${templateId}" is not available (${options.framework} + ${options.variant}).`,
		);
	}

	const targetDir = path.resolve(process.cwd(), options.projectName);

	if (await fs.pathExists(targetDir)) {
		const files = await fs.readdir(targetDir);
		if (files.length > 0) {
			throw new Error(`Target directory is not empty: ${targetDir}`);
		}
	}

	const context: TemplateContext = {
		projectName: options.projectName,
		packageName: options.packageName,
		variant: options.variant,
		features: options.features,
		packageManager: options.packageManager,
		pnpmPackageManager: PNPM_PACKAGE_MANAGER,
		isTypeScript: options.variant === "typescript",
	};

	await fs.ensureDir(targetDir);
	await copyTemplateDir(templateDir, targetDir, context, options);

	return targetDir;
}

export function printNextSteps(
	targetDir: string,
	options: CreateOptions,
	installed: boolean,
	autoStartDev = false,
): void {
	const rel = path.relative(process.cwd(), targetDir) || ".";
	const commands: string[] = [];

	if (rel !== "." && !autoStartDev) {
		commands.push(`cd ${rel}`);
	}
	const { packageManager } = options;

	if (!installed) {
		commands.push(pmInstallCommand(packageManager));
	}
	if (!autoStartDev) {
		commands.push(pmDevCommand(packageManager));
	}
	if (hasFeature(options.features, "vitest")) {
		commands.push(pmTestCommand(packageManager));
	}

	if (commands.length > 0) {
		console.log(green("\nDone. Now run:\n"));
		for (const command of commands) {
			console.log(`   ${command}`);
		}
		console.log("");
	} else {
		console.log(green("\nDone.\n"));
	}

	console.log("Optional: Initialize Git in your project directory with:\n");
	console.log('   git init && git add -A && git commit -m "initial commit"');
	console.log("");
}

export function printError(err: unknown): void {
	const msg = err instanceof Error ? err.message : String(err);
	console.error(red(`\n✖ ${msg}\n`));
}
