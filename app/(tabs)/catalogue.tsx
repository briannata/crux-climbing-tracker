import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ClimbCard } from '@/components/climb-card';
import {
  C,
  basesForStyle,
  climbGradeLabel,
  gradeColor,
  gradeOrder,
  parseGrade,
} from '@/constants/climbing';
import { useClimbs } from '@/hooks/use-climbs';

type SortDir = 'newest' | 'oldest';

export default function CatalogueScreen() {
  const { climbs } = useClimbs();
  const router = useRouter();

  const [gradeFilter, setGradeFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sort, setSort] = useState<SortDir>('newest');
  const [filtersOpen, setFiltersOpen] = useState(false);

  // ── Derived option lists ────────────────────────────────────────────────
  const usedGrades = useMemo(
    () =>
      [
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
      ].sort((a, b) => gradeOrder(a) - gradeOrder(b)),
    [climbs]
  );

  const usedLocations = useMemo(
    () =>
      [
        ...new Set(climbs.map(c => c.location).filter((x): x is string => !!x)),
      ].sort(),
    [climbs]
  );

  // ── Filter pipeline ─────────────────────────────────────────────────────
  const q = search.toLowerCase().trim();
  const filtered = climbs
    .filter(c => {
      if (gradeFilter === 'all') return true;
      const fOrd = gradeOrder(gradeFilter);
      const loBase = parseGrade(c.gradeLow).base;
      const hiBase = parseGrade(c.gradeHigh).base;
      return fOrd >= gradeOrder(loBase) && fOrd <= gradeOrder(hiBase);
    })
    .filter(c => locationFilter === 'all' || c.location === locationFilter)
    .filter(c => !dateFrom || c.date >= dateFrom)
    .filter(c => !dateTo || c.date <= dateTo)
    .filter(c => {
      if (!q) return true;
      const label = climbGradeLabel(c).toLowerCase();
      return (
        (c.routeName && c.routeName.toLowerCase().includes(q)) ||
        label.includes(q) ||
        (c.location && c.location.toLowerCase().includes(q))
      );
    })
    .sort((a, b) =>
      sort === 'newest' ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)
    );

  const activeFilterCount =
    (gradeFilter !== 'all' ? 1 : 0) +
    (locationFilter !== 'all' ? 1 : 0) +
    (dateFrom ? 1 : 0) +
    (dateTo ? 1 : 0);

  const clearAll = () => {
    setGradeFilter('all');
    setLocationFilter('all');
    setDateFrom('');
    setDateTo('');
  };

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

        <View style={styles.controlsRow}>
          <Pressable
            onPress={() => setFiltersOpen(o => !o)}
            style={[styles.controlBtn, activeFilterCount > 0 && styles.controlBtnActive]}>
            <Text style={[styles.controlText, activeFilterCount > 0 && { color: C.accent }]}>
              {filtersOpen ? '▾' : '▸'} Filters{activeFilterCount > 0 ? ` · ${activeFilterCount}` : ''}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setSort(s => (s === 'newest' ? 'oldest' : 'newest'))}
            style={styles.controlBtn}>
            <Text style={styles.controlText}>
              {sort === 'newest' ? '↓ Newest' : '↑ Oldest'}
            </Text>
          </Pressable>
          {activeFilterCount > 0 && (
            <Pressable onPress={clearAll} style={styles.controlBtn}>
              <Text style={[styles.controlText, { color: C.danger }]}>Clear</Text>
            </Pressable>
          )}
        </View>

        {filtersOpen && (
          <View style={styles.filterPanel}>
            <Text style={styles.filterLabel}>Grade</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipScroll}>
              <Chip
                label="All"
                selected={gradeFilter === 'all'}
                color={C.accent}
                onPress={() => setGradeFilter('all')}
              />
              {usedGrades.map(g => (
                <Chip
                  key={g}
                  label={g}
                  selected={gradeFilter === g}
                  color={gradeColor(g)}
                  mono
                  onPress={() => setGradeFilter(gradeFilter === g ? 'all' : g)}
                />
              ))}
            </ScrollView>

            {usedLocations.length > 0 && (
              <>
                <Text style={[styles.filterLabel, { marginTop: 12 }]}>Location</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chipScroll}>
                  <Chip
                    label="All"
                    selected={locationFilter === 'all'}
                    color={C.accent}
                    onPress={() => setLocationFilter('all')}
                  />
                  {usedLocations.map(l => (
                    <Chip
                      key={l}
                      label={l}
                      selected={locationFilter === l}
                      color={C.accent}
                      onPress={() => setLocationFilter(locationFilter === l ? 'all' : l)}
                    />
                  ))}
                </ScrollView>
              </>
            )}

            <Text style={[styles.filterLabel, { marginTop: 12 }]}>Date range</Text>
            <View style={styles.dateRow}>
              <TextInput
                value={dateFrom}
                onChangeText={setDateFrom}
                placeholder="From YYYY-MM-DD"
                placeholderTextColor={C.textMuted}
                style={[styles.dateInput, { flex: 1 }]}
              />
              <TextInput
                value={dateTo}
                onChangeText={setDateTo}
                placeholder="To YYYY-MM-DD"
                placeholderTextColor={C.textMuted}
                style={[styles.dateInput, { flex: 1 }]}
              />
            </View>
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        <Text style={styles.count}>
          {filtered.length} climb{filtered.length !== 1 ? 's' : ''}
        </Text>
        {filtered.length === 0 ? (
          <Text style={styles.empty}>No climbs match your filters.</Text>
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
  controlsRow: { flexDirection: 'row', gap: 8, marginTop: 10, alignItems: 'center' },
  controlBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: C.surfaceEl,
    borderWidth: 1,
    borderColor: C.border,
  },
  controlBtnActive: { borderColor: C.accent },
  controlText: { color: C.textSec, fontSize: 12, fontWeight: '600' },
  filterPanel: {
    marginTop: 10,
    paddingTop: 10,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  filterLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: C.textSec,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  chipScroll: { gap: 7, paddingBottom: 2 },
  chip: { borderRadius: 20, paddingHorizontal: 13, paddingVertical: 5 },
  chipText: { fontSize: 12 },
  dateRow: { flexDirection: 'row', gap: 10 },
  dateInput: {
    backgroundColor: C.surfaceEl,
    borderColor: C.border,
    borderWidth: 1,
    borderRadius: 10,
    color: C.text,
    fontSize: 13,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  list: { paddingHorizontal: 20, paddingBottom: 20 },
  count: { fontSize: 11, color: C.textSec, marginBottom: 8 },
  empty: { textAlign: 'center', color: C.textMuted, fontSize: 14, marginTop: 40 },
});
