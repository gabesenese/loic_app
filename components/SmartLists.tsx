import React from 'react';
import { View, Pressable, Text, StyleSheet, ScrollView, Platform } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useTheme } from '../ThemeContext';
// PRIORITY_COLORS moved to local definition
let BlurView: any = null;
try {
  BlurView = require('expo-blur').BlurView;
} catch {}

const SMART_LISTS = [
  { key: 'all', label: 'All Tasks', icon: 'inbox', color: { bg: '#f5f6fa', color: '#22223b', border: '#d3d3e7' } },
  { key: 'important', label: 'Important', icon: 'star', color: { bg: '#fffbe3', color: '#b68f00', border: '#ffe082' } },
  { key: 'today', label: 'Today', icon: 'calendar-day', color: { bg: '#e6f9ed', color: '#1b7f4c', border: '#b2e6c9' } },
  { key: 'work', label: 'Work', icon: 'briefcase', color: { bg: '#e3e8ff', color: '#3b5bdb', border: '#b2bff6' } },
  { key: 'personal', label: 'Personal', icon: 'home', color: { bg: '#ffe3ec', color: '#d72660', border: '#fbb1c8' } },
  { key: 'archive', label: 'Archive', icon: 'archive', color: { bg: '#f4f4f4', color: '#666', border: '#e0e0e0' } },
];

interface SmartListsProps {
  selected: string;
  onSelect: (key: string) => void;
  counts: Record<string, number>;
}

export default function SmartLists({ selected, onSelect, counts }: SmartListsProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  return (
    <View style={styles.outerContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContainer}>
        {SMART_LISTS.map(list => {
          const isActive = selected === list.key;
          let colorScheme = list.color;
          // Invert color scheme for dark mode
          if (isDark) {
            colorScheme = {
              bg: list.color.color,
              color: list.color.bg,
              border: list.color.color,
            };
          }
          return (
            <Pressable
              key={list.key}
              style={({ pressed }) => [
                styles.item,
                {
                  backgroundColor: colorScheme.bg,
                  borderRadius: 16,
                  opacity: pressed ? 0.7 : 1,
                  overflow: 'hidden',
                },
              ]}
              onPress={() => onSelect(list.key)}
            >
              {Platform.OS !== 'web' && BlurView ? (
                <BlurView
                  intensity={40}
                  tint={isDark ? 'dark' : 'light'}
                  style={StyleSheet.absoluteFill}
                />
              ) : null}
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12 }}>
                <FontAwesome5
                  name={list.icon}
                  size={20}
                  color={colorScheme.color}
                  style={{ marginRight: 8 }}
                />
                <Text
                  style={[
                    styles.label,
                    { color: colorScheme.color, fontWeight: isActive ? '700' : '500' },
                  ]}
                >
                  {list.label}
                </Text>
                <Text
                  style={[
                    styles.count,
                    {
                      backgroundColor: 'transparent',
                      color: colorScheme.color,
                      fontWeight: isActive ? '700' : '500',
                    },
                  ]}
                >
                  {counts[list.key]}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    marginBottom: 20,
    paddingTop: 8,
    paddingHorizontal: 16,
  },
  scrollContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 0,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 80,
    minHeight: 36,
    justifyContent: 'center',
    marginRight: 12,
    marginBottom: 0,
    marginTop: 0,
    borderRadius: 16,
    position: 'relative',
    backgroundColor: 'transparent',
  },
  label: {
    fontSize: 15,
    fontWeight: '500',
    marginRight: 4,
  },
  count: {
    fontSize: 13,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginLeft: 3,
    fontWeight: '500',
  },
}); 