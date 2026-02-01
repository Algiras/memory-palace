#!/usr/bin/env node
/**
 * Build script for documentation site
 * Copies HTML, CSS, and assets to dist/
 */

const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');
const distDir = path.join(__dirname, 'dist');

// Ensure dist directory exists
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Copy HTML files
function copyHTML() {
  const pagesDir = path.join(srcDir, 'pages');
  const files = fs.readdirSync(pagesDir);
  
  files.forEach(file => {
    if (file.endsWith('.html')) {
      const src = path.join(pagesDir, file);
      const dest = path.join(distDir, file);
      fs.copyFileSync(src, dest);
      console.log(`✓ Copied ${file}`);
    }
  });
}

// Copy CSS
function copyStyles() {
  const stylesDir = path.join(srcDir, 'styles');
  const destDir = path.join(distDir, 'styles');
  
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  
  const files = fs.readdirSync(stylesDir);
  files.forEach(file => {
    const src = path.join(stylesDir, file);
    const dest = path.join(destDir, file);
    fs.copyFileSync(src, dest);
    console.log(`✓ Copied styles/${file}`);
  });
}

// Create book directory placeholder
function setupBookDir() {
  const bookDir = path.join(distDir, 'book');
  if (!fs.existsSync(bookDir)) {
    fs.mkdirSync(bookDir, { recursive: true });
  }
  
  // Create placeholder index.html
  const placeholder = `<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="refresh" content="0; url=../">
    <title>Book - Memory Palace</title>
</head>
<body>
    <p>Loading book... <a href="../">Click here</a> if not redirected.</p>
</body>
</html>`;
  
  fs.writeFileSync(path.join(bookDir, 'index.html'), placeholder);
  console.log('✓ Created book/ placeholder');
}

// Build
console.log('Building documentation site...\n');
copyHTML();
copyStyles();
setupBookDir();

console.log('\n✅ Build complete! Output in docs/dist/');
console.log('   Run: npm run serve (to preview)');