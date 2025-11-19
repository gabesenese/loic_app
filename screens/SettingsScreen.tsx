import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, TextInput, Platform, Alert, InteractionManager } from 'react-native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ThemeType } from '../ThemeContext';
import * as Notifications from 'expo-notifications';

// Render blocker: prevents UI from showing until all state effects complete
function ScreenWrapper({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    InteractionManager.runAfterInteractions(() => {
      setReady(true);
    });
  }, []);

  if (!ready) return <View style={{ flex: 1 }} />;

  return <>{children}</>;
}

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

  // Load settings from storage
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const notifVal = await AsyncStorage.getItem(NOTIFICATIONS_KEY);
        if (mounted && notifVal !== null) setNotificationsEnabled(notifVal === 'true');
        
        const autoVal = await AsyncStorage.getItem(AUTO_ARCHIVE_KEY);
        if (mounted && autoVal !== null) setAutoArchive(autoVal === 'true');
        
        const daysVal = await AsyncStorage.getItem(ARCHIVE_DAYS_KEY);
        if (mounted && daysVal !== null) {
          const days = parseInt(daysVal, 10);
          if (days >= 1) {
            setArchiveDays(days);
            setArchiveDaysInput(days.toString());
          }
        }
      } catch (err) {
        console.warn('Failed to load settings', err);
      }
    })();
    return () => { mounted = false; };
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



  return (
    <ScreenWrapper>
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
      </SafeAreaView>
    </ScreenWrapper>
  );
}



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
}); 