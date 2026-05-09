import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MediaView } from '@/components/media-view';
import { C, climbGradeColor, climbGradeLabel } from '@/constants/climbing';
import { useClimbs } from '@/hooks/use-climbs';

export default function ClimbDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { climbs, remove } = useClimbs();
  const router = useRouter();
  const climb = climbs.find(c => c.id === id);

  if (!climb) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.back}>‹ Back</Text>
          </Pressable>
        </View>
        <Text style={styles.notFound}>Climb not found.</Text>
      </SafeAreaView>
    );
  }

  const col = climbGradeColor(climb);
  const gradeLabel = climbGradeLabel(climb);
  const dateStr = new Date(climb.date + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const handleDelete = () => {
    Alert.alert('Delete climb?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await remove(climb.id);
          router.back();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        <Pressable onPress={() => router.push({ pathname: '/log', params: { id: climb.id } })}>
          <Text style={styles.edit}>Edit</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <View style={{ alignItems: 'center', marginBottom: 24 }}>
          <Text style={[styles.gradeHero, { color: col, textShadowColor: col + '66' }]}>
            {gradeLabel}
          </Text>
          {(climb.count ?? 1) > 1 && (
            <Text style={styles.countBig}>×{climb.count}</Text>
          )}
          <View style={styles.heroBadgeRow}>
            <Text style={[styles.statusBadge, climb.sent ? styles.statusSent : styles.statusAttempt]}>
              {climb.sent ? '✓ SENT' : '· ATTEMPT'}
            </Text>
            {!!climb.style && (
              <Text style={[styles.statusBadge, styles.styleBadge]}>{climb.style.toUpperCase()}</Text>
            )}
            {!!climb.holdColor && (
              <View style={[styles.holdBadge, { backgroundColor: climb.holdColor }]} />
            )}
          </View>
          {!!climb.routeName && <Text style={styles.routeName}>{climb.routeName}</Text>}
          {!!climb.location && <Text style={styles.loc}>📍 {climb.location}</Text>}
          <Text style={styles.dateStr}>{dateStr}</Text>
        </View>

        {!!climb.tags?.length && (
          <View style={styles.tagsWrap}>
            {climb.tags.map(t => (
              <Text key={t} style={styles.tagPill}>{t}</Text>
            ))}
          </View>
        )}

        <View style={styles.statsRow}>
          {[
            { label: 'Attempts', value: climb.attempts != null ? String(climb.attempts) : '—' },
            { label: 'Sessions', value: climb.sessions != null ? String(climb.sessions) : '—' },
          ].map(s => (
            <View key={s.label} style={styles.statCard}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {!!climb.notes && (
          <View style={styles.notesCard}>
            <Text style={styles.notesLabel}>Notes</Text>
            <Text style={styles.notesText}>{climb.notes}</Text>
          </View>
        )}

        {(climb.routeMedia || climb.climbMedia) && (
          <View style={styles.photoRow}>
            {climb.routeMedia && <MediaView media={climb.routeMedia} style={styles.photo} />}
            {climb.climbMedia && <MediaView media={climb.climbMedia} style={styles.photo} />}
          </View>
        )}

        <Pressable onPress={handleDelete} style={styles.deleteBtn}>
          <Text style={styles.deleteText}>Delete Climb</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  back: { color: C.textSec, fontSize: 14 },
  edit: { color: C.accent, fontSize: 14, fontWeight: '700' },
  notFound: { textAlign: 'center', color: C.textMuted, marginTop: 40 },
  gradeHero: {
    fontSize: 60,
    fontWeight: '800',
    fontFamily: 'monospace',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 40,
  },
  statusBadge: {
    marginTop: 10,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    overflow: 'hidden',
  },
  statusSent: { color: '#16130e', backgroundColor: C.accent },
  statusAttempt: { color: C.textSec, backgroundColor: C.surfaceEl, borderWidth: 1, borderColor: C.border },
  routeName: { fontSize: 20, fontWeight: '700', color: C.text, marginTop: 8 },
  loc: { fontSize: 13, color: C.textSec, marginTop: 4 },
  dateStr: { fontSize: 12, color: C.textMuted, marginTop: 6 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
  },
  statValue: { fontSize: 24, fontWeight: '700', color: C.text },
  statLabel: { fontSize: 11, color: C.textSec, marginTop: 2 },
  notesCard: {
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 16,
  },
  notesLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: C.textSec,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  notesText: { fontSize: 14, color: C.text, lineHeight: 22 },
  photoRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  photo: { flex: 1, height: 200, borderRadius: 12, backgroundColor: C.surfaceEl },
  deleteBtn: {
    borderWidth: 1,
    borderColor: C.danger + '88',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  deleteText: { color: C.danger, fontSize: 14 },
  heroBadgeRow: { flexDirection: 'row', gap: 6, marginTop: 10, alignItems: 'center' },
  styleBadge: { color: C.text, backgroundColor: C.surfaceEl, borderWidth: 1, borderColor: C.border },
  holdBadge: { width: 22, height: 22, borderRadius: 11, borderWidth: 1, borderColor: C.border },
  countBig: { fontSize: 18, fontWeight: '700', color: C.accent, fontFamily: 'monospace', marginTop: 4 },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 },
  tagPill: {
    fontSize: 12,
    color: C.textSec,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
});
