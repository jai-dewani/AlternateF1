// F1 2026 team colors keyed by Jolpica constructorId
export const TEAM_COLORS = {
  mercedes:      '#00D2BE',
  red_bull:      '#3671C6',
  ferrari:       '#E8002D',
  mclaren:       '#FF8000',
  aston_martin:  '#358C75',
  alpine:        '#FF69B4',
  williams:      '#64C4FF',
  rb:            '#6692FF',
  sauber:        '#52E252',
  haas:          '#B6BABD',
};

const FALLBACK_COLORS = [
  '#FF6B6B','#4ECDC4','#45B7D1','#96CEB4','#FFEAA7',
  '#DDA0DD','#98D8C8','#F7DC6F','#BB8FCE','#85C1E9',
];
let fbIdx = 0;
const cache = new Map();

export function getDriverColor(driver) {
  if (!driver) return '#888888';
  const key = driver.constructorId ?? driver.id ?? 'unknown';
  if (cache.has(key)) return cache.get(key);
  const color = TEAM_COLORS[key] ?? FALLBACK_COLORS[fbIdx++ % FALLBACK_COLORS.length];
  cache.set(key, color);
  return color;
}

export const COUNTRY_FLAGS = {
  'Australia':    '🇦🇺', 'China':         '🇨🇳', 'Japan':       '🇯🇵',
  'Bahrain':      '🇧🇭', 'Saudi Arabia':  '🇸🇦', 'Italy':       '🇮🇹',
  'Monaco':       '🇲🇨', 'Spain':         '🇪🇸', 'Canada':      '🇨🇦',
  'Austria':      '🇦🇹', 'UK':            '🇬🇧', 'United Kingdom': '🇬🇧',
  'Hungary':      '🇭🇺', 'Belgium':       '🇧🇪', 'Netherlands': '🇳🇱',
  'Singapore':    '🇸🇬', 'USA':           '🇺🇸', 'United States': '🇺🇸',
  'Mexico':       '🇲🇽', 'Brazil':        '🇧🇷', 'UAE':         '🇦🇪',
  'Abu Dhabi':    '🇦🇪', 'Qatar':         '🇶🇦', 'Azerbaijan':  '🇦🇿',
  'Las Vegas':    '🇺🇸',
};

export function getFlag(country) {
  return COUNTRY_FLAGS[country] ?? '🏁';
}
