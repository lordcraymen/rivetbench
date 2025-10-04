#!/bin/bash

# RivetBench - Git Workflow Helper Script
# This script helps maintain a clean workflow by automating common tasks

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Function to start fresh work
start_fresh() {
    if [ -z "$1" ]; then
        print_error "Please provide a branch name"
        echo "Usage: ./workflow.sh fresh <branch-name>"
        echo "Example: ./workflow.sh fresh feature/add-authentication"
        exit 1
    fi

    print_info "Starting fresh work on branch: $1"
    
    # Check if there are uncommitted changes
    if ! git diff-index --quiet HEAD --; then
        print_warning "You have uncommitted changes!"
        echo "Please commit or stash them first:"
        echo "  git stash          # to save changes for later"
        echo "  git add . && git commit -m 'your message'  # to commit"
        exit 1
    fi
    
    print_info "Switching to main branch..."
    git checkout main
    
    print_info "Pulling latest changes..."
    git pull origin main
    
    print_info "Creating new branch: $1"
    git checkout -b "$1"
    
    print_success "Ready to work on $1!"
    echo ""
    echo "Next steps:"
    echo "  1. Make your changes"
    echo "  2. git add . && git commit -m 'description'"
    echo "  3. git push origin $1"
    echo "  4. Create a Pull Request on GitHub"
}

# Function to clean up merged branches
cleanup() {
    print_info "Cleaning up merged branches..."
    
    # Fetch and prune
    print_info "Fetching latest changes and pruning deleted remote branches..."
    git fetch --prune
    
    # Get current branch
    current_branch=$(git branch --show-current)
    
    # Switch to main if not already there
    if [ "$current_branch" != "main" ]; then
        print_info "Switching to main branch..."
        git checkout main
    fi
    
    # Pull latest main
    print_info "Pulling latest main..."
    git pull origin main
    
    # Delete local branches that are merged into main
    print_info "Deleting local merged branches..."
    merged_branches=$(git branch --merged main | grep -v "^\*" | grep -v "main" || true)
    
    if [ -z "$merged_branches" ]; then
        print_success "No merged branches to delete"
    else
        echo "$merged_branches" | while read -r branch; do
            branch=$(echo "$branch" | xargs)  # trim whitespace
            print_info "Deleting branch: $branch"
            git branch -d "$branch"
        done
        print_success "Cleanup complete!"
    fi
}

# Function to show status
status() {
    print_info "Repository Status"
    echo ""
    
    echo "Current branch:"
    git branch --show-current
    echo ""
    
    echo "Branches merged into main:"
    git branch --merged main | grep -v "^\*" || echo "  (none)"
    echo ""
    
    echo "Branches NOT merged into main:"
    git branch --no-merged main | grep -v "^\*" || echo "  (none)"
    echo ""
    
    echo "Recent commits on main:"
    git log origin/main --oneline -5
}

# Function to show help
show_help() {
    echo "RivetBench Git Workflow Helper"
    echo ""
    echo "Usage: ./workflow.sh <command> [arguments]"
    echo ""
    echo "Commands:"
    echo "  fresh <branch-name>   Start fresh work on a new branch from main"
    echo "  cleanup               Clean up local merged branches"
    echo "  status                Show current repository status"
    echo "  help                  Show this help message"
    echo ""
    echo "Examples:"
    echo "  ./workflow.sh fresh feature/add-authentication"
    echo "  ./workflow.sh cleanup"
    echo "  ./workflow.sh status"
    echo ""
    echo "For more information, see WORKFLOW.md"
}

# Main script logic
case "$1" in
    fresh)
        start_fresh "$2"
        ;;
    cleanup)
        cleanup
        ;;
    status)
        status
        ;;
    help|--help|-h|"")
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        echo ""
        show_help
        exit 1
        ;;
esac
