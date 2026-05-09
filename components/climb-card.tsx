import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { C, climbGradeColor, type Climb, type Media } from '@/constants/climbing';
import { GradeTag } from './grade-tag';

const thumbUri = (m: Media | null | undefined) =>
  m ? (m.kind === 'video' ? m.thumb : m.uri) : undefined;

export function ClimbCard({ climb, onPress }: { climb: Climb; onPress: () => void }) {
  const col = climbGradeColor(climb);
  const dateStr = new Date(climb.date + 'T12:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
  const media = climb.routeMedia || climb.climbMedia;
  const thumb = thumbUri(media);

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && { opacity: 0.7 }, !climb.sent && styles.unsent]}>
      <View style={[styles.colorBar, { backgroundColor: col }]} />
      <View style={styles.body}>
        <View style={styles.row}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 }}>
            <GradeTag climb={climb} />
            {(climb.count ?? 1) > 1 && (
              <Text style={styles.countTag}>×{climb.count}</Text>
            )}
            {!!climb.holdColor && (
              <View style={[styles.holdDot, { backgroundColor: climb.holdColor }]} />
            )}
            {!climb.sent && <Text style={styles.attemptTag}>ATTEMPT</Text>}
            {!!climb.style && <Text style={styles.styleTag}>{climb.style}</Text>}
          </View>
          <Text style={styles.date}>{dateStr}</Text>
        </View>
        {!!climb.routeName && (
          <Text style={styles.routeName} numberOfLines={1}>{climb.routeName}</Text>
        )}
        {!!climb.location && (
          <Text style={styles.location} numberOfLines={1}>📍 {climb.location}</Text>
        )}
        <View style={styles.metaRow}>
          {climb.attempts != null && (
            <Text style={styles.meta}>{climb.attempts} attempt{climb.attempts !== 1 ? 's' : ''}</Text>
          )}
          {climb.sessions != null && (
            <Text style={styles.meta}>{climb.sessions} session{climb.sessions !== 1 ? 's' : ''}</Text>
          )}
          {!!climb.notes && (
            <Text style={[styles.meta, styles.notes]} numberOfLines={1}>
              "{climb.notes.slice(0, 40)}{climb.notes.length > 40 ? '…' : ''}"
            </Text>
          )}
        </View>
      </View>
      {!!media && (
        <View style={styles.thumbWrap}>
          {thumb ? (
            <Image source={{ uri: thumb }} style={styles.thumb} />
          ) : (
            <View style={[styles.thumb, { backgroundColor: '#000' }]} />
          )}
          {media.kind === 'video' && (
            <View style={styles.playBadge}>
              <Text style={styles.playIcon}>▶</Text>
            </View>
          )}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.surface,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.border,
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  unsent: { opacity: 0.65 },
  attemptTag: {
    fontSize: 9,
    fontWeight: '700',
    color: C.textSec,
    letterSpacing: 1,
    backgroundColor: C.surfaceEl,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  styleTag: {
    fontSize: 10,
    color: C.textSec,
    backgroundColor: C.surfaceEl,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    textTransform: 'lowercase',
  },
  countTag: {
    fontSize: 11,
    fontWeight: '700',
    color: C.accent,
    fontFamily: 'monospace',
  },
  holdDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: C.border,
  },
  colorBar: { width: 4 },
  body: { flex: 1, paddingHorizontal: 14, paddingVertical: 12, minWidth: 0 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, gap: 8 },
  date: { fontSize: 11, color: C.textSec },
  routeName: { fontSize: 14, fontWeight: '600', color: C.text, marginBottom: 2 },
  location: { fontSize: 11, color: C.textSec, marginBottom: 2 },
  metaRow: { flexDirection: 'row', gap: 10, marginTop: 4, flexWrap: 'wrap' },
  meta: { fontSize: 11, color: C.textMuted },
  notes: { flex: 1 },
  thumbWrap: { width: 64, alignSelf: 'stretch' },
  thumb: { ...StyleSheet.absoluteFillObject, width: undefined, height: undefined },
  playBadge: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -12,
    marginTop: -12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: { color: '#fff', fontSize: 10, marginLeft: 1 },
});
