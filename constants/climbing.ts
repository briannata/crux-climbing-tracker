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

/**
 * Unified difficulty score on a single axis (≈ YDS-numeric).
 * Lets us compare a V grade to a YDS grade — used by "Best Send" overall.
 * Based on the common V↔YDS conversion (V0 ≈ 5.10a-b, V5 ≈ 5.12d-5.13a, ...).
 */
export function gradeDifficulty(g: string): number {
  const { system, base, mod } = parseGrade(g);

  if (system === 'V') {
    // Midpoint of the YDS-equivalent range for each V grade
    const V_MIDS: Record<string, number> = {
      VB:  8.0,   // 5.8
      V0:  10.125, // 5.10a-b
      V1:  10.75,  // 5.10d
      V2:  11.375, // 5.11b-c
      V3:  11.875, // 5.11d-5.12a
      V4:  12.375, // 5.12b-c
      V5:  12.875, // 5.12d-5.13a
      V6:  13.25,  // 5.13b
      V7:  13.625, // 5.13c-d
      V8:  14.0,   // 5.14a
      V9:  14.25,  // 5.14b
    };
    let mid = V_MIDS[base];
    if (mid === undefined) {
      const n = base === 'VB' ? -1 : Number(base.slice(1));
      if (!isNaN(n) && n >= 10) mid = 14.5 + (n - 10) * 0.25; // extrapolate
      else mid = 8.0;
    }
    const offset = mod === '+' ? 0.125 : mod === '-' ? -0.125 : 0;
    return mid + offset;
  }

  // YDS
  const m = base.match(/^5\.(\d+)$/);
  if (!m) return -9999;
  const n = Number(m[1]);
  if (n >= 10) {
    if (mod === 'a') return n + 0;
    if (mod === 'b') return n + 0.25;
    if (mod === 'c') return n + 0.5;
    if (mod === 'd') return n + 0.75;
    if (mod === '-') return n + 0;
    if (mod === '+') return n + 0.75;
    return n + 0.375;
  }
  // 5.5–5.9
  if (mod === '+') return n + 0.5;
  if (mod === '-') return n - 0.5;
  return n;
}

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

/**
 * Nocturne — dark indigo grounds, blurple accent. Grade colors (above) and
 * hold colors (below) are deliberately NOT part of this palette: they're data,
 * not chrome, and stay as they are.
 */
export const C = {
  bg: '#161826',
  surface: '#232532',
  surfaceEl: '#2b2e3d',
  border: '#3f424d',        // neutral-800
  text: '#e9e9ed',
  textSoft: '#cfd3e5',      // neutral-300
  textSec: '#9397ab',       // neutral-500
  textMuted: '#75798c',     // neutral-600
  accent: '#9184d9',
  accentSoft: '#a7a1db',    // accent-2
  accentBright: '#d2cefd',  // accent-300
  accentDeep: '#5d5294',    // accent-700
  accentDim: 'rgba(145,132,217,0.16)',
  accentGlow: 'rgba(145,132,217,0.38)',
  /** Saturated indigo used for deck-scale fills (wrapped covers). */
  section: '#262a60',
  /** Text/icon color that sits on top of a filled accent surface. */
  onAccent: '#161826',
  danger: '#f87171',
  trendBlue: '#7aa2f7',
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
  /** Who set the boulder/route. Optional, free text with autofill. */
  setter?: string;
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
 * Pyramid bucket — always a BASE grade (no modifier). V5+, V5, V5- all
 * collapse to V5. For ranges, pick the lower-middle base.
 */
export function climbPyramidBucket(c: Pick<Climb, 'gradeLow' | 'gradeHigh'>): string {
  const loBase = parseGrade(c.gradeLow).base;
  const hiBase = parseGrade(c.gradeHigh).base;
  if (loBase === hiBase) return loBase;
  const sys = parseGrade(c.gradeHigh).system;
  const bases: readonly string[] = sys === 'YDS' ? YDS_BASES : V_BASES;
  const loIdx = bases.indexOf(loBase);
  const hiIdx = bases.indexOf(hiBase);
  if (loIdx === -1 || hiIdx === -1) return hiBase;
  // Lower-middle: floor((lo+hi)/2). E.g. V4-V5 → V4, V4-V6 → V5.
  return bases[Math.floor((loIdx + hiIdx) / 2)] ?? hiBase;
}

/**
 * The grade a climb counts as when ranking "hardest send".
 *
 * A range counts as its middle, not its top — V4-V6 is a V5 send, not a V6.
 * Single-grade climbs keep their modifier, so 5.11c stays 5.11c rather than
 * collapsing to the 5.11 bucket.
 */
export function climbSendGrade(c: Pick<Climb, 'gradeLow' | 'gradeHigh'>): string {
  return c.gradeLow === c.gradeHigh ? c.gradeHigh : climbPyramidBucket(c);
}

export const climbCount = (c: Pick<Climb, 'count'>) => c.count ?? 1;
