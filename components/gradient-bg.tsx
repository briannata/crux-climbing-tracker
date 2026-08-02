import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

/**
 * Full-bleed vertical gradient. Uses react-native-svg (already a dependency)
 * so we don't pull in expo-linear-gradient just for the wrapped covers.
 */
export function GradientBg({
  from,
  to,
  /** Where the second color lands, 0–1. Nocturne's covers stop around 0.78. */
  stop = 0.78,
  angle = 'diagonal',
}: {
  from: string;
  to: string;
  stop?: number;
  angle?: 'vertical' | 'diagonal';
}) {
  const coords =
    angle === 'diagonal'
      ? { x1: '0', y1: '0', x2: '0.35', y2: '1' }
      : { x1: '0', y1: '0', x2: '0', y2: '1' };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id="g" {...coords}>
            <Stop offset="0" stopColor={from} />
            <Stop offset={String(stop)} stopColor={to} />
            <Stop offset="1" stopColor={to} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#g)" />
      </Svg>
    </View>
  );
}
