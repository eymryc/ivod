const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

// Monorepo: Expo watches all workspace apps (including Next). Ignore `.next` so
// Metro never crawls incomplete Next output (ENOENT on `.next/static/chunks/app`).
const blockNext = /[/\\]\.next([/\\]|$)/;
const existing = config.blockList;
config.blockList = Array.isArray(existing)
  ? [...existing, blockNext]
  : existing
    ? [existing, blockNext]
    : [blockNext];

module.exports = config;
