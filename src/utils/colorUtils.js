// Universal Smartphone & Electronics Colour Palette for ALZINO

export const POPULAR_COLORS = [
  { name: 'Onyx Black', hex: '#1C1C1E' },
  { name: 'Phantom Black', hex: '#0B0B0C' },
  { name: 'Pink / Rose', hex: '#EC4899' },
  { name: 'Rose Gold', hex: '#E0A899' },
  { name: 'Titanium Gray', hex: '#686B6F' },
  { name: 'Natural Titanium', hex: '#8E8A83' },
  { name: 'Midnight Blue', hex: '#1E293B' },
  { name: 'Sky Blue', hex: '#38BDF8' },
  { name: 'Flowy Emerald / Green', hex: '#0F766E' },
  { name: 'Mint Green', hex: '#34D399' },
  { name: 'Marble White / Silver', hex: '#E2E8F0' },
  { name: 'Sunset Gold', hex: '#D97706' },
  { name: 'Cobalt Violet / Purple', hex: '#7C3AED' },
  { name: 'Amber Yellow', hex: '#EAB308' },
  { name: 'Crimson Red', hex: '#DC2626' }
];

/**
 * Intelligent color-to-hex resolver.
 * Parses user input (e.g. "Pink", "hot pink", "desert titanium", "mint")
 * and returns the precise matching hex code so colours never mistakenly show purple.
 */
export function getProductColorHex(colorName = '', fallback = null) {
  if (!colorName) return fallback || '#64748B';
  const c = String(colorName).toLowerCase().trim();

  // 1. Exact match from predefined popular list
  const exact = POPULAR_COLORS.find(p => p.name.toLowerCase() === c);
  if (exact) return exact.hex;

  // 2. Pink / Rose / Magenta
  if (c.includes('pink') || c.includes('magenta') || c.includes('blush') || c.includes('fuchsia')) return '#EC4899';
  if (c.includes('rose gold') || c.includes('rosegold')) return '#E0A899';
  if (c.includes('rose')) return '#F43F5E';

  // 3. Red / Crimson / Maroon
  if (c.includes('red') || c.includes('crimson') || c.includes('ruby') || c.includes('maroon') || c.includes('burgundy')) return '#DC2626';

  // 4. Purple / Violet / Lavender
  if (c.includes('purple') || c.includes('violet') || c.includes('lavender') || c.includes('lilac')) return '#8B5CF6';

  // 5. Blue / Navy / Cyan
  if (c.includes('midnight blue') || c.includes('navy') || c.includes('deep blue')) return '#1E3A8A';
  if (c.includes('sky') || c.includes('cyan') || c.includes('aqua')) return '#0EA5E9';
  if (c.includes('cool blue') || c.includes('ice blue') || c.includes('sierra blue') || c.includes('pacific blue')) return '#38BDF8';
  if (c.includes('blue')) return '#2563EB';

  // 6. Green / Mint / Olive / Emerald
  if (c.includes('emerald') || c.includes('forest') || c.includes('alpine green')) return '#047857';
  if (c.includes('mint') || c.includes('sage')) return '#34D399';
  if (c.includes('olive')) return '#65A30D';
  if (c.includes('green')) return '#10B981';

  // 7. Yellow / Amber
  if (c.includes('yellow') || c.includes('amber')) return '#EAB308';

  // 8. Gold / Champagne / Bronze
  if (c.includes('gold') || c.includes('champagne')) return '#D97706';
  if (c.includes('bronze') || c.includes('copper')) return '#B45309';

  // 9. Orange / Coral / Peach
  if (c.includes('coral') || c.includes('peach')) return '#FB7185';
  if (c.includes('orange') || c.includes('tangerine') || c.includes('sunset')) return '#F97316';

  // 10. White / Silver / Starlight
  if (c.includes('white') || c.includes('starlight') || c.includes('pearl') || c.includes('cream') || c.includes('marble white')) return '#E2E8F0';
  if (c.includes('silver')) return '#CBD5E1';

  // 11. Black / Dark / Charcoal
  if (c.includes('black') || c.includes('onyx') || c.includes('phantom') || c.includes('midnight') || c.includes('dark') || c.includes('carbon')) return '#18181B';

  // 12. Gray / Titanium / Graphite
  if (c.includes('titanium') || c.includes('graphite') || c.includes('space gray') || c.includes('space grey')) return '#78716C';
  if (c.includes('gray') || c.includes('grey') || c.includes('slate')) return '#64748B';

  // 13. Brown / Sand / Desert / Beige
  if (c.includes('sand') || c.includes('desert') || c.includes('beige') || c.includes('tan') || c.includes('brown')) return '#D4A373';

  return fallback || '#EC4899';
}
