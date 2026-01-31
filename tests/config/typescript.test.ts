import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('TypeScript Configuration', () => {
  const tsconfigPath = path.resolve(__dirname, '../../tsconfig.json');
  const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf-8'));

  it('should have strict mode enabled', () => {
    expect(tsconfig.compilerOptions.strict).toBe(true);
  });

  it('should have strictNullChecks enabled', () => {
    expect(tsconfig.compilerOptions.strictNullChecks).toBe(true);
  });

  it('should have noImplicitAny enabled', () => {
    expect(tsconfig.compilerOptions.noImplicitAny).toBe(true);
  });

  it('should have noUnusedLocals enabled', () => {
    expect(tsconfig.compilerOptions.noUnusedLocals).toBe(true);
  });

  it('should have noUnusedParameters enabled', () => {
    expect(tsconfig.compilerOptions.noUnusedParameters).toBe(true);
  });

  it('should have path alias @/* configured', () => {
    expect(tsconfig.compilerOptions.paths).toBeDefined();
    expect(tsconfig.compilerOptions.paths['@/*']).toContain('./src/*');
  });

  it('should target ES2022', () => {
    expect(tsconfig.compilerOptions.target).toBe('ES2022');
  });
});
