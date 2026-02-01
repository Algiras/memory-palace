# GitHub Setup Guide for Memory Palace

This guide explains how to set up GitHub workflows for building and publishing your Memory Palace book and documentation site.

## 🚀 Quick Start

### 1. Configure Custom Domain (Optional)

If you want to use a custom domain:

1. Edit `docs/public/CNAME` and replace `memory-palace.dev` with your domain
2. Configure DNS with your domain provider:
   - Add an A record pointing to GitHub Pages IPs:
     - 185.199.108.153
     - 185.199.109.153
     - 185.199.110.153
     - 185.199.111.153
   - Or add a CNAME record pointing to `algiras.github.io`
3. Enable HTTPS in repository Settings > Pages

### 2. Enable GitHub Pages

1. Go to your repository on GitHub
2. Click **Settings** > **Pages**
3. Under "Source", select **GitHub Actions**
4. Save

### 3. Create a Release

To publish a new version of the book:

```bash
# Tag a new release
git tag -a v1.0.0 -m "Initial book release"
git push origin v1.0.0
```

This will:
- Build PDF and HTML versions of the book
- Create a GitHub Release with the PDF attached
- Trigger the documentation site deployment

## 📚 Workflows Explained

### Release Workflow (`.github/workflows/release.yml`)

**Triggers:**
- Pushing a tag starting with `v` (e.g., `v1.0.0`)
- Manual trigger via GitHub Actions UI

**Actions:**
1. Builds PDF using Quarto + TinyTeX
2. Builds HTML version
3. Uploads artifacts
4. Creates GitHub Release with PDF attached

**Output:**
- GitHub Release with downloadable PDF
- Versioned book artifacts

### Pages Workflow (`.github/workflows/pages.yml`)

**Triggers:**
- Push to `main` or `master` branch
- Manual trigger

**Actions:**
1. Builds documentation site from `docs/`
2. Renders book HTML using Quarto
3. Deploys to GitHub Pages

**Output:**
- Live site at `https://algiras.github.io/memory-palace`
- Or your custom domain if configured

## 📂 Directory Structure

```
.github/workflows/
├── release.yml      # Build and release on tags
└── pages.yml        # Deploy site on push to main

docs/
├── src/
│   ├── pages/
│   │   └── index.html    # Documentation site homepage
│   └── styles/
│       └── main.css      # Site styles
├── public/
│   └── CNAME             # Custom domain configuration
├── dist/                 # Build output (generated)
├── build.js              # Build script
└── package.json          # Dependencies

paper/
├── _quarto.yml           # Quarto configuration
├── index.qmd             # Main manuscript
├── sections/             # Book chapters
└── _output/              # Build output (generated)
```

## 🔧 Local Development

### Preview Documentation Site

```bash
cd docs
npm install
npm run build
npm run serve
# Open http://localhost:8080
```

### Build Book Locally

```bash
cd paper
quarto render index.qmd --to pdf
quarto render index.qmd --to html
```

## 📝 Release Checklist

Before creating a release:

- [ ] Update version in `paper/index.qmd` frontmatter
- [ ] Update `CHANGELOG.md` with new features
- [ ] Ensure all figures render correctly
- [ ] Check all citations resolve
- [ ] Test PDF builds locally
- [ ] Review generated HTML

To release:

```bash
# Commit all changes
git add .
git commit -m "Prepare for v1.0.0 release"
git push

# Tag and release
git tag -a v1.0.0 -m "Release v1.0.0: Initial book publication"
git push origin v1.0.0
```

## 🌐 Site Structure

Your deployed site will include:

- **Homepage** (`/`) - Overview, features, evolution timeline
- **Book** (`/book/`) - Full academic manuscript (HTML version)
- **GitHub Release** - Downloadable PDF version

## 📊 Monitoring

Check workflow status:
- Go to **Actions** tab in your GitHub repository
- View build logs and download artifacts
- Check deployment status

## 🔧 Troubleshooting

### Build Failures

If the PDF build fails:
1. Check Quarto version compatibility
2. Ensure TinyTeX is installed correctly
3. Review LaTeX compilation errors in logs

### Site Not Deploying

If Pages deployment fails:
1. Verify GitHub Actions has Pages permissions
2. Check that `actions/configure-pages` succeeded
3. Ensure artifact upload completed

### Custom Domain Issues

If custom domain doesn't work:
1. Verify DNS propagation (can take 24-48 hours)
2. Check CNAME file is in `docs/public/`
3. Ensure HTTPS is enabled in Settings
4. Verify no conflicting DNS records

## 📖 Additional Resources

- [Quarto Documentation](https://quarto.org/docs/)
- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Managing a Custom Domain](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site)

## 🤝 Support

For issues with:
- **Book building**: Check Quarto and TinyTeX setup
- **Site deployment**: Review GitHub Actions logs
- **Custom domains**: Verify DNS configuration
- **General questions**: Open an issue on GitHub

---

**Your book will be published at:**
- HTML: `https://memory-palace.dev/book/` (or your domain)
- PDF: Download from GitHub Releases
- Site: `https://memory-palace.dev` (or your domain)