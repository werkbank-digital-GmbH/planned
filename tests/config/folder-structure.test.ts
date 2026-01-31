import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Folder Structure', () => {
  const srcPath = path.resolve(__dirname, '../../src');

  const requiredFolders = [
    // Domain Layer
    'domain/entities',
    'domain/value-objects',
    'domain/enums',
    'domain/errors',
    'domain/services',

    // Application Layer
    'application/ports/repositories',
    'application/ports/services',
    'application/use-cases',
    'application/dtos',

    // Infrastructure Layer
    'infrastructure/repositories',
    'infrastructure/services',
    'infrastructure/supabase',
    'infrastructure/mappers',
    'infrastructure/container',

    // Presentation Layer
    'presentation/actions',
    'presentation/hooks',
    'presentation/components',
    'presentation/store',

    // App & Lib
    'app',
    'lib',
  ];

  requiredFolders.forEach((folder) => {
    it(`should have ${folder} directory`, () => {
      const folderPath = path.join(srcPath, folder);
      expect(fs.existsSync(folderPath)).toBe(true);
    });
  });

  it('should have tests/e2e directory', () => {
    const e2ePath = path.resolve(__dirname, '../../tests/e2e');
    expect(fs.existsSync(e2ePath)).toBe(true);
  });

  it('should have constants.ts in lib', () => {
    const constantsPath = path.join(srcPath, 'lib/constants.ts');
    expect(fs.existsSync(constantsPath)).toBe(true);
  });

  it('should have utils.ts in lib', () => {
    const utilsPath = path.join(srcPath, 'lib/utils.ts');
    expect(fs.existsSync(utilsPath)).toBe(true);
  });
});
