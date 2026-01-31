import { describe, it, expect } from 'vitest';
import tailwindConfig from '../../tailwind.config';

describe('Tailwind Configuration', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const colors = tailwindConfig.theme?.extend?.colors as Record<string, any>;

  it('should have planned. brand accent color', () => {
    expect(colors?.accent).toBeDefined();
    expect(colors?.accent.DEFAULT).toBe('#EBBD04');
  });

  it('should have primary color matching accent', () => {
    expect(colors?.primary).toBeDefined();
    expect(colors?.primary.DEFAULT).toBe('#EBBD04');
  });

  it('should have brand black color', () => {
    expect(colors?.black).toBe('#2D2D2D');
  });

  it('should have gray color defined', () => {
    expect(colors?.gray).toBeDefined();
    expect(colors?.gray.DEFAULT).toBe('#6D6D6D');
  });

  it('should have semantic success color', () => {
    expect(colors?.success).toBeDefined();
    expect(colors?.success.DEFAULT).toBe('#22C55E');
  });

  it('should have semantic warning color', () => {
    expect(colors?.warning).toBeDefined();
    expect(colors?.warning.DEFAULT).toBe('#F59E0B');
  });

  it('should have semantic error color', () => {
    expect(colors?.error).toBeDefined();
    expect(colors?.error.DEFAULT).toBe('#EF4444');
  });

  it('should have bereich colors for produktion and montage', () => {
    expect(colors?.bereich).toBeDefined();
    expect(colors?.bereich.produktion).toBeDefined();
    expect(colors?.bereich.montage).toBeDefined();
  });

  it('should have Inter as primary font', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fontFamily = tailwindConfig.theme?.extend?.fontFamily as Record<string, any>;
    expect(fontFamily?.sans).toBeDefined();
    expect(fontFamily?.sans[0]).toBe('Inter');
  });

  it('should include tailwindcss-animate plugin', () => {
    expect(tailwindConfig.plugins).toBeDefined();
    expect(tailwindConfig.plugins?.length).toBeGreaterThan(0);
  });
});
