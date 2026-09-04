import { checkbox, confirm, input, select } from "@inquirer/prompts";
import type { CreateOptions, Feature, Framework, Variant } from "./types.js";
import {
	assertValidPackageName,
	defaultFeatures,
	detectInvokedPackageManager,
	isBiomeExperimental,
	supportsBiomeLinter,
	supportsOptionalFeatures,
	toPackageName,
} from "./utils.js";

export async function runPrompts(
	defaults: Partial<CreateOptions> = {},
): Promise<CreateOptions> {
	const projectName = await input({
		message: "Project name:",
		default: defaults.projectName ?? "xunlei-plugin-project",
	});

	const packageName = toPackageName(defaults.packageName ?? projectName);
	assertValidPackageName(packageName);

	const framework = await select({
		message: "Select a framework:",
		choices: [
			{ name: "Vanilla", value: "vanilla" as const },
			{ name: "Vue", value: "vue" as const },
			{ name: "React", value: "react" as const },
		],
		default: defaults.framework ?? "vanilla",
	});

	const variant = await selectVariant(defaults.variant);

	const features = supportsOptionalFeatures(framework)
		? await promptFeatures(
				framework,
				variant,
				defaults.features ?? defaultFeatures(framework),
			)
		: [];

	const packageManager =
		defaults.packageManager ?? detectInvokedPackageManager();

	const install = await confirm({
		message: `Install dependencies with ${packageManager} and start now?`,
		default: defaults.install ?? true,
	});

	return {
		projectName,
		packageName,
		framework,
		variant,
		features,
		packageManager,
		install,
	};
}

async function promptFeatures(
	framework: Framework,
	_variant: Variant,
	defaultSelected: Feature[],
): Promise<Feature[]> {
	const features: Feature[] = [];

	const wantsLint = await promptAddLinter(defaultSelected);
	if (wantsLint) {
		features.push(await promptLintTool(framework, defaultSelected));
	}

	const extra = await checkbox({
		message: "Select additional features:",
		choices: [
			{
				name: "Vitest (unit testing)",
				value: "vitest",
				checked: defaultSelected.includes("vitest"),
			},
		],
	});
	features.push(...(extra as Feature[]));

	return features;
}

async function promptAddLinter(_defaultSelected: Feature[]): Promise<boolean> {
	return select({
		message: "Add linter / formatter?",
		choices: [
			{ name: "No", value: false as const },
			{ name: "Yes", value: true as const },
		],
		default: true,
	});
}

async function promptLintTool(
	framework: Framework,
	defaultSelected: Feature[],
): Promise<"lint" | "biome"> {
	const biomeLabel = isBiomeExperimental(framework)
		? "Biome (lint + format) (Experimental)"
		: "Biome (lint + format)";

	const choices = supportsBiomeLinter(framework)
		? [
				{ name: "ESLint + Prettier", value: "lint" as const },
				{ name: biomeLabel, value: "biome" as const },
			]
		: [{ name: "ESLint + Prettier", value: "lint" as const }];

	return select({
		message: "Select linter / formatter:",
		choices,
		default: defaultSelected.includes("biome") ? "biome" : "lint",
	});
}

async function selectVariant(defaultVariant?: Variant): Promise<Variant> {
	return select({
		message: "Select a variant:",
		choices: [
			{ name: "TypeScript", value: "typescript" as const },
			{ name: "JavaScript", value: "javascript" as const },
		],
		default: defaultVariant ?? "typescript",
	});
}
