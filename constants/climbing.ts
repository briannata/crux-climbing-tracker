export const GRADES = [
  'VB','V0','V1','V2','V3','V4','V5','V6','V7','V8','V9','V10','V11','V12','V13','V14','V15',
] as const;

export type Grade = typeof GRADES[number];

export const GRADE_NUM = (g: string) => GRADES.indexOf(g as Grade);

const PALETTE: Record<string, string> = {
  VB: '#94a3b8', V0: '#4ade80', V1: '#34d399', V2: '#2dd4bf', V3: '#38bdf8',
  V4: '#818cf8', V5: '#a78bfa', V6: '#c084fc', V7: '#f472b6', V8: '#fb7185',
  V9: '#f97316', V10: '#eab308', V11: '#facc15', V12: '#ff6b6b', V13: '#ff4757',
  V14: '#eccc68', V15: '#ff6348',
};

export const gradeColor = (g: string) => PALETTE[g] || '#888';

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

export type MediaKind = 'image' | 'video';

export type Media = {
  uri: string;
  kind: MediaKind;
  thumb?: string;
};

export const STYLES = ['boulder', 'top rope', 'lead'] as const;
export type ClimbStyle = typeof STYLES[number];

export const TAGS = [
  'slab', 'vertical', 'overhung', 'roof',
  'crimp', 'sloper', 'pinch', 'jug', 'pocket',
  'dyno', 'compression', 'mantle', 'heel hook', 'toe hook',
  'press', 'powerful', 'techy', 'balancy',
] as const;
export type ClimbTag = typeof TAGS[number];

// Common hold colors found in climbing gyms
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

export type Climb = {
  id: string;
  gradeLow: Grade;
  gradeHigh: Grade;
  sent: boolean;
  style?: ClimbStyle;
  tags?: ClimbTag[];
  holdColor?: string;
  count?: number; // bulk-log: how many climbs this entry represents
  routeName?: string;
  location?: string;
  notes?: string;
  attempts?: number | null;
  sessions?: number | null;
  routeMedia?: Media | null;
  climbMedia?: Media | null;
  date: string;
};

export const formatGradeRange = (low: string, high: string) => {
  if (low === high) return low;
  return `${low}-${high.replace(/^V/, '')}`;
};

export const climbGradeLabel = (c: Pick<Climb, 'gradeLow' | 'gradeHigh'>) =>
  formatGradeRange(c.gradeLow, c.gradeHigh);

export const climbGradeColor = (c: Pick<Climb, 'gradeLow' | 'gradeHigh'>) =>
  gradeColor(c.gradeHigh);

// "Best send" semantic: highest grade achieved → use high end
export const climbGradeNum = (c: Pick<Climb, 'gradeLow' | 'gradeHigh'>) =>
  GRADE_NUM(c.gradeHigh);

// Pyramid bucket: place range climbs in lower-middle bucket.
// V4 → V4, V4-5 → V4, V4-6 → V5, V4-7 → V5, V4-8 → V6
export const climbPyramidBucket = (c: Pick<Climb, 'gradeLow' | 'gradeHigh'>) => {
  const lo = GRADE_NUM(c.gradeLow);
  const hi = GRADE_NUM(c.gradeHigh);
  const mid = Math.floor((lo + hi) / 2);
  return GRADES[mid];
};

export const climbCount = (c: Pick<Climb, 'count'>) => c.count ?? 1;
