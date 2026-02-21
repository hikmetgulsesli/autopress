import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const PAGES_DIR = path.join(__dirname, '../pages');
const COMPONENTS_DIR = path.join(__dirname, '../components');

// Pages and components to check for CSS variable usage
const FILES_TO_CHECK = [
  'pages/Login.tsx',
  'pages/Dashboard.tsx',
  'pages/Settings.tsx',
  'pages/SEOTools.tsx',
  'pages/TrendExplorer.tsx',
  'pages/SiteManager.tsx',
  'components/layout/Header.tsx',
  'components/layout/Sidebar.tsx',
  'components/settings/ProfileTab.tsx',
];

describe('CSS Variables Consistency', () => {
  it('should not use hardcoded dark-* Tailwind classes', () => {
    const violations: string[] = [];
    const darkClassPattern = /dark-\d{2,3}/g;

    FILES_TO_CHECK.forEach((filePath) => {
      const fullPath = path.join(__dirname, '..', filePath);
      
      if (!fs.existsSync(fullPath)) {
        console.warn(`File not found: ${fullPath}`);
        return;
      }

      const content = fs.readFileSync(fullPath, 'utf-8');
      const matches = content.match(darkClassPattern);
      
      if (matches) {
        const uniqueMatches = [...new Set(matches)];
        violations.push(`${filePath}: Found hardcoded dark-* classes: ${uniqueMatches.join(', ')}`);
      }
    });

    if (violations.length > 0) {
      console.error('\n❌ CSS Variables Consistency Violations:\n');
      violations.forEach(v => console.error(`  - ${v}`));
    }

    expect(violations).toHaveLength(0);
  });

  it('should use CSS custom properties (var(--color-*))', () => {
    const expectedCssVars = [
      '--color-surface',
      '--color-surface-alt',
      '--color-text',
      '--color-text-muted',
      '--color-border',
      '--color-primary-400',
      '--color-primary-600',
    ];

    const cssVarsFound: Record<string, string[]> = {};

    FILES_TO_CHECK.forEach((filePath) => {
      const fullPath = path.join(__dirname, '..', filePath);
      
      if (!fs.existsSync(fullPath)) {
        return;
      }

      const content = fs.readFileSync(fullPath, 'utf-8');
      
      expectedCssVars.forEach(cssVar => {
        if (content.includes(cssVar)) {
          if (!cssVarsFound[cssVar]) {
            cssVarsFound[cssVar] = [];
          }
          cssVarsFound[cssVar].push(filePath);
        }
      });
    });

    // Verify key CSS variables are being used
    const criticalVars = [
      '--color-surface',
      '--color-surface-alt', 
      '--color-text',
      '--color-text-muted',
      '--color-border',
    ];

    const missingVars = criticalVars.filter(v => !cssVarsFound[v]);
    
    if (missingVars.length > 0) {
      console.error('\n❌ Missing critical CSS variables:\n');
      missingVars.forEach(v => console.error(`  - ${v} not found in files`));
    }

    // We expect at least some files to use these variables
    expect(cssVarsFound['--color-surface']).toBeDefined();
    expect(cssVarsFound['--color-border']).toBeDefined();
  });

  it('should use style props for dynamic colors instead of Tailwind dark classes', () => {
    // Check that components use inline styles with CSS variables for colors
    const filesWithStyleProps: string[] = [];
    
    FILES_TO_CHECK.forEach((filePath) => {
      const fullPath = path.join(__dirname, '..', filePath);
      
      if (!fs.existsSync(fullPath)) {
        return;
      }

      const content = fs.readFileSync(fullPath, 'utf-8');
      
      // Check for style prop usage with CSS variables
      if (content.includes('style={{') && content.includes('var(--color-')) {
        filesWithStyleProps.push(filePath);
      }
    });

    // At least some files should use inline styles with CSS variables
    expect(filesWithStyleProps.length).toBeGreaterThan(0);
  });
});
