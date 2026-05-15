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
import { SafeAreaView } from 'react-native-safe-area-context';
import { C, type Media } from '@/constants/climbing';

type Props = {
  media: Media;
  style?: StyleProp<ViewStyle>;
  /** When true, tapping opens a fullscreen viewer. Default true. */
  expandable?: boolean;
};

export function MediaView({ media, style, expandable = true }: Props) {
  const [open, setOpen] = useState(false);
  const Content =
    media.kind === 'video' ? (
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
        onRequestClose={() => setOpen(false)}
        statusBarTranslucent>
        <View style={styles.modalBg}>
          <SafeAreaView style={styles.modalSafe} edges={['top', 'bottom']}>
            <Pressable onPress={() => setOpen(false)} hitSlop={20} style={styles.close}>
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
            <View style={styles.modalContent}>
              {media.kind === 'video' ? (
                <VideoBlock uri={media.uri} style={styles.full} fullscreen />
              ) : (
                <Image source={{ uri: media.uri }} style={styles.full} resizeMode="contain" />
              )}
            </View>
          </SafeAreaView>
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
        allowsFullscreen
        nativeControls
      />
    </View>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: 12, overflow: 'hidden', backgroundColor: C.surfaceEl },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)' },
  modalSafe: { flex: 1 },
  close: {
    position: 'absolute',
    top: 12,
    right: 16,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  modalContent: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  full: { width: '100%', height: '100%', backgroundColor: 'transparent' },
});
