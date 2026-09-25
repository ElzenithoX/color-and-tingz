import { colornames } from 'color-name-list';
import pantoneData from '../data/pantone.json';
import { createLabIndex, type LabIndex } from './color/nearest';
import { createPantoneIndex, type PantoneEntry, type PantoneIndex } from './color/pantone';

export interface NamedColor {
  name: string;
  hex: string;
}

// Built on first use: converting ~30k names to L*a*b* takes a moment.
let names: LabIndex<NamedColor> | null = null;
let pantone: PantoneIndex | null = null;

export function nameIndex(): LabIndex<NamedColor> {
  return (names ??= createLabIndex(colornames));
}

export function pantoneIndex(): PantoneIndex {
  return (pantone ??= createPantoneIndex(pantoneData as PantoneEntry[]));
}
