import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, G, Line, Path, Text as SvgText } from 'react-native-svg';
import { GradeTag } from '@/components/grade-tag';
import {
  C,
  V_BASES,
  YDS_BASES,
  climbCount,
  climbPyramidBucket,
  gradeColor,
  gradeOrder,
  parseGrade,
  type Climb,
  type GradeSystem,
} from '@/constants/climbing';
import { useClimbs } from '@/hooks/use-climbs';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function StatsScreen() {
  const { climbs } = useClimbs();
  const [tab, setTab] = useState<'pyramid' | 'trend'>('pyramid');

  const sent = climbs.filter(c => c.sent);
  const boulderClimbs = useMemo(
    () => sent.filter(c => parseGrade(c.gradeHigh).system === 'V'),
    [sent]
  );
  const routeClimbs = useMemo(
    () => sent.filter(c => parseGrade(c.gradeHigh).system === 'YDS'),
    [sent]
  );

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Stats</Text>
        <View style={styles.tabRow}>
          {(['pyramid', 'trend'] as const).map(key => {
            const sel = tab === key;
            return (
              <Pressable
                key={key}
                onPress={() => setTab(key)}
                style={[
                  styles.tab,
                  {
                    backgroundColor: sel ? C.accentDim : C.surfaceEl,
                    borderColor: sel ? C.accent : C.border,
                    borderWidth: sel ? 1.5 : 1,
                  },
                ]}>
                <Text style={{ color: sel ? C.accent : C.textSec, fontSize: 13, fontWeight: sel ? '700' : '400' }}>
                  {key === 'pyramid' ? 'Grade Pyramid' : 'Trend'}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sentNote}>Stats include sent climbs only.</Text>

        {sent.length === 0 && <Empty />}

        {tab === 'pyramid' ? (
          <>
            {boulderClimbs.length > 0 && (
              <Section title="Boulder">
                <Pyramid climbs={boulderClimbs} system="V" />
              </Section>
            )}
            {routeClimbs.length > 0 && (
              <Section title="Top rope / Lead">
                <Pyramid climbs={routeClimbs} system="YDS" />
              </Section>
            )}
          </>
        ) : (
          <>
            {boulderClimbs.length >= 2 && (
              <Section title="Boulder">
                <Trend climbs={boulderClimbs} system="V" />
              </Section>
            )}
            {routeClimbs.length >= 2 && (
              <Section title="Top rope / Lead">
                <Trend climbs={routeClimbs} system="YDS" />
              </Section>
            )}
            {sent.length > 0 && <MonthlyBreakdown boulder={boulderClimbs} routes={routeClimbs} />}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 28 }}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Empty() {
  return <Text style={styles.empty}>Log some climbs to see stats!</Text>;
}

// ─── Pyramid ──────────────────────────────────────────────────────────────

function Pyramid({ climbs }: { climbs: Climb[]; system: GradeSystem }) {
  const counts: Record<string, number> = {};
  climbs.forEach(c => {
    const b = climbPyramidBucket(c);
    counts[b] = (counts[b] || 0) + climbCount(c);
  });
  const buckets = Object.keys(counts).sort((a, b) => gradeOrder(b) - gradeOrder(a));
  const maxCount = Math.max(...Object.values(counts), 1);

  const expanded = climbs.flatMap(c => Array(climbCount(c)).fill(gradeOrder(climbPyramidBucket(c))));
  const totalSends = expanded.length;
  const avg = expanded.reduce((a, b) => a + b, 0) / (expanded.length || 1);
  const avgGrade = buckets
    .slice()
    .sort((a, b) => Math.abs(gradeOrder(a) - avg) - Math.abs(gradeOrder(b) - avg))[0] ?? '–';
  const hardest = buckets[0] ?? '–';

  return (
    <View>
      <Text style={styles.subtle}>
        {totalSends} send{totalSends !== 1 ? 's' : ''} across {buckets.length} grade{buckets.length !== 1 ? 's' : ''}
      </Text>
      <View style={{ gap: 8 }}>
        {buckets.map(g => {
          const n = counts[g];
          const pct = n / maxCount;
          const col = gradeColor(g);
          return (
            <View key={g} style={styles.barRow}>
              <Text style={[styles.barLabel, { color: col }]}>{g}</Text>
              <View style={styles.barTrack}>
                <View
                  style={{
                    width: `${pct * 100}%`,
                    height: '100%',
                    backgroundColor: col,
                    borderRadius: 6,
                    opacity: 0.85,
                    justifyContent: 'center',
                    alignItems: 'flex-end',
                    paddingRight: 8,
                  }}>
                  {n > 0 && pct > 0.15 && <Text style={styles.barCount}>{n}</Text>}
                </View>
                {n > 0 && pct <= 0.15 && (
                  <Text style={[styles.barCountOutside, { left: `${pct * 100}%`, color: col }]}>{n}</Text>
                )}
              </View>
            </View>
          );
        })}
      </View>

      <View style={styles.summaryRow}>
        {[
          { label: 'Avg Grade', value: avgGrade, col: gradeColor(avgGrade) },
          { label: 'Hardest', value: hardest, col: gradeColor(hardest) },
        ].map(s => (
          <View key={s.label} style={styles.summaryCard}>
            <Text style={[styles.summaryValue, { color: s.col }]}>{s.value}</Text>
            <Text style={styles.summaryLabel}>{s.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Trend ────────────────────────────────────────────────────────────────

function Trend({ climbs, system }: { climbs: Climb[]; system: GradeSystem }) {
  const byMonth: Record<string, Climb[]> = {};
  climbs.forEach(c => {
    const mo = c.date.slice(0, 7);
    if (!byMonth[mo]) byMonth[mo] = [];
    byMonth[mo].push(c);
  });
  const months = Object.keys(byMonth).sort();

  const data = months.map(mo => {
    const mc = byMonth[mo];
    const highs = mc.map(c => gradeOrder(c.gradeHigh)).filter(n => n > -9000);
    const buckets = mc.flatMap(c => Array(climbCount(c)).fill(gradeOrder(climbPyramidBucket(c))));
    const maxN = Math.max(...highs);
    const avgN = buckets.reduce((a, b) => a + b, 0) / (buckets.length || 1);
    const maxClimb = mc.reduce((best, c) =>
      gradeOrder(c.gradeHigh) > gradeOrder(best.gradeHigh) ? c : best, mc[0]);
    return {
      mo,
      max: maxN,
      avg: avgN,
      count: buckets.length,
      maxGrade: maxClimb.gradeHigh,
    };
  });

  const W = 310;
  const H = 180;
  const PAD = { t: 16, b: 36, l: 48, r: 16 };
  const iW = W - PAD.l - PAD.r;
  const iH = H - PAD.t - PAD.b;
  const allNums = data.flatMap(d => [d.max, d.avg]);
  const minN = Math.min(...allNums) - 0.5;
  const maxN = Math.max(...allNums) + 0.5;
  const range = maxN - minN || 1;

  const xOf = (i: number) => PAD.l + (i / (data.length - 1 || 1)) * iW;
  const yOf = (n: number) => PAD.t + iH - ((n - minN) / range) * iH;

  const pathOf = (key: 'max' | 'avg') =>
    data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xOf(i)} ${yOf(d[key])}`).join(' ');

  const moLabel = (mo: string) => MONTHS[parseInt(mo.split('-')[1], 10) - 1];

  // Y-axis: pick base grades from this system whose gradeOrder falls in view.
  const bases = system === 'YDS' ? YDS_BASES : V_BASES;
  const yLabels = bases
    .map(b => ({ base: b, n: gradeOrder(b) }))
    .filter(({ n }) => n >= minN && n <= maxN);

  return (
    <View>
      <Text style={styles.subtle}>
        {data.length} month{data.length !== 1 ? 's' : ''} of data
      </Text>
      <View style={{ flexDirection: 'row', gap: 16, marginBottom: 10 }}>
        {[
          { col: C.accent, label: 'Highest send' },
          { col: C.trendBlue, label: 'Average' },
        ].map(l => (
          <View key={l.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 20, height: 2.5, backgroundColor: l.col, borderRadius: 2 }} />
            <Text style={{ fontSize: 12, color: C.textSec }}>{l.label}</Text>
          </View>
        ))}
      </View>

      <Svg width={W} height={H}>
        {yLabels.map(({ base, n }) => (
          <G key={base}>
            <Line x1={PAD.l} y1={yOf(n)} x2={W - PAD.r} y2={yOf(n)} stroke={C.border} strokeWidth={1} />
            <SvgText
              x={PAD.l - 6}
              y={yOf(n) + 3}
              fill={C.textMuted}
              fontSize={9}
              textAnchor="end"
              fontFamily="monospace">
              {base}
            </SvgText>
          </G>
        ))}
        {data.length > 1 && (
          <Path d={pathOf('avg')} fill="none" stroke={C.trendBlue} strokeWidth={1.5} strokeDasharray="4 3" opacity={0.7} />
        )}
        {data.length > 1 && (
          <Path d={pathOf('max')} fill="none" stroke={C.accent} strokeWidth={2} />
        )}
        {data.map((d, i) => (
          <G key={d.mo}>
            <Circle cx={xOf(i)} cy={yOf(d.avg)} r={3} fill={C.trendBlue} />
            <Circle cx={xOf(i)} cy={yOf(d.max)} r={4} fill={C.accent} />
            <SvgText
              x={xOf(i)}
              y={H - PAD.b + 14}
              fill={C.textMuted}
              fontSize={9}
              textAnchor="middle">
              {moLabel(d.mo)}
            </SvgText>
          </G>
        ))}
      </Svg>
    </View>
  );
}

// ─── Monthly breakdown (combined) ─────────────────────────────────────────

function MonthlyBreakdown({ boulder, routes }: { boulder: Climb[]; routes: Climb[] }) {
  // Group all months that have at least one climb in either system.
  const monthsSet = new Set<string>();
  [...boulder, ...routes].forEach(c => monthsSet.add(c.date.slice(0, 7)));
  const months = [...monthsSet].sort().reverse();

  const highest = (arr: Climb[], mo: string) => {
    const inMonth = arr.filter(c => c.date.startsWith(mo));
    if (inMonth.length === 0) return null;
    return inMonth.reduce((best, c) => (gradeOrder(c.gradeHigh) > gradeOrder(best.gradeHigh) ? c : best), inMonth[0]);
  };

  const countIn = (arr: Climb[], mo: string) =>
    arr.filter(c => c.date.startsWith(mo)).reduce((a, c) => a + climbCount(c), 0);

  const moLabel = (mo: string) => MONTHS[parseInt(mo.split('-')[1], 10) - 1];

  return (
    <View>
      <Text style={styles.sectionLabel}>Monthly Breakdown</Text>
      <View style={{ gap: 8 }}>
        {months.map(mo => {
          const topB = highest(boulder, mo);
          const topR = highest(routes, mo);
          const totalCount = countIn(boulder, mo) + countIn(routes, mo);
          return (
            <View key={mo} style={styles.moRow}>
              <View>
                <Text style={{ fontSize: 13, color: C.text, fontWeight: '600' }}>
                  {moLabel(mo)} {mo.slice(0, 4)}
                </Text>
                <Text style={{ fontSize: 11, color: C.textSec, marginTop: 2 }}>
                  {totalCount} send{totalCount !== 1 ? 's' : ''}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                {topB && (
                  <View style={{ alignItems: 'center' }}>
                    <Text style={styles.moSysLabel}>BOULDER</Text>
                    <GradeTag grade={topB.gradeHigh} size="sm" />
                  </View>
                )}
                {topR && (
                  <View style={{ alignItems: 'center' }}>
                    <Text style={styles.moSysLabel}>ROUTE</Text>
                    <GradeTag grade={topR.gradeHigh} size="sm" />
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  title: { fontSize: 26, fontWeight: '700', color: C.text, letterSpacing: -0.5, marginBottom: 12 },
  tabRow: { flexDirection: 'row', gap: 8 },
  tab: { borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6 },
  content: { paddingHorizontal: 20, paddingBottom: 30, paddingTop: 8 },
  subtle: { fontSize: 13, color: C.textSec, marginBottom: 16 },
  empty: { textAlign: 'center', color: C.textMuted, fontSize: 14, marginTop: 60 },
  sentNote: { fontSize: 11, color: C.textMuted, marginBottom: 12, fontStyle: 'italic' },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: C.text,
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  barLabel: { width: 48, textAlign: 'right', fontFamily: 'monospace', fontSize: 12, fontWeight: '600' },
  barTrack: { flex: 1, height: 28, backgroundColor: C.surfaceEl, borderRadius: 6, overflow: 'hidden', position: 'relative' },
  barCount: { fontSize: 11, fontWeight: '700', color: '#fff' },
  barCountOutside: { position: 'absolute', top: 6, marginLeft: 6, fontSize: 11, fontWeight: '700' },
  summaryRow: { flexDirection: 'row', gap: 10, marginTop: 24 },
  summaryCard: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
  },
  summaryValue: { fontSize: 22, fontWeight: '700', fontFamily: 'monospace' },
  summaryLabel: { fontSize: 11, color: C.textSec, marginTop: 4 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: C.textSec,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  moRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  moSysLabel: {
    fontSize: 8,
    color: C.textMuted,
    letterSpacing: 1,
    marginBottom: 3,
    fontWeight: '700',
  },
});
