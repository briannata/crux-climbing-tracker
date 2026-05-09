import { useVideoPlayer, VideoView } from 'expo-video';
import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { C, type Media } from '@/constants/climbing';

export function MediaView({ media, style }: { media: Media; style?: StyleProp<ViewStyle> }) {
  if (media.kind === 'video') return <VideoBlock uri={media.uri} style={style} />;
  return <Image source={{ uri: media.uri }} style={[styles.base, style as any]} />;
}

function VideoBlock({ uri, style }: { uri: string; style?: StyleProp<ViewStyle> }) {
  const player = useVideoPlayer(uri, p => {
    p.loop = true;
  });
  return (
    <View style={[styles.base, style]}>
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        allowsFullscreen
        nativeControls
      />
    </View>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: 12, overflow: 'hidden', backgroundColor: C.surfaceEl },
});
