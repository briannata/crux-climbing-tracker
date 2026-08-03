/**
 * Monthly Wrapped — turns the raw climb log into one summary per month.
 *
 * Everything here is derived; nothing is stored. The copy lines are generated
 * from the numbers so a quiet month reads differently from a big one.
 */

import {
  climbCount,
  climbPyramidBucket,
  climbSendGrade,
  gradeOrder,
  parseGrade,
  type Climb,
  type ClimbStyle,
} from './climbing';

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const MONTH_SHORT = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

export type GymStat = { name: string; visits: number };
export type SetterStat = { name: string; sends: number };
export type GradeBar = { grade: string; n: number };
export type DisciplineStat = { key: string; style: ClimbStyle; sends: number; hardest: string | null };

export type MonthWrapped = {
  /** 'YYYY-MM' */
  key: string;
  /** 'July 2026' */
  label: string;
  /** 'JUL' */
  short: string;

  sends: number;
  tries: number;
  misses: number;
  /** Whole-number percentage, 0–100. */
  rate: number;
  sessions: number;
  visits: number;
  perWeek: string;

  boulderSends: number;
  topRopeSends: number;
  leadSends: number;
  disciplines: DisciplineStat[];

  hardBoulder: string | null;
  hardTopRope: string | null;
  hardLead: string | null;
  hardRoute: string | null;

  gyms: GymStat[];
  gymCount: number;
  topGym: GymStat | null;
  leastGym: GymStat | null;

  setters: SetterStat[];
  setMost: SetterStat | null;
  setLeast: SetterStat | null;
  taggedSends: number;

  grades: GradeBar[];
  gradeSystemLabel: string;

  openerLine: string;
  sessionLine: string;
  splitLine: string;
  progressLine: string;
  setterHeadline: string;
  setterNote: string;
};

export const monthKey = (date: string) => date.slice(0, 7);

export function monthLabel(key: string): string {
  const [y, m] = key.split('-');
  return `${MONTH_NAMES[Number(m) - 1] ?? key} ${y}`;
}

export function monthShort(key: string): string {
  return MONTH_SHORT[Number(key.split('-')[1]) - 1] ?? key;
}

/**
 * Hardest climb in a list, compared inside one grade system. A ranged climb
 * counts as its middle rather than its top — see `climbSendGrade`.
 */
function hardestGrade(climbs: Climb[]): string | null {
  if (!climbs.length) return null;
  return climbs
    .map(climbSendGrade)
    .reduce((best, g) => (gradeOrder(g) > gradeOrder(best) ? g : best));
}

const sumCount = (climbs: Climb[]) => climbs.reduce((a, c) => a + climbCount(c), 0);

/**
 * How many goes a climb represents. An explicit `attempts` wins; otherwise
 * every logged climb counts as one go, so a bulk-logged "6 V0s" is 6 goes.
 */
const triesFor = (c: Climb) => Math.max(c.attempts ?? 0, climbCount(c));

function buildGyms(climbs: Climb[]): GymStat[] {
  // A "visit" is one day at one gym, not one climb.
  const byGym = new Map<string, Set<string>>();
  climbs.forEach(c => {
    if (!c.location) return;
    if (!byGym.has(c.location)) byGym.set(c.location, new Set());
    byGym.get(c.location)!.add(c.date);
  });
  return [...byGym.entries()]
    .map(([name, days]) => ({ name, visits: days.size }))
    .sort((a, b) => b.visits - a.visits || a.name.localeCompare(b.name));
}

function buildSetters(sent: Climb[]): SetterStat[] {
  const bySetter = new Map<string, number>();
  sent.forEach(c => {
    const name = c.setter?.trim();
    if (!name) return;
    bySetter.set(name, (bySetter.get(name) ?? 0) + climbCount(c));
  });
  return [...bySetter.entries()]
    .map(([name, sends]) => ({ name, sends }))
    .sort((a, b) => b.sends - a.sends || a.name.localeCompare(b.name));
}

/** Pyramid buckets for the grade chart — boulders if there are any, else routes. */
function buildGrades(sent: Climb[]): { grades: GradeBar[]; systemLabel: string } {
  const boulders = sent.filter(c => parseGrade(c.gradeHigh).system === 'V');
  const useBoulders = boulders.length > 0;
  const pool = useBoulders ? boulders : sent;
  const counts = new Map<string, number>();
  pool.forEach(c => {
    const b = climbPyramidBucket(c);
    counts.set(b, (counts.get(b) ?? 0) + climbCount(c));
  });
  const grades = [...counts.entries()]
    .map(([grade, n]) => ({ grade, n }))
    .sort((a, b) => gradeOrder(a.grade) - gradeOrder(b.grade))
    .slice(-6); // the chart fits about six bars
  return { grades, systemLabel: useBoulders ? 'Boulder' : 'Route' };
}

// ─── Copy ──────────────────────────────────────────────────────────────────

function openerLine(sessions: number, tries: number, sends: number): string {
  if (sessions === 0) return 'Nothing logged this month. The wall is still there.';
  if (sessions <= 3) {
    return `A quiet one — ${sessions} session${sessions === 1 ? '' : 's'} and ${sends} send${sends === 1 ? '' : 's'}. That still counts.`;
  }
  if (sessions >= 12) {
    return `${sessions} sessions and ${tries} goes. You did not come to hang out.`;
  }
  return `${sessions} sessions, ${tries} goes, ${sends} of them stuck.`;
}

function sessionLine(perWeek: number): string {
  if (perWeek >= 3.5) return 'That is most nights of the week on the wall.';
  if (perWeek >= 2.5) return `About ${perWeek.toFixed(1)} nights a week, steady as a metronome.`;
  if (perWeek >= 1.5) return 'Roughly twice a week, mostly after work.';
  if (perWeek > 0) return 'Life happened. The wall waited.';
  return 'No sessions logged.';
}

function splitLine(b: number, tr: number, lead: number): string {
  const rope = tr + lead;
  if (b > 0 && rope === 0) return 'All boulders this month — the ropes stayed coiled.';
  if (rope > 0 && b === 0) return 'All rope this month. The pads got a break.';
  if (b > rope * 2) return 'Boulders carried the month; rope was a cameo.';
  if (rope > b * 2) return 'Rope volume was the story here.';
  return 'A real mixed diet — boulders and rope traded off.';
}

function progressLine(
  hardBoulder: string | null,
  hardRoute: string | null,
  prevBest: { boulder: string | null; route: string | null }
): string {
  const beatB = hardBoulder && (!prevBest.boulder || gradeOrder(hardBoulder) > gradeOrder(prevBest.boulder));
  const beatR = hardRoute && (!prevBest.route || gradeOrder(hardRoute) > gradeOrder(prevBest.route));
  if (beatB && beatR) return `${hardBoulder} and ${hardRoute} — both ceilings moved this month.`;
  if (beatB) return `${hardBoulder} is a new high point. The ceiling gave.`;
  if (beatR) return `${hardRoute} on rope is a new high point.`;
  const top = hardBoulder ?? hardRoute;
  if (!top) return 'No sends logged this month.';
  return `${top} was the high point — a base month, not a peak month.`;
}

function setterCopy(setters: SetterStat[], taggedSends: number) {
  if (setters.length === 0) return { headline: '', note: '' };
  if (setters.length === 1) {
    return {
      headline: 'One setter owned your month',
      note: `Only ${setters[0].name} got tagged this month, so there is no least-sent to name.`,
    };
  }
  return {
    headline: 'You have a favourite, and a nemesis',
    note: `${setters.length} setters tagged across ${taggedSends} of your sends.`,
  };
}

// ─── Builder ───────────────────────────────────────────────────────────────

function buildMonth(
  key: string,
  monthClimbs: Climb[],
  prevBest: { boulder: string | null; route: string | null }
): MonthWrapped {
  const sent = monthClimbs.filter(c => c.sent);

  const sends = sumCount(sent);
  const tries = monthClimbs.reduce((a, c) => a + triesFor(c), 0);
  const misses = Math.max(0, tries - sends);
  const rate = tries > 0 ? Math.round((sends / tries) * 100) : 0;

  const sessions = new Set(monthClimbs.map(c => c.date)).size;
  const gyms = buildGyms(monthClimbs);
  const visits = gyms.reduce((a, g) => a + g.visits, 0) || sessions;
  const perWeekNum = sessions / 4.3;

  const byStyle = (s: ClimbStyle) => sent.filter(c => c.style === s);
  const boulderStyle = byStyle('boulder');
  const topRopeStyle = byStyle('top rope');
  const leadStyle = byStyle('lead');

  // Fall back to the grade system when a climb has no style recorded.
  const boulderAll = sent.filter(c => parseGrade(c.gradeHigh).system === 'V');
  const routeAll = sent.filter(c => parseGrade(c.gradeHigh).system === 'YDS');

  const hardBoulder = hardestGrade(boulderAll);
  const hardTopRope = hardestGrade(topRopeStyle);
  const hardLead = hardestGrade(leadStyle);
  const hardRoute = hardestGrade(routeAll);

  const allDisciplines: DisciplineStat[] = [
    { key: 'Boulder', style: 'boulder', sends: sumCount(boulderStyle), hardest: hardestGrade(boulderStyle) },
    { key: 'Top rope', style: 'top rope', sends: sumCount(topRopeStyle), hardest: hardTopRope },
    { key: 'Lead', style: 'lead', sends: sumCount(leadStyle), hardest: hardLead },
  ];
  const disciplines = allDisciplines.filter(d => d.sends > 0);

  const setters = buildSetters(sent);
  const taggedSends = setters.reduce((a, s) => a + s.sends, 0);
  const { headline, note } = setterCopy(setters, taggedSends);
  const { grades, systemLabel } = buildGrades(sent);

  return {
    key,
    label: monthLabel(key),
    short: monthShort(key),

    sends,
    tries,
    misses,
    rate,
    sessions,
    visits,
    perWeek: perWeekNum.toFixed(1),

    boulderSends: sumCount(boulderStyle),
    topRopeSends: sumCount(topRopeStyle),
    leadSends: sumCount(leadStyle),
    disciplines,

    hardBoulder,
    hardTopRope,
    hardLead,
    hardRoute,

    gyms,
    gymCount: gyms.length,
    topGym: gyms[0] ?? null,
    leastGym: gyms.length > 1 ? gyms[gyms.length - 1] : null,

    setters,
    setMost: setters[0] ?? null,
    setLeast: setters.length > 1 ? setters[setters.length - 1] : null,
    taggedSends,

    grades,
    gradeSystemLabel: systemLabel,

    openerLine: openerLine(sessions, tries, sends),
    sessionLine: sessionLine(perWeekNum),
    splitLine: splitLine(sumCount(boulderStyle), sumCount(topRopeStyle), sumCount(leadStyle)),
    progressLine: progressLine(hardBoulder, hardRoute, prevBest),
    setterHeadline: headline,
    setterNote: note,
  };
}

/**
 * One entry per month that has climbs, newest first.
 * Built oldest-first internally so each month can compare itself to the best
 * that came before it.
 */
export function monthlyWrapped(climbs: Climb[]): MonthWrapped[] {
  const byMonth = new Map<string, Climb[]>();
  climbs.forEach(c => {
    const k = monthKey(c.date);
    if (!byMonth.has(k)) byMonth.set(k, []);
    byMonth.get(k)!.push(c);
  });

  const keysAsc = [...byMonth.keys()].sort();
  const best = { boulder: null as string | null, route: null as string | null };
  const out: MonthWrapped[] = [];

  for (const k of keysAsc) {
    const mc = byMonth.get(k)!;
    out.push(buildMonth(k, mc, { ...best }));
    // Roll the running best forward for the next month's comparison.
    const sent = mc.filter(c => c.sent);
    const b = hardestGrade(sent.filter(c => parseGrade(c.gradeHigh).system === 'V'));
    const r = hardestGrade(sent.filter(c => parseGrade(c.gradeHigh).system === 'YDS'));
    if (b && (!best.boulder || gradeOrder(b) > gradeOrder(best.boulder))) best.boulder = b;
    if (r && (!best.route || gradeOrder(r) > gradeOrder(best.route))) best.route = r;
  }

  return out.reverse();
}

export function wrappedForMonth(climbs: Climb[], key: string): MonthWrapped | null {
  return monthlyWrapped(climbs).find(m => m.key === key) ?? null;
}

/** Which story cards this month has enough data to show. */
export type WrappedCard =
  | 'opener' | 'sessions' | 'sends' | 'split' | 'gyms' | 'setters' | 'hardest' | 'summary';

export function cardsFor(m: MonthWrapped): WrappedCard[] {
  const cards: WrappedCard[] = ['opener', 'sessions', 'sends'];
  if (m.disciplines.length > 0) cards.push('split');
  if (m.gyms.length > 0) cards.push('gyms');
  if (m.setters.length > 0) cards.push('setters');
  if (m.grades.length > 0 || m.hardBoulder || m.hardRoute) cards.push('hardest');
  cards.push('summary');
  return cards;
}

/** Plain-text recap for the share sheet. */
export function shareText(m: MonthWrapped): string {
  const lines = [
    `${m.label} — Crux Wrapped`,
    ``,
    `${m.sends} sends across ${m.sessions} session${m.sessions === 1 ? '' : 's'} (${m.rate}% send rate)`,
  ];
  if (m.hardBoulder) lines.push(`Hardest boulder: ${m.hardBoulder}`);
  if (m.hardRoute) lines.push(`Hardest route: ${m.hardRoute}`);
  if (m.topGym) lines.push(`Home wall: ${m.topGym.name} (${m.topGym.visits} visits)`);
  if (m.setMost) lines.push(`Most sent setter: ${m.setMost.name} (${m.setMost.sends})`);
  return lines.join('\n');
}
