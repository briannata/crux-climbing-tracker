import * as ImagePicker from 'expo-image-picker';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { useState, type Dispatch, type SetStateAction } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, mediaCaption, type ClimbMedia } from '@/constants/climbing';
import { uploadMedia } from '@/lib/media-storage';
import { genId } from '@/lib/supabase';

/** Enough for a long projecting session without making the strip unwieldy. */
const MAX_ITEMS = 20;

/** A media item while the form is open. `uploading` is never saved. */
export type DraftMedia = ClimbMedia & { id: string; uploading?: boolean };

/** Strip form-only state before a climb is saved. */
export function toClimbMedia(d: DraftMedia): ClimbMedia {
  return {
    id: d.id,
    uri: d.uri,
    kind: d.kind,
    thumb: d.thumb,
    attempt: d.attempt,
    isSend: d.isSend,
  };
}

type Props = {
  media: DraftMedia[];
  /** A state setter, so uploads finishing late apply to the latest list. */
  onChange: Dispatch<SetStateAction<DraftMedia[]>>;
  /** Marking a video as the send means the climb was sent. */
  onMarkSend?: () => void;
};

export function MediaGalleryEditor({ media, onChange, onMarkSend }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const editing = media.find(m => m.id === editingId) ?? null;
  const remaining = MAX_ITEMS - media.length;

  const update = (id: string, patch: Partial<DraftMedia>) =>
    onChange(prev => prev.map(m => (m.id === id ? { ...m, ...patch } : m)));

  const uploadOne = async (draft: DraftMedia) => {
    let patch: Partial<DraftMedia> = { uploading: false };
    try {
      const remote = await uploadMedia(draft, `climbs/${genId()}`);
      if (remote) patch = { ...patch, uri: remote.uri, thumb: remote.thumb };
    } catch (e) {
      // Keep the local copy so the pick isn't lost; it just won't survive an
      // app reinstall until it is re-added.
      console.warn('[crux] media upload failed, keeping local copy', e);
    }
    update(draft.id, patch);
  };

  const add = async () => {
    if (remaining <= 0) return;
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsMultipleSelection: true,
      // Keeps videos in the order they were tapped, which is the order they
      // get numbered in.
      orderedSelection: true,
      selectionLimit: remaining,
      quality: 0.7,
      videoMaxDuration: 60,
    });
    if (res.canceled || res.assets.length === 0) return;

    // Number new videos after the highest attempt already on this climb.
    let nextAttempt = Math.max(0, ...media.map(m => m.attempt ?? 0));
    const drafts: DraftMedia[] = [];
    for (const asset of res.assets.slice(0, remaining)) {
      const kind = asset.type === 'video' ? 'video' : 'image';
      let thumb: string | undefined;
      if (kind === 'video') {
        try {
          thumb = (await VideoThumbnails.getThumbnailAsync(asset.uri, { time: 500 })).uri;
        } catch {}
      }
      drafts.push({
        id: genId(),
        uri: asset.uri,
        kind,
        thumb,
        attempt: kind === 'video' ? ++nextAttempt : undefined,
        uploading: true,
      });
    }

    // Show everything straight away, then upload one at a time so several
    // videos don't compete for a phone's connection.
    onChange(prev => [...prev, ...drafts]);
    for (const draft of drafts) await uploadOne(draft);
  };

  const setAttempt = (id: string, attempt: number | undefined) => update(id, { attempt });

  const toggleSend = (item: DraftMedia) => {
    if (item.isSend) {
      update(item.id, { isSend: false });
      return;
    }
    // Only one send per climb.
    onChange(prev => prev.map(m => ({ ...m, isSend: m.id === item.id })));
    onMarkSend?.();
  };

  const removeItem = (id: string) => {
    setEditingId(null);
    onChange(prev => prev.filter(m => m.id !== id));
  };

  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
        {media.map(item => (
          <Pressable key={item.id} onPress={() => setEditingId(item.id)} style={styles.tile}>
            <Thumb item={item} />
            {!!item.attempt && (
              <Text style={[styles.chip, styles.chipLeft]}>#{item.attempt}</Text>
            )}
            {item.isSend && <Text style={[styles.chip, styles.chipSend]}>SEND</Text>}
            {item.uploading && (
              <View style={styles.uploading}>
                <ActivityIndicator color={C.accent} size="small" />
              </View>
            )}
          </Pressable>
        ))}

        {remaining > 0 && (
          <Pressable onPress={add} style={[styles.tile, styles.addTile]}>
            <Text style={styles.addPlus}>＋</Text>
            <Text style={styles.addLabel}>Add</Text>
            <Text style={styles.addHint}>photos or{'\n'}videos</Text>
          </Pressable>
        )}
      </ScrollView>

      <Text style={styles.hint}>
        {media.length === 0
          ? 'Add as many photos and videos as you like. Videos are numbered as attempts.'
          : 'Tap one to change its attempt number or mark the send.'}
      </Text>

      <Modal
        visible={!!editing}
        transparent
        animationType="slide"
        onRequestClose={() => setEditingId(null)}>
        <Pressable style={styles.backdrop} onPress={() => setEditingId(null)}>
          {editing && (
            <Pressable
              style={[styles.sheet, { paddingBottom: insets.bottom + 18 }]}
              onPress={() => {}}>
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>{mediaCaption(editing)}</Text>
                <Pressable onPress={() => setEditingId(null)} hitSlop={10}>
                  <Text style={styles.done}>Done</Text>
                </Pressable>
              </View>

              <View style={styles.sheetPreview}>
                <Thumb item={editing} />
              </View>

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>Attempt</Text>
                  <Text style={styles.rowSub}>Leave blank for a photo of the route.</Text>
                </View>
                <View style={styles.stepper}>
                  <Pressable
                    onPress={() =>
                      setAttempt(
                        editing.id,
                        editing.attempt && editing.attempt > 1 ? editing.attempt - 1 : undefined
                      )
                    }
                    disabled={!editing.attempt}
                    style={[styles.stepBtn, !editing.attempt && { opacity: 0.35 }]}>
                    <Text style={styles.stepText}>−</Text>
                  </Pressable>
                  <Text style={styles.stepValue}>{editing.attempt ?? '—'}</Text>
                  <Pressable
                    onPress={() => setAttempt(editing.id, (editing.attempt ?? 0) + 1)}
                    style={styles.stepBtn}>
                    <Text style={styles.stepText}>+</Text>
                  </Pressable>
                </View>
              </View>

              {editing.kind === 'video' ? (
                <Pressable onPress={() => toggleSend(editing)} style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>This is the send</Text>
                    <Text style={styles.rowSub}>
                      {editing.isSend
                        ? 'Shown first on the climb.'
                        : 'Marks the climb as sent. Replaces any other send.'}
                    </Text>
                  </View>
                  <View style={[styles.check, editing.isSend && styles.checkOn]}>
                    {editing.isSend && <Text style={styles.checkMark}>✓</Text>}
                  </View>
                </Pressable>
              ) : (
                <Text style={styles.photoNote}>Only a video can be marked as the send.</Text>
              )}

              <Pressable onPress={() => removeItem(editing.id)} style={styles.remove}>
                <Text style={styles.removeText}>Remove</Text>
              </Pressable>
            </Pressable>
          )}
        </Pressable>
      </Modal>
    </View>
  );
}

function Thumb({ item }: { item: ClimbMedia }) {
  const src = item.kind === 'video' ? item.thumb : item.uri;
  return (
    <View style={StyleSheet.absoluteFill}>
      {src ? (
        <Image source={{ uri: src }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }]} />
      )}
      {item.kind === 'video' && (
        <View style={styles.play}>
          <Text style={styles.playIcon}>▶</Text>
        </View>
      )}
    </View>
  );
}

const TILE_W = 92;
const TILE_H = 116;

const styles = StyleSheet.create({
  strip: { gap: 8, paddingVertical: 2 },
  tile: {
    width: TILE_W,
    height: TILE_H,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: C.surfaceEl,
    borderWidth: 1,
    borderColor: C.border,
  },
  addTile: {
    alignItems: 'center',
    justifyContent: 'center',
    borderStyle: 'dashed',
    borderWidth: 1.5,
  },
  addPlus: { color: C.accent, fontSize: 22, marginBottom: 2 },
  addLabel: { color: C.textSoft, fontSize: 12, fontWeight: '600' },
  addHint: { color: C.textMuted, fontSize: 10, textAlign: 'center', marginTop: 2 },
  chip: {
    position: 'absolute',
    top: 5,
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    overflow: 'hidden',
  },
  chipLeft: { left: 5, color: '#fff', backgroundColor: 'rgba(0,0,0,0.6)' },
  chipSend: { right: 5, color: C.onAccent, backgroundColor: C.accent, letterSpacing: 0.5 },
  uploading: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(22,24,38,0.6)',
  },
  play: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -13,
    marginTop: -13,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: { color: '#fff', fontSize: 10, marginLeft: 1 },
  hint: { fontSize: 11, color: C.textMuted, marginTop: 6 },

  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 20,
    paddingTop: 14,
    gap: 14,
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetTitle: { color: C.text, fontSize: 17, fontWeight: '700' },
  done: { color: C.accent, fontSize: 15, fontWeight: '700' },
  sheetPreview: {
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: C.surfaceEl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  rowTitle: { color: C.text, fontSize: 15, fontWeight: '600' },
  rowSub: { color: C.textMuted, fontSize: 12, marginTop: 2 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surfaceEl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: { color: C.text, fontSize: 18, lineHeight: 20 },
  stepValue: { color: C.text, fontSize: 17, fontWeight: '700', minWidth: 22, textAlign: 'center' },
  check: {
    width: 26,
    height: 26,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: C.surfaceEl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: { backgroundColor: C.accent, borderColor: C.accent },
  checkMark: { color: C.onAccent, fontSize: 15, fontWeight: '700' },
  photoNote: { color: C.textMuted, fontSize: 12 },
  remove: {
    borderWidth: 1,
    borderColor: C.danger + '88',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  removeText: { color: C.danger, fontSize: 14, fontWeight: '600' },
});
