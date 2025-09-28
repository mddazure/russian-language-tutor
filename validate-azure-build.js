#!/usr/bin/env node

/**
 * Azure Build Validation Script
 * Validates that the build is ready for Azure Web App deployment
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Validating Azure Web App build...\n');

const distPath = path.join(__dirname, 'dist');
const requiredFiles = [
  'index.html',
  'web.config'
];

let errors = [];
let warnings = [];

// Check if dist directory exists
if (!fs.existsSync(distPath)) {
  errors.push('❌ dist/ directory not found. Run: npm run build:azure');
} else {
  console.log('✅ dist/ directory exists');
  
  // Check required files
  for (const file of requiredFiles) {
    const filePath = path.join(distPath, file);
    if (!fs.existsSync(filePath)) {
      errors.push(`❌ ${file} not found in dist/`);
    } else {
      console.log(`✅ ${file} exists`);
      
      // Validate web.config content
      if (file === 'web.config') {
        const webConfigContent = fs.readFileSync(filePath, 'utf8');
        
        const requiredPatterns = [
          /<defaultDocument>/,
          /<add value="index.html"/,
          /Static Assets/,
          /React Routes/,
          /application\/javascript/
        ];
        
        for (const pattern of requiredPatterns) {
          if (!pattern.test(webConfigContent)) {
            warnings.push(`⚠️  web.config may be missing required pattern: ${pattern}`);
          }
        }
        
        if (webConfigContent.includes('url="/"')) {
          errors.push('❌ web.config contains incorrect rewrite rule. Should be url="/index.html"');
        }
      }
      
      // Validate index.html
      if (file === 'index.html') {
        const indexContent = fs.readFileSync(filePath, 'utf8');
        
        if (!indexContent.includes('<div id="root">')) {
          errors.push('❌ index.html missing root div');
        }
        
        if (!indexContent.includes('/assets/')) {
          warnings.push('⚠️  index.html may not reference built assets correctly');
        }
        
        if (indexContent.includes('/src/main.css')) {
          errors.push('❌ index.html still references development CSS path');
        }
      }
    }
  }
  
  // Check for assets directory
  const assetsPath = path.join(distPath, 'assets');
  if (!fs.existsSync(assetsPath)) {
    errors.push('❌ assets/ directory not found in dist/');
  } else {
    console.log('✅ assets/ directory exists');
    
    // Check for JS and CSS files
    const assets = fs.readdirSync(assetsPath);
    const jsFiles = assets.filter(f => f.endsWith('.js'));
    const cssFiles = assets.filter(f => f.endsWith('.css'));
    
    if (jsFiles.length === 0) {
      errors.push('❌ No JavaScript files found in assets/');
    } else {
      console.log(`✅ Found ${jsFiles.length} JavaScript file(s)`);
    }
    
    if (cssFiles.length === 0) {
      errors.push('❌ No CSS files found in assets/');
    } else {
      console.log(`✅ Found ${cssFiles.length} CSS file(s)`);
    }
  }
}

// Check package.json scripts
const packageJsonPath = path.join(__dirname, 'package.json');
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  if (!packageJson.scripts['build:azure']) {
    errors.push('❌ package.json missing build:azure script');
  } else {
    console.log('✅ build:azure script exists');
  }
}

// Check deploy.sh
const deployScriptPath = path.join(__dirname, 'deploy.sh');
if (fs.existsSync(deployScriptPath)) {
  const deployScript = fs.readFileSync(deployScriptPath, 'utf8');
  
  if (deployScript.includes('npm run build:azure')) {
    console.log('✅ deploy.sh uses build:azure');
  } else {
    warnings.push('⚠️  deploy.sh may not use build:azure command');
  }
} else {
  warnings.push('⚠️  deploy.sh not found');
}

// Summary
console.log('\n📋 Validation Summary:');

if (errors.length === 0) {
  console.log('🎉 Build is ready for Azure deployment!');
} else {
  console.log(`❌ ${errors.length} error(s) found:`);
  errors.forEach(error => console.log(`  ${error}`));
}

if (warnings.length > 0) {
  console.log(`⚠️  ${warnings.length} warning(s):`);
  warnings.forEach(warning => console.log(`  ${warning}`));
}

if (errors.length === 0 && warnings.length === 0) {
  console.log('\n🚀 Ready to deploy to Azure Web App!');
  console.log('   Next steps:');
  console.log('   1. Commit and push to trigger deployment');
  console.log('   2. Or manually deploy dist/ contents to Azure');
} else if (errors.length > 0) {
  console.log('\n🔧 Fix the errors above, then run this script again.');
  process.exit(1);
}