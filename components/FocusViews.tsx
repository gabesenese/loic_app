import React, { useRef, useEffect } from 'react';
import { View, Pressable, Text, StyleSheet, ScrollView, Platform, Animated } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useTheme } from '../ThemeContext';
// PRIORITY_COLORS moved to local definition
let BlurView: any = null;
try {
  BlurView = require('expo-blur').BlurView;
} catch {}

const FOCUS_VIEWS = [
  { key: 'all', label: 'All Tasks', icon: 'inbox', color: { bg: '#f5f6fa', color: '#22223b', border: '#d3d3e7' } },
  { key: 'overdue', label: 'Overdue', icon: 'exclamation-triangle', color: { bg: '#ffe5e5', color: '#e53e3e', border: '#ffb3b3' } },
  { key: 'today', label: 'Today', icon: 'calendar-day', color: { bg: '#e6f9ed', color: '#1b7f4c', border: '#b2e6c9' } },
  { key: 'thisweek', label: 'This Week', icon: 'calendar-week', color: { bg: '#e8f4fd', color: '#2b6cb0', border: '#b3d9ff' } },
  { key: 'important', label: 'Important', icon: 'star', color: { bg: '#fffbe3', color: '#b68f00', border: '#ffe082' } },
  { key: 'work', label: 'Work', icon: 'briefcase', color: { bg: '#e3e8ff', color: '#3b5bdb', border: '#b2bff6' } },
  { key: 'personal', label: 'Personal', icon: 'home', color: { bg: '#ffe3ec', color: '#d72660', border: '#fbb1c8' } },
  { key: 'archive', label: 'Archive', icon: 'archive', color: { bg: '#f4f4f4', color: '#666', border: '#e0e0e0' } },
];

// Function to calculate dynamic width based on text length
const getActiveWidth = (label: string): number => {
  // Special case for "All Tasks" - use larger width
  if (label === 'All Tasks') {
    return 180;
  }
  
  // Base width for icon + padding + counter + margins
  const baseWidth = 85; // Increased to accommodate counter
  // Approximate character width (adjust based on your font)
  const charWidth = 9;
  // Calculate width based on label length
  const textWidth = label.length * charWidth;
  // Return total width with some padding, but cap at reasonable max
  return Math.min(baseWidth + textWidth, 200);
};

interface FocusViewsProps {
  selected: string;
  onSelect: (key: string) => void;
  counts: Record<string, number>;
}

export default function FocusViews({ selected, onSelect, counts }: FocusViewsProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  // Animation values for each focus view
  const animatedValues = useRef<{ [key: string]: Animated.Value }>({});
  
  // Initialize animation values
  FOCUS_VIEWS.forEach(view => {
    if (!animatedValues.current[view.key]) {
      animatedValues.current[view.key] = new Animated.Value(selected === view.key ? 1 : 0);
    }
  });
  
  // Animate when selection changes
  useEffect(() => {
    FOCUS_VIEWS.forEach(view => {
      const isActive = selected === view.key;
      Animated.timing(animatedValues.current[view.key], {
        toValue: isActive ? 1 : 0,
        duration: 250,
        useNativeDriver: false,
      }).start();
    });
  }, [selected]);

  return (
    <View style={styles.outerContainer}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContainer}
      >
        {FOCUS_VIEWS.map(view => {
          const isActive = selected === view.key;
          let colorScheme = view.color;
          // Invert color scheme for dark mode
          if (isDark) {
            colorScheme = {
              bg: view.color.color,
              color: view.color.bg,
              border: view.color.color,
            };
          }
          
          return (
            <Animated.View
              key={view.key}
              style={[
                styles.item,
                {
                  backgroundColor: colorScheme.bg,
                  borderRadius: 25,
                  overflow: 'hidden',
                  marginRight: 6, // Tighter spacing between items
                  width: animatedValues.current[view.key].interpolate({
                    inputRange: [0, 1],
                    outputRange: [48, getActiveWidth(view.label)], // Dynamic width based on text length
                    extrapolate: 'clamp',
                  }),
                  opacity: animatedValues.current[view.key].interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0.7, 0.85, 1],
                    extrapolate: 'clamp',
                  }),
                  transform: [{
                    scale: animatedValues.current[view.key].interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.92, 1],
                      extrapolate: 'clamp',
                    })
                  }],
                },
              ]}
            >
              <Pressable
                style={({ pressed }) => [
                  StyleSheet.absoluteFill,
                  { opacity: pressed ? 0.7 : 1 }
                ]}
                onPress={() => onSelect(view.key)}
              >
                {Platform.OS !== 'web' && BlurView ? (
                <BlurView
                  intensity={40}
                  tint={isDark ? 'dark' : 'light'}
                  style={StyleSheet.absoluteFill}
                />
              ) : null}
              <Animated.View style={[styles.itemContent, { 
                paddingLeft: animatedValues.current[view.key].interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 16], // No padding when inactive for perfect centering
                  extrapolate: 'clamp',
                }),
                paddingRight: animatedValues.current[view.key].interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 16], // No padding when inactive for perfect centering
                  extrapolate: 'clamp',
                }),
                paddingVertical: 12,
                justifyContent: 'center', // Ensure perfect centering
              }]}>
                <FontAwesome5
                  name={view.icon}
                  size={20}
                  color={colorScheme.color}
                  style={{ 
                    marginRight: isActive ? 10 : 0,
                    alignSelf: 'center', // Ensure icon is centered
                  }}
                />
                {isActive && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                        <Text
                          style={[
                            styles.label,
                            { color: colorScheme.color, fontWeight: '700' },
                          ]}
                        >
                          {view.label}
                        </Text>
                        <Text
                          style={[
                            styles.count,
                            {
                              backgroundColor: 'transparent',
                              color: colorScheme.color,
                              fontWeight: '700',
                            },
                          ]}
                        >
                          {counts[view.key] || 0}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}
              </Animated.View>
              </Pressable>
            </Animated.View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    marginBottom: 12, // Reduced from 20 for better spacing
    paddingTop: 8, // Reduced from 12
    paddingBottom: 6, // Reduced from 8
    paddingHorizontal: 0, // Remove horizontal padding for edge-to-edge
  },
  scrollContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16, // Add padding to the scroll container instead
    justifyContent: 'flex-start',
    minHeight: 52, // Reduced from 60 for tighter layout
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
    marginBottom: 0,
    marginTop: 0,
    borderRadius: 25,
    position: 'relative',
    backgroundColor: 'transparent',
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%', // Ensure full width for proper centering
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