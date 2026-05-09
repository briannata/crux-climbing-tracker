import { StyleSheet, Text, View } from 'react-native';
import { climbGradeColor, climbGradeLabel, gradeColor, type Climb } from '@/constants/climbing';

type Size = 'sm' | 'md' | 'lg';

const SIZES: Record<Size, { fontSize: number; px: number; py: number; radius: number; weight: '400' | '600' | '700' }> = {
  sm: { fontSize: 11, px: 7, py: 2, radius: 5, weight: '600' },
  md: { fontSize: 13, px: 9, py: 3, radius: 7, weight: '600' },
  lg: { fontSize: 18, px: 14, py: 5, radius: 9, weight: '700' },
};

export function GradeTag({
  grade,
  climb,
  size = 'md',
}: {
  grade?: string;
  climb?: Pick<Climb, 'gradeLow' | 'gradeHigh'>;
  size?: Size;
}) {
  const sz = SIZES[size];
  const label = climb ? climbGradeLabel(climb) : grade!;
  const col = climb ? climbGradeColor(climb) : gradeColor(grade!);
  return (
    <View
      style={{
        backgroundColor: col + '22',
        borderColor: col + '44',
        borderWidth: 1,
        borderRadius: sz.radius,
        paddingHorizontal: sz.px,
        paddingVertical: sz.py,
        alignSelf: 'flex-start',
      }}>
      <Text style={[styles.text, { color: col, fontSize: sz.fontSize, fontWeight: sz.weight }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  text: {
    fontFamily: 'monospace',
    letterSpacing: 0.5,
  },
});
