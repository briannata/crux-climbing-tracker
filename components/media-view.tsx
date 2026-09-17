import { useVideoPlayer, VideoView } from 'expo-video';
import { useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, type Media } from '@/constants/climbing';

type Props = {
  media: Media;
  style?: StyleProp<ViewStyle>;
  /** When true, tapping opens a fullscreen viewer. Default true. */
  expandable?: boolean;
  /**
   * Show a video as its thumbnail rather than an inline player. A gallery of
   * attempts would otherwise create one live player per tile; the fullscreen
   * viewer still plays it.
   */
  preview?: boolean;
};

export function MediaView({ media, style, expandable = true, preview = false }: Props) {
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const Content =
    media.kind === 'video' && preview ? (
      <View style={[styles.base, style as any]}>
        {media.thumb ? (
          <Image source={{ uri: media.thumb }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : null}
        <View style={styles.playBadge}>
          <Text style={styles.playIcon}>▶</Text>
        </View>
      </View>
    ) : media.kind === 'video' ? (
      <VideoBlock uri={media.uri} style={style} />
    ) : (
      <Image source={{ uri: media.uri }} style={[styles.base, style as any]} resizeMode="cover" />
    );

  if (!expandable) return Content;

  return (
    <>
      <Pressable onPress={() => setOpen(true)} style={style as any}>
        {Content}
      </Pressable>
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}>
        <View style={styles.modalBg}>
          <View style={[styles.modalHeader, { paddingTop: insets.top + 8 }]}>
            <Pressable onPress={() => setOpen(false)} hitSlop={20} style={styles.close}>
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>
          {media.kind === 'video' ? (
            <View style={[styles.modalContent, { paddingBottom: insets.bottom }]}>
              <VideoBlock uri={media.uri} style={styles.full} fullscreen />
            </View>
          ) : (
            <Pressable
              onPress={() => setOpen(false)}
              style={[styles.modalContent, { paddingBottom: insets.bottom }]}>
              <Image source={{ uri: media.uri }} style={styles.full} resizeMode="contain" />
            </Pressable>
          )}
        </View>
      </Modal>
    </>
  );
}

function VideoBlock({
  uri,
  style,
  fullscreen,
}: {
  uri: string;
  style?: StyleProp<ViewStyle>;
  fullscreen?: boolean;
}) {
  const player = useVideoPlayer(uri, p => {
    p.loop = true;
    if (fullscreen) p.play();
  });
  return (
    <View style={[styles.base, style]}>
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit={fullscreen ? 'contain' : 'cover'}
        fullscreenOptions={{ enable: true }}
        nativeControls
      />
    </View>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: 12, overflow: 'hidden', backgroundColor: C.surfaceEl },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)' },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  close: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  modalContent: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  full: { width: '100%', height: '100%', backgroundColor: 'transparent' },
  playBadge: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -18,
    marginTop: -18,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: { color: '#fff', fontSize: 14, marginLeft: 2 },
});
