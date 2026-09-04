import path from "node:path";
import { fileURLToPath } from "node:url";
import { execaSync } from "execa";
import { expect, test } from "vitest";

const CLI_PATH = path.join(
	path.dirname(fileURLToPath(import.meta.url)),
	"../src/index.ts",
);

const run = (args: string[]) => {
	return execaSync("tsx", [CLI_PATH, ...args]);
};

test("matches help snapshot", () => {
	const { stdout: help } = run(["--help"]);
	const { stdout: shortHelp } = run(["-h"]);

	expect(help).toMatchSnapshot();
	expect(shortHelp).toBe(help);
});
