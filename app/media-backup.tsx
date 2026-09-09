import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C, type Climb, type Media } from '@/constants/climbing';
import { useClimbs } from '@/hooks/use-climbs';
import { isLocalUri, localFileExists, uploadMedia } from '@/lib/media-storage';

type Slot = 'routeMedia' | 'climbMedia';
const SLOTS: Slot[] = ['routeMedia', 'climbMedia'];

type Item = { climb: Climb; slot: Slot; media: Media; readable: boolean };

/**
 * One-time rescue for media logged before uploads existed. Anything still on
 * this device is copied to Storage; anything iOS already purged is reported,
 * so what was lost is visible rather than silently skipped.
 */
export default function MediaBackupScreen() {
  const { climbs, loaded, upsert } = useClimbs();
  const router = useRouter();

  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(0);
  const [result, setResult] = useState<{ saved: number; failed: number } | null>(null);
  const [clearing, setClearing] = useState(false);

  // The existence check is a synchronous filesystem read, so this is derived
  // straight from the climb list rather than run as an effect.
  const items = useMemo<Item[]>(() => {
    const found: Item[] = [];
    for (const climb of climbs) {
      for (const slot of SLOTS) {
        const media = climb[slot];
        if (!media || !isLocalUri(media.uri)) continue;
        found.push({ climb, slot, media, readable: localFileExists(media.uri) });
      }
    }
    return found;
  }, [climbs]);

  const readable = useMemo(() => items.filter(i => i.readable), [items]);
  const missing = items.length - readable.length;

  const run = async () => {
    if (running || readable.length === 0) return;
    setRunning(true);
    setDone(0);
    let saved = 0;
    let failed = 0;

    // Group by climb so a climb carrying two media is written once.
    const byClimb = new Map<string, Item[]>();
    for (const item of readable) {
      const list = byClimb.get(item.climb.id) ?? [];
      list.push(item);
      byClimb.set(item.climb.id, list);
    }

    for (const [climbId, group] of byClimb) {
      let next = group[0].climb;
      let changed = false;
      for (const item of group) {
        try {
          const remote = await uploadMedia(item.media, `climbs/${climbId}/${item.slot}`);
          if (remote) {
            next = { ...next, [item.slot]: remote };
            changed = true;
            saved++;
          } else {
            failed++;
          }
        } catch (e) {
          console.warn('[crux] backup failed for', climbId, item.slot, e);
          failed++;
        }
        setDone(d => d + 1);
      }
      if (changed) {
        try {
          await upsert(next);
        } catch (e) {
          console.warn('[crux] could not save climb after upload', climbId, e);
        }
      }
    }

    setResult({ saved, failed });
    setRunning(false);
  };

  /**
   * Drop references to files iOS already deleted. Nothing recoverable is lost
   * here -- the underlying files are gone -- and it goes through `upsert` so
   * the local cache and the server clear together. A server-only cleanup would
   * be undone by the next sync, which pushes the local cache back up.
   */
  const clearMissing = () => {
    const gone = items.filter(i => !i.readable);
    if (clearing || gone.length === 0) return;

    const apply = async () => {
      setClearing(true);
      const byClimb = new Map<string, Item[]>();
      for (const item of gone) {
        const list = byClimb.get(item.climb.id) ?? [];
        list.push(item);
        byClimb.set(item.climb.id, list);
      }
      for (const [climbId, group] of byClimb) {
        let next = group[0].climb;
        for (const item of group) next = { ...next, [item.slot]: null };
        try {
          await upsert(next);
        } catch (e) {
          console.warn('[crux] could not clear media for', climbId, e);
        }
      }
      setClearing(false);
    };

    const title = `Remove ${gone.length} missing reference${gone.length === 1 ? '' : 's'}?`;
    const body =
      'These files are no longer on this phone, so nothing recoverable is lost. Your climbs, grades and notes are untouched.';

    // react-native-web's Alert.alert is a no-op, which would make this button
    // do nothing on web.
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(`${title}

${body}`)) apply();
      return;
    }

    Alert.alert(title, body, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: apply },
    ]);
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        <Text style={styles.title}>Media backup</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.lede}>
          Older climbs stored photos and videos as a path on this phone, inside a cache folder iOS
          is free to empty. Anything still readable here can be copied to your account, where it
          survives app updates and shows up on other devices.
        </Text>

        {!loaded ? (
          <View style={styles.centered}>
            <ActivityIndicator color={C.accent} />
            <Text style={styles.muted}>Checking your library…</Text>
          </View>
        ) : items.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Nothing to back up</Text>
            <Text style={styles.muted}>Every climb with media already points at your account.</Text>
          </View>
        ) : (
          <>
            <View style={styles.statRow}>
              <Stat value={String(items.length)} label="on-device" />
              <Stat value={String(readable.length)} label="recoverable" accent />
              <Stat value={String(missing)} label="already gone" />
            </View>

            {missing > 0 && (
              <View style={styles.warnCard}>
                <Text style={styles.warnTitle}>
                  {missing} file{missing === 1 ? '' : 's'} cannot be recovered
                </Text>
                <Text style={styles.muted}>
                  These were cleared from this phone, so there is nothing left to copy. The
                  originals may still be in your Photos library — those climbs need their media
                  attached again by hand.
                </Text>
                <Pressable
                  onPress={clearMissing}
                  disabled={clearing}
                  style={[styles.secondary, clearing && { opacity: 0.5 }]}>
                  <Text style={styles.secondaryText}>
                    {clearing
                      ? 'Removing…'
                      : `Remove ${missing} missing reference${missing === 1 ? '' : 's'}`}
                  </Text>
                </Pressable>
              </View>
            )}

            {result ? (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>
                  {result.saved} file{result.saved === 1 ? '' : 's'} backed up
                </Text>
                {result.failed > 0 && (
                  <Text style={styles.muted}>
                    {result.failed} could not be uploaded. Try again on a stable connection.
                  </Text>
                )}
              </View>
            ) : readable.length === 0 ? null : (
              <Pressable
                onPress={run}
                disabled={running}
                style={[styles.cta, running && { opacity: 0.5 }]}>
                {running ? (
                  <Text style={styles.ctaText}>
                    Backing up… {done}/{readable.length}
                  </Text>
                ) : (
                  <Text style={styles.ctaText}>
                    Back up {readable.length} file{readable.length === 1 ? '' : 's'}
                  </Text>
                )}
              </Pressable>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, accent && { color: C.accentBright }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  back: { color: C.textSec, fontSize: 14, width: 50 },
  title: { color: C.text, fontSize: 16, fontWeight: '700' },
  content: { padding: 20, gap: 16 },
  lede: { color: C.textSec, fontSize: 14, lineHeight: 21 },
  centered: { alignItems: 'center', gap: 10, marginTop: 30 },
  muted: { color: C.textMuted, fontSize: 13, lineHeight: 20 },
  statRow: { flexDirection: 'row', gap: 10 },
  stat: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    paddingVertical: 14,
    alignItems: 'center',
  },
  statValue: { color: C.text, fontSize: 24, fontWeight: '700' },
  statLabel: { color: C.textSec, fontSize: 11, marginTop: 2 },
  card: {
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    gap: 6,
  },
  cardTitle: { color: C.text, fontSize: 16, fontWeight: '600' },
  warnCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    borderStyle: 'dashed',
    padding: 16,
    gap: 6,
  },
  warnTitle: { color: C.textSoft, fontSize: 15, fontWeight: '600' },
  cta: {
    backgroundColor: C.accent,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  ctaText: { color: C.onAccent, fontSize: 16, fontWeight: '700' },
  secondary: {
    marginTop: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    paddingVertical: 11,
    alignItems: 'center',
  },
  secondaryText: { color: C.textSoft, fontSize: 14, fontWeight: '600' },
});
