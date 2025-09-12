/* eslint-disable no-console */
// Project selector module for BWS secure
import fs from 'node:fs';
import { promises as fsPromises } from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';

// Helper function to log messages
function log(level, message) {
  // Progressive quiet mode: suppress ALL messages during secure-run progress bar display
  // unless DEBUG is explicitly set
  const progressBarActive = !process.env.DEBUG && process.env.BWS_SUPPRESS_ALL !== 'true';

  if (progressBarActive) {
    // In progress bar mode, suppress ALL messages (including warnings) to maintain single-line progress
    return;
  } else {
    // Traditional debug mode - only skip debug messages unless DEBUG is enabled
    if (level === 'debug' && !process.env.DEBUG) {
      return;
    }
  }

  const colors = {
    error: '\u001B[31m', // Red
    warn: '\u001B[33m', // Yellow
    info: '\u001B[32m', // Green
    debug: '\u001B[34m', // Blue
    verbose: '\u001B[36m' // Cyan
  };
  const color = colors[level] || '';
  const reset = '\u001B[0m';
  console.log(`${color}${message}${reset}`);
}

// Read configuration file
async function readConfigFile() {
  try {
    const configPath = path.join(process.cwd(), 'bwsconfig.json');
    if (!fs.existsSync(configPath)) {
      throw new Error('bwsconfig.json not found');
    }
    const configContent = await fsPromises.readFile(configPath);
    return JSON.parse(configContent);
  } catch (error) {
    throw new Error(`Failed to read bwsconfig.json: ${error.message}`);
  }
}

// Update the environment's BWS section in the .env file
async function updateEnvironmentBwsSection(project, environment, onlyToggleEnvironment = false) {
  const environmentPath = path.join(process.cwd(), '.env');

  try {
    // Read current .env content
    let content = '';
    if (fs.existsSync(environmentPath)) {
      content = await fsPromises.readFile(environmentPath, 'utf8');
    }

    const lines = content.split('\n').map((line) => line.trimEnd());

    if (onlyToggleEnvironment) {
      // Just toggle environment comments when BWS_ENV is explicitly set
      const environmentSectionStart = lines.findIndex((line) =>
        line.includes('Environment options (uncomment to switch)')
      );

      if (environmentSectionStart !== -1) {
        for (let index = environmentSectionStart + 1; index < lines.length; index++) {
          const line = lines[index];
          if (!line.includes('BWS_ENV=')) {
            continue;
          }
          if (
            line === '' ||
            (line.trim() !== '' && !line.includes('#') && !line.includes('BWS_ENV='))
          ) {
            break;
          }

          if (line.includes('BWS_ENV=')) {
            if (line.includes(`BWS_ENV=${environment}`)) {
              lines[index] = line.replace(/^#\s*/, '');
            } else if (!line.startsWith('#')) {
              lines[index] = `# ${line}`;
            }
          }
        }
      }
    } else {
      // Define section markers
      const beginMarker = '# === BEGIN BWS PROJECT CONFIGURATION ===';
      const endMarker = '# === END BWS PROJECT CONFIGURATION ===';

      // Find existing BWS section with markers
      const beginIndex = lines.findIndex((line) => line.includes(beginMarker));
      const endIndex = lines.findIndex((line) => line.includes(endMarker));

      // Prepare new BWS section with markers
      const bwsSection = [];
      // Start with the begin marker, then project options
      bwsSection.push(beginMarker, '', '# Project options (uncomment to switch)');

      // Get all available projects
      const config = await readConfigFile();

      // Add all project options, with selected project uncommented
      for (const p of config.projects) {
        const line = `BWS_PROJECT=${p.projectName}`;
        if (p.projectName === project.projectName) {
          bwsSection.push(line);
        } else {
          bwsSection.push(`# ${line}`);
        }
      }

      bwsSection.push('', '# Environment options (uncomment to switch)');

      // Add all environment options for the selected project
      // Get available environments from the project's bwsProjectIds keys
      const availableEnvironments = Object.keys(project.bwsProjectIds || {});
      const environmentsToUse =
        availableEnvironments.length > 0 ? availableEnvironments : ['local', 'dev', 'prod'];

      for (const environment_ of environmentsToUse) {
        const line = `BWS_ENV=${environment_}`;

        // Generate appropriate comments based on environment name
        let comment = '';
        if (environment_ === 'local') {
          comment = '     # For local development';
        } else if (environment_ === 'dev' || environment_ === 'development') {
          comment = '      # For development/preview deployments';
        } else if (environment_ === 'prod' || environment_ === 'production') {
          comment = '     # For production deployments';
        } else if (environment_ === 'staging') {
          comment = '   # For staging deployments';
        } else {
          comment = `     # For ${environment_} deployments`;
        }

        if (environment_ === environment) {
          bwsSection.push(`${line}${comment}`);
        } else {
          bwsSection.push(`# ${line}${comment}`);
        }
      }

      bwsSection.push('', endMarker);

      // Update or add the BWS section with markers
      if (beginIndex !== -1 && endIndex !== -1 && beginIndex < endIndex) {
        // Before replacing the section, check if there's content after the endMarker
        // and preserve any blank lines that may be there (but not more than one)
        const additionalLines = [];
        let nonBlankFound = false;

        // Look ahead after the end marker to preserve spacing before the next section
        for (let index = endIndex + 1; index < lines.length; index++) {
          if (lines[index].trim() === '') {
            if (!nonBlankFound) {
              additionalLines.push(''); // Add only one blank line initially
            }
          } else {
            nonBlankFound = true;
            break; // Stop once we find non-blank content
          }
        }

        // Replace entire section between markers (inclusive)
        lines.splice(beginIndex, endIndex - beginIndex + 1, ...bwsSection);

        // If there was non-blank content after the marker and we didn't already add a blank line
        // in the bwsSection array, add exactly ONE blank line to separate sections
        if (nonBlankFound && additionalLines.length === 0) {
          lines.splice(beginIndex + bwsSection.length, 0, '');
        }
      } else {
        // No existing section with markers found

        // First look for a BWS Project Configuration line
        const configLine = lines.findIndex((line) => line.includes('BWS Project Configuration'));

        if (configLine === -1) {
          // No existing section at all, add after BWS_ACCESS_TOKEN if present
          const accessTokenIndex = lines.findIndex((line) => line.includes('BWS_ACCESS_TOKEN'));

          if (accessTokenIndex === -1) {
            // No access token found, add to the end of the file
            if (lines.length > 0 && lines.at(-1).trim() !== '') {
              lines.push('', '');
            }
            lines.push(...bwsSection);

            // Add one blank line at the end if we're not at the end of the file
            if (lines.length > 0 && lines.at(-1).trim() !== '') {
              lines.push('');
            }
          } else {
            // Add after the access token section with proper spacing

            // First, find the line after the access token (it could be a comment or the token itself)
            let accessTokenSectionEnd = accessTokenIndex;
            while (
              accessTokenSectionEnd + 1 < lines.length &&
              lines[accessTokenSectionEnd + 1].trim() !== '' &&
              (lines[accessTokenSectionEnd + 1].includes('BWS_ACCESS_TOKEN') ||
                lines[accessTokenSectionEnd + 1].trim().startsWith('#')) &&
              !lines[accessTokenSectionEnd + 1].includes('=== BEGIN BWS PROJECT CONFIGURATION ===')
            ) {
              accessTokenSectionEnd++;
            }

            // Insert point is right after the access token section
            const insertIndex = accessTokenSectionEnd + 1;

            // Clear any existing blank lines after the access token section
            while (insertIndex < lines.length && lines[insertIndex].trim() === '') {
              lines.splice(insertIndex, 1);
            }

            // Always add exactly one blank line before the BWS section
            lines.splice(insertIndex, 0, '');

            // Add our BWS section
            lines.splice(insertIndex + 1, 0, ...bwsSection);

            // Add one blank line to separate from next section if it exists
            if (
              insertIndex + 1 + bwsSection.length < lines.length &&
              lines[insertIndex + 1 + bwsSection.length].trim() !== ''
            ) {
              lines.splice(insertIndex + 1 + bwsSection.length, 0, '');
            }
          }
        } else {
          // Find a reasonable place to end the old section
          let oldSectionEnd = lines.length - 1;
          for (let index = configLine + 1; index < lines.length; index++) {
            if (
              index > configLine + 15 || // Limit how far we look
              (lines[index].trim().startsWith('#') &&
                !lines[index].includes('Project options') &&
                !lines[index].includes('Environment options'))
            ) {
              oldSectionEnd = index - 1;
              break;
            }
          }

          // Replace from config line to estimated end
          lines.splice(configLine, oldSectionEnd - configLine + 1, ...bwsSection);

          // Add one blank line to separate from next section if it exists
          if (
            configLine + bwsSection.length < lines.length &&
            lines[configLine + bwsSection.length].trim() !== ''
          ) {
            lines.splice(configLine + bwsSection.length, 0, '');
          }
        }
      }
    }

    // Remove any trailing empty lines at the end of the file
    // This ensures we don't keep adding empty lines
    while (lines.length > 0 && lines.at(-1).trim() === '') {
      lines.pop();
    }
    // Add exactly one empty line at the end of the file
    lines.push('');

    // Write updated content back to file
    await fsPromises.writeFile(environmentPath, lines.join('\n'));
    log('debug', `Updated .env file with BWS settings for ${project.projectName}`);
  } catch (error) {
    log('warn', `Failed to update .env file: ${error.message}`);
  }
}

// Check if a project is already set in the .env file
async function getProjectFromEnvironmentFile() {
  try {
    const environmentPath = path.join(process.cwd(), '.env');
    if (!fs.existsSync(environmentPath)) {
      return null;
    }

    const content = await fsPromises.readFile(environmentPath, 'utf8');
    const lines = content.split('\n');

    // Look for an uncommented BWS_PROJECT line
    const projectLine = lines.find((line) => {
      const trimmed = line.trim();
      return trimmed.startsWith('BWS_PROJECT=') && !trimmed.startsWith('#');
    });

    if (projectLine) {
      const projectName = projectLine.split('=')[1].trim();
      return projectName;
    }

    return null;
  } catch (error) {
    log('warn', `Failed to read project from .env: ${error.message}`);
    return null;
  }
}

// Prompt user to select a project
async function promptForProject(projects) {
  // Handle empty projects array - suggest using BWS_PROJECT_ID directly
  if (!projects || projects.length === 0) {
    log('error', 'No projects found in configuration');
    log('info', 'You can bypass project configuration by setting BWS_PROJECT_ID directly:');
    log('info', 'BWS_PROJECT_ID=4ba4dc04-091f-4bf9-ba82-b2f900ee7d2a pnpm dev');
    throw new Error('No projects available in configuration. Use BWS_PROJECT_ID to bypass.');
  }

  // Capture currently saved project if it exists
  let currentProject = null;

  // First check if there's a project in environment variable
  if (process.env.BWS_PROJECT) {
    currentProject = projects.find((p) => p.projectName === process.env.BWS_PROJECT);
    if (currentProject) {
      log('debug', `Using project from environment variable: ${currentProject.projectName}`);
      // Don't update BWS section - project is valid
      return currentProject;
    } else {
      // Project is invalid - will need to update BWS section
      log(
        'warn',
        `Selected project '${process.env.BWS_PROJECT}' no longer exists in config - will update BWS section`
      );
    }
  }

  // If not in environment, check the .env file
  if (!currentProject) {
    const savedProjectName = await getProjectFromEnvironmentFile();
    if (savedProjectName) {
      currentProject = projects.find((p) => p.projectName === savedProjectName);
      if (currentProject) {
        // Set the environment variable to match what's in the file
        process.env.BWS_PROJECT = currentProject.projectName;
        log('debug', `Using project from .env file: ${currentProject.projectName}`);
        // Don't update BWS section - project is valid
        return currentProject;
      } else {
        // Project in .env is invalid - will need to update BWS section
        log(
          'warn',
          `Saved project '${savedProjectName}' no longer exists in config - will update BWS section`
        );
      }
    }
  }

  // If single project, use it automatically without prompting
  if (projects.length === 1) {
    const selectedProject = projects[0];
    process.env.BWS_PROJECT = selectedProject.projectName;
    log('debug', `Using single available project: ${selectedProject.projectName}`);
    await updateEnvironmentBwsSection(selectedProject, process.env.BWS_ENV || 'local');
    return selectedProject;
  }

  // For platform builds, use first project as default without prompting
  const isNetlify = process.env.NETLIFY === 'true';
  const isVercel = process.env.VERCEL === '1';
  if (isNetlify || isVercel) {
    const selectedProject = projects[0];
    process.env.BWS_PROJECT = selectedProject.projectName;
    log(
      'debug',
      `Automatically selecting first project for platform build: ${selectedProject.projectName}`
    );
    await updateEnvironmentBwsSection(selectedProject, process.env.BWS_ENV || 'local');
    return selectedProject;
  }

  // Multiple projects in local development - prompt only if we don't have a valid current project
  if (currentProject) {
    log('debug', `Using current project: ${currentProject.projectName}`);
    // Don't update BWS section - project is valid (already validated above)
    return currentProject;
  }

  // Only prompt if we have multiple projects and no current selection
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log('\nAvailable projects:');
  for (const [index, p] of projects.entries()) {
    // Show current selection with an indicator
    const isCurrent = currentProject && p.projectName === currentProject.projectName;
    console.log(`${index + 1}. ${p.projectName} (${p.platform})${isCurrent ? ' (current)' : ''}`);
  }

  try {
    const defaultOption = currentProject ? projects.indexOf(currentProject) + 1 : 1; // Default to first project if none selected
    const prompt = `\nSelect a project number [${defaultOption}]: `;

    const answer = await new Promise((resolve) => {
      rl.question(prompt, (input) => resolve(input || defaultOption.toString()));
    });

    rl.close();
    const selection = Number.parseInt(answer, 10) - 1;

    if (selection >= 0 && selection < projects.length) {
      const selectedProject = projects[selection];
      process.env.BWS_PROJECT = selectedProject.projectName;
      await updateEnvironmentBwsSection(selectedProject, process.env.BWS_ENV || 'local');
      return selectedProject;
    }

    throw new Error('Invalid selection');
  } catch (error) {
    rl.close();
    throw new Error(`Project selection failed: ${error.message}`);
  }
}

// Normalize environment names to our standard format
function normalizeEnvironment(environmentName) {
  if (!environmentName) {
    return 'local'; // Default to local if no environment specified
  }

  // Convert to lowercase for consistent matching
  const environment = environmentName.toLowerCase();

  // Map various environment names to our standard ones
  if (environment === 'production' || environment === 'prod') {
    return 'prod';
  }

  if (environment === 'dev' || environment === 'develop' || environment === 'development') {
    return 'dev';
  }

  // Check other development-like environments (but preserve staging as-is)
  const developmentEnvironments = [
    'preview',
    'deploy-preview',
    'branch-deploy',
    'deploy/preview',
    'branch',
    'test'
  ];

  if (developmentEnvironments.includes(environment)) {
    return 'dev';
  }

  // Handle staging separately - don't normalize it to dev
  if (environment === 'staging') {
    return 'staging';
  }

  if (environment === 'local' || environment === 'development-local') {
    return 'local';
  }

  // If no match found, warn but return the original to help with debugging
  log(
    'warn',
    `Unknown environment "${environmentName}" - will try to load .env.secure.${environment}`
  );
  return environment;
}

// Determine environment based on platform or defaults
function determineEnvironment() {
  // First check if BWS_ENV is explicitly set - give this highest priority
  if (process.env.BWS_ENV) {
    return normalizeEnvironment(process.env.BWS_ENV);
  }

  // Platform-specific environment detection (only if BWS_ENV isn't set)
  if (process.env.NETLIFY === 'true') {
    return normalizeEnvironment(process.env.CONTEXT || 'dev');
  }

  if (process.env.VERCEL === '1') {
    return normalizeEnvironment(process.env.VERCEL_ENV || 'dev');
  }

  // Default to local if nothing else matches
  return 'local';
}

export {
  promptForProject,
  updateEnvironmentBwsSection,
  determineEnvironment,
  normalizeEnvironment,
  readConfigFile,
  log
};
