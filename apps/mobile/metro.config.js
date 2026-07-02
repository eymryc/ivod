const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");
const fs = require("fs");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");
const mobileModules = path.resolve(projectRoot, "node_modules");
const rootModules = path.resolve(monorepoRoot, "node_modules");

/**
 * EXPO_ROUTER_APP_ROOT — requis par expo-router pour localiser les routes.
 *
 * expo-router/_ctx.ios.js utilise require.context(process.env.EXPO_ROUTER_APP_ROOT, ...)
 * pour scanner le répertoire app/. Normalement, le CLI expo le définit automatiquement.
 * Dans ce monorepo, expo est hoisted vers la racine et le CLI perd ce contexte —
 * il faut donc le déclarer ici avec le chemin absolu vers app/.
 */
if (!process.env.EXPO_ROUTER_APP_ROOT) {
  process.env.EXPO_ROUTER_APP_ROOT = path.resolve(projectRoot, "app");
}

const config = getDefaultConfig(projectRoot);

/**
 * Résout un package en cherchant d'abord dans node_modules du mobile,
 * puis dans la racine du monorepo (packages hoisted par npm workspaces).
 */
function resolvePkg(name) {
  const inMobile = path.join(mobileModules, name);
  if (fs.existsSync(inMobile)) return inMobile;
  return path.join(rootModules, name);
}

// Surveille l'ensemble du monorepo pour les packages partagés (@ivod/types, etc.)
config.watchFolders = [monorepoRoot];

// Ordre de résolution : mobile d'abord, puis root (packages hoisted)
config.resolver.nodeModulesPaths = [mobileModules, rootModules];

// Force les packages critiques vers leurs emplacements corrects.
// Sans disableHierarchicalLookup, Metro fait une résolution Node.js standard
// (remonte l'arborescence), ce qui permet de trouver les deps imbriquées
// comme @expo/metro-runtime dans expo-router/node_modules/.
config.resolver.extraNodeModules = {
  react: resolvePkg("react"),
  "react-native": resolvePkg("react-native"),
  expo: resolvePkg("expo"),
};

module.exports = config;
