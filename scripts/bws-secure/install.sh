#!/bin/bash

# ANSI color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Determine if we're in the monorepo root or the package directory
if [ -f "package.json" ] && [ ! -d "scripts/bws-secure" ]; then
  # We're in the package directory, need to go to monorepo root
  cd ../..
fi

echo -e "${BLUE}🔒 Setting up BWS Secure in $(pwd)/scripts/bws-secure ${NC}"

# Create scripts directory if it doesn't exist
mkdir -p scripts

# Helper function to check and initialize git submodules if needed
check_git_submodules() {
  # Check if .gitmodules exists
  if [ -f ".gitmodules" ]; then
    echo "Git submodules detected, checking status..."
    
    # Check if any submodules are uninitialized (have no .git directory)
    UNINITIALIZED_SUBMODULES=$(git submodule status | grep "^-" | wc -l)
    
    if [ "$UNINITIALIZED_SUBMODULES" -gt 0 ]; then
      echo "Found uninitialized git submodules. Initializing them now..."
      git submodule update --init
      return 0  # Submodules were initialized
    fi
  fi
  return 1  # No submodules initialized
}

# Call the function to check for submodules before starting
check_git_submodules

# Clone BWS Secure using HTTPS (more universal than SSH)
if [ ! -d "scripts/bws-secure" ]; then
  git clone https://github.com/last-rev-llc/bws-secure.git scripts/bws-secure || {
    echo -e "${RED}❌ Failed to clone repository${NC}"
    exit 1
  }
fi

# Navigate to bws-secure directory
cd scripts/bws-secure || exit 1

# Create bin directory if it doesn't exist
mkdir -p bin

# Make scripts executable (only if they exist)
if [ -d "./bin" ] && [ "$(ls -A ./bin)" ]; then
  chmod +x ./bin/*
fi
[ -f "./bws-installer.sh" ] && chmod +x ./bws-installer.sh

# Detect package manager
if [ -f "../../pnpm-lock.yaml" ]; then
  PM="pnpm"
elif [ -f "../../yarn.lock" ]; then
  PM="yarn"
else
  PM="npm"
fi

# First installation in BWS package directory 
NODE_VERSION=$(node -e "console.log(process.version.match(/^v(\d+)\./)[1])")
if [ "$NODE_VERSION" -lt "20" ]; then
  echo "Detected Node.js v$NODE_VERSION, ensuring compatible glob version (v10) for Node.js v$NODE_VERSION"
  
  # Update BWS Secure's own package.json to use compatible glob version
  if [ -f "package.json" ]; then
    echo "Updating BWS Secure package.json to use glob v10.3.10 compatible with Node.js v$NODE_VERSION..."
    
    # Create temporary script to update BWS package.json
    BWS_TMP_SCRIPT=$(mktemp)
    cat > "$BWS_TMP_SCRIPT" << EOF
    const fs = require('fs');
    try {
      const packageJsonPath = '$(pwd)/package.json';
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      // Update glob version to compatible one
      if (packageJson.dependencies && packageJson.dependencies.glob) {
        packageJson.dependencies.glob = '^10.3.10';
      }
      
      // Write back to file
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
      process.exit(0);
    } catch (error) {
      console.error('Error updating BWS package.json:', error);
      process.exit(1);
    }
EOF
    
    # Run the temporary Node.js script
    if node "$BWS_TMP_SCRIPT"; then
      echo "Updated BWS Secure package.json with compatible glob version"
    else
      echo "Warning: Failed to update BWS Secure package.json"
    fi
    
    # Clean up temporary script
    rm -f "$BWS_TMP_SCRIPT"
  fi
fi

# Install dependencies based on package manager
if [ "$PM" = "pnpm" ]; then
  # Check if this is a pnpm workspace
  if grep -q "\"workspaces\"" ../../package.json 2>/dev/null || [ -f "../../pnpm-workspace.yaml" ]; then
    echo "PNPM workspace detected, using --workspace-root flag for BWS installation..."
    $PM install --workspace-root --ignore-scripts --silent
  else
    $PM install --ignore-scripts --silent
  fi
  
  # Check if installation failed
  if [ $? -ne 0 ]; then
    echo "BWS package installation failed. Checking for common issues..."
    # Run git submodule check and retry if needed
    if check_git_submodules; then
      echo "Git submodules were initialized. Retrying BWS package installation..."
      if grep -q "\"workspaces\"" ../../package.json 2>/dev/null || [ -f "../../pnpm-workspace.yaml" ]; then
        $PM install --workspace-root --ignore-scripts --silent
      else
        $PM install --ignore-scripts --silent
      fi
    else
      echo "Could not automatically fix BWS package installation issues."
    fi
  fi
elif [ "$PM" = "yarn" ]; then
  # Check if this is a yarn workspace
  if grep -q "\"workspaces\"" ../../package.json 2>/dev/null; then
    echo "Yarn workspace detected, using -W flag for BWS installation..."
    $PM install --ignore-scripts -W --silent --no-audit
  else
    $PM install --ignore-scripts --silent --no-audit
  fi
  
  # Check if installation failed
  if [ $? -ne 0 ]; then
    echo "BWS package installation failed. Checking for common issues..."
    # Run git submodule check and retry if needed
    if check_git_submodules; then
      echo "Git submodules were initialized. Retrying BWS package installation..."
      if grep -q "\"workspaces\"" ../../package.json 2>/dev/null; then
        $PM install --ignore-scripts -W --silent --no-audit
      else
        $PM install --ignore-scripts --silent --no-audit
      fi
    else
      echo "Could not automatically fix BWS package installation issues."
    fi
  fi
else
  $PM install --ignore-scripts --quiet --no-audit
  # Check if installation failed
  if [ $? -ne 0 ]; then
    echo "BWS package installation failed. Checking for common issues..."
    # Run git submodule check and retry if needed
    if check_git_submodules; then
      echo "Git submodules were initialized. Retrying BWS package installation..."
      $PM install --ignore-scripts --quiet --no-audit
    else
      echo "Could not automatically fix BWS package installation issues."
    fi
  fi
fi

# Return to project root (first and only time)
cd ../..

echo "Setting up BWS Secure in project root: $(pwd)"

# Copy example config if it doesn't exist
if [ ! -f "bwsconfig.json" ] && [ -f "scripts/bws-secure/examples/bwsconfig.example.json" ]; then
  echo "Creating bwsconfig.json from example..."
  cp scripts/bws-secure/examples/bwsconfig.example.json bwsconfig.json
else
  echo "Checking for bwsconfig.json in project root..."
  if [ -f "bwsconfig.json" ]; then
    echo "Found existing bwsconfig.json at: $(pwd)/bwsconfig.json"
  else
    # Create default config if example doesn't exist
    echo "Creating default bwsconfig.json..."
    cat > bwsconfig.json << EOF
{
  "projects": [
    {
      "platform": "vercel|netlify",
      "projectName": "firstProjectName",
      "bwsProjectIds": {
        "prod": "yourBWSProdProjectID",
        "dev": "yourBWSDevProjectID",
        "local": "yourBWSLocalProjectID"
      },
      "preserveVars": ["BWS_ACCESS_TOKEN"],
      "excludeVars": [
        "VERCEL_URL"
      ]
    },
    {
      "platform": "vercel|netlify",
      "projectName": "secondProjectName",
      "bwsProjectIds": {
        "prod": "yourBWSProdProjectID",
        "dev": "yourBWSDevProjectID",
        "local": "yourBWSLocalProjectID"
      },
      "preserveVars": ["BWS_ACCESS_TOKEN"],
      "excludeVars": [
        "DEPLOY_URL"
      ]
    }
  ]
}
EOF
  fi
fi

# Clean up git repository
rm -rf scripts/bws-secure/.git

echo "Checking .gitignore configuration..."
# Update .gitignore
GITIGNORE_ENTRIES=(
  " "
  "# BWS Secure"
  ".env"
  ".env.*"
  ".env.secure.*"
  "requiredVars.env"
  ".env-debug.html"
)

if [ ! -f ".gitignore" ]; then
  touch .gitignore
fi

# Check if entries already exist in .gitignore
for entry in "${GITIGNORE_ENTRIES[@]}"; do
  if ! grep -Fxq "$entry" .gitignore; then
    echo "$entry" >> .gitignore
  fi
done

echo "Setting up .npmrc for direct command execution..."

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
  cat > .env << EOF
# BWS Secure Configuration
BWS_ACCESS_TOKEN=your_token_here
EOF
fi

# Update root package.json (we're already in the right directory)
if [ -f "package.json" ]; then
  echo "Updating package.json at: $(pwd)/package.json"
  
  TMP_SCRIPT=$(mktemp)
  cat > "$TMP_SCRIPT" << EOF
const fs = require('fs');
try {
  // Use absolute path to package.json
  const packageJsonPath = '$(pwd)/package.json';
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

  // Ensure scripts object exists
  packageJson.scripts = packageJson.scripts || {};

  // Add our core scripts
  packageJson.scripts['secure-run'] = 'node ./scripts/bws-secure/secureRun.js';
  packageJson.scripts['list-projects'] = 'node ./scripts/bws-secure/list-projects.js';
  packageJson.scripts['bws-deps'] = '[ -d node_modules/dotenv ] && [ -d node_modules/dotenv-cli ] && [ -f node_modules/.bin/bws ] || npm install';
  packageJson.scripts['bws-update'] = 'rm -rf scripts/bws-secure && git clone git@github.com:last-rev-llc/bws-secure.git scripts/bws-secure && rm -rf scripts/bws-secure/.git && bash scripts/bws-secure/install.sh';

  // Check for and fix incorrect secure-run.js references in any scripts
  for (const [scriptName, scriptCommand] of Object.entries(packageJson.scripts)) {
    if (scriptCommand.includes('secure-run.js')) {
      console.log(\`Fixing incorrect secure-run.js reference in \${scriptName} script\`);
      packageJson.scripts[scriptName] = scriptCommand.replace(/secure-run\.js/g, 'secureRun.js');
    }
  }

  // Handle postinstall script intelligently
  const bwsInstallCommand = 'bash ./scripts/bws-secure/bws-installer.sh';
  if (packageJson.scripts.postinstall) {
    // Check if bws-installer is already in the postinstall script
    if (!packageJson.scripts.postinstall.includes(bwsInstallCommand)) {
      // Append our command to existing postinstall
      packageJson.scripts.postinstall = \`\${packageJson.scripts.postinstall} && \${bwsInstallCommand}\`;
    }
  } else {
    // No existing postinstall, add ours
    packageJson.scripts.postinstall = bwsInstallCommand;
  }

  // Add dependencies if they don't exist
  packageJson.devDependencies = packageJson.devDependencies || {};
  packageJson.devDependencies['dotenv'] = packageJson.devDependencies['dotenv'] || '^16.4.7';
  packageJson.devDependencies['dotenv-cli'] = packageJson.devDependencies['dotenv-cli'] || '^8.0.0';
  packageJson.devDependencies['yargs'] = packageJson.devDependencies['yargs'] || '^17.7.2';
  
  // Check Node.js version and apply appropriate glob version
  const nodeVersion = process.version.match(/^v(\d+)\./)[1];
  const nodeVersionNum = parseInt(nodeVersion, 10);
  if (nodeVersionNum >= 20) {
    // For Node.js 20+, use glob v11
    packageJson.devDependencies['glob'] = '^11.0.1';
  } else {
    // For Node.js < 20, use glob v10
    packageJson.devDependencies['glob'] = '^10.3.10';
  }
  
  packageJson.devDependencies['axios'] = packageJson.devDependencies['axios'] || '^1.7.9';

  // Write back to file
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
  process.exit(0);
} catch (error) {
  console.error('Error updating package.json:', error);
  process.exit(1);
}
EOF

  # Run the temporary Node.js script
  if node "$TMP_SCRIPT"; then
    echo "Updated package.json successfully"
    echo "Added/Updated scripts and dependencies:"
    echo "  Scripts:"
    echo "    - secure-run"
    echo "    - list-projects"
    echo "    - bws-deps"
    echo "    - postinstall"
    echo "    - bws-update"
    echo "  Dependencies:"
    echo "    - dotenv"
    echo "    - dotenv-cli"
    echo "    - yargs"
    echo "    - glob"
    echo "    - axios"
    echo "  Also fixed any incorrect secure-run.js references"
  else
    echo -e "${RED}Warning: Failed to update package.json scripts. You may need to add them manually.${NC}"
  fi
  
  # Clean up temporary script
  rm -f "$TMP_SCRIPT"
fi

# Install dependencies with detected package manager
echo "Installing dependencies with $PM..."

# We'll skip the second pre-installation of glob here, as we're already 
# setting the correct version in package.json

# Now run the full installation
if [ "$PM" = "pnpm" ]; then
  # Check if this is a pnpm workspace
  if grep -q "\"workspaces\"" package.json 2>/dev/null || [ -f "pnpm-workspace.yaml" ]; then
    echo "PNPM workspace detected, using --workspace-root flag for installation..."
    $PM install --workspace-root --silent
  else
    $PM install --silent
  fi
  
  # Check if installation failed
  if [ $? -ne 0 ]; then
    echo "Installation failed. Checking for common issues..."
    # Run git submodule check and retry if needed
    if check_git_submodules; then
      echo "Git submodules were initialized. Retrying installation..."
      if grep -q "\"workspaces\"" package.json 2>/dev/null || [ -f "pnpm-workspace.yaml" ]; then
        $PM install --workspace-root --silent
      else
        $PM install --silent
      fi
    else
      echo "Could not automatically fix installation issues."
    fi
  fi
elif [ "$PM" = "yarn" ]; then
  # Check if this is a yarn workspace
  if grep -q "\"workspaces\"" package.json 2>/dev/null; then
    echo "Yarn workspace detected, using -W flag for installation..."
    $PM install -W --silent
  else
    $PM install --silent
  fi
  
  # Check if installation failed
  if [ $? -ne 0 ]; then
    echo "Installation failed. Checking for common issues..."
    # Run git submodule check and retry if needed
    if check_git_submodules; then
      echo "Git submodules were initialized. Retrying installation..."
      if grep -q "\"workspaces\"" package.json 2>/dev/null; then
        $PM install -W --silent
      else
        $PM install --silent
      fi
    else
      echo "Could not automatically fix installation issues."
    fi
  fi
else
  $PM install --quiet
  # Check if installation failed
  if [ $? -ne 0 ]; then
    echo "Installation failed. Checking for common issues..."
    # Run git submodule check and retry if needed
    if check_git_submodules; then
      echo "Git submodules were initialized. Retrying installation..."
      $PM install --quiet
    else
      echo "Could not automatically fix installation issues."
    fi
  fi
fi

# Success message with box drawing characters
echo -e "
${GREEN}╔════════════════════════════════════════════════════════════╗
║             ✅ BWS Secure Setup Complete!                  ║
╚════════════════════════════════════════════════════════════╝${NC}

📋 Next Steps:

1. Configure your bwsconfig.json at:
   $(pwd)/bwsconfig.json
   - Set platform to 'vercel' or 'netlify'
   - Update projectName to match your deployment
   - Add your BWS project IDs for each environment

2. Add your BWS token to .env:
   BWS_ACCESS_TOKEN=your_token_here

3. Update your build scripts to use secure-run:
   \"dev\": \"secure-run next dev\"
   \"build\": \"secure-run next build\"
   \"start\": \"secure-run next start\"

🔧 Added Scripts:
   - secure-run: Runs commands with secure environment variables
   - list-projects: Lists available BWS projects
   - bws-deps: Ensures BWS dependencies are installed
   - bws-update: Updates BWS Secure to the latest version

📦 Dependencies:
   - BWS CLI will be installed automatically when needed
   - Required packages have been added to package.json
     (dotenv, dotenv-cli, yargs, glob, axios)
   - Run '$PM bws-deps' to verify BWS installation

🔒 Security:
   - Environment files are encrypted
   - .gitignore has been updated
   - Secrets are never logged

📚 Documentation: https://github.com/last-rev-llc/bws-secure

For help or issues:
1. Check the README.md in scripts/bws-secure/
2. Enable debug mode: DEBUG=true $PM build
3. Open an issue on GitHub
"

echo "Checking Prettier configuration..."
# Create or update .prettierignore
PRETTIER_ENTRIES=(
  " "
  "# BWS Secure - Environment Files"
  ".env"
  ".env.*"
  "*.env"
  "scripts/bws-secure/.env*"
  "scripts/bws-secure/**/.env*"
  ".env.secure"
  ".env.secure.*"
)

# Create .prettierignore if it doesn't exist
if [ ! -f ".prettierignore" ]; then
  touch .prettierignore
  echo "Created new .prettierignore file"
fi

# Add a blank line if file exists and doesn't end with one
if [ -s ".prettierignore" ]; then
  if [ "$(tail -c1 .prettierignore | wc -l)" -eq 0 ]; then
    echo "" >> .prettierignore
  fi
fi

# Check if BWS Secure section header exists
if ! grep -q "# BWS Secure - Environment Files" .prettierignore; then
  # Add a blank line before our section if file is not empty
  if [ -s ".prettierignore" ]; then
    echo "" >> .prettierignore
  fi
fi

# Check if entries already exist in .prettierignore
for entry in "${PRETTIER_ENTRIES[@]}"; do
  if ! grep -Fxq "$entry" .prettierignore; then
    echo "$entry" >> .prettierignore
    echo "Added $entry to .prettierignore"
  fi
done

# Ensure file ends with a newline
if [ -s ".prettierignore" ] && [ "$(tail -c1 .prettierignore | wc -l)" -eq 0 ]; then
  echo "" >> .prettierignore
fi

echo "Prettier ignore configuration updated successfully"

echo "Checking README files for BWS Secure documentation..."
# Find README.md or Readme.md file
README_FILES=("README.md" "Readme.md" "readme.md")
README_FOUND=false
echo "Looking for README files in: $(pwd)"

# Define the BWS Secure documentation content
BWS_DOC_CONTENT="<!-- BWS-SECURE-DOCS-START -->
## BWS Secure Environmental Variable Integration

This project uses [BWS Secure](https://github.com/last-rev-llc/bws-secure) for managing environment variables across different environments.

### Creating an Access Token

1. Visit your [Bitwarden Machine Accounts](https://vault.bitwarden.com/#/sm/\${BWS_ORG_ID:-YOUR_BWS_ORG_ID_HERE}/machine-accounts) section
   - **Note:** This link requires you to be a member of the Last Rev Bitwarden organization
   - If you don't have access, please refer to the [BWS Secure documentation](https://github.com/last-rev-llc/bws-secure) or contact your team administrator
2. After clicking the link, follow these steps:
   - Select the appropriate Client/Set of Machine Accounts from the list
   - Click on the \"Access Tokens\" tab
   - Click \"+ New Access Token\" button
   - Give the token a meaningful name (e.g., \"Your Name - Local Development\")
   - Click \"Save\" to generate the token
3. Copy the displayed token (you won't be able to see it again after closing)
4. Add it to your .env file in your project root:
   \`\`\`
   BWS_ACCESS_TOKEN=your_token_here
   \`\`\`
5. Never commit this token to version control

### Updating BWS Secure

To update BWS Secure to the latest version, you can use the convenient script that was added to your package.json:

\`\`\`bash
npm run bws-update  # Or use your project's package manager: yarn bws-update, pnpm bws-update
\`\`\`

Alternatively, you can run the following command manually from your project root:

\`\`\`bash
rm -rf scripts/bws-secure && git clone git@github.com:last-rev-llc/bws-secure.git scripts/bws-secure && rm -rf scripts/bws-secure/.git && bash scripts/bws-secure/install.sh
\`\`\`
<!-- BWS-SECURE-DOCS-END -->"

for README_FILE in "${README_FILES[@]}"; do
  echo "Checking for $README_FILE..."
  if [ -f "$README_FILE" ]; then
    README_FOUND=true
    echo "Found README file: $(pwd)/$README_FILE"
    
    # Check if any BWS Secure sections exist
    if grep -q "<!-- BWS-SECURE-DOCS-START -->" "$README_FILE"; then
      echo "BWS Secure documentation markers found in $README_FILE..."
      
      # Count how many BWS Secure sections exist
      START_COUNT=$(grep -c "<!-- BWS-SECURE-DOCS-START -->" "$README_FILE")
      END_COUNT=$(grep -c "<!-- BWS-SECURE-DOCS-END -->" "$README_FILE")
      
      if [ "$START_COUNT" -gt 1 ] || [ "$END_COUNT" -gt 1 ]; then
        echo "Detected $START_COUNT start markers and $END_COUNT end markers. Removing duplicate sections..."
        
        # Create a temporary script to handle complex README processing
        TMP_SCRIPT=$(mktemp)
        cat > "$TMP_SCRIPT" << 'EOF'
#!/usr/bin/env node
const fs = require('fs');
const path = process.argv[2];
const newContent = process.argv[3];

try {
  // Read the file content
  let content = fs.readFileSync(path, 'utf8');
  
  // Find all start and end positions of BWS docs sections
  const startPattern = /<!-- BWS-SECURE-DOCS-START -->/g;
  const endPattern = /<!-- BWS-SECURE-DOCS-END -->/g;
  let startMatch;
  let endMatch;
  const sections = [];
  
  // Find all start positions
  while ((startMatch = startPattern.exec(content)) !== null) {
    sections.push({ start: startMatch.index });
  }
  
  // Find all end positions
  let i = 0;
  while ((endMatch = endPattern.exec(content)) !== null && i < sections.length) {
    sections[i].end = endMatch.index + "<!-- BWS-SECURE-DOCS-END -->".length;
    i++;
  }
  
  // Sort sections by start position (earliest first)
  sections.sort((a, b) => a.start - b.start);
  
  // Keep only the first section, replace all others
  if (sections.length > 0) {
    // Build new content by keeping everything before first section
    let newFileContent = content.substring(0, sections[0].start);
    
    // Add the new BWS docs content
    newFileContent += newContent;
    
    // Add everything after the first section, excluding other sections
    let currentPos = sections[0].end;
    for (let i = 1; i < sections.length; i++) {
      // Add content between last section end and this section start
      if (sections[i].start > currentPos) {
        newFileContent += content.substring(currentPos, sections[i].start);
      }
      // Skip this section
      currentPos = sections[i].end;
    }
    
    // Add any remaining content after the last section
    if (currentPos < content.length) {
      newFileContent += content.substring(currentPos);
    }
    
    // Write the new content back to the file
    fs.writeFileSync(path, newFileContent);
    process.exit(0);
  } else {
    // No sections found, just append
    fs.appendFileSync(path, "\n\n" + newContent);
    process.exit(0);
  }
} catch (error) {
  console.error('Error processing README:', error);
  process.exit(1);
}
EOF

        # Make the script executable
        chmod +x "$TMP_SCRIPT"
        
        # Execute the script to fix the README
        if node "$TMP_SCRIPT" "$README_FILE" "$BWS_DOC_CONTENT"; then
          echo "Successfully cleaned up duplicate BWS Secure documentation sections in $README_FILE"
        else
          echo "Warning: Failed to clean up duplicate sections. Attempting standard update..."
          # Fall back to standard update logic
          update_standard=true
        fi
        
        # Clean up temporary script
        rm -f "$TMP_SCRIPT"
      else
        # Only one section, use standard update logic
        update_standard=true
      fi
      
      # Standard update logic for single section
      if [ "$update_standard" = true ]; then
        # Create a temporary file
        TMP_FILE=$(mktemp)
        
        # Extract everything before the start marker
        sed -n '1,/<!-- BWS-SECURE-DOCS-START -->/p' "$README_FILE" | sed '$d' > "$TMP_FILE"
        
        # Add the updated BWS documentation
        echo -e "$BWS_DOC_CONTENT" >> "$TMP_FILE"
        
        # Extract everything after the end marker
        sed -n '/<!-- BWS-SECURE-DOCS-END -->/,$p' "$README_FILE" | sed '1d' >> "$TMP_FILE"
        
        # Replace the original file with the updated content
        mv "$TMP_FILE" "$README_FILE"
        
        echo "Successfully updated BWS Secure documentation in $README_FILE"
      fi
    else
      echo "Adding BWS Secure documentation to $README_FILE..."
      
      # Add newline at end of file if not present
      if [ -s "$README_FILE" ] && [ "$(tail -c1 "$README_FILE" | wc -l)" -eq 0 ]; then
        echo "" >> "$README_FILE"
      fi
      
      # Append BWS Secure documentation with markers
      echo -e "\n$BWS_DOC_CONTENT" >> "$README_FILE"
      
      echo "Successfully added BWS Secure documentation to $README_FILE"
    fi
    
    # Verify the changes were actually written
    if grep -q "<!-- BWS-SECURE-DOCS-START -->" "$README_FILE" && grep -q "<!-- BWS-SECURE-DOCS-END -->" "$README_FILE"; then
      START_COUNT=$(grep -c "<!-- BWS-SECURE-DOCS-START -->" "$README_FILE")
      if [ "$START_COUNT" -eq 1 ]; then
        echo "Verified: BWS Secure documentation is present in $README_FILE (single instance)"
      else
        echo "Warning: Multiple BWS Secure documentation sections still exist in $README_FILE"
      fi
    else
      echo "Warning: Failed to add/update BWS Secure documentation in $README_FILE"
    fi
    break
  fi
done

if [ "$README_FOUND" = false ]; then
  echo "No README file found in $(pwd). Creating README.md with BWS Secure documentation..."
  
  # Create a new README with the BWS documentation
  cat > "README.md" << EOF
# Project Documentation

$BWS_DOC_CONTENT
EOF

  echo "Created README.md with BWS Secure documentation at $(pwd)/README.md"
  # Verify the file was created
  if [ -f "README.md" ]; then
    echo "Verified: README.md was successfully created"
  else
    echo "Warning: Failed to create README.md"
  fi
fi

echo -e "
${GREEN}╔════════════════════════════════════════════════════════════╗
║             ✅ BWS Secure Setup Complete!                  ║
╚════════════════════════════════════════════════════════════╝${NC}

📋 Next Steps:

1. Configure your bwsconfig.json at:
   $(pwd)/bwsconfig.json
   - Set platform to 'vercel' or 'netlify'
   - Update projectName to match your deployment
   - Add your BWS project IDs for each environment

2. Add your BWS token to .env:
   BWS_ACCESS_TOKEN=your_token_here

3. Update your build scripts to use secure-run:
   \"dev\": \"secure-run next dev\"
   \"build\": \"secure-run next build\"
   \"start\": \"secure-run next start\"

🔧 Added Scripts:
   - secure-run: Runs commands with secure environment variables
   - list-projects: Lists available BWS projects
   - bws-deps: Ensures BWS dependencies are installed
   - bws-update: Updates BWS Secure to the latest version

📦 Dependencies:
   - BWS CLI will be installed automatically when needed
   - Required packages have been added to package.json
     (dotenv, dotenv-cli, yargs, glob, axios)
   - Run '$PM bws-deps' to verify BWS installation

🔒 Security:
   - Environment files are encrypted
   - .gitignore has been updated
   - Secrets are never logged

📚 Documentation: https://github.com/last-rev-llc/bws-secure

For help or issues:
1. Check the README.md in scripts/bws-secure/
2. Enable debug mode: DEBUG=true $PM build
3. Open an issue on GitHub
" 