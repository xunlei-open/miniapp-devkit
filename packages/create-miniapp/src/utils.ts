import validate from "validate-npm-package-name";
import type { Feature, Framework, PackageManager, Variant } from "./types.js";

export function toPackageName(input: string): string {
	return input
		.trim()
		.toLowerCase()
		.replace(/\s+/g, "-")
		.replace(/[^a-z0-9-_]/g, "-")
		.replace(/-+/g, "-")
		.replace(/^-|-$/g, "");
}

export function assertValidPackageName(name: string): void {
	const result = validate(name);
	if (!result.validForNewPackages) {
		const errors = [...(result.errors ?? []), ...(result.warnings ?? [])];
		throw new Error(`Invalid package name "${name}": ${errors.join(", ")}`);
	}
}

const ALL_FEATURES: Feature[] = ["lint", "biome", "vitest"];

const FEATURE_ALIASES: Record<string, Feature> = {
	lint: "lint",
	eslint: "lint",
	prettier: "lint",
	biome: "biome",
	vitest: "vitest",
};

const TEMPLATE_IDS: Record<Framework, Record<Variant, string>> = {
	vanilla: {
		javascript: "vanilla",
		typescript: "vanilla-ts",
	},
	vue: {
		javascript: "vue",
		typescript: "vue-ts",
	},
	react: {
		javascript: "react",
		typescript: "react-ts",
	},
};

/** Map CLI framework / variant to the templates/ directory name. */
export function resolveTemplateId(
	framework: Framework,
	variant: Variant,
): string {
	return TEMPLATE_IDS[framework][variant];
}

export function parseFramework(input: string): Framework | undefined {
	const key = input.trim().toLowerCase();
	const map: Record<string, Framework> = {
		vanilla: "vanilla",
		vue: "vue",
		react: "react",
	};
	return map[key];
}

export function parsePackageManager(input: string): PackageManager | undefined {
	const key = input.trim().toLowerCase();
	const map: Record<string, PackageManager> = {
		npm: "npm",
		yarn: "yarn",
		pnpm: "pnpm",
	};
	return map[key];
}

function pkgFromUserAgent(
	userAgent: string | undefined,
): { name: string; version: string } | undefined {
	if (!userAgent) return undefined;
	const pkgSpec = userAgent.split(" ")[0];
	const [name, version] = pkgSpec?.split("/") ?? [];
	if (!name) return undefined;
	return { name, version: version ?? "" };
}

export const PNPM_PACKAGE_MANAGER = "pnpm@10.17.1";

/** Infer npm / yarn / pnpm from npx, pnpx, yarn dlx, pnpm create, etc. */
export function detectInvokedPackageManager(): PackageManager {
	const pkgInfo = pkgFromUserAgent(process.env.npm_config_user_agent);
	if (pkgInfo) {
		const pm = parsePackageManager(pkgInfo.name);
		if (pm) return pm;
	}

	const execPath = process.env.npm_execpath ?? "";
	if (execPath.includes("pnpm")) return "pnpm";
	if (execPath.includes("yarn")) return "yarn";

	return "npm";
}

export function pmInstallCommand(pm: PackageManager): string {
	return pm === "yarn" ? "yarn" : `${pm} install`;
}

export function pmDevCommand(pm: PackageManager): string {
	return pm === "npm" ? "npm run dev" : `${pm} dev`;
}

export function pmTestCommand(pm: PackageManager): string {
	return pm === "npm" ? "npm test" : `${pm} test`;
}

export function pmDevArgs(pm: PackageManager): string[] {
	return pm === "npm" ? ["run", "dev"] : ["dev"];
}

export function parseVariant(input: string): Variant | undefined {
	const key = input.trim().toLowerCase();
	const map: Record<string, Variant> = {
		typescript: "typescript",
		ts: "typescript",
		javascript: "javascript",
		js: "javascript",
	};
	return map[key];
}

export function parseFeatures(input: string): Feature[] {
	const features: Feature[] = [];
	for (const part of input.split(/[,+]/)) {
		const key = part.trim().toLowerCase();
		if (!key) continue;
		const feature = FEATURE_ALIASES[key];
		if (feature && !features.includes(feature)) {
			features.push(feature);
		}
	}
	return resolveMutuallyExclusiveLint(features);
}

export function hasFeature(features: Feature[], feature: Feature): boolean {
	return features.includes(feature);
}

export function supportsOptionalFeatures(_framework: Framework): boolean {
	return true;
}

export function defaultFeatures(_framework: Framework): Feature[] {
	return [];
}

/** lint and biome are mutually exclusive; prefer lint when both are present. */
export function resolveMutuallyExclusiveLint(features: Feature[]): Feature[] {
	if (features.includes("lint") && features.includes("biome")) {
		return features.filter((f) => f !== "biome");
	}
	return features;
}

export function supportsBiomeLinter(framework: Framework): boolean {
	return (
		framework === "vanilla" || framework === "react" || framework === "vue"
	);
}

export function isBiomeExperimental(framework: Framework): boolean {
	return framework === "vue";
}

export function normalizeFeatures(
	features: Feature[] | undefined,
	framework: Framework,
): Feature[] {
	let result: Feature[] = [];

	for (const f of features ?? []) {
		if (ALL_FEATURES.includes(f) && !result.includes(f)) {
			result.push(f);
		}
	}

	result = resolveMutuallyExclusiveLint(result);

	if (result.includes("biome") && !supportsBiomeLinter(framework)) {
		result = result.filter((f) => f !== "biome");
	}

	return result;
}
