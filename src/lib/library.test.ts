import { describe, expect, it } from 'vitest';
import {
  addColor,
  addPalette,
  emptyLibrary,
  hasColor,
  normalizeLibrary,
  removeColor,
  removePalette,
  renamePalette,
  restoreColor,
  restorePalette,
} from './library';

const NOW = new Date('2026-09-25T12:00:00Z');

describe('normalizeLibrary', () => {
  it('returns an empty library for junk', () => {
    for (const junk of [null, undefined, 42, 'x', [], { colors: 'nope' }]) {
      expect(normalizeLibrary(junk)).toEqual(emptyLibrary());
    }
  });

  it('keeps valid entries and drops broken ones', () => {
    const lib = normalizeLibrary({
      version: 1,
      colors: [
        { id: 'a', hex: '#07959d', name: 'Peacock Feather', createdAt: '2026-01-01T00:00:00Z' },
        { id: 'b', hex: 'not a colour', name: 'Bad' },
        { id: 'c', hex: '#07959D', name: 'Duplicate' },
        { hex: 'fff' },
        'string',
      ],
      palettes: [
        { id: 'p', name: 'Beach', colors: ['#fff', 'zzz', '#000000'], source: 'image' },
        { id: 'q', name: 'Empty', colors: ['zzz'] },
        { id: 'r', colors: ['#123456'], source: 'weird' },
      ],
    });
    expect(lib.colors.map((c) => [c.hex, c.name])).toEqual([
      ['#07959D', 'Peacock Feather'],
      ['#FFFFFF', '#FFFFFF'],
    ]);
    expect(lib.colors[1].id).toBeTruthy();
    expect(lib.palettes).toHaveLength(2);
    expect(lib.palettes[0]).toMatchObject({ name: 'Beach', colors: ['#FFFFFF', '#000000'], source: 'image' });
    expect(lib.palettes[1]).toMatchObject({ name: 'Untitled palette', source: 'manual' });
  });

  it('gives duplicate ids fresh ones', () => {
    const lib = normalizeLibrary({ colors: [{ id: 'x', hex: '#000' }, { id: 'x', hex: '#fff' }] });
    expect(lib.colors[0].id).not.toBe(lib.colors[1].id);
  });

  it('round-trips through JSON', () => {
    let lib = addColor(emptyLibrary(), '#07959D', 'Peacock Feather', NOW);
    lib = addPalette(lib, 'Beach', ['#FFFFFF', '#07959D'], 'image', NOW);
    expect(normalizeLibrary(JSON.parse(JSON.stringify(lib)))).toEqual(lib);
  });
});

describe('colours', () => {
  it('adds to the top and moves an existing colour up instead of duplicating', () => {
    let lib = addColor(emptyLibrary(), '#07959d', 'Peacock Feather', NOW);
    lib = addColor(lib, '#FFFFFF', 'White', NOW);
    expect(lib.colors.map((c) => c.hex)).toEqual(['#FFFFFF', '#07959D']);
    const id = lib.colors[1].id;
    lib = addColor(lib, '07959D', 'Other name', NOW);
    expect(lib.colors.map((c) => c.hex)).toEqual(['#07959D', '#FFFFFF']);
    expect(lib.colors[0]).toMatchObject({ id, name: 'Peacock Feather', createdAt: NOW.toISOString() });
    expect(hasColor(lib, '#07959d')).toBe(true);
    expect(hasColor(lib, '#000000')).toBe(false);
  });

  it('ignores invalid hex', () => {
    const lib = emptyLibrary();
    expect(addColor(lib, 'nope', 'x')).toBe(lib);
  });

  it('removes and restores in place', () => {
    let lib = emptyLibrary();
    for (const h of ['#000000', '#111111', '#222222']) lib = addColor(lib, h, h, NOW);
    const item = lib.colors[1];
    const removed = removeColor(lib, item.id);
    expect(removed.colors).toHaveLength(2);
    expect(restoreColor(removed, item, 1)).toEqual(lib);
    expect(restoreColor(lib, item, 0)).toBe(lib);
  });
});

describe('palettes', () => {
  it('adds, renames, removes and restores', () => {
    let lib = addPalette(emptyLibrary(), '  Beach  ', ['#fff', 'zzz', '#000'], 'image', NOW);
    lib = addPalette(lib, '', ['#123456'], 'gradient', NOW);
    expect(lib.palettes.map((p) => p.name)).toEqual(['Untitled palette', 'Beach']);
    expect(lib.palettes[1].colors).toEqual(['#FFFFFF', '#000000']);

    const beach = lib.palettes[1];
    lib = renamePalette(lib, beach.id, 'Sunset');
    expect(lib.palettes[1].name).toBe('Sunset');
    expect(renamePalette(lib, beach.id, '   ').palettes[1].name).toBe('Sunset');

    const removed = removePalette(lib, beach.id);
    expect(removed.palettes).toHaveLength(1);
    expect(restorePalette(removed, lib.palettes[1], 1)).toEqual(lib);
  });

  it('does not save an empty palette', () => {
    const lib = emptyLibrary();
    expect(addPalette(lib, 'x', ['zzz'], 'manual')).toBe(lib);
  });
});
