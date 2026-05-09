import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MediaPicker } from '@/components/photo-picker';
import {
  C,
  GRADES,
  GRADE_NUM,
  HOLD_COLORS,
  STYLES,
  TAGS,
  gradeColor,
  type Climb,
  type ClimbStyle,
  type ClimbTag,
  type Grade,
  type Media,
} from '@/constants/climbing';
import { useClimbs } from '@/hooks/use-climbs';

export default function LogScreen() {
  const { climbs, upsert } = useClimbs();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const editing = useMemo(
    () => (params.id ? climbs.find(c => c.id === params.id) : undefined),
    [params.id, climbs]
  );

  // Most recent location used, for default + suggestions
  const lastLocation = useMemo(() => {
    const sorted = [...climbs].sort((a, b) => b.date.localeCompare(a.date));
    return sorted.find(c => c.location)?.location || '';
  }, [climbs]);
  const knownLocations = useMemo(
    () => [...new Set(climbs.map(c => c.location).filter((x): x is string => !!x))],
    [climbs]
  );

  const initLow = GRADE_NUM(editing?.gradeLow || 'V4');
  const initHigh = GRADE_NUM(editing?.gradeHigh || 'V4');
  const [lowIdx, setLowIdx] = useState(initLow);
  const [highIdx, setHighIdx] = useState(initHigh);
  const [sent, setSent] = useState(editing?.sent ?? true);
  const [style, setStyle] = useState<ClimbStyle | undefined>(editing?.style ?? 'boulder');
  const [tags, setTags] = useState<ClimbTag[]>(editing?.tags ?? []);
  const [holdColor, setHoldColor] = useState<string | undefined>(editing?.holdColor);
  const [count, setCount] = useState(editing?.count != null ? String(editing.count) : '1');

  const onTapGrade = (i: number) => {
    if (i >= lowIdx && i <= highIdx) {
      setLowIdx(i);
      setHighIdx(i);
    } else if (i === lowIdx - 1) {
      setLowIdx(i);
    } else if (i === highIdx + 1) {
      setHighIdx(i);
    } else {
      setLowIdx(i);
      setHighIdx(i);
    }
  };

  const toggleTag = (t: ClimbTag) =>
    setTags(prev => (prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]));

  const [routeName, setRouteName] = useState(editing?.routeName || '');
  const [location, setLocation] = useState(editing?.location ?? lastLocation);
  const [notes, setNotes] = useState(editing?.notes || '');
  const [attempts, setAttempts] = useState(editing?.attempts != null ? String(editing.attempts) : '');
  const [sessions, setSessions] = useState(editing?.sessions != null ? String(editing.sessions) : '');
  const [routeMedia, setRouteMedia] = useState<Media | null>(editing?.routeMedia ?? null);
  const [climbMedia, setClimbMedia] = useState<Media | null>(editing?.climbMedia ?? null);
  const [date, setDate] = useState(editing?.date || new Date().toISOString().slice(0, 10));

  const locationSuggestions = location
    ? knownLocations.filter(
        l => l.toLowerCase().includes(location.toLowerCase()) && l !== location
      )
    : [];

  const handleSave = async () => {
    const parsedCount = parseInt(count, 10);
    const c: Climb = {
      id: editing?.id || Date.now().toString(),
      gradeLow: GRADES[lowIdx] as Grade,
      gradeHigh: GRADES[highIdx] as Grade,
      sent,
      style,
      tags: tags.length ? tags : undefined,
      holdColor,
      count: !isNaN(parsedCount) && parsedCount > 1 ? parsedCount : undefined,
      routeName: routeName || undefined,
      location: location || undefined,
      notes: notes || undefined,
      attempts: attempts !== '' ? parseInt(attempts, 10) : null,
      sessions: sessions !== '' ? parseInt(sessions, 10) : null,
      routeMedia,
      climbMedia,
      date,
    };
    await upsert(c);
    router.back();
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.cancel}>Cancel</Text>
          </Pressable>
          <Text style={styles.title}>{editing ? 'Edit Climb' : 'Log a Climb'}</Text>
          <Pressable onPress={handleSave}>
            <Text style={styles.save}>Save</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Field label="Style">
            <View style={styles.chipRow}>
              {STYLES.map(s => {
                const sel = style === s;
                return (
                  <Pressable
                    key={s}
                    onPress={() => setStyle(s)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: sel ? C.accentDim : C.surfaceEl,
                        borderColor: sel ? C.accent : C.border,
                        borderWidth: sel ? 1.5 : 1,
                      },
                    ]}>
                    <Text
                      style={{
                        color: sel ? C.accent : C.textSec,
                        fontSize: 13,
                        fontWeight: sel ? '700' : '400',
                      }}>
                      {s}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Field>

          <Field label="Grade (tap adjacent grades to make a range)">
            <View style={styles.gradeWrap}>
              {GRADES.map((g, i) => {
                const sel = i >= lowIdx && i <= highIdx;
                const col = gradeColor(g);
                return (
                  <Pressable
                    key={g}
                    onPress={() => onTapGrade(i)}
                    style={[
                      styles.gradeBtn,
                      {
                        backgroundColor: sel ? col + '33' : C.surfaceEl,
                        borderColor: sel ? col : C.border,
                        borderWidth: sel ? 1.5 : 1,
                      },
                    ]}>
                    <Text
                      style={{
                        color: sel ? col : C.textSec,
                        fontFamily: 'monospace',
                        fontSize: 13,
                        fontWeight: sel ? '700' : '400',
                      }}>
                      {g}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Field>

          <Field label="Hold color">
            <View style={styles.chipRow}>
              {HOLD_COLORS.map(hc => {
                const sel = holdColor === hc.value;
                return (
                  <Pressable
                    key={hc.name}
                    onPress={() => setHoldColor(sel ? undefined : hc.value)}
                    style={[
                      styles.colorSwatch,
                      {
                        backgroundColor: hc.value,
                        borderWidth: sel ? 3 : 1,
                        borderColor: sel ? C.accent : C.border,
                      },
                    ]}
                  />
                );
              })}
              {holdColor && (
                <Pressable onPress={() => setHoldColor(undefined)} style={styles.clearChip}>
                  <Text style={{ color: C.textSec, fontSize: 12 }}>clear</Text>
                </Pressable>
              )}
            </View>
          </Field>

          <Field label="Sent?">
            <Pressable onPress={() => setSent(s => !s)} style={styles.checkRow}>
              <View style={[styles.checkbox, sent && styles.checkboxOn]}>
                {sent && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.checkLabel}>
                {sent ? 'Sent it' : 'Attempted (not sent)'}
              </Text>
            </Pressable>
          </Field>

          <Field label="How many of this grade?">
            <TextInput
              value={count}
              onChangeText={setCount}
              keyboardType="number-pad"
              placeholder="1"
              placeholderTextColor={C.textMuted}
              style={styles.input}
            />
            <Text style={styles.hint}>Use this to bulk-log multiple climbs of the same grade (e.g. "6 V0s today").</Text>
          </Field>

          <Field label="Tags">
            <View style={styles.chipRow}>
              {TAGS.map(t => {
                const sel = tags.includes(t);
                return (
                  <Pressable
                    key={t}
                    onPress={() => toggleTag(t)}
                    style={[
                      styles.tagChip,
                      {
                        backgroundColor: sel ? C.accentDim : C.surfaceEl,
                        borderColor: sel ? C.accent : C.border,
                        borderWidth: sel ? 1.5 : 1,
                      },
                    ]}>
                    <Text
                      style={{
                        color: sel ? C.accent : C.textSec,
                        fontSize: 12,
                        fontWeight: sel ? '700' : '400',
                      }}>
                      {t}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Field>

          <Field label="Date">
            <TextInput
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={C.textMuted}
              style={styles.input}
            />
          </Field>

          <Field label="Route Name (optional)">
            <TextInput
              value={routeName}
              onChangeText={setRouteName}
              placeholder="e.g. The Traverse"
              placeholderTextColor={C.textMuted}
              style={styles.input}
            />
          </Field>

          <Field label="Location (optional)">
            <TextInput
              value={location}
              onChangeText={setLocation}
              placeholder="e.g. Movement Boulder"
              placeholderTextColor={C.textMuted}
              style={styles.input}
            />
            {locationSuggestions.length > 0 && (
              <View style={styles.suggestWrap}>
                {locationSuggestions.slice(0, 5).map(l => (
                  <Pressable key={l} onPress={() => setLocation(l)} style={styles.suggestRow}>
                    <Text style={styles.suggestText}>{l}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </Field>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Field label="Attempts">
                <TextInput
                  value={attempts}
                  onChangeText={setAttempts}
                  keyboardType="number-pad"
                  placeholder="–"
                  placeholderTextColor={C.textMuted}
                  style={styles.input}
                />
              </Field>
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Sessions">
                <TextInput
                  value={sessions}
                  onChangeText={setSessions}
                  keyboardType="number-pad"
                  placeholder="–"
                  placeholderTextColor={C.textMuted}
                  style={styles.input}
                />
              </Field>
            </View>
          </View>

          <Field label="Notes (optional)">
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Beta, conditions, feelings..."
              placeholderTextColor={C.textMuted}
              multiline
              style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]}
            />
          </Field>

          <Field label="Media (optional)">
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <MediaPicker
                label="Route"
                media={routeMedia}
                onSet={setRouteMedia}
                style={{ flex: 1, height: 110 }}
              />
              <MediaPicker
                label="Your send"
                media={climbMedia}
                onSet={setClimbMedia}
                style={{ flex: 1, height: 110 }}
              />
            </View>
            <Text style={styles.hint}>Long-press to remove.</Text>
          </Field>

          <Pressable onPress={handleSave} style={styles.cta}>
            <Text style={styles.ctaText}>{editing ? 'Update Climb' : '🧗 Log Climb'}</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={styles.label}>{label}</Text>
      {children}
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
  },
  title: { fontSize: 16, fontWeight: '700', color: C.text },
  cancel: { color: C.textSec, fontSize: 14 },
  save: { color: C.accent, fontSize: 14, fontWeight: '700' },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: C.textSec,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  input: {
    backgroundColor: C.surfaceEl,
    borderColor: C.border,
    borderWidth: 1,
    borderRadius: 10,
    color: C.text,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  gradeWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  gradeBtn: { borderRadius: 8, paddingHorizontal: 11, paddingVertical: 6 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, alignItems: 'center' },
  chip: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  tagChip: { borderRadius: 16, paddingHorizontal: 11, paddingVertical: 5 },
  colorSwatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  clearChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: C.surfaceEl,
    borderWidth: 1,
    borderColor: C.border,
  },
  hint: { fontSize: 11, color: C.textMuted, marginTop: 6 },
  cta: {
    marginTop: 8,
    backgroundColor: C.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  ctaText: { color: '#16130e', fontSize: 16, fontWeight: '700' },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: C.surfaceEl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: C.accent, borderColor: C.accent },
  checkmark: { color: '#16130e', fontSize: 16, fontWeight: '700' },
  checkLabel: { color: C.text, fontSize: 15 },
  suggestWrap: {
    marginTop: 4,
    backgroundColor: C.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  suggestRow: { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  suggestText: { color: C.text, fontSize: 14 },
});
