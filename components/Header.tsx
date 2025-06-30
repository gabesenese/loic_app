import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../ThemeContext';

type HeaderProps = {
  currentDate: Date;
  onPrev: () => void;
  onNext: () => void;
};

function getHeaderMainLabel(date: Date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  if (d.getTime() === yesterday.getTime()) return 'Yesterday';
  if (d.getTime() === today.getTime()) return 'Today';
  if (d.getTime() === tomorrow.getTime()) return 'Tomorrow';
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
}

function getHeaderDateDisplay(date: Date) {
  // Always weekday, month, day (no year)
  return date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
}

export default function Header({ currentDate, onPrev, onNext }: HeaderProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const mainLabel = getHeaderMainLabel(currentDate);
  const showDateDisplay = mainLabel === 'Yesterday' || mainLabel === 'Today' || mainLabel === 'Tomorrow';
  return (
    <View style={styles.headerRow}>
      <TouchableOpacity onPress={onPrev} style={styles.navArrow} accessibilityLabel="Previous Day">
        <Ionicons name="chevron-back" size={24} color={isDark ? '#fff' : '#222'} />
      </TouchableOpacity>
      <View style={styles.headerTitleContainer}>
        <Text style={[styles.headerTitle, { color: isDark ? '#fff' : '#1e293b' }]}>{mainLabel}</Text>
        {showDateDisplay && (
          <Text style={[styles.dateDisplay, { color: isDark ? '#fff' : '#64748b' }]}>{getHeaderDateDisplay(currentDate)}</Text>
        )}
      </View>
      <TouchableOpacity onPress={onNext} style={styles.navArrow} accessibilityLabel="Next Day">
        <Ionicons name="chevron-forward" size={24} color={isDark ? '#fff' : '#222'} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    gap: 8,
  },
  navArrow: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'transparent',
    marginHorizontal: 8,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#1e293b',
    textAlign: 'center',
  },
  dateDisplay: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '400',
    textAlign: 'center',
    marginTop: 2,
  },
}); 