import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C } from '@/constants/climbing';
import { useCurrentUser } from '@/hooks/use-current-user';

export default function OnboardingScreen() {
  const { signUp } = useCurrentUser();
  const router = useRouter();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!name.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      await signUp(name);
      router.replace('/(tabs)' as never);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not sign up';
      setError(msg);
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.body}>
          <Text style={styles.title}>🧗 Crux</Text>
          <Text style={styles.tagline}>Track every send.</Text>

          <View style={styles.form}>
            <Text style={styles.label}>What should we call you?</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Brianna"
              placeholderTextColor={C.textMuted}
              autoCapitalize="words"
              autoCorrect={false}
              autoFocus
              onSubmitEditing={submit}
              returnKeyType="go"
              style={styles.input}
            />
            {!!error && <Text style={styles.error}>{error}</Text>}

            <Pressable
              onPress={submit}
              disabled={!name.trim() || busy}
              style={[styles.cta, (!name.trim() || busy) && styles.ctaDisabled]}>
              {busy ? (
                <ActivityIndicator color="#16130e" />
              ) : (
                <Text style={styles.ctaText}>Get started</Text>
              )}
            </Pressable>

            <Text style={styles.fineprint}>
              No password, no email — your data stays on this device unless someone follows you.
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  body: { flex: 1, paddingHorizontal: 28, justifyContent: 'center' },
  title: { fontSize: 48, fontWeight: '800', color: C.text, marginBottom: 6, letterSpacing: -1 },
  tagline: { fontSize: 16, color: C.textSec, marginBottom: 36 },
  form: { gap: 12 },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: C.textSec,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: C.surfaceEl,
    borderColor: C.border,
    borderWidth: 1,
    borderRadius: 10,
    color: C.text,
    fontSize: 17,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  error: { color: C.danger, fontSize: 13 },
  cta: {
    marginTop: 8,
    backgroundColor: C.accent,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  ctaDisabled: { opacity: 0.4 },
  ctaText: { color: '#16130e', fontSize: 16, fontWeight: '700' },
  fineprint: { color: C.textMuted, fontSize: 12, textAlign: 'center', marginTop: 16 },
});
