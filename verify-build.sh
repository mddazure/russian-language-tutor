#!/bin/bash

# Build Verification Script
# Ensures the build is correct before deployment

echo "🔨 Build Verification for Azure Deployment"
echo "=========================================="
echo ""

# Clean previous build
echo "🧹 Cleaning previous build..."
rm -rf dist/
echo "✅ Cleaned dist directory"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
if npm ci; then
    echo "✅ Dependencies installed"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi
echo ""

# Run build
echo "🏗️  Building application..."
if npm run build; then
    echo "✅ Build completed"
else
    echo "❌ Build failed"
    exit 1
fi
echo ""

# Verify build output
echo "🔍 Verifying build output..."

# Check essential files
if [ -f "dist/index.html" ]; then
    echo "✅ index.html created"
    
    # Check if it has the correct title
    if grep -q "Russian Language Tutor" dist/index.html; then
        echo "✅ index.html has correct title"
    else
        echo "⚠️  index.html may not have the expected title"
    fi
else
    echo "❌ index.html missing"
    exit 1
fi

if [ -d "dist/assets" ]; then
    ASSET_COUNT=$(ls -1 dist/assets/ 2>/dev/null | wc -l)
    echo "✅ Assets directory created with $ASSET_COUNT files"
    
    # List asset files
    echo "   Asset files:"
    ls -la dist/assets/ | tail -n +2 | awk '{print "   " $9 " (" $5 " bytes)"}'
else
    echo "❌ Assets directory missing"
    exit 1
fi

# Copy web.config
echo ""
echo "📄 Copying web.config..."
if [ -f "web.config" ]; then
    cp web.config dist/
    echo "✅ web.config copied to dist/"
else
    echo "⚠️  web.config not found, creating basic one..."
    cat > dist/web.config << 'EOF'
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <defaultDocument>
      <files>
        <clear />
        <add value="index.html" />
      </files>
    </defaultDocument>
    
    <rewrite>
      <rules>
        <rule name="Static Assets" stopProcessing="true">
          <match url="^(assets/.*|.*\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot))$" />
          <action type="None" />
        </rule>
        
        <rule name="React Routes" stopProcessing="true">
          <match url=".*" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
          </conditions>
          <action type="Rewrite" url="/index.html" />
        </rule>
      </rules>
    </rewrite>
    
    <staticContent>
      <mimeMap fileExtension=".json" mimeType="application/json" />
      <mimeMap fileExtension=".js" mimeType="application/javascript" />
      <mimeMap fileExtension=".mjs" mimeType="application/javascript" />
      <mimeMap fileExtension=".css" mimeType="text/css" />
      <mimeMap fileExtension=".woff" mimeType="font/woff" />
      <mimeMap fileExtension=".woff2" mimeType="font/woff2" />
      <mimeMap fileExtension=".ttf" mimeType="font/ttf" />
      <mimeMap fileExtension=".eot" mimeType="application/vnd.ms-fontobject" />
      <mimeMap fileExtension=".svg" mimeType="image/svg+xml" />
    </staticContent>
  </system.webServer>
</configuration>
EOF
    echo "✅ Basic web.config created"
fi

# Verify web.config exists in dist
if [ -f "dist/web.config" ]; then
    echo "✅ web.config is in dist directory"
else
    echo "❌ web.config missing from dist directory"
    exit 1
fi

# Check total build size
echo ""
echo "📊 Build Analysis:"
TOTAL_SIZE=$(du -sh dist/ | cut -f1)
echo "   Total build size: $TOTAL_SIZE"

# List all files in dist
echo ""
echo "📁 Files in dist directory:"
find dist/ -type f | sort | while read file; do
    SIZE=$(ls -lh "$file" | awk '{print $5}')
    echo "   $file ($SIZE)"
done

# Create deployment package
echo ""
echo "📦 Creating deployment package..."
cd dist
zip -r ../dist.zip . > /dev/null 2>&1
cd ..
PACKAGE_SIZE=$(ls -lh dist.zip | awk '{print $5}')
echo "✅ Deployment package created: dist.zip ($PACKAGE_SIZE)"

echo ""
echo "🎉 Build verification complete!"
echo ""
echo "Ready for deployment. You can now:"
echo "1. Deploy using the script: ./deploy-azure-simplified.sh"
echo "2. Or deploy the zip manually to Azure Web App"
echo "3. Verify deployment with: ./troubleshoot-deployment.sh"