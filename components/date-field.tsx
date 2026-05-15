import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { C, localDateString } from '@/constants/climbing';

type Props = {
  value: string; // 'YYYY-MM-DD' or ''
  onChange: (v: string) => void;
  placeholder?: string;
  allowClear?: boolean;
  style?: StyleProp<ViewStyle>;
};

function parseLocalDate(v: string): Date {
  if (!v) return new Date();
  const [y, m, d] = v.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function formatDisplay(v: string): string {
  if (!v) return '';
  const d = parseLocalDate(v);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

export function DateField({ value, onChange, placeholder, allowClear, style }: Props) {
  const [iosOpen, setIosOpen] = useState(false);
  const [iosTemp, setIosTemp] = useState<Date>(() => parseLocalDate(value));

  const handlePress = () => {
    const initial = parseLocalDate(value);
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: initial,
        mode: 'date',
        onChange: (_event: DateTimePickerEvent, selected?: Date) => {
          if (selected) onChange(localDateString(selected));
        },
      });
    } else {
      setIosTemp(initial);
      setIosOpen(true);
    }
  };

  return (
    <View style={[styles.row, style]}>
      <Pressable onPress={handlePress} style={styles.field}>
        <Text style={[styles.text, !value && styles.placeholder]}>
          {value ? formatDisplay(value) : placeholder ?? 'Pick a date'}
        </Text>
      </Pressable>
      {allowClear && !!value && (
        <Pressable onPress={() => onChange('')} hitSlop={10} style={styles.clear}>
          <Text style={styles.clearText}>✕</Text>
        </Pressable>
      )}

      {Platform.OS === 'ios' && (
        <Modal
          visible={iosOpen}
          transparent
          animationType="slide"
          onRequestClose={() => setIosOpen(false)}>
          <Pressable style={styles.sheetBackdrop} onPress={() => setIosOpen(false)}>
            <Pressable style={styles.sheet} onPress={() => {}}>
              <View style={styles.sheetHeader}>
                <Pressable onPress={() => setIosOpen(false)}>
                  <Text style={styles.sheetCancel}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    onChange(localDateString(iosTemp));
                    setIosOpen(false);
                  }}>
                  <Text style={styles.sheetDone}>Done</Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={iosTemp}
                mode="date"
                display="inline"
                themeVariant="dark"
                onChange={(_: DateTimePickerEvent, selected?: Date) => {
                  if (selected) setIosTemp(selected);
                }}
              />
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  field: {
    flex: 1,
    backgroundColor: C.surfaceEl,
    borderColor: C.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  text: { color: C.text, fontSize: 15 },
  placeholder: { color: C.textMuted },
  clear: {
    marginLeft: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: C.surfaceEl,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearText: { color: C.textSec, fontSize: 12 },
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: C.surface,
    paddingHorizontal: 16,
    paddingBottom: 32,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    marginBottom: 6,
  },
  sheetCancel: { color: C.textSec, fontSize: 15 },
  sheetDone: { color: C.accent, fontSize: 15, fontWeight: '700' },
});
