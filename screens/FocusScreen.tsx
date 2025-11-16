import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
  Dimensions,
  Modal,
  TextInput,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AnimatedCircularProgress } from 'react-native-circular-progress';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../ThemeContext';


// Apple-inspired color system with semantic meanings and hierarchy
const COLORS = {
  primary: {
    light: '#007AFF',
    dark: '#0A84FF',
  },
  success: '#32D74B',
  accent: '#FF9F0A',
  purple: '#AF52DE',
  neutral: {
    100: '#F7F7FA',
    200: '#F2F2F5',
    300: '#E6E7EA',
    800: '#1B1B1D',
    900: '#0F0F10',
  },
  card: {
    light: 'rgba(255,255,255,0.72)',
    dark: 'rgba(24,24,26,0.72)',
  },
  text: {
    light: '#0B0B0B',
    muted: '#6B7280',
    lightMuted: 'rgba(0,0,0,0.45)',
    dark: '#F2F2F5',
  },
  separator: 'rgba(0,0,0,0.06)'
};

const FOCUS_MODES = {
  DEEP_WORK: {
    name: 'Deep Work',
    icon: 'bulb-outline',
    duration: 90,
    color: COLORS.primary.light,
    description: 'Intensive focus for complex tasks',
  },
  FLOW: {
    name: 'Flow State',
    icon: 'flash-outline',
    duration: 45,
    color: COLORS.success,
    description: 'Balanced focus for creative work',
  },
  QUICK: {
    name: 'Quick Focus',
    icon: 'timer-outline',
    duration: 25,
    color: COLORS.accent,
    description: 'Short bursts of concentrated effort',
  },
  CUSTOM: {
    name: 'Custom Mode',
    icon: 'options-outline',
    duration: 30,
    color: '#8E8E93', // Apple iOS system grey
    description: 'Personalized focus session',
  },
};

type FocusSession = {
  id: string;
  mode: keyof typeof FOCUS_MODES;
  startTime: string;
  duration: number;
  completed?: boolean;
  notes?: string[];
  productivity?: number;
}


const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export default function FocusScreen() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';


  const windowWidth = Dimensions.get('window').width;
  const cardWidth = Math.min(360, (windowWidth - 56) / 2);

  // Memoized animation values for better performance
  const animations = useMemo(() => ({
    fade: new Animated.Value(1),
    scale: new Animated.Value(1),
    modeScales: Object.keys(FOCUS_MODES).map(() => new Animated.Value(1)),
    timer: {
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0.9)
    },
    buttonColor: new Animated.Value(0), // For button color interpolation
  }), []);

  // Destructure for cleaner access
  const { fade: fadeAnim, scale: scaleAnim, modeScales: modeScaleAnims, timer: { opacity: timerOpacity, scale: timerScale }, buttonColor: buttonColorAnim } = animations;

  // Focus mode state
  const [selectedMode, setSelectedMode] = useState<keyof typeof FOCUS_MODES>('DEEP_WORK');
  const [prevMode, setPrevMode] = useState<keyof typeof FOCUS_MODES>('DEEP_WORK');
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [sessionHistory, setSessionHistory] = useState<FocusSession[]>([]);
  // Favorite mode pinning
  const [favoriteMode, setFavoriteMode] = useState<keyof typeof FOCUS_MODES | null>(null);
  // Custom duration modal state
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customDuration, setCustomDuration] = useState('30');
  const [customModeActualDuration, setCustomModeActualDuration] = useState(30);

  // Start a new focus session
  const startFocusSession = useCallback(() => {
    // Handle custom mode - show modal for duration input
    if (selectedMode === 'CUSTOM') {
      setShowCustomModal(true);
      return;
    }
    
    const duration = FOCUS_MODES[selectedMode].duration;
    setTimeRemaining(duration * 60); // Convert to seconds

    // Show session UI immediately for snappy UX, then animate the timer appearance
    setIsSessionActive(true);

    // Quick, subtle entrance for the timer (no slow spring)
    timerOpacity.setValue(0);
    timerScale.setValue(0.96);
    Animated.parallel([
      Animated.timing(timerOpacity, {
        toValue: 1,
        duration: 160,
        useNativeDriver: true,
      }),
      Animated.timing(timerScale, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0.65,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();

    // Add new session to history
    const newSession: FocusSession = {
      id: Date.now().toString(),
      mode: selectedMode,
      startTime: new Date().toISOString(),
      duration: duration,
    };

    setSessionHistory(prev => [newSession, ...prev]);

    // Strong haptic feedback for session start
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [selectedMode, fadeAnim, scaleAnim, timerOpacity, timerScale]);

  // Start custom focus session with user-defined duration
  const startCustomSession = useCallback(() => {
    const duration = parseInt(customDuration);
    if (isNaN(duration) || duration <= 0 || duration > 300) {
      Alert.alert('Invalid Duration', 'Please enter a valid duration between 1 and 300 minutes.');
      return;
    }

    setCustomModeActualDuration(duration);
    setTimeRemaining(duration * 60); // Convert to seconds
    setShowCustomModal(false);

    // Show session UI immediately for snappy UX, then animate the timer appearance
    setIsSessionActive(true);

    // Quick, subtle entrance for the timer (no slow spring)
    timerOpacity.setValue(0);
    timerScale.setValue(0.96);
    Animated.parallel([
      Animated.timing(timerOpacity, {
        toValue: 1,
        duration: 160,
        useNativeDriver: true,
      }),
      Animated.timing(timerScale, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0.65,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();

    // Add new session to history
    const newSession: FocusSession = {
      id: Date.now().toString(),
      mode: selectedMode,
      startTime: new Date().toISOString(),
      duration: duration,
    };

    setSessionHistory(prev => [newSession, ...prev]);

    // Strong haptic feedback for session start
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [customDuration, selectedMode, fadeAnim, timerOpacity, timerScale]);

  // Pause / resume handler for active session
  const togglePause = useCallback(() => {
    setIsPaused(p => !p);
    Haptics.selectionAsync();
  }, []);

  // End the current focus session: animate out, mark completed, persist
  const endFocusSession = useCallback(async () => {
    // Animate timer out and restore UI
    Animated.parallel([
      Animated.timing(timerOpacity, { toValue: 0, duration: 160, useNativeDriver: true }),
      Animated.timing(timerScale, { toValue: 0.96, duration: 180, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start(() => {
      setIsSessionActive(false);
      setIsPaused(false);
    });

    // Mark session completed in memory and persist
    setSessionHistory(prev => {
      const updated = [...prev];
      if (updated.length > 0) {
        updated[0] = { ...updated[0], completed: true };
      }
      // Fire-and-forget persistence
      AsyncStorage.setItem('focus_history', JSON.stringify(updated)).catch(err => console.error('Error saving focus history:', err));
      return updated;
    });

    // Haptic success feedback
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [fadeAnim, timerOpacity, timerScale]);

  // Timer countdown effect
  useEffect(() => {
    if (!isSessionActive) return;
    if (isPaused) return;
    if (timeRemaining <= 0) return;

    const id = setInterval(() => {
      setTimeRemaining(t => {
        if (t <= 1) {
          clearInterval(id);
          // End session when time runs out
          endFocusSession();
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(id);
  }, [isSessionActive, isPaused, timeRemaining, endFocusSession]);

  // Reset fade animation when theme changes to prevent visual bugs
  useEffect(() => {
    if (!isSessionActive) {
      fadeAnim.setValue(1);
    }
  }, [theme, fadeAnim, isSessionActive]);

  // Format time remaining
  const formattedTime = useMemo(() => {
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, [timeRemaining]);

  // Adaptive background color based on time of day
  const getAdaptiveBackground = () => {
    // Keep background consistent with app tab bar (same colors as App.tsx)
    return isDark ? '#000000' : '#ffffff';
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: getAdaptiveBackground() }]}>
      {/* Frosted glass effect removed as requested */}
      <Animated.View
        style={[
          styles.contentContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
            backgroundColor: isDark ? '#000000' : '#ffffff',
          },
        ]}
      >
        {!isSessionActive && (
          <View style={styles.header}>
            <Text style={[styles.title, { color: isDark ? COLORS.text.dark : COLORS.text.light }]}>
              Focus Zone
            </Text>
            <Text style={[styles.subtitle, { color: isDark ? COLORS.text.dark : COLORS.text.lightMuted }]}>
              Choose Your Focus Mode
            </Text>
          </View>
        )}

        {isSessionActive ? (
          // Active Session UI
          <Animated.View style={[styles.timerPage, { opacity: timerOpacity, transform: [{ scale: timerScale }] }]}>
            <Text style={[styles.timerMode, { color: isDark ? '#E5E5EA' : '#6B7280', paddingBottom: 20}]} allowFontScaling accessibilityLabel={FOCUS_MODES[selectedMode].name}>
              {FOCUS_MODES[selectedMode].name}
            </Text>
            <View style={[styles.timerCenter, { padding: 0, borderRadius: 999, backgroundColor: 'transparent' }]}>
              <AnimatedCircularProgress
                size={280}
                width={18}
                fill={(() => {
                  const total = selectedMode === 'CUSTOM' ? customModeActualDuration * 60 : FOCUS_MODES[selectedMode].duration * 60;
                  const elapsed = Math.max(0, total - timeRemaining);
                  return total > 0 ? (elapsed / total) * 100 : 0;
                })()}
                tintColor={FOCUS_MODES[selectedMode].color}
                // Make inner area transparent so the timer reads as a floating circular ring
                backgroundColor={'transparent'}
                style={{ marginBottom: 8 }}
              >
                {() => (
                  <View style={styles.timerInner}>
                    <View style={styles.timeRow}>
                      <Text style={[styles.timeDigits, { color: isDark ? '#F4F5F7' : '#111' }]} accessibilityLabel="Minutes">
                        {String(Math.floor(timeRemaining / 60)).padStart(2, '0')}
                      </Text>
                      <Text style={[styles.timeSeparator, { color: isDark ? '#F4F5F7' : '#111' }]}>:</Text>
                      <Text style={[styles.timeDigits, { color: isDark ? '#F4F5F7' : '#111' }]} accessibilityLabel="Seconds">
                        {String(timeRemaining % 60).padStart(2, '0')}
                      </Text>
                    </View>
                  </View>
                )}
              </AnimatedCircularProgress>

            </View>
            <View style={styles.timerControls}>
              <TouchableOpacity
                style={[styles.pauseButton, { 
                  backgroundColor: isDark ? '#F8F9FA' : '#1F2937',
                }]}
                onPress={togglePause}
                activeOpacity={0.9}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons 
                  name={isPaused ? 'play' : 'pause'} 
                  size={24} 
                  color={isDark ? '#1F2937' : '#F8F9FA'}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.endButton, { backgroundColor: isDark ? '#FF4757' : '#FF3742' }]}
                onPress={endFocusSession}
                activeOpacity={0.9}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Text style={styles.endButtonText}>End Session</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        ) : (
          // Mode Selection UI
          <View style={styles.modesGrid}>
            {/* Only show mode cards and start button when not active */}
            {Object.entries(FOCUS_MODES).map(([key, mode], index) => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.modeCard,
                  {
                    backgroundColor: isDark ? '#23272A' : '#F8F9FA',
                    borderColor: selectedMode === key ? mode.color : `${mode.color}30`,
                    transform: [{ scale: modeScaleAnims[index] }],
                    borderWidth: favoriteMode === key ? 2 : 1,
                  },
                ]}
                onPressIn={() => {
                  Animated.spring(modeScaleAnims[index], {
                    toValue: 0.95,
                    tension: 120,
                    friction: 8,
                    useNativeDriver: true,
                  }).start();
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); // Haptic feedback
                }}
                onPressOut={() => {
                  Animated.spring(modeScaleAnims[index], {
                    toValue: 1,
                    tension: 80,
                    friction: 4,
                    useNativeDriver: true,
                  }).start();
                }}
                onPress={() => {
                  if (key !== selectedMode) {
                    setPrevMode(selectedMode);
                    setSelectedMode(key as keyof typeof FOCUS_MODES);
                    Haptics.selectionAsync();
                  }
                }}
                onLongPress={() => {
                  // Toggle favorite on long press
                  setFavoriteMode(prev => (prev === (key as keyof typeof FOCUS_MODES) ? null : (key as keyof typeof FOCUS_MODES)));
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  // You can add a modal or action sheet here for edit/info
                }}
                activeOpacity={1}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <View
                  style={[
                    styles.modeIcon,
                    {
                      backgroundColor: `${mode.color}18`,
                      shadowColor: mode.color,
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: selectedMode === key ? 0.7 : 0.6,
                      shadowRadius: selectedMode === key ? 7 : 6,
                      elevation: selectedMode === key ? 10 : 8,
                    },
                  ]}
                >
                  <Ionicons name={mode.icon as any} size={22} color={mode.color} />
                </View>
                <Text style={[
                  styles.modeName,
                  {
                    color: isDark ? '#F4F5F7' : '#1F2937',
                    fontWeight: selectedMode === key ? '700' : '600',
                    fontSize: selectedMode === key ? 20.5 : 20,
                  }
                ]}>
                  {mode.name}
                </Text>
                <Text style={[styles.modeDuration, { color: isDark ? '#A0A3A8' : '#4B5563' }]}>
                  {key === 'CUSTOM' ? `${customModeActualDuration} min` : `${mode.duration} min`}
                </Text>
                <Text style={[styles.modeDesc, { color: isDark ? '#A0A3A8' : '#4B5563' }]} numberOfLines={2} ellipsizeMode="tail">
                  {mode.description}
                </Text>
                {/* Pin icon for favorite mode */}
                {favoriteMode === key && (
                  <Ionicons name="star" size={18} color={mode.color} style={{ position: 'absolute', top: 8, right: 8 }} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {!isSessionActive && (
          <View style={{ alignItems: 'flex-end', marginRight: 80 }}>
            <AnimatedTouchable
              style={[styles.startButton, {
                backgroundColor: '#FDD835', // Solid vibrant yellow
                shadowColor: '#F9A825',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 6,
                elevation: 6,
              }]}
              onPress={() => {
                Animated.sequence([
                  Animated.spring(scaleAnim, { toValue: 0.98, friction: 6, useNativeDriver: true }),
                  Animated.spring(scaleAnim, { toValue: 1, friction: 6, useNativeDriver: true }),
                ]).start();
                startFocusSession();
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              }}
              activeOpacity={0.9}
              accessibilityLabel={`Start ${FOCUS_MODES[selectedMode].name} Focus Session`}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <View style={styles.startIconWrap}>
                <Ionicons
                  name="play"
                  size={18}
                  color="#795548" // Warm brown for good contrast
                  accessibilityLabel="Start Focus Icon"
                />
              </View>
              <Text style={[styles.startText, { color: '#795548' }]} allowFontScaling accessibilityLabel="Start Focus Session" numberOfLines={1}>
                Start Focus Session
              </Text>
            </AnimatedTouchable>
          </View>
        )}
      </Animated.View>

      {/* Custom Duration Modal */}
      <Modal
        visible={showCustomModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCustomModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}>
            <Text style={[styles.modalTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
              Custom Focus Duration
            </Text>
            <Text style={[styles.modalSubtitle, { color: isDark ? '#8E8E93' : '#6B7280' }]}>
              Enter duration in minutes (1-300)
            </Text>
            <TextInput
              style={[
                styles.modalInput,
                {
                  backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7',
                  color: isDark ? '#FFFFFF' : '#000000',
                  borderColor: isDark ? '#3A3A3C' : '#C7C7CC',
                }
              ]}
              value={customDuration}
              onChangeText={setCustomDuration}
              placeholder="30"
              placeholderTextColor={isDark ? '#8E8E93' : '#8E8E93'}
              keyboardType="number-pad"
              keyboardAppearance={isDark ? 'dark' : 'light'}
              maxLength={3}
              autoFocus={true}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }]}
                onPress={() => setShowCustomModal(false)}
              >
                <Text style={[styles.modalButtonText, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton, { backgroundColor: COLORS.primary.light }]}
                onPress={startCustomSession}
              >
                <Text style={[styles.modalButtonText, { color: '#FFFFFF' }]}>
                  Start Session
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  contentContainer: {
    flex: 1,
    padding: 20,
  },
  header: {
    marginTop: Platform.select({ ios: 52, android: 32 }),
    marginBottom: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: -0.8,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 17,
    fontWeight: '500',
    letterSpacing: -0.4,
    marginTop: 4,
    opacity: 0.8,
  },
  timerPage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 32,
  },
  timerCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  timerBig: {
    fontSize: 56,
    fontWeight: '700',
    letterSpacing: -1.2,
    color: '#111',
    fontVariant: ['tabular-nums'],
    marginBottom: 0,
  },
  timerMode: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 12,
    letterSpacing: -0.4,
    color: COLORS.primary.light,
    textAlign: 'center',
  },
  timerInner: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 140,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeDigits: {
    fontSize: 64,
    fontWeight: '700',
    letterSpacing: -1.5,
    fontVariant: ['tabular-nums'],
  },
  timeSeparator: {
    fontSize: 64,
    fontWeight: '700',
    marginHorizontal: 8,
  },
  timerCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    borderRadius: 20,
    minWidth: 260,
  },
  timerInnerLarge: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 180,
    flexDirection: 'row',
  },
  timeDigitsLarge: {
    fontSize: 56,
    fontWeight: '700',
    letterSpacing: -1.2,
    fontVariant: ['tabular-nums'],
  },
  timeSeparatorLarge: {
    fontSize: 56,
    fontWeight: '700',
    marginHorizontal: 8,
  },
  activeSessionCard: {
    backgroundColor: '#FFFFFF10',
    borderRadius: 20,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    alignItems: 'center',
    marginHorizontal: 4,
    marginBottom: 24,
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  timer: {
    fontSize: 64,
    fontWeight: '700',
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
  },
  modeLabel: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 8,
  },
  endButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    backgroundColor: '#FF3B30',
  },
  endButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  pauseButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    marginRight: 16,
  },
  pauseButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  timerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
  },
  modesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    // 'gap' is not supported in RN; use margins inside cards instead
    marginBottom: 32, // More space below
    paddingHorizontal: 8, // Add horizontal padding
  },
  modeCard: {
    width: '47%',
    backgroundColor: 'transparent',
    borderRadius: 24, // More rounded
    padding: 20, // More padding
    borderWidth: 1,
    borderColor: '#E5E5EA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 }, // Softer shadow
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
    marginBottom: 16, // More space between cards vertically
    overflow: 'hidden',
  },
  modeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modeName: {
    fontSize: 20, // Larger title
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: -0.6,
  },
  modeDuration: {
    fontSize: 16,
    marginBottom: 10,
    fontWeight: '500',
    color: '#8E8E93', // Subtle secondary text
  },
  modeDesc: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.8,
    letterSpacing: -0.1,
    color: '#8E8E93', // Subtle secondary text
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 30,
    borderRadius: 50, // Pill shape
    marginBottom: 24,
    width: '75%',
    flexWrap: 'nowrap',
  },
  startIcon: {
    marginRight: 8,
  },
  startText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    flexShrink: 0,
  },
  startIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 3,
    backgroundColor: 'rgba(255,255,255,0.12)'
  },
  startTextWrap: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'center'
  },
  hintText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    opacity: 0.9,
    marginTop: 2,
    fontWeight: '500'
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    maxWidth: 350,
    padding: 24,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  modalInput: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    marginRight: 6,
  },
  confirmButton: {
    marginLeft: 6,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  // duration pill removed per request

});
