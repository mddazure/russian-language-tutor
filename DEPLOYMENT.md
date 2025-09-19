# Deployment Instructions

## GitHub Pages Deployment

This project is configured for automatic deployment to GitHub Pages using GitHub Actions.

### Automatic Deployment

1. **Push to Main Branch**: Any push to the `main` branch will automatically trigger deployment
2. **GitHub Actions**: The workflow builds the project and deploys to GitHub Pages
3. **Live Site**: Your site will be available at `https://yourusername.github.io/russian-language-lea/`

### Manual Deployment Steps

If you need to deploy manually:

1. **Build the Project**:
   ```bash
   npm run build
   ```

2. **Deploy Using gh-pages**:
   ```bash
   npm run deploy
   ```

### GitHub Repository Settings

Make sure your GitHub repository has:

1. **Pages Settings**:
   - Go to Settings > Pages
   - Source: Deploy from a branch
   - Branch: `gh-pages` (will be created automatically)

2. **Actions Permissions**:
   - Go to Settings > Actions > General
   - Enable "Allow all actions and reusable workflows"

### Important Notes

- The `base` path in `vite.config.ts` is set to `/russian-language-lea/` - update this to match your repository name
- The GitHub Actions workflow requires Pages to be enabled in your repository settings
- First deployment may take a few minutes to become available

### Troubleshooting

- If deployment fails, check the Actions tab for error details
- Ensure your repository is public or you have GitHub Pro for private repo Pages
- Verify that the repository name matches the base path in the Vite config