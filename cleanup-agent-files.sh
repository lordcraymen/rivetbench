#!/bin/bash
# Agent Files Cleanup Script
# This script moves temporary MD files from root to .agent/ directory

set -e

echo "🧹 Agent Files Cleanup"
echo "====================="
echo ""

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Ensure .agent directories exist
mkdir -p .agent/memory
mkdir -p .agent/pr
mkdir -p .agent/summaries

moved_count=0

# Function to move file if it exists
move_if_exists() {
    local source="$1"
    local dest="$2"
    
    if [ -f "$source" ]; then
        echo -e "${BLUE}Moving${NC} $source → $dest"
        mv "$source" "$dest"
        ((moved_count++))
    fi
}

echo "Moving agent memory files..."
move_if_exists "agent.md.backup" ".agent/memory/agent.md.backup"

echo ""
echo "Moving PR-related files..."
move_if_exists "PR_DESCRIPTION.md" ".agent/pr/description.md"
move_if_exists "PR_DOCUMENTATION_CLEANUP.md" ".agent/pr/documentation-cleanup.md"
move_if_exists "CREATE_PR_INSTRUCTIONS.md" ".agent/pr/instructions.md"

echo ""
echo "Moving summary files..."
move_if_exists "BRANCH_CLEANUP_SUMMARY.md" ".agent/summaries/branch-cleanup.md"
move_if_exists "CLEANUP_SUMMARY.md" ".agent/summaries/cleanup.md"
move_if_exists "CUCUMBER_IMPLEMENTATION.md" ".agent/summaries/cucumber-implementation.md"

# Check for any other temporary-looking MD files in root
echo ""
echo "Checking for other temporary files..."
for file in *_SUMMARY.md *_INSTRUCTIONS.md *_COMPLETE.md *_ANALYSIS.md; do
    if [ -f "$file" ]; then
        echo -e "${BLUE}Found${NC} $file - consider moving to .agent/summaries/"
    fi
done

echo ""
echo "================================================"

if [ $moved_count -eq 0 ]; then
    echo -e "${GREEN}✓${NC} No temporary files found - already clean!"
else
    echo -e "${GREEN}✓${NC} Moved $moved_count file(s) to .agent/"
    echo ""
    echo "Next steps:"
    echo "  1. Review files in .agent/ directory"
    echo "  2. These files are now gitignored"
    echo "  3. Safe to commit remaining changes"
fi

echo ""
