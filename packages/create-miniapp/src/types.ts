export type Framework = "vanilla" | "vue" | "react";

export type Variant = "typescript" | "javascript";

export type Feature = "lint" | "biome" | "vitest";

export type PackageManager = "npm" | "yarn" | "pnpm";

export interface CreateOptions {
	projectName: string;
	packageName: string;
	framework: Framework;
	variant: Variant;
	features: Feature[];
	packageManager: PackageManager;
	install: boolean;
}

export interface TemplateContext {
	projectName: string;
	packageName: string;
	variant: Variant;
	features: Feature[];
	packageManager: PackageManager;
	pnpmPackageManager: string;
	isTypeScript: boolean;
}
