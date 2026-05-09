import * as ImagePicker from 'expo-image-picker';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { Image, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { C, type Media } from '@/constants/climbing';

type Props = {
  label: string;
  media: Media | null | undefined;
  onSet: (m: Media | null) => void;
  style?: ViewStyle;
};

export function MediaPicker({ label, media, onSet, style }: Props) {
  const pick = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.7,
      videoMaxDuration: 60,
    });
    if (res.canceled || !res.assets[0]) return;
    const asset = res.assets[0];
    const kind = asset.type === 'video' ? 'video' : 'image';
    let thumb: string | undefined;
    if (kind === 'video') {
      try {
        const t = await VideoThumbnails.getThumbnailAsync(asset.uri, { time: 500 });
        thumb = t.uri;
      } catch {}
    }
    onSet({ uri: asset.uri, kind, thumb });
  };

  const previewUri = media?.kind === 'video' ? media.thumb : media?.uri;

  return (
    <Pressable
      onPress={pick}
      onLongPress={() => onSet(null)}
      style={[styles.box, { borderColor: media ? C.accent : C.border }, style]}>
      {media ? (
        <View style={styles.previewWrap}>
          {previewUri ? (
            <Image source={{ uri: previewUri }} style={styles.img} />
          ) : (
            <View style={[styles.img, { backgroundColor: '#000' }]} />
          )}
          {media.kind === 'video' && (
            <View style={styles.playBadge}>
              <Text style={styles.playIcon}>▶</Text>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.plus}>＋</Text>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.hint}>photo or video</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: C.surfaceEl,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewWrap: { width: '100%', height: '100%' },
  img: { width: '100%', height: '100%' },
  playBadge: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -16,
    marginTop: -16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: { color: '#fff', fontSize: 14, marginLeft: 2 },
  placeholder: { alignItems: 'center', padding: 12 },
  plus: { fontSize: 22, color: C.textMuted, marginBottom: 4 },
  label: { fontSize: 11, color: C.textMuted, textAlign: 'center' },
  hint: { fontSize: 10, color: C.textMuted, opacity: 0.7, marginTop: 2 },
});
