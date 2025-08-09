import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Vibration,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../ThemeContext';
import * as Haptics from 'expo-haptics';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const RING_SIZE = 260; // keep in sync with styles.progressRing dimensions

interface FocusTimerProps {
  onSessionComplete?: (duration: number, type: 'focus' | 'break') => void;
}

interface TimerPreset {
  id: string;
  name: string;
  duration: number; // in minutes
  color: string;
  icon: string;
  description: string;
}

const TIMER_PRESETS: TimerPreset[] = [
  { 
    id: 'pomodoro', 
    name: 'Pomodoro', 
    duration: 25, 
    color: '#ff453a', 
    icon: 'timer-outline',
    description: 'Focused work sprint'
  },
  { 
    id: 'short-break', 
    name: 'Short Break', 
    duration: 5, 
    color: '#30d158', 
    icon: 'leaf-outline',
    description: 'Recharge briefly'
  },
  { 
    id: 'long-break', 
    name: 'Long Break', 
    duration: 15, 
    color: '#0a84ff', 
    icon: 'cafe-outline',
    description: 'Take a longer breather'
  },
  { 
    id: 'deep-work', 
    name: 'Deep Work', 
    duration: 90, 
    color: '#bf5af2', 
    icon: 'bulb-outline',
    description: 'Intense focus session'
  },
  { 
    id: 'quick-focus', 
    name: 'Quick Focus', 
    duration: 15, 
    color: '#ff9f0a', 
    icon: 'flash-outline',
    description: 'Quick focus burst'
  },
  { 
    id: 'custom', 
    name: 'Custom', 
    duration: 0, 
    color: '#8e8e93', 
    icon: 'settings-outline',
    description: 'Choose your duration'
  },
];

export default function FocusTimer({ onSessionComplete }: FocusTimerProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Timer state
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0); // in seconds
  const [selectedPreset, setSelectedPreset] = useState<TimerPreset>(TIMER_PRESETS[0]);
  const [customMinutes, setCustomMinutes] = useState(30);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [showPresets, setShowPresets] = useState(true);

  // Animations
  const progressAnimation = useRef(new Animated.Value(0)).current;
  const scaleAnimation = useRef(new Animated.Value(1)).current;
  const fadeAnimation = useRef(new Animated.Value(1)).current;
  const slideAnimation = useRef(new Animated.Value(0)).current;
  const pulseAnimation = useRef(new Animated.Value(1)).current;
  const presetsSlideAnimation = useRef(new Animated.Value(0)).current;

  // Derived values for enhanced timer UI
  const totalSecondsForPreset = (selectedPreset.id === 'custom' ? customMinutes : selectedPreset.duration) * 60;
  const progressRatio = totalSecondsForPreset > 0 ? Math.max(0, Math.min(1, 1 - (timeLeft / totalSecondsForPreset))) : 0;
  const sessionType: 'focus' | 'break' = selectedPreset.id.includes('break') ? 'break' : 'focus';
  const endTimeLabel = isActive && timeLeft > 0
    ? new Date(Date.now() + timeLeft * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;
  const circumference = Math.PI * (RING_SIZE - 20);

  // Timer logic
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    if (isActive && !isPaused && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((time) => {
          const newTime = time - 1;
          
          // Update progress animation
          const totalSeconds = (selectedPreset.id === 'custom' ? customMinutes : selectedPreset.duration) * 60;
          const progress = 1 - (newTime / totalSeconds);
          Animated.timing(progressAnimation, {
            toValue: progress,
            duration: 1000,
            useNativeDriver: false,
          }).start();

          if (newTime <= 0) {
            // Timer completed
            handleTimerComplete();
            return 0;
          }
          
          return newTime;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, isPaused, timeLeft, selectedPreset, customMinutes]);

  // Pulse animation when timer is active
  useEffect(() => {
    if (isActive && !isPaused) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnimation, {
            toValue: 1.02,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnimation, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnimation.setValue(1);
    }
  }, [isActive, isPaused]);

  // Slide animation for presets
  useEffect(() => {
    Animated.timing(presetsSlideAnimation, {
      toValue: showPresets ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [showPresets]);

  const handleTimerComplete = () => {
    setIsActive(false);
    setIsPaused(false);
    
    // Haptic feedback
    if (Platform.OS === 'ios') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Vibration.vibrate(500);
    }

    // Callback
    if (onSessionComplete) {
      const duration = selectedPreset.id === 'custom' ? customMinutes : selectedPreset.duration;
      const type = selectedPreset.id.includes('break') ? 'break' : 'focus';
      onSessionComplete(duration, type);
    }

    // Reset animations
    Animated.timing(progressAnimation, {
      toValue: 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const startTimer = () => {
    const duration = selectedPreset.id === 'custom' ? customMinutes : selectedPreset.duration;
    setTimeLeft(duration * 60);
    setIsActive(true);
    setIsPaused(false);
    setShowPresets(false);

    // Haptic feedback
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    // Start animation
    Animated.sequence([
      Animated.timing(scaleAnimation, {
        toValue: 0.95,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnimation, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const pauseTimer = () => {
    setIsPaused(true);
    
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const resumeTimer = () => {
    setIsPaused(false);
    
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const resetTimer = () => {
    setIsActive(false);
    setIsPaused(false);
    setTimeLeft(0);
    setShowPresets(true);
    
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    // Reset animations
    Animated.timing(progressAnimation, {
      toValue: 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const selectPreset = (preset: TimerPreset) => {
    setSelectedPreset(preset);
    if (preset.id === 'custom') {
      setShowCustomInput(true);
    } else {
      setShowCustomInput(false);
      resetTimer();
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgressColor = () => {
    if (isActive && !isPaused) {
      return selectedPreset.color;
    }
    return isDark ? '#38383a' : '#e5e5ea';
  };

  const getBackgroundColor = () => {
    if (isActive) {
      return isDark ? '#1c1c1e' : '#ffffff';
    }
    return isDark ? '#2c2c2e' : '#f2f2f7';
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#000000' : '#f2f2f7' }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      
      {/* Timer Display - Minimalist, Apple-level */}
      <View style={styles.minimalTimerContainer}>
        <Animated.View style={[styles.minimalRingWrapper, { transform: [{ scale: pulseAnimation }] }]}>
          {/* Precise circular progress using react-native-svg */}
          <Svg width={RING_SIZE} height={RING_SIZE}>
            {/* Background ring */}
            <Circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={(RING_SIZE - 20) / 2}
              stroke={isDark ? '#2b2b2e' : '#e5e5ea'}
              strokeWidth={10}
              fill="none"
            />
            {/* Progress ring */}
            <Circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={(RING_SIZE - 20) / 2}
              stroke={selectedPreset.color}
              strokeWidth={10}
              fill="none"
              strokeDasharray={`${circumference}, ${circumference}`}
              strokeDashoffset={circumference * (1 - (timeLeft / totalSecondsForPreset || 1))}
              strokeLinecap="round"
              transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
            />
          </Svg>
          {/* Time overlay centered within ring */}
          <View style={styles.minimalTimeOverlay} pointerEvents="none">
            <Text style={[styles.minimalTime, { color: isDark ? '#ffffff' : '#0a0a0a' }]}>{formatTime(timeLeft)}</Text>
          </View>
        </Animated.View>

        {/* Meta (below ring) */}
        <View style={styles.minimalMetaRow}>
          <View style={[styles.minimalBadge, { backgroundColor: isDark ? '#1f1f22' : '#f4f4f5', borderColor: selectedPreset.color + '55' }]}>
            <Ionicons name={sessionType === 'break' ? 'cafe-outline' : 'flame-outline'} size={12} color={selectedPreset.color} />
            <Text style={[styles.minimalBadgeText, { color: selectedPreset.color }]}>{sessionType === 'break' ? 'Break' : 'Focus'}</Text>
          </View>
          {endTimeLabel && (
            <Text style={[styles.minimalMeta, { color: isDark ? '#8e8e93' : '#6b7280' }]}>Ends {endTimeLabel}</Text>
          )}
        </View>

        {/* Minimal controls */}
        <View style={styles.minimalControls}>
          {!isActive ? (
            <TouchableOpacity style={[styles.minimalPrimaryBtn, { backgroundColor: selectedPreset.color }]} onPress={startTimer} activeOpacity={0.9}>
              <View style={styles.minimalPrimaryIcon}>
                <Ionicons name="play" size={18} color="#fff" />
              </View>
              <Text style={styles.minimalPrimaryText}>Start</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.minimalControlsRow}>
              <TouchableOpacity style={[styles.minimalControlBtn, { backgroundColor: isDark ? '#2b2b2e' : '#ececef' }]} onPress={isPaused ? resumeTimer : pauseTimer} activeOpacity={0.9}>
                <Ionicons name={isPaused ? 'play' : 'pause'} size={16} color={isDark ? '#ffffff' : '#0a0a0a'} />
                <Text style={[styles.minimalControlText, { color: isDark ? '#ffffff' : '#0a0a0a' }]}>{isPaused ? 'Resume' : 'Pause'}</Text>
                </TouchableOpacity>
              <TouchableOpacity style={[styles.minimalControlBtn, { backgroundColor: isDark ? '#2b2b2e' : '#ececef' }]} onPress={resetTimer} activeOpacity={0.9}>
                <Ionicons name="refresh" size={16} color={isDark ? '#ffffff' : '#0a0a0a'} />
                <Text style={[styles.minimalControlText, { color: isDark ? '#ffffff' : '#0a0a0a' }]}>Reset</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* Preset Selection */}
      <Animated.View 
        style={[
          styles.presetsContainer,
          {
            opacity: presetsSlideAnimation,
            transform: [{
              translateY: presetsSlideAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [50, 0],
              }),
            }],
          },
        ]}
      >
        <View style={styles.presetsHeader}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#ffffff' : '#000000' }]}>
            Choose Your Focus Session
          </Text>
          <Text style={[styles.sectionSubtitle, { color: isDark ? '#8e8e93' : '#6b7280' }]}>
            Select a timer preset that fits your workflow
          </Text>
        </View>
        
        <View style={styles.presetsGrid}>
          {TIMER_PRESETS.map((preset) => (
            <TouchableOpacity
              key={preset.id}
              style={[
                styles.presetCard,
                {
                  backgroundColor: isDark ? '#1c1c1e' : '#ffffff',
                  borderColor: selectedPreset.id === preset.id ? preset.color : (isDark ? '#38383a' : '#e5e5ea'),
                  borderWidth: selectedPreset.id === preset.id ? 2 : 1,
                },
              ]}
              onPress={() => selectPreset(preset)}
              activeOpacity={0.7}
            >
              <View style={[styles.presetIcon, { backgroundColor: preset.color + '20' }]}>
                <Ionicons name={preset.icon as any} size={24} color={preset.color} />
              </View>
              <View style={styles.presetContent}>
                <View style={styles.presetHeaderRow}>
                <Text style={[styles.presetName, { color: isDark ? '#ffffff' : '#000000' }]}>
                  {preset.name}
                </Text>
                  <View style={[
                    styles.presetTimeBadge,
                    { backgroundColor: isDark ? '#2a2a2c' : '#f2f2f7', borderColor: preset.color + '55' }
                  ]}>
                    <Ionicons name="time-outline" size={14} color={preset.color} />
                    <Text style={[styles.presetTimeText, { color: preset.color }]}>
                      {preset.duration === 0 ? 'Custom' : `${preset.duration} min`}
                </Text>
                  </View>
                </View>
                <View style={[styles.presetDescriptionContainer, { borderLeftColor: preset.color + '66' }]}>
                  <Text
                    style={[styles.presetCardDescription, { color: isDark ? '#a1a1aa' : '#4b5563' }]}
                    numberOfLines={2}
                  >
                  {preset.description}
                </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Custom Timer Input */}
        {showCustomInput && (
          <Animated.View
            style={[
              styles.customInputContainer,
              { backgroundColor: isDark ? '#1c1c1e' : '#ffffff' },
            ]}
          >
            <Text style={[styles.inputLabel, { color: isDark ? '#8e8e93' : '#6b7280' }]}>
              Custom Duration
            </Text>
            <View style={styles.customInputRow}>
              <TouchableOpacity
                style={[styles.numberButton, { backgroundColor: isDark ? '#38383a' : '#f2f2f7' }]}
                onPress={() => setCustomMinutes(Math.max(1, customMinutes - 5))}
                activeOpacity={0.7}
              >
                <Ionicons name="remove" size={20} color={isDark ? '#ffffff' : '#000000'} />
              </TouchableOpacity>
              
              <Text style={[styles.customMinutes, { color: isDark ? '#ffffff' : '#000000' }]}>
                {customMinutes} minutes
              </Text>
              
              <TouchableOpacity
                style={[styles.numberButton, { backgroundColor: isDark ? '#38383a' : '#f2f2f7' }]}
                onPress={() => setCustomMinutes(customMinutes + 5)}
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={20} color={isDark ? '#ffffff' : '#000000'} />
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  
  minimalTimerContainer: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 12,
  },

  minimalRingWrapper: {
    width: RING_SIZE,
    height: RING_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },

  minimalOuterRing: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: 10,
  },

  minimalProgressArc: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: 10,
    borderColor: 'transparent',
    borderTopColor: 'currentColor',
    borderRightColor: 'currentColor',
  },

  // Remove extra visuals for pure minimalism

  minimalTimeOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },

  minimalTime: {
    fontSize: 52,
    fontWeight: '200',
    letterSpacing: -1.5,
    marginBottom: 6,
    fontFamily: Platform.OS === 'ios' ? 'System' : undefined,
  },

  minimalMeta: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },

  minimalMetaRow: {
    marginTop: 10,
    marginBottom: 12,
    gap: 6,
    alignItems: 'center',
  },

  presetName: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.2,
    marginBottom: 2,
  },

  minimalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    marginBottom: 6,
  },
  minimalBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },

  presetDescription: {
    fontSize: 14,
    fontWeight: '400',
    letterSpacing: -0.08,
    textAlign: 'center',
    opacity: 0.7,
  },

  presetDescriptionContainer: {
    marginTop: 2,
    paddingLeft: 10,
    borderLeftWidth: 3,
  },

  presetCardDescription: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
    letterSpacing: 0.1,
  },

  minimalControls: {
    alignItems: 'center',
    marginTop: 4,
  },
  minimalControlsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  minimalPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 8,
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 999,
  },
  minimalPrimaryText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.2,
    lineHeight: 16,
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  minimalPrimaryIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  minimalControlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  minimalControlText: {
    fontSize: 14,
    fontWeight:  '700',
    letterSpacing: -0.2,
  },

  presetsContainer: {
    flex: 1,
  },

  presetsHeader: {
    marginTop: 12,
    marginBottom: 16,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.24,
    marginBottom: 4,
  },

  sectionSubtitle: {
    fontSize: 14,
    fontWeight: '400',
    letterSpacing: -0.08,
    lineHeight: 20,
  },

  presetsGrid: {
    gap: 12,
  },

  presetCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },

  presetIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  presetContent: {
    flex: 1,
  },

  presetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    marginBottom: 4,
  },

  presetTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
  },

  presetTimeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },

  presetDuration: {
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: -0.08,
    marginBottom: 4,
  },

  customInputContainer: {
    marginTop: 16,
    padding: 16,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    marginBottom: 10,
  },

  customInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  numberButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },

  customMinutes: {
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: -0.24,
    minWidth: 120,
    textAlign: 'center',
  },
}); 