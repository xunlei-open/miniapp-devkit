import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, expect, test } from "vitest";
import createMiniappPackage from "../package.json";
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
			"miniapp.config.js",
			"package.json",
			"public",
			"src",
		],
		typescript: [
			".gitignore",
			"index.html",
			"manifest.json",
			"miniapp.config.ts",
			"package.json",
			"public",
			"src",
			"tsconfig.json",
		],
	},
	vue: {
		javascript: [
			".gitignore",
			"index.html",
			"jsconfig.json",
			"manifest.json",
			"miniapp.config.js",
			"package.json",
			"public",
			"src",
		],
		typescript: [
			".gitignore",
			"index.html",
			"manifest.json",
			"miniapp.config.ts",
			"package.json",
			"public",
			"src",
			"tsconfig.app.json",
			"tsconfig.json",
			"tsconfig.node.json",
		],
	},
	react: {
		javascript: [
			".gitignore",
			"index.html",
			"jsconfig.json",
			"manifest.json",
			"miniapp.config.js",
			"package.json",
			"public",
			"src",
		],
		typescript: [
			".gitignore",
			"index.html",
			"manifest.json",
			"miniapp.config.ts",
			"package.json",
			"public",
			"src",
			"tsconfig.app.json",
			"tsconfig.json",
			"tsconfig.node.json",
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
			expect(manifest.permissions).toEqual(["tasks.create"]);
			expect(manifest.scripts).toBeUndefined();
			expect(fs.existsSync(path.join(targetDir, "src/events"))).toBe(false);

			const appEntry =
				framework === "vanilla"
					? variant === "typescript"
						? "src/main.ts"
						: "src/main.js"
					: framework === "vue"
						? "src/App.vue"
						: variant === "typescript"
							? "src/App.tsx"
							: "src/App.jsx";
			const appSource = fs.readFileSync(
				path.join(targetDir, appEntry),
				"utf-8",
			);
			expect(appSource).toContain("xunlei.tasks.create");
			expect(appSource).not.toContain("counter");
			const pkg = JSON.parse(
				fs.readFileSync(path.join(targetDir, "package.json"), "utf-8"),
			) as {
				scripts: Record<string, string>;
				devDependencies: Record<string, string>;
			};
			expect(pkg.scripts.dev).toBe("xunlei-miniapp");
			expect(pkg.scripts.package).toBe("xunlei-miniapp package");
			expect(pkg.devDependencies["@xunlei-open/miniapp"]).toBe(
				`^${createMiniappPackage.version}`,
			);
			expect(
				pkg.devDependencies["@xunlei-open/vite-plugin-miniapp"],
			).toBeUndefined();

			const configFile =
				variant === "typescript" ? "miniapp.config.ts" : "miniapp.config.js";
			expect(
				fs.readFileSync(path.join(targetDir, configFile), "utf-8"),
			).toContain("defineConfig");
			expect(
				fs.existsSync(path.join(targetDir, configFile)),
			).toBe(true);
			expect(
				fs.existsSync(
					path.join(
						targetDir,
						variant === "typescript" ? "vite.config.ts" : "vite.config.js",
					),
				),
			).toBe(false);
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
	) as {
		name: string;
		scripts: Record<string, string>;
		devDependencies: Record<string, string>;
	};

	expect(pkg.name).toBe("my-vue-plugin");
	expect(pkg.scripts.dev).toBe("xunlei-miniapp");
	expect(pkg.scripts.package).toBe("xunlei-miniapp package");
	expect(pkg.devDependencies["@xunlei-open/miniapp"]).toBe(
		`^${createMiniappPackage.version}`,
	);
	expect(pkg.devDependencies["@xunlei-open/vite-plugin-miniapp"]).toBeUndefined();
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
