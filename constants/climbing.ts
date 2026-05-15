// ─── Grade systems ─────────────────────────────────────────────────────────

export const V_BASES = [
  'VB','V0','V1','V2','V3','V4','V5','V6','V7','V8','V9','V10','V11','V12','V13','V14','V15',
] as const;

export const YDS_BASES = [
  '5.5','5.6','5.7','5.8','5.9','5.10','5.11','5.12','5.13','5.14',
] as const;

// Backward-compat aliases
export const GRADES = V_BASES;
export type Grade = typeof V_BASES[number];

export type GradeSystem = 'V' | 'YDS';

export const V_MODIFIERS = ['-', '+'] as const;
/** YDS 5.10 and above use letter modifiers (and sometimes +/-). */
export const YDS_LETTER_MODIFIERS = ['a', 'b', 'c', 'd'] as const;
export const YDS_PLUSMINUS = ['-', '+'] as const;

export const STYLES = ['boulder', 'top rope', 'lead'] as const;
export type ClimbStyle = typeof STYLES[number];

/** Which grade system does this style use? */
export function gradeSystemForStyle(s?: ClimbStyle): GradeSystem {
  return s === 'top rope' || s === 'lead' ? 'YDS' : 'V';
}

/** Base grades to show in the picker for a given style. */
export function basesForStyle(s?: ClimbStyle): readonly string[] {
  return gradeSystemForStyle(s) === 'YDS' ? YDS_BASES : V_BASES;
}

/** Modifier options for a given base grade. VB has none. */
export function modifiersForBase(base: string): readonly string[] {
  if (base === 'VB') return [];
  if (base.startsWith('V')) return V_MODIFIERS;
  const ydsMatch = base.match(/^5\.(\d+)$/);
  if (ydsMatch) {
    const n = Number(ydsMatch[1]);
    return n >= 10 ? [...YDS_PLUSMINUS, ...YDS_LETTER_MODIFIERS] : YDS_PLUSMINUS;
  }
  return [];
}

/** Split a composed grade string into base + modifier. */
export function parseGrade(g: string): { base: string; mod: string; system: GradeSystem } {
  const v = g.match(/^(VB|V\d+)([-+]?)$/);
  if (v) return { base: v[1], mod: v[2], system: 'V' };
  const yds = g.match(/^(5\.\d+)([-+]|[abcd])?$/);
  if (yds) return { base: yds[1], mod: yds[2] ?? '', system: 'YDS' };
  return { base: g, mod: '', system: g.startsWith('5') ? 'YDS' : 'V' };
}

export function composeGrade(base: string, mod: string): string {
  if (!mod) return base;
  if (base === 'VB') return base;
  return base + mod;
}

/**
 * Numeric order for any composed grade string, comparable within a system.
 * V grades live in [-1, 16); YDS grades in [100, 115).
 */
export function gradeOrder(g: string): number {
  const v = g.match(/^V(B|\d+)([-+]?)$/);
  if (v) {
    const base = v[1] === 'B' ? -1 : Number(v[1]);
    const mod = v[2] === '-' ? -0.33 : v[2] === '+' ? 0.33 : 0;
    return base + mod;
  }
  const yds = g.match(/^5\.(\d+)([-+]|[abcd])?$/);
  if (yds) {
    const base = Number(yds[1]);
    const m = yds[2] || '';
    let offset = 0;
    if (m === '-') offset = -0.4;
    else if (m === '+') offset = 0.4;
    else if (m === 'a') offset = -0.3;
    else if (m === 'b') offset = -0.1;
    else if (m === 'c') offset = 0.1;
    else if (m === 'd') offset = 0.3;
    return 100 + base + offset;
  }
  return -9999;
}

/** Legacy index lookup (only used for V-system pickers). */
export const GRADE_NUM = (g: string) => V_BASES.indexOf(g as Grade);

// ─── Colors ────────────────────────────────────────────────────────────────

const V_PALETTE: Record<string, string> = {
  VB: '#94a3b8', V0: '#4ade80', V1: '#34d399', V2: '#2dd4bf', V3: '#38bdf8',
  V4: '#818cf8', V5: '#a78bfa', V6: '#c084fc', V7: '#f472b6', V8: '#fb7185',
  V9: '#f97316', V10: '#eab308', V11: '#facc15', V12: '#ff6b6b', V13: '#ff4757',
  V14: '#eccc68', V15: '#ff6348',
};

// Map YDS base grades onto V-palette analogues by relative difficulty.
const YDS_PALETTE: Record<string, string> = {
  '5.5': '#4ade80',  '5.6': '#34d399',  '5.7': '#2dd4bf',
  '5.8': '#38bdf8',  '5.9': '#818cf8',
  '5.10': '#a78bfa', '5.11': '#c084fc', '5.12': '#f472b6',
  '5.13': '#fb7185', '5.14': '#f97316',
};

export const gradeColor = (g: string): string => {
  const { base } = parseGrade(g);
  return V_PALETTE[base] || YDS_PALETTE[base] || '#888';
};

// ─── Theme ─────────────────────────────────────────────────────────────────

export const C = {
  bg: '#16130e',
  surface: '#211e18',
  surfaceEl: '#2a2720',
  border: '#3a362e',
  text: '#ede8e0',
  textSec: '#7a7168',
  textMuted: '#4a4540',
  accent: '#e09030',
  accentDim: 'rgba(224,144,48,0.15)',
  accentGlow: 'rgba(224,144,48,0.35)',
  danger: '#f87171',
  trendBlue: '#60a5fa',
};

// ─── Media + tags ──────────────────────────────────────────────────────────

export type MediaKind = 'image' | 'video';

export type Media = {
  uri: string;
  kind: MediaKind;
  thumb?: string;
};

export const TAGS = [
  'slab', 'vertical', 'overhung', 'roof', 'dihedral',
  'crimp', 'sloper', 'pinch', 'jug', 'pocket',
  'dyno', 'compression', 'mantle', 'heel hook', 'toe hook', 'toe foot match',
  'press', 'powerful', 'techy', 'balancy',
] as const;
export type ClimbTag = typeof TAGS[number];

export const HOLD_COLORS: { name: string; value: string }[] = [
  { name: 'red', value: '#ef4444' },
  { name: 'orange', value: '#f97316' },
  { name: 'yellow', value: '#eab308' },
  { name: 'green', value: '#22c55e' },
  { name: 'blue', value: '#3b82f6' },
  { name: 'purple', value: '#a855f7' },
  { name: 'pink', value: '#ec4899' },
  { name: 'black', value: '#1f2937' },
  { name: 'white', value: '#f3f4f6' },
  { name: 'gray', value: '#6b7280' },
];

// ─── Climb model ───────────────────────────────────────────────────────────

export type Climb = {
  id: string;
  /** Composed grade like 'V5', 'V5+', '5.10c'. */
  gradeLow: string;
  /** Composed grade. Equals gradeLow for single-grade entries. */
  gradeHigh: string;
  sent: boolean;
  style?: ClimbStyle;
  tags?: ClimbTag[];
  holdColor?: string;
  count?: number;
  routeName?: string;
  location?: string;
  notes?: string;
  attempts?: number | null;
  sessions?: number | null;
  routeMedia?: Media | null;
  climbMedia?: Media | null;
  date: string;
};

// ─── Date helper ───────────────────────────────────────────────────────────

export const localDateString = (d: Date = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// ─── Display helpers ───────────────────────────────────────────────────────

export const formatGradeRange = (low: string, high: string) => {
  if (low === high) return low;
  // For V grades, abbreviate the high end: V4-6, V4+-V5 stays explicit
  const lp = parseGrade(low);
  const hp = parseGrade(high);
  if (lp.system === 'V' && hp.system === 'V' && !lp.mod && !hp.mod) {
    return `${low}-${high.replace(/^V/, '')}`;
  }
  return `${low}-${high}`;
};

export const climbGradeLabel = (c: Pick<Climb, 'gradeLow' | 'gradeHigh'>) =>
  formatGradeRange(c.gradeLow, c.gradeHigh);

export const climbGradeColor = (c: Pick<Climb, 'gradeLow' | 'gradeHigh'>) =>
  gradeColor(c.gradeHigh);

/** Canonical numeric grade for a climb — high end. */
export const climbGradeNum = (c: Pick<Climb, 'gradeLow' | 'gradeHigh'>) =>
  gradeOrder(c.gradeHigh);

/**
 * Pyramid bucket. For ranges, pick the lower-middle (so V4-6 → V5, V4-5 → V4).
 * Returns the COMPOSED grade closest to the midpoint, chosen from the
 * relevant base list.
 */
export function climbPyramidBucket(c: Pick<Climb, 'gradeLow' | 'gradeHigh'>): string {
  if (c.gradeLow === c.gradeHigh) return c.gradeLow;
  const lo = gradeOrder(c.gradeLow);
  const hi = gradeOrder(c.gradeHigh);
  const target = (lo + hi) / 2;
  // Snap target to the closest base grade in the same system.
  const sys = parseGrade(c.gradeHigh).system;
  const bases = sys === 'YDS' ? YDS_BASES : V_BASES;
  let best = bases[0] as string;
  let bestDist = Math.abs(gradeOrder(best) - target);
  for (const b of bases) {
    const d = Math.abs(gradeOrder(b) - target);
    // Prefer the lower of two equidistant options
    if (d < bestDist - 1e-9 || (Math.abs(d - bestDist) < 1e-9 && gradeOrder(b) < gradeOrder(best))) {
      best = b;
      bestDist = d;
    }
  }
  // Bias to the lower of the two when target is exactly between two bases
  if (Math.floor(target) !== Math.ceil(target)) {
    const lower = bases.find(b => Math.abs(gradeOrder(b) - Math.floor(target)) < 0.01);
    if (lower) return lower;
  }
  return best;
}

export const climbCount = (c: Pick<Climb, 'count'>) => c.count ?? 1;
