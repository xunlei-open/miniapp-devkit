import { expect, test, vi } from "vitest";
import {
	assertValidPackageName,
	defaultFeatures,
	detectInvokedPackageManager,
	hasFeature,
	isBiomeExperimental,
	normalizeFeatures,
	parseFeatures,
	parseFramework,
	parsePackageManager,
	parseVariant,
	pmDevArgs,
	pmDevCommand,
	pmInstallCommand,
	pmTestCommand,
	resolveMutuallyExclusiveLint,
	resolveTemplateId,
	supportsBiomeLinter,
	supportsOptionalFeatures,
	toPackageName,
} from "../src/utils";

test("toPackageName", () => {
	expect(toPackageName(" xunlei-miniapp ")).toBe("xunlei-miniapp");
	expect(toPackageName("XUNLEI-MINIAPP")).toBe("xunlei-miniapp");
	expect(toPackageName("xunlei-   miniapp    1.0.0")).toBe(
		"xunlei-miniapp-1-0-0",
	);
	expect(toPackageName("xunlei---miniapp")).toBe("xunlei-miniapp");
	expect(toPackageName("xunlei微应用")).toBe("xunlei");
	expect(toPackageName("-xunlei-")).toBe("xunlei");
});

test("assertValidPackageName", () => {
	expect(() => assertValidPackageName("xunlei-miniapp")).not.toThrow();
	expect(() => assertValidPackageName(" ")).toThrow();
});

test("resolveTemplateId", () => {
	expect(resolveTemplateId("vanilla", "javascript")).toBe("vanilla");
	expect(resolveTemplateId("vanilla", "typescript")).toBe("vanilla-ts");
	expect(resolveTemplateId("vue", "javascript")).toBe("vue");
	expect(resolveTemplateId("vue", "typescript")).toBe("vue-ts");
	expect(resolveTemplateId("react", "javascript")).toBe("react");
	expect(resolveTemplateId("react", "typescript")).toBe("react-ts");
});

test("parseFramework", () => {
	expect(parseFramework("vanilla")).toBe("vanilla");
	expect(parseFramework("vue")).toBe("vue");
	expect(parseFramework("react")).toBe("react");
});

test("parsePackageManager", () => {
	expect(parsePackageManager("npm")).toBe("npm");
	expect(parsePackageManager("yarn")).toBe("yarn");
	expect(parsePackageManager("pnpm")).toBe("pnpm");
});

// TODO 这里后续发布之后，需要补充测试npx pnpx yarn dlx 等命令的场景
test("detectInvokedPackageManager", () => {
	vi.stubEnv(
		"npm_config_user_agent",
		"pnpm/9.15.0 npm/? node/v22.21.1 darwin arm64",
	);
	expect(detectInvokedPackageManager()).toBe("pnpm");
	vi.stubEnv(
		"npm_config_user_agent",
		"npm/10.9.4 node/v22.21.1 darwin arm64 workspaces/false",
	);
	expect(detectInvokedPackageManager()).toBe("npm");
	vi.stubEnv(
		"npm_config_user_agent",
		"yarn/1.22.22 npm/? node/v22.21.1 darwin arm64",
	);
	expect(detectInvokedPackageManager()).toBe("yarn");
});

test("pmInstallCommand", () => {
	expect(pmInstallCommand("npm")).toBe("npm install");
	expect(pmInstallCommand("yarn")).toBe("yarn");
	expect(pmInstallCommand("pnpm")).toBe("pnpm install");
});

test("pmDevCommand", () => {
	expect(pmDevCommand("npm")).toBe("npm run dev");
	expect(pmDevCommand("yarn")).toBe("yarn dev");
	expect(pmDevCommand("pnpm")).toBe("pnpm dev");
});

test("pmTestCommand", () => {
	expect(pmTestCommand("npm")).toBe("npm test");
	expect(pmTestCommand("yarn")).toBe("yarn test");
	expect(pmTestCommand("pnpm")).toBe("pnpm test");
});

test("pmDevArgs", () => {
	expect(pmDevArgs("npm")).toStrictEqual(["run", "dev"]);
	expect(pmDevArgs("yarn")).toStrictEqual(["dev"]);
	expect(pmDevArgs("pnpm")).toStrictEqual(["dev"]);
});

test("parseVariant", () => {
	expect(parseVariant("typescript")).toBe("typescript");
	expect(parseVariant("javascript")).toBe("javascript");
	expect(parseVariant("ts")).toBe("typescript");
	expect(parseVariant("js")).toBe("javascript");
	expect(parseVariant("unknown")).toBeUndefined();
});

test("parseFeatures", () => {
	expect(parseFeatures("lint")).toStrictEqual(["lint"]);
	expect(parseFeatures("lint,biome")).toStrictEqual(["lint"]);
	expect(parseFeatures("lint,biome,vitest")).toStrictEqual(["lint", "vitest"]);
});

test("hasFeature", () => {
	expect(hasFeature(["lint"], "lint")).toBe(true);
	expect(hasFeature(["lint"], "biome")).toBe(false);
	expect(hasFeature(["lint", "vitest"], "vitest")).toBe(true);
	expect(hasFeature(["lint", "vitest"], "biome")).toBe(false);
});

test("supportsOptionalFeatures", () => {
	expect(supportsOptionalFeatures("vanilla")).toBe(true);
	expect(supportsOptionalFeatures("vue")).toBe(true);
	expect(supportsOptionalFeatures("react")).toBe(true);
});

test("defaultFeatures", () => {
	expect(defaultFeatures("vanilla")).toStrictEqual([]);
	expect(defaultFeatures("vue")).toStrictEqual([]);
	expect(defaultFeatures("react")).toStrictEqual([]);
});

test("resolveMutuallyExclusiveLint", () => {
	expect(resolveMutuallyExclusiveLint(["lint", "biome"])).toStrictEqual([
		"lint",
	]);
	expect(
		resolveMutuallyExclusiveLint(["lint", "biome", "vitest"]),
	).toStrictEqual(["lint", "vitest"]);
	expect(resolveMutuallyExclusiveLint(["biome", "vitest"])).toStrictEqual([
		"biome",
		"vitest",
	]);
});

test("supportsBiomeLinter", () => {
	expect(supportsBiomeLinter("vanilla")).toBe(true);
	expect(supportsBiomeLinter("vue")).toBe(true);
	expect(supportsBiomeLinter("react")).toBe(true);
});

test("isBiomeExperimental", () => {
	expect(isBiomeExperimental("vue")).toBe(true);
	expect(isBiomeExperimental("react")).toBe(false);
	expect(isBiomeExperimental("vanilla")).toBe(false);
});

test("normalizeFeatures", () => {
	expect(normalizeFeatures(["lint", "biome"], "vanilla")).toStrictEqual([
		"lint",
	]);
	expect(normalizeFeatures(["lint", "biome"], "vue")).toStrictEqual(["lint"]);
	expect(normalizeFeatures(["lint", "biome"], "react")).toStrictEqual(["lint"]);
});
