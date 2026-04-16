import { SemanticVersion, type SemanticVersionString } from "../src/semantic-version";

const version = new SemanticVersion({ major: 1, minor: 2, patch: 3 });
const asString: string = version.toString();
const validSemanticVersionString: SemanticVersionString = "1.2.3";
const incremented = version.incrementPatch();
const nextPatch: number = incremented.Patch;

void asString;
void validSemanticVersionString;
void nextPatch;

// @ts-expect-error major must be a number
new SemanticVersion({ major: "1", minor: 2, patch: 3 });

// @ts-expect-error patch updates must use numbers
version.changePatch("4");

// @ts-expect-error patch part is required
const invalidSemanticVersionString: SemanticVersionString = "1.2";
void invalidSemanticVersionString;
