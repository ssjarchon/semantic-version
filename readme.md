# Semantic Versions

A simple class for parsing and incrementing Semantic Version labels.

Has checks for strict Semantic Versions, as well as several common variations such as Hotfix numbers. Allows some customization of checks.

Note that the class is read-only; incrementing a version part will return a new Semantic Version, just a like a string.

Also includes RegExp used for parsing.
