import assert from "node:assert/strict";
import test from "node:test";
import RepositoryMapBuilder from "../../../../../src/features/github-tools/tools/repo-mapper/domain/RepositoryMapBuilder.ts";

test("keeps paths whose segments collide with inherited object keys", () => {
	const result = RepositoryMapBuilder.build([
		{ path: "src", type: "tree" },
		{ path: "src/constructor", type: "tree" },
		{ path: "src/constructor/index.js", type: "blob" },
		{ path: "toString", type: "blob" },
		{ path: "README.md", type: "blob" },
	], "ascii");

	assert.equal(result.output, [
		"├── src",
		"│   └── constructor",
		"│       └── index.js",
		"├── README.md",
		"└── toString",
	].join("\n"));
	assert.equal(result.files, 3);
	assert.equal(result.folders, 2);
});

test("does not emit a blank line for directories without children", () => {
	const result = RepositoryMapBuilder.build([
		{ path: "vendor", type: "tree" },
		{ path: "README.md", type: "blob" },
	], "ascii");

	assert.equal(result.output, "├── vendor\n└── README.md");
});

test("lists raw paths in source order for the paths format", () => {
	const result = RepositoryMapBuilder.build([
		{ path: "b.md", type: "blob" },
		{ path: "a", type: "tree" },
	], "paths");

	assert.equal(result.output, "b.md\na");
});
