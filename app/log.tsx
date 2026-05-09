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
import { C, GRADES, GRADE_NUM, gradeColor, type Climb, type Grade, type Media } from '@/constants/climbing';
import { useClimbs } from '@/hooks/use-climbs';

export default function LogScreen() {
  const { climbs, upsert } = useClimbs();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const editing = useMemo(
    () => (params.id ? climbs.find(c => c.id === params.id) : undefined),
    [params.id, climbs]
  );

  const initLow = GRADE_NUM(editing?.gradeLow || 'V4');
  const initHigh = GRADE_NUM(editing?.gradeHigh || 'V4');
  const [lowIdx, setLowIdx] = useState(initLow);
  const [highIdx, setHighIdx] = useState(initHigh);
  const [sent, setSent] = useState(editing?.sent ?? true);

  const onTapGrade = (i: number) => {
    if (i >= lowIdx && i <= highIdx) {
      // tapping inside selection: collapse to that single grade
      setLowIdx(i);
      setHighIdx(i);
    } else if (i === lowIdx - 1) {
      setLowIdx(i);
    } else if (i === highIdx + 1) {
      setHighIdx(i);
    } else {
      // non-adjacent: replace selection
      setLowIdx(i);
      setHighIdx(i);
    }
  };

  const [routeName, setRouteName] = useState(editing?.routeName || '');
  const [location, setLocation] = useState(editing?.location || '');
  const [notes, setNotes] = useState(editing?.notes || '');
  const [attempts, setAttempts] = useState(editing?.attempts != null ? String(editing.attempts) : '');
  const [sessions, setSessions] = useState(editing?.sessions != null ? String(editing.sessions) : '');
  const [routeMedia, setRouteMedia] = useState<Media | null>(editing?.routeMedia ?? null);
  const [climbMedia, setClimbMedia] = useState<Media | null>(editing?.climbMedia ?? null);
  const [date, setDate] = useState(editing?.date || new Date().toISOString().slice(0, 10));

  const handleSave = async () => {
    const c: Climb = {
      id: editing?.id || Date.now().toString(),
      gradeLow: GRADES[lowIdx] as Grade,
      gradeHigh: GRADES[highIdx] as Grade,
      sent,
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
});
