import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ClimbCard } from '@/components/climb-card';
import { C, climbGradeColor, climbGradeLabel, climbGradeNum } from '@/constants/climbing';
import { useClimbs } from '@/hooks/use-climbs';

export default function FeedScreen() {
  const { climbs } = useClimbs();
  const router = useRouter();

  const sorted = [...climbs].sort((a, b) => b.date.localeCompare(a.date));
  const sentClimbs = climbs.filter(c => c.sent);
  const maxClimb = sentClimbs.length
    ? sentClimbs.reduce((best, c) => (climbGradeNum(c) > climbGradeNum(best) ? c : best), sentClimbs[0])
    : null;
  const monthPrefix = new Date().toISOString().slice(0, 7);
  const thisMonth = climbs.filter(c => c.date.startsWith(monthPrefix));

  const stats = [
    { label: 'Total Climbs', value: String(climbs.length), color: C.text, small: false },
    { label: 'This Month', value: String(thisMonth.length), color: C.text, small: false },
    { label: 'Best Send', value: maxClimb ? climbGradeLabel(maxClimb) : '–', color: maxClimb ? climbGradeColor(maxClimb) : C.text, small: true },
  ];

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

      <View style={styles.statsRow}>
        {stats.map(s => (
          <View key={s.label} style={styles.statCard}>
            <Text style={[styles.statValue, s.small && { fontSize: 18 }, { color: s.color }]}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

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
  statsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingVertical: 8 },
  statCard: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
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
