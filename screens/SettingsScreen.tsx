import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Switch, Platform, TextInput, TouchableOpacity, Modal, SafeAreaView, Appearance } from 'react-native';
import { Svg, Circle } from 'react-native-svg';
import { Animated, Easing } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ThemeType } from '../ThemeContext';
import * as Notifications from 'expo-notifications';

let BlurView: any = null;
try {
  BlurView = require('expo-blur').BlurView;
} catch {}

const STORAGE_KEY = 'TODO_TASKS';
const NOTIFICATIONS_KEY = 'NOTIFICATIONS_ENABLED';
const AUTO_ARCHIVE_KEY = 'AUTO_ARCHIVE_ENABLED';
const ARCHIVE_DAYS_KEY = 'ARCHIVE_DAYS';

// Apple-style Settings Row Component
const SettingsRow = ({ 
  icon, 
  title, 
  subtitle, 
  rightElement, 
  onPress, 
  isDark 
}: { 
  icon: string; 
  title: string; 
  subtitle?: string; 
  rightElement?: React.ReactNode; 
  onPress?: () => void; 
  isDark: boolean; 
}) => (
  <TouchableOpacity 
    style={[
      styles.settingsRow, 
      { 
        backgroundColor: isDark ? '#1c1c1e' : '#ffffff',
        borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
      }
    ]} 
    onPress={onPress}
    activeOpacity={0.7}
    disabled={!onPress}
  >
    <View style={[styles.iconContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
      <Ionicons name={icon as any} size={20} color={isDark ? '#ffffff' : '#000000'} />
    </View>
    <View style={styles.textContainer}>
      <Text style={[styles.rowTitle, { color: isDark ? '#ffffff' : '#000000' }]}>{title}</Text>
      {subtitle ? <Text style={[styles.rowSubtitle, { color: isDark ? '#8e8e93' : '#6b7280' }]}>{subtitle}</Text> : null}
    </View>
    {rightElement ? <View style={styles.rightElement}>{rightElement}</View> : null}
    {onPress ? <Ionicons name="chevron-forward" size={16} color={isDark ? '#8e8e93' : '#c7c7cc'} style={styles.chevron} /> : null}
  </TouchableOpacity>
);

// Apple-style Toggle Component
const AppleToggle = ({ value, onValueChange, isDark }: { value: boolean; onValueChange: (v: boolean) => void; isDark: boolean }) => (
  <Switch
    value={value}
    onValueChange={onValueChange}
    trackColor={{ false: isDark ? '#38383a' : '#e5e5ea', true: '#34c759' }}
    thumbColor={value ? '#ffffff' : '#ffffff'}
    ios_backgroundColor={isDark ? '#38383a' : '#e5e5ea'}
  />
);

// Settings Section Component
const SettingsSection = ({ title, children, isDark }: { title: string; children: React.ReactNode; isDark: boolean }) => (
  <View style={styles.section}>
    <Text style={[styles.sectionTitle, { color: isDark ? '#8e8e93' : '#8e8e93' }]}>{title}</Text>
    <View style={[styles.sectionContent, { backgroundColor: isDark ? '#1c1c1e' : '#ffffff' }]}>
      {children}
    </View>
  </View>
);

export default function SettingsScreen() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark';
  const { top } = useSafeAreaInsets();

  // Settings state
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [autoArchive, setAutoArchive] = useState(true);
  const [archiveDays, setArchiveDays] = useState(7);
  const [archiveDaysInput, setArchiveDaysInput] = useState('7'); // Separate input state
  const [pomodoroVisible, setPomodoroVisible] = useState(false);
  const [pomodoroTime, setPomodoroTime] = useState(25 * 60);
  const [pomodoroRunning, setPomodoroRunning] = useState(false);

  // Load settings from storage
  useEffect(() => {
    AsyncStorage.getItem(NOTIFICATIONS_KEY).then(val => {
      if (val !== null) setNotificationsEnabled(val === 'true');
    });
    AsyncStorage.getItem(AUTO_ARCHIVE_KEY).then(val => {
      if (val !== null) setAutoArchive(val === 'true');
    });
    AsyncStorage.getItem(ARCHIVE_DAYS_KEY).then(val => {
      if (val !== null) {
        const days = parseInt(val, 10);
        if (days >= 1) {
          setArchiveDays(days);
          setArchiveDaysInput(days.toString());
        }
      }
    });
  }, []);

  // Save settings to storage
  useEffect(() => {
    if (typeof notificationsEnabled === 'boolean') {
      AsyncStorage.setItem(NOTIFICATIONS_KEY, notificationsEnabled ? 'true' : 'false');
    }
  }, [notificationsEnabled]);

  useEffect(() => {
    AsyncStorage.setItem(AUTO_ARCHIVE_KEY, autoArchive ? 'true' : 'false');
  }, [autoArchive]);

  useEffect(() => {
    AsyncStorage.setItem(ARCHIVE_DAYS_KEY, archiveDays.toString());
  }, [archiveDays]);

  // Handle archive days input changes
  const handleArchiveDaysChange = (text: string) => {
    // Filter out non-numeric characters and periods, only allow integers
    const filteredText = text.replace(/[^0-9]/g, '');
    
    // Allow empty input temporarily
    setArchiveDaysInput(filteredText);
    
    // Only update the actual value if it's a valid number >= 1
    const numValue = parseInt(filteredText, 10);
    if (!isNaN(numValue) && numValue >= 1) {
      setArchiveDays(numValue);
    }
  };

  // Handle when input loses focus - validate and set minimum value
  const handleArchiveDaysBlur = () => {
    const numValue = parseInt(archiveDaysInput, 10);
    if (isNaN(numValue) || numValue < 1) {
      setArchiveDays(1);
      setArchiveDaysInput('1');
    } else {
      setArchiveDays(numValue);
      setArchiveDaysInput(numValue.toString());
    }
  };

  // Pomodoro timer logic
  useEffect(() => {
    let interval: any = null;
    if (pomodoroRunning && pomodoroTime > 0) {
      interval = setInterval(() => {
        setPomodoroTime(t => t - 1);
      }, 1000);
    } else if (pomodoroTime === 0) {
      setPomodoroRunning(false);
    }
    return () => clearInterval(interval);
  }, [pomodoroRunning, pomodoroTime]);

  const handleNotificationsToggle = async (value: boolean) => {
    if (Platform.OS === 'ios' && value) {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        const { status: newStatus } = await Notifications.requestPermissionsAsync();
        if (newStatus !== 'granted') {
          return;
        }
      }
    }
    setNotificationsEnabled(value);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const startPomodoro = () => {
    setPomodoroTime(25 * 60);
    setPomodoroRunning(true);
  };

  const stopPomodoro = () => {
    setPomodoroRunning(false);
  };

  const resetPomodoro = () => {
    setPomodoroTime(25 * 60);
    setPomodoroRunning(false);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#000000' : '#f2f2f7', paddingTop: top }]}>
      <View 
        style={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: isDark ? '#ffffff' : '#000000' }]}>Settings</Text>
          <Text style={[styles.headerSubtitle, { color: isDark ? '#8e8e93' : '#6b7280' }]}>Customize your experience</Text>
        </View>

        {/* Appearance Section */}
        <SettingsSection title="Appearance" isDark={isDark}>
          <SettingsRow
            icon="moon"
            title="Dark Mode"
            subtitle="Switch between light and dark themes"
            rightElement={
              <AppleToggle 
                value={isDark} 
                onValueChange={(v) => setTheme(v ? 'dark' : 'light')} 
                isDark={isDark} 
              />
            }
            isDark={isDark}
          />
        </SettingsSection>

        {/* Notifications Section */}
        <SettingsSection title="Notifications" isDark={isDark}>
          <SettingsRow
            icon="notifications"
            title="Push Notifications"
            subtitle="Get reminded about your tasks"
            rightElement={<AppleToggle value={notificationsEnabled} onValueChange={handleNotificationsToggle} isDark={isDark} />}
            isDark={isDark}
          />
        </SettingsSection>

        {/* Task Management Section */}
        <SettingsSection title="Task Management" isDark={isDark}>
          <SettingsRow
            icon="archive"
            title="Auto-archive"
            subtitle="Automatically archive completed tasks"
            rightElement={<AppleToggle value={autoArchive} onValueChange={setAutoArchive} isDark={isDark} />}
            isDark={isDark}
          />
          {autoArchive ? (
            <View style={[styles.archiveInputContainer, { 
              backgroundColor: isDark ? '#1c1c1e' : '#ffffff',
              borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
            }]}>
              <Text style={[styles.archiveInputLabel, { color: isDark ? '#8e8e93' : '#6b7280' }]}>Archive after</Text>
              <TextInput
                style={[styles.archiveInput, { 
                  color: isDark ? '#ffffff' : '#000000',
                  backgroundColor: isDark ? '#2c2c2e' : '#f2f2f7',
                  borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'
                }]}
                keyboardType="numeric"
                value={archiveDaysInput}
                onChangeText={handleArchiveDaysChange}
                onBlur={handleArchiveDaysBlur}
                maxLength={2}
                placeholder="7"
                placeholderTextColor={isDark ? '#8e8e93' : '#6b7280'}
              />
              <Text style={[styles.archiveInputLabel, { color: isDark ? '#8e8e93' : '#6b7280' }]}>days</Text>
            </View>
          ) : null}
        </SettingsSection>

        {/* Productivity Section */}
        <SettingsSection title="Productivity" isDark={isDark}>
          <SettingsRow
            icon="timer"
            title="Pomodoro Timer"
            subtitle="Stay focused with timed work sessions"
            onPress={() => setPomodoroVisible(true)}
            isDark={isDark}
          />
        </SettingsSection>

        {/* About Section */}
        <SettingsSection title="About" isDark={isDark}>
          <SettingsRow
            icon="information-circle"
            title="Version"
            subtitle="1.0.0"
            isDark={isDark}
          />
          <SettingsRow
            icon="heart"
            title="Made with ❤️"
            subtitle="Built for productivity"
            isDark={isDark}
          />
        </SettingsSection>
      </View>

      {/* Pomodoro Timer Modal */}
      <Modal visible={pomodoroVisible} animationType="slide" transparent onRequestClose={() => setPomodoroVisible(false)}>
        <TouchableOpacity
          activeOpacity={1}
          style={styles.modalOverlay}
          onPressOut={() => setPomodoroVisible(false)}
        >
          {BlurView ? (
            <BlurView intensity={60} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? 'rgba(28,28,30,0.7)' : 'rgba(255,255,255,0.7)' }]} />
          )}
          <View style={[styles.pomoModalContainer, { backgroundColor: isDark ? 'rgba(28,28,30,0.85)' : 'rgba(255,255,255,0.85)' }]}> 
            <View style={styles.pomoModalHeader}>
              <View style={styles.pomoModalHandle} />
              <Text style={[styles.pomoModalTitle, { color: isDark ? '#fff' : '#000' }]}>Pomodoro</Text>
              <TouchableOpacity onPress={() => setPomodoroVisible(false)} style={styles.pomoCloseButton} hitSlop={{top:10,bottom:10,left:10,right:10}}>
                <Ionicons name="close" size={24} color={isDark ? '#fff' : '#000'} />
              </TouchableOpacity>
            </View>
            <View style={styles.pomoTimerSection}>
              <PomodoroProgressCircle
                progress={pomodoroTime / (25 * 60)}
                isDark={isDark}
                time={formatTime(pomodoroTime)}
              />
              <Text style={[styles.pomoTimerLabel, { color: isDark ? '#8e8e93' : '#6b7280' }]}>Stay focused for 25 minutes</Text>
            </View>
            <View style={styles.pomoTimerControls}>
              {!pomodoroRunning ? (
                <TouchableOpacity onPress={startPomodoro} style={styles.pomoStartButton}>
                  <Ionicons name="play" size={20} color="#fff" />
                  <Text style={styles.pomoStartButtonText}>Start</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={stopPomodoro} style={styles.pomoPauseButton}>
                  <Ionicons name="pause" size={20} color="#fff" />
                  <Text style={styles.pomoPauseButtonText}>Pause</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={resetPomodoro} style={[styles.pomoResetButton, { backgroundColor: isDark ? '#232325' : '#f2f2f7' }] }>
                <Ionicons name="refresh" size={20} color={isDark ? '#fff' : '#000'} />
                <Text style={[styles.pomoResetButtonText, { color: isDark ? '#fff' : '#000' }]}>Reset</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

// Pomodoro Progress Circle Component

const PomodoroProgressCircle = ({ progress, isDark, time }: { progress: number; isDark: boolean; time: string }) => {
  const size = 180;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const animatedProgress = useRef(new Animated.Value(progress)).current;

  useEffect(() => {
    Animated.timing(animatedProgress, {
      toValue: progress,
      duration: 400,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const animatedOffset = animatedProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
      <Svg width={size} height={size}>
        <Circle
          stroke={isDark ? '#232325' : '#e5e5ea'}
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        <AnimatedCircle
          stroke={isDark ? '#34c759' : '#34c759'}
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference},${circumference}`}
          strokeDashoffset={animatedOffset}
          strokeLinecap="round"
        />
      </Svg>
      <Text style={{
        position: 'absolute',
        fontSize: 48,
        fontWeight: '200',
        color: isDark ? '#fff' : '#000',
        fontVariant: ['tabular-nums'],
        fontFamily: Platform.OS === 'ios' ? 'System' : undefined,
        letterSpacing: -1,
        width: size,
        textAlign: 'center',
      }}>{time}</Text>
    </View>
  );
};

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 16,
    fontWeight: '400',
    opacity: 0.6,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    opacity: 0.6,
  },
  sectionContent: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    marginLeft: 12,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '400',
    marginBottom: 2,
  },
  rowSubtitle: {
    fontSize: 14,
    fontWeight: '400',
    opacity: 0.6,
  },
  rightElement: {
    marginLeft: 8,
  },
  chevron: {
    marginLeft: 8,
  },
  archiveInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
  },
  archiveInputLabel: {
    fontSize: 16,
    fontWeight: '400',
    marginRight: 8,
  },
  archiveInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 60,
    textAlign: 'center',
    fontSize: 16,
    marginHorizontal: 8,
  },
  // --- Pomodoro Modal Redesign ---
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  pomoModalContainer: {
    width: '100%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 12,
  },
  pomoModalHeader: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    position: 'relative',
  },
  pomoModalHandle: {
    position: 'absolute',
    top: -8,
    left: '50%',
    marginLeft: -18,
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#d1d1d6',
    opacity: 0.5,
  },
  pomoModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.2,
    flex: 1,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : undefined,
  },
  pomoCloseButton: {
    position: 'absolute',
    right: 0,
    top: 0,
    padding: 4,
  },
  pomoTimerSection: {
    alignItems: 'center',
    marginBottom: 16,
    width: '100%',
  },
  pomoTimerLabel: {
    fontSize: 15,
    fontWeight: '400',
    opacity: 0.7,
    marginTop: 2,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : undefined,
  },
  pomoTimerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    gap: 16,
    marginTop: 8,
  },
  pomoStartButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#34c759',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
    shadowColor: '#34c759',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 2,
  },
  pomoStartButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
    fontFamily: Platform.OS === 'ios' ? 'System' : undefined,
  },
  pomoPauseButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#ff453a',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
    shadowColor: '#ff453a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 2,
  },
  pomoPauseButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
    fontFamily: Platform.OS === 'ios' ? 'System' : undefined,
  },
  pomoResetButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    // backgroundColor set dynamically
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },
  pomoResetButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    fontFamily: Platform.OS === 'ios' ? 'System' : undefined,
  },
}); 