import { describe, expect, it } from 'vitest';
import { parseColorInput } from './parse';
import { createPantoneIndex } from './pantone';

const pantone = createPantoneIndex([
  { code: '320 C', hex: '#009CA6' },
  { code: 'Reflex Blue C', hex: '#001489' },
  { code: 'Purple C', hex: '#BB29BB' },
]);
const parse = (s: string) => parseColorInput(s, pantone.find);

describe('parseColorInput', () => {
  it('detects HEX', () => {
    expect(parse('#07959D')).toEqual({ hex: '#07959D', format: 'hex' });
    expect(parse('07959d')).toEqual({ hex: '#07959D', format: 'hex' });
    expect(parse('#0af')).toEqual({ hex: '#00AAFF', format: 'hex' });
  });

  it('detects RGB', () => {
    expect(parse('7,149,157')).toEqual({ hex: '#07959D', format: 'rgb' });
    expect(parse('7 149 157')).toEqual({ hex: '#07959D', format: 'rgb' });
    expect(parse('rgb(7, 149, 157)')).toEqual({ hex: '#07959D', format: 'rgb' });
    expect(parse('rgb(7 149 157 / 50%)')?.hex).toBe('#07959D');
  });

  it('detects HSL', () => {
    expect(parse('hsl(0, 100%, 50%)')).toEqual({ hex: '#FF0000', format: 'hsl' });
    expect(parse('120, 100%, 50%')).toEqual({ hex: '#00FF00', format: 'hsl' });
    expect(parse('240deg 100 50')).toEqual({ hex: '#0000FF', format: 'hsl' });
  });

  it('detects CMYK', () => {
    expect(parse('96,5,0,38')).toEqual({ hex: '#06969E', format: 'cmyk' });
    expect(parse('96%, 5%, 0%, 38%')?.format).toBe('cmyk');
    expect(parse('cmyk(0, 100, 100, 0)')).toEqual({ hex: '#FF0000', format: 'cmyk' });
    expect(parse('device-cmyk(0 0 0 1)')).toEqual({ hex: '#000000', format: 'cmyk' });
    expect(parse('0.96, 0.05, 0, 0.38')?.hex).toBe('#06969E');
  });

  it('detects Pantone codes in several spellings', () => {
    for (const s of ['320 C', '320C', '320c', 'Pantone 320 C', 'PANTONE 320C', '320']) {
      const r = parse(s);
      expect(r?.format, s).toBe('pantone');
      expect(r?.hex).toBe('#009CA6');
      expect(r?.pantone?.code).toBe('320 C');
    }
    expect(parse('reflex blue c')?.pantone?.code).toBe('Reflex Blue C');
  });

  it('keeps plain colour names as CSS, not Pantone', () => {
    expect(parse('purple')).toEqual({ hex: '#800080', format: 'css' });
  });

  it('reads 3 digits as hex when there is no matching Pantone', () => {
    expect(parse('123')).toEqual({ hex: '#112233', format: 'hex' });
  });

  it('falls back to any CSS colour', () => {
    expect(parse('teal')).toEqual({ hex: '#008080', format: 'css' });
    expect(parse('oklch(62.8% 0.2577 29.23)')?.format).toBe('css');
  });

  it('rejects nonsense and out-of-range values', () => {
    for (const bad of ['', '   ', 'hello world', '300,0,0', '1,2', '1,2,3,4,5', '0,0,0,101', '10, 120%, 50%', 'cmyk(1,2,3)']) {
      expect(parse(bad), bad).toBeNull();
    }
  });

  it('works without a Pantone lookup', () => {
    expect(parseColorInput('320 C')).toBeNull();
    expect(parseColorInput('#fff')?.hex).toBe('#FFFFFF');
  });
});
