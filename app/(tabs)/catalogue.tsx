import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ClimbCard } from '@/components/climb-card';
import { C, basesForStyle, climbGradeLabel, gradeColor, gradeOrder, parseGrade } from '@/constants/climbing';
import { useClimbs } from '@/hooks/use-climbs';

export default function CatalogueScreen() {
  const { climbs } = useClimbs();
  const router = useRouter();
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  // Collect all base grades covered by climbs (across systems), ordered.
  const usedGrades = [
    ...new Set(
      climbs.flatMap(c => {
        const lo = parseGrade(c.gradeLow);
        const hi = parseGrade(c.gradeHigh);
        if (lo.system !== hi.system) return [lo.base, hi.base];
        const bases = basesForStyle(lo.system === 'YDS' ? 'lead' : 'boulder');
        const loIdx = bases.indexOf(lo.base);
        const hiIdx = bases.indexOf(hi.base);
        if (loIdx === -1 || hiIdx === -1) return [lo.base, hi.base];
        return bases.slice(loIdx, hiIdx + 1);
      })
    ),
  ].sort((a, b) => gradeOrder(a) - gradeOrder(b));

  const q = search.toLowerCase();
  const filtered = climbs
    .filter(c => {
      if (filter === 'all') return true;
      const fOrd = gradeOrder(filter);
      const loBase = parseGrade(c.gradeLow).base;
      const hiBase = parseGrade(c.gradeHigh).base;
      return fOrd >= gradeOrder(loBase) && fOrd <= gradeOrder(hiBase);
    })
    .filter(c => {
      if (!q) return true;
      const label = climbGradeLabel(c).toLowerCase();
      return (
        (c.routeName && c.routeName.toLowerCase().includes(q)) ||
        label.includes(q) ||
        (c.location && c.location.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Catalogue</Text>
        <TextInput
          placeholder="Search…"
          placeholderTextColor={C.textMuted}
          value={search}
          onChangeText={setSearch}
          style={styles.search}
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}>
          <Chip
            label="All"
            selected={filter === 'all'}
            color={C.accent}
            onPress={() => setFilter('all')}
          />
          {usedGrades.map(g => (
            <Chip
              key={g}
              label={g}
              selected={filter === g}
              color={gradeColor(g)}
              mono
              onPress={() => setFilter(filter === g ? 'all' : g)}
            />
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        <Text style={styles.count}>
          {filtered.length} send{filtered.length !== 1 ? 's' : ''}
        </Text>
        {filtered.length === 0 ? (
          <Text style={styles.empty}>No climbs match your filter.</Text>
        ) : (
          <View style={{ gap: 10 }}>
            {filtered.map(c => (
              <ClimbCard
                key={c.id}
                climb={c}
                onPress={() => router.push({ pathname: '/climb/[id]', params: { id: c.id } })}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Chip({
  label,
  selected,
  color,
  mono,
  onPress,
}: {
  label: string;
  selected: boolean;
  color: string;
  mono?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? color + '33' : C.surfaceEl,
          borderColor: selected ? color : C.border,
          borderWidth: selected ? 1.5 : 1,
        },
      ]}>
      <Text
        style={[
          styles.chipText,
          {
            color: selected ? color : C.textSec,
            fontWeight: selected ? '700' : '400',
            fontFamily: mono ? 'monospace' : undefined,
          },
        ]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  title: { fontSize: 26, fontWeight: '700', color: C.text, letterSpacing: -0.5, marginBottom: 10 },
  search: {
    backgroundColor: C.surfaceEl,
    borderColor: C.border,
    borderWidth: 1,
    borderRadius: 10,
    color: C.text,
    fontSize: 14,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  chips: { gap: 7, paddingTop: 10, paddingBottom: 2 },
  chip: { borderRadius: 20, paddingHorizontal: 13, paddingVertical: 5 },
  chipText: { fontSize: 12 },
  list: { paddingHorizontal: 20, paddingBottom: 20 },
  count: { fontSize: 11, color: C.textSec, marginBottom: 8 },
  empty: { textAlign: 'center', color: C.textMuted, fontSize: 14, marginTop: 40 },
});
