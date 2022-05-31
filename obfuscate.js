const obfuscator = require("javascript-obfuscator");
const fs = require("fs");

fs.writeFileSync("./dest.js", obfuscator.obfuscate(fs.readFileSync("./index.js", "utf8"), {
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.75,
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.4,
  identifierNamesGenerator: "hexadecimal",
  ignoreImports: true,
  numbersToExpressions: true,
  reservedStrings: [
    "chalk",
    "decoration-replace",
    "enquirer",
    "freeze-selfbot",
    "ms",
    "ora",
    "sjcl",
    "prompt",
    "fs",
    "os",
    "path",
    "child_process",
    "spawn"
  ],
  splitStrings: true,
  splitStringsChunkLength: 10,
  stringArray: true,
  stringArrayCallsTransform: true,
  stringArrayCallsTransformThreshold: 0.75,
  stringArrayEncoding: ["base64"],
  stringArrayIndexShift: true,
  stringArrayThreshold: 0.75,
  stringArrayIndexesType: ["hexadecimal-number", "hexadecimal-numeric-string"],
  stringArrayRotate: true,
  stringArrayShuffle: true,
  target: "node",
  transformObjectKeys: true,
  unicodeEscapeSequence: true,
}).getObfuscatedCode());