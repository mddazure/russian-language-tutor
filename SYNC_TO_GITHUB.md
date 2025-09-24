# Sync to GitHub Repository

Follow these steps to sync your Russian Language Tutor app to a GitHub repository:

## Step 1: Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `russian-language-tutor` (or your preferred name)
3. Description: `AI-powered Russian language learning app with story generation and interactive exercises`
4. Choose Public or Private
5. **Do NOT** initialize with README, .gitignore, or license (we already have these)
6. Click "Create repository"

## Step 2: Add Remote Origin

In your terminal, run:

```bash
git remote add origin https://github.com/YOUR_USERNAME/russian-language-tutor.git
```

Replace `YOUR_USERNAME` with your actual GitHub username.

## Step 3: Push to GitHub

```bash
# Add all files to staging
git add .

# Commit your changes
git commit -m "Initial commit: Russian Language Tutor with dual deployment support"

# Set main branch
git branch -M main

# Push to GitHub
git push -u origin main
```

## Step 4: Verify Upload

1. Refresh your GitHub repository page
2. You should see all the files uploaded
3. The README.md will be displayed automatically

## Step 5: Enable GitHub Pages (Optional)

If you want to host the app directly on GitHub Pages:

1. Go to your repository settings
2. Scroll down to "Pages" section
3. Select "Deploy from a branch"
4. Choose "main" branch and "/ (root)" folder
5. Click "Save"

## What Gets Synced

The following files will be included in your GitHub repository:

### Core Application Files
- `src/` - All source code including React components
- `index.html` - Main HTML file
- `package.json` - Dependencies and scripts
- `tailwind.config.js` - Tailwind configuration
- `tsconfig.json` - TypeScript configuration
- `vite.config.ts` - Vite build configuration

### Documentation
- `README.md` - Project documentation
- `PRD.md` - Product requirements document
- `AZURE_DEPLOYMENT.md` - Azure deployment guide
- `DEPLOYMENT.md` - General deployment guide

### Configuration Files
- `.gitignore` - Files to exclude from git
- `components.json` - shadcn/ui configuration
- `web.config` - Azure Web App configuration

### Azure Deployment Files
- `api/` - Azure Functions backend
- `deploy.sh` - Deployment script
- `host.json` - Azure Functions host configuration

## What Gets Excluded

These files are automatically excluded via `.gitignore`:

- `node_modules/` - Dependencies (will be installed via npm)
- `dist/` - Build output
- `.env` - Environment variables (create separately for each deployment)
- Various cache and temp files

## Environment Variables

After syncing to GitHub, remember to:

1. **For Azure deployment**: Create a `.env` file with your Azure OpenAI credentials
2. **For GitHub Actions**: Add secrets to your repository if setting up CI/CD
3. **For local development**: The app works out-of-the-box in Spark environment

## Next Steps

After syncing to GitHub, you can:

1. **Deploy to Azure**: Follow the Azure deployment guide
2. **Set up CI/CD**: Create GitHub Actions for automated deployment
3. **Collaborate**: Invite collaborators to contribute
4. **Track Issues**: Use GitHub Issues for bug reports and feature requests
5. **Create Releases**: Tag versions for stable releases

## Troubleshooting

If you encounter issues:

1. **Authentication errors**: Make sure you're logged into GitHub CLI or have proper credentials
2. **Large files**: Check if any files exceed GitHub's 100MB limit
3. **Permission errors**: Ensure you have write access to the repository
4. **Merge conflicts**: If the repository isn't empty, you may need to pull first

```bash
git pull origin main --allow-unrelated-histories
```

## Support

For questions about:
- **GitHub sync**: Check GitHub's documentation
- **Application features**: See README.md and PRD.md
- **Azure deployment**: See AZURE_DEPLOYMENT.md