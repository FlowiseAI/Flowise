/**
 * requiredRuntimeVars.js
 * -----------------------
 * This script scans specified directories in your JavaScript/TypeScript project
 * (or default directories if none are specified) to find references to `process.env.*`.
 * It supports:
 *   1. Default directory scanning (e.g. "functions", "api", "my-next-app-project-files")
 *   2. Named directory searches ("functions", "api") throughout the entire repo
 *   3. Direct paths ("my-next-app/functions/react")
 *   4. Wildcard / glob patterns ("my-next-app/**\/*.js")
 * It generates a report listing all required environment variables found, grouped
 * by folder. The main output file is `requiredVars.env` which will appear
 * in the parent directory (bws-secure).
 *
 * Usage examples:
 *   - pnpm scan
 *   - pnpm scan "functions"
 *   - pnpm scan "my-next-app/functions/react"
 *   - pnpm scan "my-next-app/**\/*.js"
 *   - pnpm scan "functions,api,my-next-app/**\/*.js"
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promises as fsPromises } from 'node:fs';
// Fixed ESM import - glob doesn't provide a default export in ESM
import * as globModule from 'glob';
import { promisify } from 'node:util';
import logger from '../logger.js';

// Get the directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Make glob available if used elsewhere
const glob = globModule.glob;

/**
 * ---------------------------------------------
 * CHANGE: Use DEBUG=true instead of VAR_SCANNER_VERBOSE
 * ---------------------------------------------
 */
const VERBOSE = process.env.DEBUG === 'true';

/**
 * The root of the repository is determined by going up two levels ("../../..")
 * from this file's directory. That typically means:
 *   scripts/bws-secure/check-vars -> repoRoot
 */
const repoRoot = path.resolve(__dirname, '../../..');

/**
 * These are directories we always want to include if the user doesn't specify
 * any custom directories. So if the user doesn't provide arguments, we check:
 *   "functions", "api", and "amy-app/functions"
 * You can customize or expand this list as needed.
 */
const defaultDirs = [
  // Default folders we always want to check, if not explicitly provided
  'functions',
  'api',
  'apps/web/src',
  'packages'
];

/**
 * directoriesToCheck is determined by reading command-line arguments. For example:
 *   pnpm scan "someDir,anotherDir"
 * would yield process.argv[2] = "someDir,anotherDir"
 * so we split on commas, trim whitespace, and remove empty entries.
 */
let directoriesToCheck = [];
if (process.argv[2]) {
  directoriesToCheck = process.argv[2]
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
}

/**
 * If the user didn't provide a directory that we know we always want to scan,
 * push those defaults into the list. For instance, if the user doesn't mention
 * "functions", we still want to check it.
 */
defaultDirs.forEach((d) => {
  if (!directoriesToCheck.includes(d)) directoriesToCheck.push(d);
});

/**
 * Reads .gitignore (if it exists) from the current working directory.
 *   - Appends each line that isn't a comment to the ignorePatterns array.
 *   - Always ignores "node_modules" by default.
 * This is used later to skip certain folders/files from scanning.
 */
function getIgnorePatterns() {
  const patterns = ['node_modules']; // Always ignore node_modules
  try {
    const gitignore = fs.readFileSync('.gitignore', 'utf-8');
    const additionalPatterns = gitignore
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'));
    patterns.push(...additionalPatterns);
  } catch (error) {
    logger.warn('No .gitignore found, using default exclusions');
  }
  return patterns;
}

/**
 * Checks a given filePath to see if it matches any of the ignore patterns
 * (like those from .gitignore). If it matches, we skip scanning that path.
 */
function shouldIgnorePath(filePath, ignorePatterns) {
  // Normalize Windows backslashes to forward slashes
  const normalizedPath = filePath.replace(/\\/g, '/');

  // Quick check for common patterns before logging - to reduce debug noise
  const commonPatterns = [
    'node_modules/',
    '.git/',
    'dist/',
    'build/',
    '.next/',
    'cms-sync/',
    'packages/graphql-runner/cms-sync/'
  ];

  // Pre-check without logging for very common patterns
  for (const pattern of commonPatterns) {
    if (normalizedPath.includes(pattern)) {
      return true;
    }
  }

  // Always ignore these patterns (more specific than before)
  const defaultIgnores = [
    'node_modules/',
    '.git/',
    'dist/',
    'build/',
    '.next/',
    '.cache/',
    'coverage/',
    '.turbo/',
    'cms-sync/',
    // Specific patterns for the cms-sync directory
    'packages/graphql-runner/cms-sync/',
    // Additional build output folders
    '.nuxt/',
    'out/',
    'public/build/',
    'storybook-static/',
    '.vscode/',
    '.idea/',
    '.vercel/',
    '.netlify/',
    // Files to always ignore
    '.env',
    '.env.*',
    '*.min.js',
    '*.bundle.js',
    '*.map'
  ];

  const allPatterns = [...new Set([...defaultIgnores, ...ignorePatterns])];

  if (VERBOSE) {
    logger.debug(`Checking path against ignore patterns: ${normalizedPath}`);
  }

  // Add a timeout to prevent infinite loops
  const startTime = Date.now();
  const TIMEOUT = 5000; // 5 seconds

  for (const pattern of allPatterns) {
    // Check for timeout
    if (Date.now() - startTime > TIMEOUT) {
      logger.warn('Pattern matching timeout - skipping remaining patterns');
      return true;
    }

    try {
      // Handle directory patterns that end with /
      if (pattern.endsWith('/')) {
        if (normalizedPath.includes(`/${pattern}`) || normalizedPath.startsWith(pattern)) {
          if (VERBOSE) {
            logger.debug(`Path ${normalizedPath} matched directory pattern ${pattern}`);
          }
          return true;
        }
        continue;
      }

      // Handle exact matches first
      if (normalizedPath === pattern || normalizedPath.endsWith(`/${pattern}`)) {
        if (VERBOSE) {
          logger.debug(`Path ${normalizedPath} matched exact pattern ${pattern}`);
        }
        return true;
      }

      // Handle glob patterns
      if (pattern.includes('*') || pattern.includes('?')) {
        const regexPattern = pattern
          .replace(/\\/g, '\\\\') // Escape backslashes first
          .replace(/\./g, '\\.')
          .replace(/\*/g, '[^/]*')
          .replace(/\?/g, '[^/]')
          .replace(/\//g, '\\/');
        const regex = new RegExp(`^${regexPattern}$|/${regexPattern}$`);
        if (regex.test(normalizedPath)) {
          if (VERBOSE) {
            logger.debug(`Path ${normalizedPath} matched glob pattern ${pattern}`);
          }
          return true;
        }
      }
    } catch (error) {
      logger.warn(`Warning: Error matching pattern ${pattern}: ${error.message}`);
    }
  }

  return false;
}

/**
 * List of file extensions we want to scan for environment variables.
 * These are typically files that could contain runtime code.
 */
const VALID_EXTENSIONS = new Set([
  '.js',
  '.jsx',
  '.ts',
  '.tsx',
  '.vue',
  '.mjs',
  '.cjs',
  '.mts',
  '.cts'
]);

/**
 * Check if a file should be scanned based on its extension
 */
function isValidFileType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return VALID_EXTENSIONS.has(ext);
}

/**
 * Recursively list all files in a directory (any extension), skipping those
 * that match .gitignore patterns. If the directory doesn't exist, logs a warning
 * and returns an empty array (instead of throwing an error).
 */
async function getAllFiles(dir, ignorePatterns) {
  try {
    let files = [];

    const entries = await fsPromises.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(process.cwd(), fullPath);

      // Skip if .gitignore says to ignore this path
      if (shouldIgnorePath(relativePath, ignorePatterns)) {
        if (VERBOSE) {
          logger.debug(`Ignoring path (matched .gitignore): ${relativePath}`);
        }
        continue;
      }

      // If it's a directory, recurse deeper
      if (entry.isDirectory()) {
        files = files.concat(await getAllFiles(fullPath, ignorePatterns));
      } else if (isValidFileType(fullPath)) {
        // Only add files with valid extensions
        files.push(fullPath);
      } else if (VERBOSE) {
        logger.debug(`Skipping file (invalid extension): ${relativePath}`);
      }
    }
    return files;
  } catch (error) {
    if (error.code === 'ENOENT') {
      logger.info(`Directory not found: ${dir} - skipping`);
      return [];
    }
    throw error;
  }
}

/**
 * Comment patterns for different file types
 */
const COMMENT_PATTERNS = {
  '.js': { single: '//', multi: [['/*', '*/']] },
  '.jsx': { single: '//', multi: [['/*', '*/']] },
  '.ts': { single: '//', multi: [['/*', '*/']] },
  '.tsx': { single: '//', multi: [['/*', '*/']] },
  '.vue': {
    single: '//',
    multi: [
      ['/*', '*/'],
      ['<!--', '-->']
    ]
  },
  '.mjs': { single: '//', multi: [['/*', '*/']] },
  '.cjs': { single: '//', multi: [['/*', '*/']] },
  '.mts': { single: '//', multi: [['/*', '*/']] },
  '.cts': { single: '//', multi: [['/*', '*/']] }
};

/**
 * Reads the content of a file and searches for references to process.env.<VAR>.
 * It returns an array of variable names discovered. For example, if the file
 * contains "process.env.API_KEY", the array will include "API_KEY".
 *
 * ---------------------------------------------
 * CHANGE #2: Support lower-case letters, i.e.
 *            ([a-zA-Z0-9_]+) in the capturing group
 * ---------------------------------------------
 */
async function findEnvVarsInFile(filePath) {
  const content = await fsPromises.readFile(filePath, 'utf-8');
  const ext = path.extname(filePath).toLowerCase();
  const commentStyle = COMMENT_PATTERNS[ext] || {
    single: '//',
    multi: [['/*', '*/']]
  };

  // Remove multi-line comments for this file type
  let noComments = content;
  commentStyle.multi.forEach(([start, end]) => {
    const multiLineRegex = new RegExp(`${escapeRegExp(start)}[\\s\\S]*?${escapeRegExp(end)}`, 'g');
    noComments = noComments.replace(multiLineRegex, '');
  });

  // Split into lines and filter out single-line comments
  const activeLines = noComments
    .split('\n')
    .filter((line) => !line.trim().startsWith(commentStyle.single));

  // Rejoin the lines and find env vars
  const activeContent = activeLines.join('\n');
  const matches = activeContent.match(/process\.env\.([a-zA-Z0-9_]+)/g) || [];
  return matches.map((match) => match.replace('process.env.', ''));
}

// Helper function to escape special regex characters
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Detects if the user input might be a direct path or a wildcard path.
 * We treat user inputs that include a slash, or are ".", "..", or contain a
 * wildcard character (* or ?), as "full paths" or globs. Otherwise, we consider
 * them directory names to be discovered in the repo (like "functions").
 */
function isFullPathOrGlob(p) {
  return p.includes('/') || p === '.' || p === '..' || isGlobPath(p);
}

/**
 * Checks if the user input string is a wildcard pattern. We consider it a glob
 * if it includes an asterisk (*) or question mark (?).
 */
function isGlobPath(p) {
  return p.includes('*') || p.includes('?');
}

/**
 * Converts a wildcard pattern like "**\/*.js" or "*.ts" into a JavaScript
 * regular expression. We'll use this to filter only the files that match
 * the user-supplied glob pattern.
 */
function wildcardToRegex(pattern) {
  // First, escape backslashes
  let regexStr = pattern.replace(/\\/g, '\\\\');

  // Then escape literal dots
  regexStr = regexStr.replace(/\./g, '\\.');

  // Replace ** with a placeholder that we'll later replace with ".*"
  regexStr = regexStr.replace(/\*\*/g, '___GLOBSTAR___');

  // Replace single-star with "[^/]*", meaning any sequence of characters not including a slash
  regexStr = regexStr.replace(/\*/g, '[^/]*');

  // Replace the placeholder (___GLOBSTAR___) with ".*", letting us match multiple directory levels
  regexStr = regexStr.replace(/___GLOBSTAR___/g, '.*');

  // Replace the question mark with ".", which in regex means match exactly one character
  regexStr = regexStr.replace(/\?/g, '.');

  // Finally, anchor the regex so it must match the entire path
  return new RegExp(`^${regexStr}$`);
}

/**
 * For a userPath like "myNextApp/**\/*.js", we split it into:
 *   - baseDir: "myNextApp"
 *   - pattern: "**\/*.js"
 * If there's no slash before the wildcard, or it starts with "**",
 * we treat the entire userPath as the pattern and set baseDir = repoRoot by default.
 */
function parseGlobPath(userPath) {
  const slashIndex = userPath.indexOf('/');
  const starIndex = userPath.search(/[\*\?]/);

  // If the wildcard (* or ?) appears before an actual slash, or no slash at all,
  // assume the user typed something like "**/*.js" with no base directory
  if (starIndex >= 0 && (slashIndex < 0 || starIndex < slashIndex)) {
    return {
      baseDir: repoRoot,
      pattern: userPath
    };
  }

  // Otherwise, find the last slash before the wildcard so we can separate
  // the base directory from the glob pattern that follows.
  let lastSlash = userPath.lastIndexOf('/', starIndex);
  if (lastSlash === -1) {
    // No slash, but a wildcard is present
    return {
      baseDir: repoRoot,
      pattern: userPath
    };
  }

  // Everything up to lastSlash is the base directory, everything after is the pattern
  return {
    baseDir: path.resolve(repoRoot, userPath.slice(0, lastSlash)),
    pattern: userPath.slice(lastSlash + 1)
  };
}

/**
 * Filters a given array of file paths, returning only those that match the wildcard pattern.
 * E.g. if pattern = "**\/*.js", we keep only .js files within nested folders.
 */
function filterByPattern(files, pattern) {
  const regex = wildcardToRegex(pattern);
  return files.filter((file) => {
    // Convert to a relative path from repoRoot. This helps the wildcard match properly.
    const relPath = path.relative(repoRoot, file).replace(/\\/g, '/');
    return regex.test(relPath);
  });
}

/**
 * Recursively search the entire directory tree (starting from 'dir') for folders that
 * match the name 'targetDirName'. For example, if targetDirName = "functions",
 * it finds every "functions" folder anywhere in the repo.
 */
async function findAllNamedDirs(dir, targetDirName, ignorePatterns) {
  const results = [];
  const entries = await fsPromises.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(process.cwd(), fullPath);

    if (shouldIgnorePath(relativePath, ignorePatterns)) {
      if (VERBOSE) {
        logger.debug(`Skipping directory (matched .gitignore): ${relativePath}`);
      }
      continue;
    }

    if (entry.isDirectory()) {
      // If the directory name matches targetDirName, store it
      if (entry.name === targetDirName) {
        results.push(fullPath);
      }
      // Then recurse into that directory to see if deeper subdirectories match
      const deeper = await findAllNamedDirs(fullPath, targetDirName, ignorePatterns);
      results.push(...deeper);
    }
  }
  return results;
}

/**
 * If the user didn't provide custom directories, we do a fallback:
 * We search the entire repo for "functions" or "api" directories by name,
 * recurring on subfolders. This helps automatically gather typical function
 * or API directories used in many frameworks.
 */
async function findFunctionsDirs(dir, ignorePatterns) {
  const functionsDirs = [];
  const entries = await fsPromises.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(process.cwd(), fullPath);

    if (shouldIgnorePath(relativePath, ignorePatterns)) {
      continue;
    }

    if (entry.isDirectory()) {
      // If the folder is literally named "functions" or "api",
      // or if "functions"/"api" is part of the path, we include it.
      if (
        entry.name === 'functions' ||
        entry.name === 'api' ||
        relativePath.includes('/functions/') ||
        relativePath.includes('/api/')
      ) {
        functionsDirs.push(fullPath);
      }
      // Recurse deeper to find more possible matches
      functionsDirs.push(...(await findFunctionsDirs(fullPath, ignorePatterns)));
    }
  }
  return functionsDirs;
}

/**
 * When scanning function directories discovered by findFunctionsDirs, we gather
 * only .js, .ts, or .tsx files. This is a narrower approach than getAllFiles because
 * we assume function code is typically in these file extensions.
 */
async function getFunctionFiles(dir) {
  let files = [];
  const entries = await fsPromises.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files = files.concat(await getFunctionFiles(fullPath));
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

/**
 * Removes any previous requiredVars.env file so we can write a fresh one.
 */
const cleanupExistingReport = async () => {
  const reportPath = path.join(__dirname, '../requiredVars.env');
  try {
    await fsPromises.unlink(reportPath);
    if (VERBOSE) {
      logger.debug(`Removed old report file at ${reportPath}`);
    }
  } catch (error) {
    // Ignore if file doesn't exist
    if (error.code !== 'ENOENT') {
      logger.warn(`Could not remove old report file: ${error.message}`);
    }
  }
};

/**
 * Read turbo.json and extract environment variables if available
 */
function getTurboVars() {
  try {
    const turboConfigPath = path.join(repoRoot, 'turbo.json');

    // If no turbo.json exists, return empty set silently
    if (!fs.existsSync(turboConfigPath)) {
      if (VERBOSE) {
        logger.debug('No turbo.json found - skipping turbo variable scanning');
      }
      return new Set();
    }

    let turboConfig;
    try {
      const rawConfig = fs.readFileSync(turboConfigPath, 'utf8');
      turboConfig = JSON.parse(rawConfig);
    } catch (parseError) {
      logger.warn('\n⚠️  Warning: Found turbo.json but could not parse it:');
      logger.warn(`   ${parseError.message}`);
      logger.info('   Continuing scan without turbo.json variables...\n');
      return new Set();
    }

    // Safely access potentially undefined properties
    const buildEnv = turboConfig?.tasks?.build?.env || [];
    const globalEnv = turboConfig?.globalEnv || [];

    const turboVars = new Set([...buildEnv, ...globalEnv]);

    if (VERBOSE) {
      if (turboVars.size > 0) {
        logger.debug('Found variables in turbo.json:', Array.from(turboVars));
      } else {
        logger.debug('No variables found in turbo.json');
      }
    }

    return turboVars;
  } catch (error) {
    logger.warn('\n⚠️  Warning: Error accessing turbo.json:');
    logger.warn(`   ${error.message}`);
    logger.info('   Continuing scan without turbo.json variables...\n');
    return new Set();
  }
}

/**
 * Main execution function. Orchestrates all logic:
 *   1. Decide which folders to scan
 *   2. Collect environment vars
 *   3. Writes out the final `requiredVars.env`
 */
async function main() {
  try {
    await cleanupExistingReport();
  } catch (error) {
    if (error.code !== 'ENOENT') {
      logger.error(`Error cleaning up report file: ${error}`);
    }
  }
  logger.info('Scanning for environment variables...');

  // Get turbo.json variables before starting the scan
  const turboVars = getTurboVars();

  // Gather the patterns to ignore based on .gitignore
  const ignorePatterns = getIgnorePatterns();

  // We'll store absolute file paths that we want to scan for environment var references
  let pathsToScan = [];

  // If the user specified a list of directories or patterns:
  if (directoriesToCheck.length > 0) {
    logger.info('Using selected paths:', directoriesToCheck);

    // Loop through each user-supplied path or pattern
    for (const userPath of directoriesToCheck) {
      // If userPath has slashes or wildcard, treat it as direct path or glob
      if (isFullPathOrGlob(userPath)) {
        // If it's a direct path with no wildcard (like "path/foo/bar")
        if (!userPath.includes('*') && !userPath.includes('?')) {
          const absolutePath = path.resolve(repoRoot, userPath);

          // If the path is outside our repoRoot, skip
          if (!absolutePath.startsWith(repoRoot)) {
            logger.info(`Skipping ${absolutePath} - outside repo root`);
            continue;
          }

          // Attempt to verify the path exists, and then gather all files
          try {
            await fsPromises.access(absolutePath);
            const files = await getAllFiles(absolutePath, ignorePatterns);
            pathsToScan.push(...files);
          } catch (error) {
            if (error.code === 'ENOENT') {
              logger.info(`Directory not found: ${absolutePath} - skipping`);
              continue;
            }
            throw error;
          }
        } else {
          // It's a wildcard or glob pattern, such as "my-next-app/**/*.js"
          const { baseDir, pattern } = parseGlobPath(userPath);

          if (!baseDir.startsWith(repoRoot)) {
            logger.info(`Skipping ${baseDir} - outside repo root`);
            continue;
          }

          try {
            await fsPromises.access(baseDir);
            const files = await getAllFiles(baseDir, ignorePatterns);
            // Filter out only the files that match the user-provided pattern
            const matched = filterByPattern(files, pattern);
            pathsToScan.push(...matched);
          } catch (error) {
            if (error.code === 'ENOENT') {
              logger.info(`Directory not found: ${baseDir} - skipping`);
              continue;
            }
            throw error;
          }
        }
      } else {
        // Name-based directory search, e.g. "functions" or "api"
        const matchingDirs = await findAllNamedDirs(repoRoot, userPath, ignorePatterns);
        if (matchingDirs.length === 0) {
          logger.info(`No directories named '${userPath}' found - skipping`);
          continue;
        }
        // For each matching directory, gather all files
        for (const matchedDir of matchingDirs) {
          try {
            const files = await getAllFiles(matchedDir, ignorePatterns);
            pathsToScan.push(...files);
          } catch (error) {
            if (error.code === 'ENOENT') {
              logger.info(`Directory not found: ${matchedDir} - skipping`);
              continue;
            }
            throw error;
          }
        }
      }
    }
  } else {
    // If user provided no custom directories, we do a fallback search for "functions" or "api"
    const functionsDirs = await findFunctionsDirs(repoRoot, ignorePatterns);
    logger.info(`Found ${functionsDirs.length} matching directories:`);
    functionsDirs.forEach((dir) => logger.info(`- ${path.relative(repoRoot, dir)}`));

    // Now gather JS/TS files from those discovered function/api directories
    for (const dir of functionsDirs) {
      const files = await getFunctionFiles(dir);
      pathsToScan.push(...files);
    }
  }

  // If no files ended up in pathsToScan, we let the user know and exit gracefully
  if (pathsToScan.length === 0) {
    logger.info('\nNo files found to scan. To scan specific directories, you can:');
    logger.info("1. Create a 'functions' or 'api' directory in your project");
    logger.info('2. Pass custom directories or patterns as an argument:');
    logger.info('   pnpm scan "src,pages,components"');
    logger.info('   pnpm scan "my-next-app/**/*.js"');
    process.exit(0);
  }

  logger.info(`\nScanning ${pathsToScan.length} files...`);
  let processedFiles = 0;
  const startTime = Date.now();

  /**
   * We'll create a Map keyed by directory, with a Set of environment variable names
   * that we found in that directory's files.
   */
  const envVarsByDir = new Map();
  const varTotalReferences = new Map();
  const varOccurrences = new Map();
  let totalFileCount = 0;

  for (const file of pathsToScan) {
    processedFiles++;
    if (processedFiles % 100 === 0 || VERBOSE) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      logger.info(`Progress: ${processedFiles}/${pathsToScan.length} files (${elapsed}s)`);
    }

    if (VERBOSE) {
      logger.debug(`Scanning file: ${path.relative(repoRoot, file)}`);
    }
    const vars = await findEnvVarsInFile(file);
    if (vars.length) {
      const dir = path.dirname(file);
      if (!envVarsByDir.has(dir)) {
        envVarsByDir.set(dir, new Set());
      }

      // Count each occurrence in the file
      vars.forEach((v) => {
        envVarsByDir.get(dir).add(v);
        varTotalReferences.set(v, (varTotalReferences.get(v) || 0) + 1);
      });

      totalFileCount++;
    }
  }

  // Count directory occurrences
  for (const vars of envVarsByDir.values()) {
    for (const v of vars) {
      varOccurrences.set(v, (varOccurrences.get(v) || 0) + 1);
    }
  }

  // Calculate total references (actual sum of all variable references)
  const totalReferences = Array.from(varTotalReferences.values()).reduce(
    (sum, count) => sum + count,
    0
  );

  // Get unique variables across all directories
  const allEnvVars = new Set();
  for (const vars of envVarsByDir.values()) {
    for (const v of vars) {
      allEnvVars.add(v);
    }
  }

  // Find variables used in multiple directories
  const repeatedVars = Array.from(varOccurrences.entries())
    .filter(([_, count]) => count > 1)
    .sort((a, b) => b[1] - a[1]); // Sort by occurrence count descending

  logger.info('\nEnvironment Variable Statistics:');
  logger.info(`- ${allEnvVars.size} unique environment variables`);
  logger.info(`- ${totalReferences} total variable references`);
  logger.info(`- ${envVarsByDir.size} directories containing environment variables`);
  logger.info(`- ${totalFileCount} files containing environment variables`);

  if (repeatedVars.length > 0) {
    logger.info('\nVariables used in multiple directories:');
    repeatedVars.forEach(([varName, count]) => {
      const totalRefs = varTotalReferences.get(varName);
      logger.info(`- ${varName}: used in ${count} directories (${totalRefs} total references)`);
    });
  }

  // After scanning is complete, add turbo vars to allEnvVars
  if (turboVars.size > 0) {
    logger.info('\nAdding variables from turbo.json:');
    for (const v of turboVars) {
      if (!allEnvVars.has(v)) {
        logger.info(`- ${v} (from turbo.json)`);
        allEnvVars.add(v);
      }
    }
  }

  // Build a human-readable report that we can write to disk
  const reportLines = [
    '# Environment Variables Required by Directory',
    `# Generated: ${new Date().toLocaleString()}`,
    '#',
    '# This file maps which environment variables are required in each directory.',
    '#',
    '# Variables from turbo.json:',
    ...Array.from(turboVars).map((v) => `# - ${v}`),
    '#\n'
  ];

  // Group results by the first directory segment so e.g. "functions/userHandler" and
  // "functions/kitchenSink" can be listed together.
  const groupedDirs = new Map();
  for (const [dir, vars] of envVarsByDir) {
    const relativePath = path.relative(process.cwd(), dir);
    const parentDir = relativePath.split('/')[0] || '.';
    if (!groupedDirs.has(parentDir)) {
      groupedDirs.set(parentDir, []);
    }
    groupedDirs.get(parentDir).push([dir, vars]);
  }

  // For each parent dir group, list subdirectories and environment variables discovered
  for (const [parentDir, entries] of groupedDirs) {
    // Turn headings into comments
    reportLines.push(`# ${parentDir}`);
    reportLines.push('');

    for (const [dir, vars] of entries) {
      const relativePath = path.relative(process.cwd(), dir);
      reportLines.push(`# ${relativePath}`);

      const sortedVars = Array.from(vars).sort();
      for (const envVar of sortedVars) {
        reportLines.push(envVar);
      }
      reportLines.push('');
    }
    reportLines.push('');
  }

  // Add turbo vars at the end of the report if they weren't found in scanned files
  const scannedVars = new Set();
  for (const [, vars] of envVarsByDir) {
    for (const v of vars) {
      scannedVars.add(v);
    }
  }

  const turboOnlyVars = Array.from(turboVars).filter((v) => !scannedVars.has(v));
  if (turboOnlyVars.length > 0) {
    reportLines.push('\n# Additional variables from turbo.json:');
    turboOnlyVars.forEach((v) => reportLines.push(v));
  }

  // Write out the final formatted report to a single file in this directory (check-vars).
  const OUTPUT_PATH = path.join(__dirname, '..', 'requiredVars.env');

  const outputDir = path.dirname(OUTPUT_PATH);
  try {
    await fsPromises.mkdir(outputDir, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST ') {
      throw error;
    }
  }

  await fsPromises.writeFile(OUTPUT_PATH, reportLines.join('\n'), 'utf8');
  logger.info(`Environment variable report written to ${OUTPUT_PATH}`);
}

// Execute the main function
main().catch((error) => {
  logger.error(`Error: ${error.message}`);
  process.exit(1);
});
