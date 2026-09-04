import { Command } from "commander";
import { execa } from "execa";
import { cyan } from "kolorist";
import packageJson from "../package.json";
import { generateProject, printError, printNextSteps } from "./generator.js";
import { runPrompts } from "./prompts.js";
import type { CreateOptions, Framework, Variant } from "./types.js";
import {
	assertValidPackageName,
	detectInvokedPackageManager,
	normalizeFeatures,
	parseFeatures,
	parseFramework,
	parsePackageManager,
	parseVariant,
	pmDevArgs,
	pmDevCommand,
	toPackageName,
} from "./utils.js";

const CLI_NAME = "@xunlei-open/create-miniapp";

const program = new Command();

program
	.name(CLI_NAME)
	.description("Xunlei Open Platform plugin scaffold")
	.version(packageJson.version)
	.argument("[project-name]", "project name")
	.option("--framework <framework>", "vanilla | vue | react")
	.option("--variant <variant>", "typescript | javascript")
	.option(
		"--features <features>",
		"comma-separated: lint,biome,vitest (lint and biome are mutually exclusive; eslint/prettier alias lint)",
	)
	.option("--package-manager <pm>", "npm | yarn | pnpm")
	.option("--no-install", "skip dependency installation")
	.option("-y, --yes", "use defaults and skip prompts")
	.action(async (projectName: string | undefined, opts) => {
		try {
			const defaults: Partial<CreateOptions> = {};
			if (projectName) defaults.projectName = projectName;

			const frameworkInput = opts.framework;
			if (frameworkInput) {
				const parsed = parseFramework(frameworkInput);
				if (!parsed) {
					throw new Error(
						`Unknown framework: ${frameworkInput} (supported: vanilla | vue | react)`,
					);
				}
				defaults.framework = parsed;
			}

			const variantInput = opts.variant;
			if (variantInput) {
				const parsed = parseVariant(variantInput);
				if (!parsed) {
					throw new Error(
						`Unknown variant: ${variantInput} (supported: typescript | javascript)`,
					);
				}
				defaults.variant = parsed;
			}

			const featuresInput = opts.features;
			if (featuresInput) {
				const parsed = parseFeatures(featuresInput);
				if (parsed.length === 0) {
					throw new Error(
						`Unknown features: ${featuresInput} (supported: lint, biome, vitest; eslint/prettier alias lint)`,
					);
				}
				defaults.features = parsed;
			}

			if (opts.install === false) defaults.install = false;

			const packageManagerInput = opts.packageManager;
			if (packageManagerInput) {
				const parsed = parsePackageManager(packageManagerInput);
				if (!parsed) {
					throw new Error(
						`Unknown package manager: ${packageManagerInput} (supported: npm | yarn | pnpm)`,
					);
				}
				defaults.packageManager = parsed;
			} else {
				defaults.packageManager = detectInvokedPackageManager();
			}

			console.log(cyan(`\n ${CLI_NAME} \n`));
			const options = opts.yes
				? resolveOptionsFromDefaults(defaults)
				: await runPrompts(defaults);
			const targetDir = await generateProject(options);

			let installed = false;
			if (options.install) {
				const { packageManager: pm } = options;
				console.log(cyan(`\nInstalling dependencies (${pm})...\n`));
				await execa(pm, ["install"], {
					cwd: targetDir,
					stdio: "inherit",
				});
				installed = true;

				printNextSteps(targetDir, options, installed, true);
				console.log(cyan(`\nStarting dev server (${pmDevCommand(pm)})...\n`));
				await execa(pm, pmDevArgs(pm), { cwd: targetDir, stdio: "inherit" });
			} else {
				printNextSteps(targetDir, options, installed);
			}
		} catch (err) {
			printError(err);
			process.exit(1);
		}
	});

function resolveOptionsFromDefaults(
	defaults: Partial<CreateOptions>,
): CreateOptions {
	const projectName = defaults.projectName ?? "xunlei-plugin-project";
	const packageName = toPackageName(defaults.packageName ?? projectName);
	assertValidPackageName(packageName);

	const framework = (defaults.framework ?? "vanilla") as Framework;
	const variant = (defaults.variant ?? "typescript") as Variant;

	const features = normalizeFeatures(defaults.features, framework);
	const packageManager =
		defaults.packageManager ?? detectInvokedPackageManager();
	const install = defaults.install ?? true;

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

program.parse();
