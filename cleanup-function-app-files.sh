#!/bin/bash

# Cleanup script to remove Function App related files after migration
# Run this after successfully migrating to the simplified architecture

set -e

echo "🧹 Cleaning up Function App related files..."

# Files and directories to remove
FILES_TO_REMOVE=(
    "api/"
    "functions-deploy/"
    "host.json"
    "local.settings.json"
    "deploy-azure-functions.sh"
    "deploy.sh"
    "validate-azure-build.js"
)

DOCS_TO_ARCHIVE=(
    "AZURE_DEPLOYMENT.md"
    "API_500_TROUBLESHOOTING.md"
    "AZURE_TROUBLESHOOTING.md"
    "STORAGE_REMOVAL_CHANGES.md"
    "apitest.md"
)

# Create backup directory
BACKUP_DIR="backup-function-app-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "📦 Creating backup in $BACKUP_DIR..."

# Backup files before removal
for file in "${FILES_TO_REMOVE[@]}" "${DOCS_TO_ARCHIVE[@]}"; do
    if [ -e "$file" ]; then
        echo "   Backing up: $file"
        cp -r "$file" "$BACKUP_DIR/" 2>/dev/null || true
    fi
done

echo "🗑️  Removing Function App files..."

# Remove Function App files
for file in "${FILES_TO_REMOVE[@]}"; do
    if [ -e "$file" ]; then
        echo "   Removing: $file"
        rm -rf "$file"
    else
        echo "   Not found: $file"
    fi
done

echo "📚 Moving old documentation to backup..."

# Move old documentation to backup
for doc in "${DOCS_TO_ARCHIVE[@]}"; do
    if [ -e "$doc" ]; then
        echo "   Archiving: $doc"
        mv "$doc" "$BACKUP_DIR/"
    fi
done

# Update README to reference new deployment guide
if [ -f "README.md" ]; then
    echo "📝 Updating README.md..."
    sed -i.bak 's/AZURE_DEPLOYMENT\.md/AZURE_DEPLOYMENT_SIMPLIFIED.md/g' README.md 2>/dev/null || true
    rm -f README.md.bak
fi

echo "✅ Cleanup completed!"
echo ""
echo "📋 Summary:"
echo "   ✅ Function App files removed"
echo "   ✅ Old documentation archived to $BACKUP_DIR"
echo "   ✅ README updated"
echo ""
echo "🚀 Your project is now using the simplified architecture!"
echo ""
echo "📁 Backup location: $BACKUP_DIR"
echo "   (You can safely delete this after confirming everything works)"
echo ""
echo "📖 New deployment guide: AZURE_DEPLOYMENT_SIMPLIFIED.md"
echo "🔄 Migration guide: MIGRATION_TO_SIMPLIFIED.md"

# Make the new deployment script executable if it exists
if [ -f "deploy-azure-simplified.sh" ]; then
    chmod +x deploy-azure-simplified.sh
    echo "🔧 Made deploy-azure-simplified.sh executable"
fi

echo "✨ Cleanup script completed successfully!"