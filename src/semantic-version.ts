import { z } from "zod";

export const semanticVersionRegex =
	/^(?:(?<Label>v|(?:ver)|(?:version)) ?)?(?<Major>\d+)\.(?<Minor>\d+)\.(?<Patch>\d+)(?:\.(?<Hotfix>\d+))?(?:\.(?<Prerelease>[1-9a-z][0-9a-z.]*))?(?:\+(?<Build>(?:[0-9a-z.-]+)*))?$/gi;
const alphaNumericWithPrefixRuleRegex = /^[1-9a-z-][0-9a-z-]*$/gi;
const alphaNumericRegex = /^[0-9a-z-]+$/gi;
const LabelSchema = z
	.string()
	.refine((k) => k.match(/^v|(?:ver)|(?:version)?$/gi))
	.optional();
const MajorVersionSchema = z.number().int().nonnegative().safe().finite();
const MinorVersionSchema = z.number().int().nonnegative().safe().finite();
const PatchVersionSchema = z.number().int().nonnegative().safe().finite();
const HotfixVersionSchema = z
	.number()
	.int()
	.nonnegative()
	.safe()
	.finite()
	.optional();
const PrereleaseVersionSchema = z
	.string()
	.refine((k) => {
		return k
			.split(".")
			.every((piece) => piece.match(alphaNumericWithPrefixRuleRegex) !== null);
	}, "Prerelease Version does not match required format.")
	.optional();
const BuildVersionSchema = z
	.string()
	.refine((k) => {
		return k
			.split(".")
			.every((piece) => piece.match(alphaNumericRegex) !== null);
	}, "Build Version does not match required format.")
	.optional();
const BranchSchema = z.string().min(1).optional();

type Label = z.infer<typeof LabelSchema>;
type MajorVersion = z.infer<typeof MajorVersionSchema>;
type MinorVersion = z.infer<typeof MinorVersionSchema>;
type PatchVersion = z.infer<typeof PatchVersionSchema>;
type HotfixVersion = z.infer<typeof HotfixVersionSchema>;
type PrereleaseVersion = z.infer<typeof PrereleaseVersionSchema>;
type BuildVersion = z.infer<typeof BuildVersionSchema>;
type Branch = z.infer<typeof BranchSchema>;

type UndefinedToEmptyStringWithPrefixAndSuffix<
	T extends string | number | undefined,
	Prefix extends string = "",
	Suffix extends string = "",
> = T extends undefined ? "" : `${Prefix}${T}${Suffix}`;

export type SemanticVersionString =
	`${UndefinedToEmptyStringWithPrefixAndSuffix<
		Branch,
		"",
		" "
	>}${UndefinedToEmptyStringWithPrefixAndSuffix<
		Label,
		"",
		" "
	>}${MajorVersion}.${MinorVersion}.${PatchVersion}${UndefinedToEmptyStringWithPrefixAndSuffix<
		HotfixVersion,
		"."
	>}${UndefinedToEmptyStringWithPrefixAndSuffix<
		PrereleaseVersion,
		"-"
	>}${UndefinedToEmptyStringWithPrefixAndSuffix<BuildVersion, "+">}`;

const SemanticVersionSchema = z.object({
	branch: BranchSchema,
	label: LabelSchema,
	major: MajorVersionSchema,
	minor: MinorVersionSchema,
	patch: PatchVersionSchema,
	hotfix: HotfixVersionSchema,
	prerelease: PrereleaseVersionSchema,
	build: BuildVersionSchema,
	complianceSettings: z
		.object({
			Branch: z
				.union([
					z.literal("required"),
					z.literal("optional"),
					z.literal("forbidden"),
					z.array(z.union([z.string(), z.instanceof(RegExp)])),
				])
				.default("optional"),
			Label: z
				.union([
					z.literal("required"),
					z.literal("optional"),
					z.literal("forbidden"),
					z.array(z.union([z.string(), z.instanceof(RegExp)])),
				])
				.default("optional"),
			Hotfix: z
				.union([
					z.literal("required"),
					z.literal("optional"),
					z.literal("forbidden"),
					z.array(z.union([z.number(), z.instanceof(RegExp)])),
				])
				.default("optional"),
			Prerelease: z
				.union([
					z.literal("required"),
					z.literal("optional"),
					z.literal("forbidden"),
					z.array(z.union([z.string(), z.instanceof(RegExp)])),
				])
				.default("optional"),
			Build: z
				.union([
					z.literal("required"),
					z.literal("optional"),
					z.literal("forbidden"),
					z.array(z.union([z.string(), z.instanceof(RegExp)])),
				])
				.default("optional"),
		})
		.optional(),
});

type SemanticVersionStruct = z.infer<typeof SemanticVersionSchema>;

type SemanticVersionStringTemplate<T extends SemanticVersionStruct> =
	`${UndefinedToEmptyStringWithPrefixAndSuffix<
		T["branch"],
		"",
		" "
	>}${UndefinedToEmptyStringWithPrefixAndSuffix<
		T["label"],
		"",
		" "
	>}${T["major"]}.${T["minor"]}.${T["patch"]}${UndefinedToEmptyStringWithPrefixAndSuffix<
		T["hotfix"],
		"."
	>}${UndefinedToEmptyStringWithPrefixAndSuffix<
		T["prerelease"],
		"-"
	>}${UndefinedToEmptyStringWithPrefixAndSuffix<T["build"], "+">}`;

/**
 * These properties must match at least one element in the array to be considered compliant.
 */
type SemanticVersionComplianceSettings = {
	Branch: "required" | "optional" | "forbidden" | (string | RegExp)[];
	Label: "required" | "optional" | "forbidden" | (string | RegExp)[];
	Hotfix: "required" | "optional" | "forbidden" | (number | RegExp)[];
	Prerelease: "required" | "optional" | "forbidden" | (string | RegExp)[];
	Build: "required" | "optional" | "forbidden" | (string | RegExp)[];
};

type ComplianceMessage = {
	message: string;
	type: "error" | "warning" | "info";
};

type ComplianceReport<
	T extends
		| keyof SemanticVersionComplianceSettings
		| "Major"
		| "Minor"
		| "Patch",
> = {
	field: T;
	success: boolean;
	messages: ComplianceMessage[];
};

const checkCustomComplianceForSingleSetting = <
	Key extends keyof SemanticVersionComplianceSettings,
>(
	key: Key,
	struct: SemanticVersion<SemanticVersionStruct>,
): ComplianceReport<Key> => {
	const setting = struct.ComplianceSettings[key];
	const expectedType = key === "Hotfix" ? "number" : "string";
	if (struct) {
		if (setting === "required") {
			if (
				!struct[key] ||
				typeof struct[key] !== expectedType ||
				(expectedType === "string"
					? (struct[key] as string).trim().length > 0
					: true)
			) {
				return {
					field: key,
					success: false,
					messages: [
						{
							message: `Semantic Version Setting ${key} is required`,
							type: "error",
						},
					],
				};
			}
		} else if (setting === "forbidden") {
			if (struct[key] !== undefined) {
				return {
					field: key,
					success: false,
					messages: [
						{
							message: `Semantic Version Setting ${key} is forbidden`,
							type: "error",
						},
					],
				};
			}
		} else if (
			setting === "optional" ||
			setting === null ||
			setting === undefined
		) {
			// Do nothing
		} else {
			if (
				!setting.some((s) =>
					typeof s === "string"
						? s === ""
							? struct[key] === undefined
							: s === struct[key]
						: typeof s === "number"
						? s === struct[key]
						: s.test(struct[key] ? struct[key].toString() : ""),
				)
			) {
				return {
					field: key,
					success: false,
					messages: [
						{
							message: `Semantic Version Setting ${key} does not match required format`,
							type: "error",
						},
					],
				};
			}
		}
		return {
			field: key,
			success: true,
			messages: [],
		};
	}
	throw new Error(`Semantic Version Struct is null or undefined.`);
};

const checkCustomCompliance = (
	struct: SemanticVersion<SemanticVersionStruct>,
) => {
	const complianceMessages = [
		checkCustomComplianceForSingleSetting("Branch", struct),
		checkCustomComplianceForSingleSetting("Label", struct),
		checkCustomComplianceForSingleSetting("Hotfix", struct),
		checkCustomComplianceForSingleSetting("Prerelease", struct),
		checkCustomComplianceForSingleSetting("Build", struct),
	];
	return {
		success: complianceMessages.every((m) => m?.success),
		messages: complianceMessages.flatMap((m) => m.messages),
	};
};

const checkStandardCompliance = (
	struct: SemanticVersion<SemanticVersionStruct>,
	strict: boolean = false,
) => {
	const messages: ComplianceMessage[] = [
		strict
			? {
					field: "Branch" as const,
					message: "Branch is not a standard notation",
					type: (struct.Branch !== undefined ? "error" : "info") as
						| "error"
						| "info",
			  }
			: BranchSchema.safeParse(struct.Branch).success
			? null
			: {
					field: "Branch" as const,
					message: "Branch does not match required format",
					type: "error" as const,
			  },
		strict && struct.Label
			? {
					field: "Label" as const,
					message: "Label is not a standard notation",
					type: "error" as const,
			  }
			: LabelSchema.safeParse(struct.Label).success
			? null
			: {
					field: "Label" as const,
					message: "Label does not match required format",
					type: "error" as const,
			  },
		MajorVersionSchema.safeParse(struct.Major).success
			? null
			: {
					field: "Major" as const,
					message: "Major Version does not match required format",
					type: "error" as const,
			  },
		MinorVersionSchema.safeParse(struct.Minor).success
			? null
			: {
					field: "Minor" as const,
					message: "Minor Version does not match required format",
					type: "error" as const,
			  },
		PatchVersionSchema.safeParse(struct.Patch).success
			? null
			: {
					field: "Patch" as const,
					message: "Patch Version does not match required format",
					type: "error" as const,
			  },
		strict
			? {
					field: "Hotfix" as const,
					message: "Hotfix is not a standard notation",
					type: (struct.Hotfix !== undefined ? "error" : "info") as
						| "error"
						| "info",
			  }
			: HotfixVersionSchema.safeParse(struct.Hotfix).success
			? null
			: {
					field: "Hotfix" as const,
					message: "Hotfix Version does not match required format",
					type: "error" as const,
			  },
		PrereleaseVersionSchema.safeParse(struct.Prerelease).success
			? null
			: {
					field: "Prerelease" as const,
					message: "Prerelease Version does not match required format",
					type: "error" as const,
			  },
		BuildVersionSchema.safeParse(struct.Build).success
			? null
			: {
					field: "Build" as const,
					message: "Build Version does not match required format",
					type: "error" as const,
			  },
	].filter((k) => k !== null);

	return {
		success: !messages.some((m) => m.type === "error"),
		messages: messages,
	};
};

export class SemanticVersion<
	Struct extends SemanticVersionStruct = SemanticVersionStruct,
	T extends SemanticVersionStringTemplate<Struct> = SemanticVersionStringTemplate<Struct>,
> {
	private _branch: Struct["branch"];
	private _label: Struct["label"];
	private _major: Struct["major"];
	private _minor: Struct["minor"];
	private _patch: Struct["patch"];
	private _hotfix: Struct["hotfix"];
	private _prerelease: Struct["prerelease"];
	private _build: Struct["build"];

	private static _complianceSettings: SemanticVersionComplianceSettings;

	private _complianceSettings: SemanticVersionComplianceSettings;

	get ComplianceSettings(): SemanticVersionComplianceSettings {
		return this._complianceSettings;
	}

	get Branch(): Struct["branch"] {
		return this._branch;
	}
	changeBranch(branch: Branch): SemanticVersion<Struct, T> {
		return new SemanticVersion({ ...this, branch });
	}
	get Label(): Struct["label"] {
		return this._label;
	}
	changeLabel(label: Label): SemanticVersion<Struct, T> {
		return new SemanticVersion({ ...this, label });
	}
	get Major(): Struct["major"] {
		return this._major;
	}
	changeMajor(major: MajorVersion): SemanticVersion<Struct, T> {
		return new SemanticVersion({ ...this, major });
	}
	get Minor(): Struct["minor"] {
		return this._minor;
	}
	changeMinor(minor: MinorVersion): SemanticVersion<Struct, T> {
		return new SemanticVersion({ ...this, minor });
	}
	get Patch(): Struct["patch"] {
		return this._patch;
	}
	changePatch(patch: PatchVersion): SemanticVersion<Struct, T> {
		return new SemanticVersion({ ...this, patch });
	}
	get Hotfix(): Struct["hotfix"] {
		return this._hotfix;
	}
	changeHotfix(hotfix: HotfixVersion): SemanticVersion<Struct, T> {
		return new SemanticVersion({ ...this, hotfix });
	}
	get Prerelease(): Struct["prerelease"] {
		return this._prerelease;
	}
	changePrerelease(prerelease: PrereleaseVersion): SemanticVersion<Struct, T> {
		return new SemanticVersion({ ...this, prerelease });
	}
	get Build(): Struct["build"] {
		return this._build;
	}
	changeBuild(build: BuildVersion): SemanticVersion<Struct, T> {
		return new SemanticVersion({ ...this, build });
	}

	incrementMajor(): SemanticVersion<Struct, T> {
		return new SemanticVersion({
			...this,
			major: this.Major + 1,
			minor: 0,
			patch: 0,
			hotfix: undefined,
			prerelease: undefined,
			build: undefined,
		});
	}
	incrementMinor(): SemanticVersion<Struct, T> {
		return new SemanticVersion({
			...this,
			minor: this.Minor + 1,
			patch: 0,
			hotfix: undefined,
			prerelease: undefined,
			build: undefined,
		});
	}
	incrementPatch(): SemanticVersion<Struct, T> {
		return new SemanticVersion({
			...this,
			patch: this.Patch + 1,
			hotfix: undefined,
			prerelease: undefined,
			build: undefined,
		});
	}
	incrementHotfix(): SemanticVersion<Struct, T> {
		return new SemanticVersion({
			...this,
			hotfix: (this.Hotfix ?? 0) + 1,
			prerelease: undefined,
			build: undefined,
		});
	}

	isStandardCompliant(strict: boolean = false): boolean {
		return checkStandardCompliance(this, strict).success;
	}
	isCustomCompliant(): boolean {
		return checkCustomCompliance(this).success;
	}

	static compare(
		a: SemanticVersion<SemanticVersionStruct>,
		b: SemanticVersion<SemanticVersionStruct>,
	): number {
		return a.comparePrecedence(b);
	}
	static tryParse(
		input: unknown,
	):
		| SemanticVersion<
				SemanticVersionStruct,
				SemanticVersionStringTemplate<SemanticVersionStruct>
		  >
		| undefined {
		const obj =
			typeof input === "string"
				? input.match(semanticVersionRegex)?.groups
				: typeof input === "object" && input !== null && input !== undefined
				? input
				: undefined;
		if (obj) {
			const parsed = SemanticVersionSchema.safeParse(obj);
			const struct = parsed.data as SemanticVersionStruct;
			if (parsed.success && struct) {
				return new SemanticVersion(struct) as SemanticVersion<
					SemanticVersionStruct,
					SemanticVersionStringTemplate<SemanticVersionStruct>
				>;
			}
		}
		return undefined;
	}
	static setDefaultComplianceSettings(
		settings: SemanticVersionComplianceSettings,
	) {
		SemanticVersion._complianceSettings = settings;
	}
	static get DefaultComplianceSettings() {
		return SemanticVersion._complianceSettings;
	}

	comparePrecedence(other: SemanticVersion<Struct, T>): number {
		if (this.Branch !== other.Branch) {
			return (this.Branch ?? "").localeCompare(other.Branch ?? "");
		}
		if (this.Major !== other.Major) {
			return this.Major - other.Major;
		}
		if (this.Minor !== other.Minor) {
			return this.Minor - other.Minor;
		}
		if (this.Patch !== other.Patch) {
			return this.Patch - other.Patch;
		}
		if (this.Hotfix !== other.Hotfix) {
			return (this.Hotfix ?? 0) - (other.Hotfix ?? 0);
		}
		return 0;
	}

	constructor(initializer?: T | SemanticVersion<Struct, T> | Struct) {
		this._complianceSettings = SemanticVersion._complianceSettings;
		if (initializer && typeof initializer === "string") {
			const match = initializer.match(semanticVersionRegex);
			if (match) {
				const groups = match.groups as Record<string, string>;
				const parsed = SemanticVersionSchema.safeParse(groups);
				if (parsed.success) {
					this._branch = parsed.data.branch;
					this._label = parsed.data.label;
					this._major = parsed.data.major;
					this._minor = parsed.data.minor;
					this._patch = parsed.data.patch;
					this._hotfix = parsed.data.hotfix;
					this._prerelease = parsed.data.prerelease;
					this._build = parsed.data.build;
				} else {
					throw new Error(parsed.error.errors.map((e) => e.message).join("\n"));
				}
			} else {
				throw new Error("Invalid Semantic Version String");
			}
		} else if (initializer && typeof initializer === "object") {
			if (initializer instanceof SemanticVersion) {
				this._complianceSettings = initializer._complianceSettings;
			}

			const parsed = SemanticVersionSchema.safeParse(initializer);
			if (parsed.success) {
				this._branch = parsed.data.branch;
				this._label = parsed.data.label;
				this._major = parsed.data.major;
				this._minor = parsed.data.minor;
				this._patch = parsed.data.patch;
				this._hotfix = parsed.data.hotfix;
				this._prerelease = parsed.data.prerelease;
				this._build = parsed.data.build;
				this._complianceSettings =
					parsed.data.complianceSettings ?? SemanticVersion._complianceSettings;
			} else {
				throw new Error(parsed.error.errors.map((e) => e.message).join("\n"));
			}
		} else if (initializer === null || initializer === undefined) {
			this._branch = undefined;
			this._label = undefined;
			this._major = 0;
			this._minor = 0;
			this._patch = 1;
			this._hotfix = undefined;
			this._prerelease = undefined;
			this._build = undefined;
		} else {
			throw new Error("Invalid Semantic Version Initializer", initializer);
		}
	}

	toJSON(): SemanticVersionStruct {
		return {
			branch: this._branch,
			label: this._label,
			major: this._major,
			minor: this._minor,
			patch: this._patch,
			hotfix: this._hotfix,
			prerelease: this._prerelease,
			build: this._build,
			complianceSettings: this._complianceSettings,
		};
	}

	toString(): T {
		return `${this._branch !== undefined ? `${this._branch} ` : ""}${
			this._label !== undefined ? `${this._label} ` : ""
		}${this._major}.${this._minor}.${this._patch}${
			this._hotfix !== undefined ? `.${this._hotfix}` : ""
		}${this._prerelease !== undefined ? `-${this._prerelease}` : ""}${
			this._build !== undefined ? `+${this._build}` : ""
		}` as T;
	}
}
