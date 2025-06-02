#!/bin/bash

# Dependabot Update Testing Script
# Created by your helpful AI assistant 😉

set -e

echo "🚀 Starting Dependabot Update Testing Pipeline..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to run tests
run_tests() {
    local package_name=$1
    echo -e "${YELLOW}Testing after updating: $package_name${NC}"
    
    echo "📦 Installing dependencies..."
    pnpm install
    
    echo "🔍 Running linting..."
    if pnpm lint; then
        echo -e "${GREEN}✅ Linting passed${NC}"
    else
        echo -e "${RED}❌ Linting failed${NC}"
        return 1
    fi
    
    echo "🏗️ Running build..."
    if pnpm build; then
        echo -e "${GREEN}✅ Build passed${NC}"
    else
        echo -e "${RED}❌ Build failed${NC}"
        return 1
    fi
    
    echo "🧪 Running tests..."
    if pnpm test; then
        echo -e "${GREEN}✅ Tests passed${NC}"
    else
        echo -e "${RED}❌ Tests failed${NC}"
        return 1
    fi
    
    echo -e "${GREEN}🎉 All tests passed for: $package_name${NC}"
    return 0
}

# Function to update a package
update_package() {
    local package_name=$1
    local version=$2
    
    echo -e "${YELLOW}🔄 Updating $package_name to $version${NC}"
    
    # Create a git branch for this update
    git checkout -b "update/$package_name-$version" 2>/dev/null || git checkout "update/$package_name-$version"
    
    # Update the package
    pnpm add $package_name@$version
    
    # Run tests
    if run_tests "$package_name"; then
        echo -e "${GREEN}✅ $package_name update successful!${NC}"
        git add .
        git commit -m "chore: update $package_name to $version"
        return 0
    else
        echo -e "${RED}❌ $package_name update failed, reverting...${NC}"
        git checkout -- .
        git checkout main
        git branch -D "update/$package_name-$version" 2>/dev/null || true
        return 1
    fi
}

# Function to batch update low-risk packages
batch_update_safe() {
    echo -e "${YELLOW}📦 Batch updating low-risk packages...${NC}"
    
    git checkout -b "update/batch-safe-updates" 2>/dev/null || git checkout "update/batch-safe-updates"
    
    # Safe updates that are unlikely to break
    pnpm add eslint-plugin-react@7.37.5
    pnpm add wait-on@8.0.3
    
    if run_tests "batch safe updates"; then
        echo -e "${GREEN}✅ Batch safe updates successful!${NC}"
        git add .
        git commit -m "chore: batch update safe packages"
        return 0
    else
        echo -e "${RED}❌ Batch safe updates failed${NC}"
        git checkout -- .
        git checkout main
        git branch -D "update/batch-safe-updates" 2>/dev/null || true
        return 1
    fi
}

# Main execution
main() {
    echo "🎯 Choose your update strategy:"
    echo "1. Batch update safe packages first"
    echo "2. Update packages individually"
    echo "3. Full automated update (risky!)"
    
    read -p "Enter your choice (1-3): " choice
    
    case $choice in
        1)
            batch_update_safe
            ;;
        2)
            echo "Individual update mode - you can call specific functions"
            echo "Available functions:"
            echo "- update_package 'package-name' 'version'"
            echo "- run_tests 'description'"
            ;;
        3)
            echo "🚨 Full automated mode - buckle up!"
            batch_update_safe
            update_package "@babel/preset-env" "7.27.2"
            update_package "@babel/preset-typescript" "7.27.1"
            update_package "prettier" "3.5.3"
            # Add more as needed
            ;;
        *)
            echo "Invalid choice"
            exit 1
            ;;
    esac
}

# If script is run directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi 