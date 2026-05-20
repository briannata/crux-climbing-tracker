import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ClimbCard } from '@/components/climb-card';
import {
  C,
  climbCount,
  climbGradeColor,
  climbGradeLabel,
  gradeDifficulty,
  gradeOrder,
  localDateString,
  parseGrade,
  type Climb,
} from '@/constants/climbing';
import { useClimbs } from '@/hooks/use-climbs';

export default function FeedScreen() {
  const { climbs } = useClimbs();
  const router = useRouter();

  const sorted = [...climbs].sort((a, b) => b.date.localeCompare(a.date));
  const sent = climbs.filter(c => c.sent);
  const sentBoulder = sent.filter(c => parseGrade(c.gradeHigh).system === 'V');
  const sentRoutes = sent.filter(c => parseGrade(c.gradeHigh).system === 'YDS');

  // Within a system, use gradeOrder. Across systems, use gradeDifficulty
  // (which converts V↔YDS so we can compare).
  const bestBy = (arr: Climb[], score: (g: string) => number) =>
    arr.length
      ? arr.reduce((b, c) => (score(c.gradeHigh) > score(b.gradeHigh) ? c : b), arr[0])
      : null;
  const bestB = bestBy(sentBoulder, gradeOrder);
  const bestR = bestBy(sentRoutes, gradeOrder);
  const bestOverall = bestBy(sent, gradeDifficulty);
  const bothSystems = sentBoulder.length > 0 && sentRoutes.length > 0;

  const monthPrefix = localDateString().slice(0, 7);
  const thisMonth = climbs.filter(c => c.date.startsWith(monthPrefix));
  const sumCount = (arr: typeof climbs) => arr.reduce((acc, c) => acc + climbCount(c), 0);

  const stats: { label: string; value: string; color: string; small?: boolean }[] = [
    { label: 'Total Climbs', value: String(sumCount(climbs)), color: C.text },
    { label: 'This Month', value: String(sumCount(thisMonth)), color: C.text },
  ];
  if (bestOverall) {
    stats.push({
      label: 'Best Send',
      value: climbGradeLabel(bestOverall),
      color: climbGradeColor(bestOverall),
      small: true,
    });
  } else {
    stats.push({ label: 'Best Send', value: '–', color: C.text, small: true });
  }
  // Only break out per-system when there are climbs in both — otherwise
  // Best Send already is the per-system best.
  if (bothSystems) {
    if (bestB) {
      stats.push({
        label: 'Best Boulder',
        value: climbGradeLabel(bestB),
        color: climbGradeColor(bestB),
        small: true,
      });
    }
    if (bestR) {
      stats.push({
        label: 'Best Route',
        value: climbGradeLabel(bestR),
        color: climbGradeColor(bestR),
        small: true,
      });
    }
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Crux</Text>
          <Text style={styles.subtitle}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </Text>
        </View>
        <Pressable onPress={() => router.push('/log')} style={styles.logBtn}>
          <Text style={styles.logBtnText}>+ Log</Text>
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.statsRow}>
        {stats.map(s => (
          <View key={s.label} style={styles.statCard}>
            <Text
              style={[
                styles.statValue,
                s.small && { fontSize: 18, fontFamily: 'monospace' },
                { color: s.color },
              ]}>
              {s.value}
            </Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.sectionLabel}>Recent Climbs</Text>
        {sorted.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No climbs yet.</Text>
            <Pressable onPress={() => router.push('/log')}>
              <Text style={styles.emptyLink}>Log your first climb →</Text>
            </Pressable>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {sorted.slice(0, 20).map(c => (
              <ClimbCard
                key={c.id}
                climb={c}
                onPress={() => router.push({ pathname: '/climb/[id]', params: { id: c.id } })}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { fontSize: 26, fontWeight: '700', color: C.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 12, color: C.textSec, marginTop: 1 },
  logBtn: {
    backgroundColor: C.accent,
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  logBtnText: { color: '#16130e', fontWeight: '700', fontSize: 14 },
  statsRow: { gap: 10, paddingHorizontal: 20, paddingVertical: 8, alignItems: 'center' },
  statCard: {
    backgroundColor: C.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 96,
  },
  statValue: { fontSize: 20, fontWeight: '700' },
  statLabel: { fontSize: 10, color: C.textSec, marginTop: 2 },
  scroll: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 20 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: C.textSec,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  empty: { alignItems: 'center', marginTop: 40 },
  emptyText: { color: C.textMuted, fontSize: 14, marginBottom: 4 },
  emptyLink: { color: C.accent, fontSize: 14 },
});
