import { SemanticVersion, semanticVersionRegex } from "./semantic-version";

describe("SemanticVersion", () => {
	it("creates default version values", () => {
		const version = new SemanticVersion();

		expect(version.toString()).toBe("0.0.1");
		expect(version.toJSON()).toEqual({
			branch: undefined,
			label: undefined,
			major: 0,
			minor: 0,
			patch: 1,
			hotfix: undefined,
			prerelease: undefined,
			build: undefined,
			complianceSettings: version.ComplianceSettings,
		});
	});

	it("serializes semantic versions with optional components", () => {
		const version = new SemanticVersion({
			major: 1,
			minor: 2,
			patch: 3,
			hotfix: 4,
			prerelease: "rc.1",
			build: "build.1",
		});

		expect(version.toString()).toBe("1.2.3.4-rc.1+build.1");
	});

	it("compares version precedence", () => {
		const a = new SemanticVersion({ major: 1, minor: 0, patch: 0 });
		const b = new SemanticVersion({ major: 2, minor: 0, patch: 0 });

		expect(a.comparePrecedence(b)).toBeLessThan(0);
		expect(b.comparePrecedence(a)).toBeGreaterThan(0);
		expect(a.comparePrecedence(new SemanticVersion({ major: 1, minor: 0, patch: 0 }))).toBe(0);
	});

	it("returns undefined for invalid tryParse input", () => {
		expect(SemanticVersion.tryParse("invalid")).toBeUndefined();
		expect(SemanticVersion.tryParse(123)).toBeUndefined();
	});
});

describe("semanticVersionRegex", () => {
	it("matches semantic version strings with optional prefixes", () => {
		const match = "version 1.2.3".match(semanticVersionRegex);

		expect(match).not.toBeNull();
		expect(match?.[0]).toBe("version 1.2.3");
	});
});
