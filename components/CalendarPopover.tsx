import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, FlatList } from 'react-native';

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export default function CalendarPopover({ visible, onClose, onSelectDate }: {
  visible: boolean;
  onClose: () => void;
  onSelectDate: (date: string) => void;
}) {
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth());
  const [year, setYear] = useState(today.getFullYear());

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);
  const days: (number | null)[] = Array(firstDay).fill(null).concat(Array.from({ length: daysInMonth }, (_, i) => i + 1));

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.overlay}>
        <View style={styles.popover}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setMonth(m => m === 0 ? 11 : m - 1)}><Text style={styles.arrow}>{'<'}</Text></TouchableOpacity>
            <Text style={styles.monthLabel}>{new Date(year, month).toLocaleString('default', { month: 'long', year: 'numeric' })}</Text>
            <TouchableOpacity onPress={() => setMonth(m => m === 11 ? 0 : m + 1)}><Text style={styles.arrow}>{'>'}</Text></TouchableOpacity>
          </View>
          <View style={styles.grid}>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
              <Text key={d + i} style={styles.dayName}>{d}</Text>
            ))}
            {days.map((d, i) => d ? (
              <TouchableOpacity
                key={i}
                style={[styles.dayCell, d === today.getDate() && month === today.getMonth() && year === today.getFullYear() ? styles.today : null]}
                onPress={() => onSelectDate(new Date(year, month, d).toISOString())}
              >
                <Text style={styles.dayText}>{d}</Text>
              </TouchableOpacity>
            ) : <View key={i} style={styles.dayCell} />)}
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}><Text style={styles.closeBtnText}>Close</Text></TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'center', alignItems: 'center' },
  popover: { backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 16, padding: 20, width: 340, minHeight: 300, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 16, elevation: 8 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  arrow: { fontSize: 20, color: '#3b82f6', paddingHorizontal: 12 },
  monthLabel: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
  dayName: { width: 40, textAlign: 'center', color: '#64748b', fontWeight: '600', marginBottom: 4 },
  dayCell: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 12, margin: 1 },
  today: { backgroundColor: '#e0e7ff' },
  dayText: { fontSize: 16, color: '#1e293b' },
  closeBtn: { marginTop: 16, alignSelf: 'center', padding: 8, borderRadius: 8, backgroundColor: '#3b82f6' },
  closeBtnText: { color: '#fff', fontWeight: 'bold' },
}); 