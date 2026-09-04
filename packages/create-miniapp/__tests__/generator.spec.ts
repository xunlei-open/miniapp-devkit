import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, expect, test } from "vitest";
import { generateProject } from "../src/generator";
import type { CreateOptions, Framework, Variant } from "../src/types";

const projectName = "test-app";

let tempDir = "";
let previousCwd = "";

const CORE_FILES: Record<Framework, Record<Variant, string[]>> = {
	vanilla: {
		javascript: [
			".gitignore",
			"index.html",
			"jsconfig.json",
			"manifest.json",
			"package.json",
			"public",
			"src",
			"vite.config.js",
		],
		typescript: [
			".gitignore",
			"index.html",
			"manifest.json",
			"package.json",
			"public",
			"src",
			"tsconfig.json",
			"vite.config.ts",
		],
	},
	vue: {
		javascript: [
			".gitignore",
			"index.html",
			"jsconfig.json",
			"manifest.json",
			"package.json",
			"public",
			"src",
			"vite.config.js",
		],
		typescript: [
			".gitignore",
			"index.html",
			"manifest.json",
			"package.json",
			"public",
			"src",
			"tsconfig.app.json",
			"tsconfig.json",
			"tsconfig.node.json",
			"vite.config.ts",
		],
	},
	react: {
		javascript: [
			".gitignore",
			"index.html",
			"jsconfig.json",
			"manifest.json",
			"package.json",
			"public",
			"src",
			"vite.config.js",
		],
		typescript: [
			".gitignore",
			"index.html",
			"manifest.json",
			"package.json",
			"public",
			"src",
			"tsconfig.app.json",
			"tsconfig.json",
			"tsconfig.node.json",
			"vite.config.ts",
		],
	},
};

function baseOptions(overrides: Partial<CreateOptions> = {}): CreateOptions {
	return {
		projectName,
		packageName: "test-app",
		framework: "vue",
		variant: "typescript",
		features: [],
		packageManager: "pnpm",
		install: false,
		...overrides,
	};
}

function projectPath(name = projectName): string {
	return path.resolve(name);
}

function listProjectRoot(name = projectName): string[] {
	return fs
		.readdirSync(projectPath(name))
		.filter((file) => file !== ".DS_Store")
		.sort();
}

beforeEach(() => {
	tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "create-miniapp-"));
	previousCwd = process.cwd();
	process.chdir(tempDir);
});

afterEach(() => {
	process.chdir(previousCwd);
	fs.rmSync(tempDir, { recursive: true, force: true });
});

for (const framework of ["vanilla", "vue", "react"] as const) {
	for (const variant of ["javascript", "typescript"] as const) {
		test(`scaffolds ${framework}-${variant} with core files`, async () => {
			const targetDir = await generateProject(
				baseOptions({ framework, variant }),
			);

			expect(targetDir).toBe(projectPath());
			expect(listProjectRoot()).toEqual(
				[...CORE_FILES[framework][variant]].sort(),
			);
			const manifest = JSON.parse(
				fs.readFileSync(path.join(targetDir, "manifest.json"), "utf-8"),
			) as Record<string, unknown>;
			expect(manifest.entry).toEqual({
				type: "miniapp",
				url: "index.html",
			});
		});
	}
}

test("renders package.json with package name", async () => {
	const options = baseOptions({
		packageName: "my-vue-plugin",
		projectName: "my-custom-app",
	});

	await generateProject(options);

	const pkg = JSON.parse(
		fs.readFileSync(
			path.join(projectPath(options.projectName), "package.json"),
			"utf-8",
		),
	) as { name: string };

	expect(pkg.name).toBe("my-vue-plugin");
});

test("omits vitest files when feature is not selected", async () => {
	await generateProject(baseOptions({ features: [] }));

	expect(fs.existsSync(path.join(projectPath(), "tests"))).toBe(false);

	const pkg = JSON.parse(
		fs.readFileSync(path.join(projectPath(), "package.json"), "utf-8"),
	) as { scripts?: Record<string, string> };

	expect(pkg.scripts?.test).toBeUndefined();
});

test("includes vitest files when feature is selected", async () => {
	await generateProject(baseOptions({ features: ["vitest"] }));

	expect(fs.existsSync(path.join(projectPath(), "tests"))).toBe(true);

	const pkg = JSON.parse(
		fs.readFileSync(path.join(projectPath(), "package.json"), "utf-8"),
	) as { scripts?: Record<string, string> };

	expect(pkg.scripts?.test).toBe("vitest run");
});

test("restores .gitignore from the npm-safe template name", async () => {
	await generateProject(baseOptions());

	expect(fs.existsSync(path.join(projectPath(), ".gitignore"))).toBe(true);
	expect(fs.existsSync(path.join(projectPath(), "_gitignore"))).toBe(false);
});

test("adds lint scripts and configuration when lint is selected", async () => {
	await generateProject(baseOptions({ features: ["lint"] }));

	const pkg = JSON.parse(
		fs.readFileSync(path.join(projectPath(), "package.json"), "utf-8"),
	) as { scripts?: Record<string, string> };

	expect(pkg.scripts?.lint).toBe("eslint .");
	expect(pkg.scripts?.format).toBe("prettier --write .");
	expect(fs.existsSync(path.join(projectPath(), "eslint.config.js"))).toBe(true);
	expect(fs.existsSync(path.join(projectPath(), ".prettierrc"))).toBe(true);
});

test("rejects non-empty target directory", async () => {
	fs.mkdirSync(projectPath(), { recursive: true });
	fs.writeFileSync(path.join(projectPath(), "package.json"), "{}");

	await expect(generateProject(baseOptions())).rejects.toThrow(
		"Target directory is not empty",
	);
});
