import { checkbox, confirm, input, select } from "@inquirer/prompts";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { runPrompts } from "../src/prompts";

vi.mock("@inquirer/prompts");

const mockInput = vi.mocked(input);
const mockSelect = vi.mocked(select);
const mockCheckbox = vi.mocked(checkbox);
const mockConfirm = vi.mocked(confirm);

function mockPromptFlow() {
	mockInput.mockResolvedValue("mock-project");
	mockSelect
		.mockResolvedValueOnce("vanilla")
		.mockResolvedValueOnce("typescript")
		.mockResolvedValueOnce(false);
	mockCheckbox.mockResolvedValue([]);
	mockConfirm.mockResolvedValue(false);
}

function mockSelectFlow(
	framework: "vanilla" | "vue" | "react",
	variant: "typescript" | "javascript",
	wantsLint: boolean,
	lintTool?: "lint" | "biome",
) {
	mockSelect.mockReset();
	mockSelect.mockResolvedValueOnce(framework);
	mockSelect.mockResolvedValueOnce(variant);
	mockSelect.mockResolvedValueOnce(wantsLint);
	if (wantsLint && lintTool) {
		mockSelect.mockResolvedValueOnce(lintTool);
	}
}

beforeEach(() => {
	vi.clearAllMocks();
	mockPromptFlow();
});

afterEach(() => {
	vi.unstubAllEnvs();
});

test("prompts for project name with fallback default when defaults omit projectName", async () => {
	await runPrompts();

	expect(mockInput).toHaveBeenCalledOnce();
	expect(mockInput).toHaveBeenCalledWith({
		message: "Project name:",
		default: "xunlei-plugin-project",
	});
});

test("uses input value as projectName in result", async () => {
	mockInput.mockResolvedValue("test-app");

	const result = await runPrompts();

	expect(result.projectName).toBe("test-app");
});

test("rejects invalid package name", async () => {
	mockInput.mockResolvedValue("!!!");

	await expect(runPrompts()).rejects.toThrow(/Invalid package name/);
});

test("framework defaults to vanilla when defaults omit framework", async () => {
	await runPrompts();

	expect(mockSelect).toHaveBeenCalledWith(
		expect.objectContaining({
			message: "Select a framework:",
			default: "vanilla",
		}),
	);
});

test("uses selected framework and variant in result", async () => {
	mockSelectFlow("vue", "typescript", false);

	const result = await runPrompts();

	expect(result.framework).toBe("vue");
	expect(result.variant).toBe("typescript");
});

test("uses detected package manager in result", async () => {
	vi.stubEnv(
		"npm_config_user_agent",
		"pnpm/9.15.0 npm/? node/v22.21.1 darwin arm64",
	);

	const result = await runPrompts();

	expect(result.packageManager).toBe("pnpm");
});

test("uses install confirm in result", async () => {
	mockConfirm.mockResolvedValue(true);

	const result = await runPrompts();

	expect(result.install).toBe(true);
});

test("skips linter selection when user declines linter", async () => {
	mockSelectFlow("vue", "typescript", false);

	const result = await runPrompts();

	expect(result.features).toStrictEqual([]);
	expect(mockSelect).not.toHaveBeenCalledWith(
		expect.objectContaining({ message: "Select linter / formatter:" }),
	);
});

test("selects biome when user picks biome linter", async () => {
	mockSelectFlow("vue", "typescript", true, "biome");

	const result = await runPrompts();

	expect(result.features).toStrictEqual(["biome"]);
	expect(result.features).not.toContain("lint");
	expect(mockSelect).toHaveBeenCalledWith(
		expect.objectContaining({
			message: "Select linter / formatter:",
			choices: [
				expect.objectContaining({ value: "lint" }),
				expect.objectContaining({
					value: "biome",
					name: "Biome (lint + format) (Experimental)",
				}),
			],
		}),
	);
});

test("selects lint when user picks eslint linter", async () => {
	mockSelectFlow("vue", "typescript", true, "lint");

	const result = await runPrompts();

	expect(result.features).toStrictEqual(["lint"]);
	expect(result.features).not.toContain("biome");
});

test("includes vitest when selected in checkbox", async () => {
	mockSelectFlow("vue", "typescript", false);
	mockCheckbox.mockResolvedValue(["vitest"]);

	const result = await runPrompts();

	expect(result.features).toStrictEqual(["vitest"]);
});
