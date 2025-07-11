import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Keyboard,
  Platform,
  Dimensions,
  ScrollView,
  Alert,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
  Easing,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../ThemeContext';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Apple's semantic colors
const APPLE_COLORS = {
  light: {
    background: '#ffffff',
    secondaryBackground: '#f2f2f7',
    tertiaryBackground: '#e5e5ea',
    label: '#000000',
    secondaryLabel: '#3c3c43',
    tertiaryLabel: '#787880',
    separator: '#c6c6c8',
    systemBlue: '#007aff',
    systemGreen: '#34c759',
    systemOrange: '#ff9500',
    systemRed: '#ff3b30',
    systemGray: '#8e8e93',
    systemGray2: '#aeaeb2',
    systemGray3: '#c7c7cc',
    systemGray4: '#d1d1d6',
    systemGray5: '#e5e5ea',
    systemGray6: '#f2f2f7',
  },
  dark: {
    background: '#000000',
    secondaryBackground: '#1c1c1e',
    tertiaryBackground: '#2c2c2e',
    label: '#ffffff',
    secondaryLabel: '#ebebf5',
    tertiaryLabel: '#ebebf599',
    separator: '#38383a',
    systemBlue: '#0a84ff',
    systemGreen: '#30d158',
    systemOrange: '#ff9f0a',
    systemRed: '#ff453a',
    systemGray: '#8e8e93',
    systemGray2: '#636366',
    systemGray3: '#48484a',
    systemGray4: '#3a3a3c',
    systemGray5: '#2c2c2e',
    systemGray6: '#1c1c1e',
  }
};

const PRIORITY_COLORS = {
  None: { bg: '#f2f2f7', color: '#8e8e93', border: '#e5e5ea' },
  Low: { bg: '#e9f8ef', color: '#34c759', border: '#b7f5d8' },
  Medium: { bg: '#fff6e5', color: '#ff9500', border: '#ffe5b2' },
  High: { bg: '#ffe5e7', color: '#ff3b30', border: '#ffd1d4' },
};

const DUE_DATE_OPTIONS = [
  { key: 'none', label: 'No Due Date', icon: 'calendar-outline' },
  { key: 'today', label: 'Today', icon: 'today-outline' },
  { key: 'tomorrow', label: 'Tomorrow', icon: 'calendar-outline' },
  { key: 'nextWeek', label: 'Next Week', icon: 'calendar-outline' },
  { key: 'custom', label: 'Custom Date', icon: 'calendar-outline' },
];

const PRIORITY_OPTIONS = [
  { key: 'None', label: 'None', icon: 'ellipse-outline' },
  { key: 'Low', label: 'Low', icon: 'checkmark-circle-outline' },
  { key: 'Medium', label: 'Medium', icon: 'remove-circle-outline' },
  { key: 'High', label: 'High', icon: 'alert-circle-outline' },
];

const REMINDER_OPTIONS = [
  { key: 'none', label: 'No Reminder', icon: 'notifications-off-outline' },
  { key: '5min', label: '5 minutes before', icon: 'time-outline' },
  { key: '15min', label: '15 minutes before', icon: 'time-outline' },
  { key: '1hour', label: '1 hour before', icon: 'time-outline' },
  { key: '1day', label: '1 day before', icon: 'time-outline' },
];

interface TaskModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (task: TaskData) => void;
  editingTask?: TaskData | null;
}

interface TaskData {
  id?: string;
  text: string;
  notes: string;
  priority: 'None' | 'Low' | 'Medium' | 'High';
  dueDate: string | null;
  reminder: string;
  completed: boolean;
}

// Apple-style Settings Row Component
const SettingsRow = ({ 
  title, 
  subtitle, 
  rightElement, 
  onPress, 
  isDark 
}: { 
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
    <View style={styles.textContainer}>
      <Text style={[styles.rowTitle, { color: isDark ? '#ffffff' : '#000000' }]}>{title}</Text>
      {subtitle && <Text style={[styles.rowSubtitle, { color: isDark ? '#8e8e93' : '#6b7280' }]}>{subtitle}</Text>}
    </View>
    {rightElement && <View style={styles.rightElement}>{rightElement}</View>}
    {onPress && <Ionicons name="chevron-forward" size={16} color={isDark ? '#8e8e93' : '#c7c7cc'} style={styles.chevron} />}
  </TouchableOpacity>
);

// Settings Section Component
const SettingsSection = ({ title, children, isDark }: { title: string; children: React.ReactNode; isDark: boolean }) => (
  <View style={styles.settingsSection}>
    <Text style={[styles.settingsSectionTitle, { color: isDark ? '#8e8e93' : '#8e8e93' }]}>{title}</Text>
    <View style={[styles.sectionContent, { backgroundColor: isDark ? '#1c1c1e' : '#ffffff' }]}>
      {children}
    </View>
  </View>
);

export default function TaskModal({ 
  visible, 
  onClose, 
  onSave, 
  editingTask 
}: TaskModalProps) {
  const { theme } = useTheme();
  const colors = APPLE_COLORS[theme];
  const isDark = theme === 'dark';

  // Form state
  const [taskText, setTaskText] = useState(editingTask?.text || '');
  const [notes, setNotes] = useState(editingTask?.notes || '');
  const [priority, setPriority] = useState<TaskData['priority']>(editingTask?.priority || 'None');
  const [dueDate, setDueDate] = useState<string | null>(editingTask?.dueDate || null);
  const [reminder, setReminder] = useState(editingTask?.reminder || 'none');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [customDate, setCustomDate] = useState(new Date());

  // Dropdown states
  const [showDueDateDropdown, setShowDueDateDropdown] = useState(false);
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);
  const [showReminderDropdown, setShowReminderDropdown] = useState(false);
  const [showDueDatePicker, setShowDueDatePicker] = useState(false);

  // Animation values
  const modalOpacity = useSharedValue(0);
  const modalScale = useSharedValue(0.9);
  const modalTranslateY = useSharedValue(50);
  const keyboardHeight = useSharedValue(0);
  const backdropOpacity = useSharedValue(0);

  // Refs
  const taskInputRef = useRef<TextInput>(null);
  const notesInputRef = useRef<TextInput>(null);

  // Reset form when editing task changes
  useEffect(() => {
    if (editingTask) {
      setTaskText(editingTask.text);
      setNotes(editingTask.notes);
      setPriority(editingTask.priority);
      setDueDate(editingTask.dueDate);
      setReminder(editingTask.reminder);
    } else {
      setTaskText('');
      setNotes('');
      setPriority('None');
      setDueDate(null);
      setReminder('none');
    }
  }, [editingTask]);

  // Modal animations
  useEffect(() => {
    if (visible) {
      backdropOpacity.value = withTiming(1, {
        duration: 300,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
      });
      modalOpacity.value = withTiming(1, {
        duration: 300,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
      });
      modalScale.value = withSpring(1, {
        damping: 20,
        stiffness: 300,
        mass: 0.8,
      });
      modalTranslateY.value = withSpring(0, {
        damping: 20,
        stiffness: 300,
        mass: 0.8,
      });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else {
      backdropOpacity.value = withTiming(0, {
        duration: 250,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
      });
      modalOpacity.value = withTiming(0, {
        duration: 250,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
      });
      modalScale.value = withTiming(0.9, {
        duration: 250,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
      });
      modalTranslateY.value = withTiming(50, {
        duration: 250,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
      }, (finished) => {
        if (finished) runOnJS(onClose)();
      });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [visible]);

  // Keyboard handling
  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        keyboardHeight.value = withTiming(e.endCoordinates.height, {
          duration: 250,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
        });
      }
    );

    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        keyboardHeight.value = withTiming(0, {
          duration: 250,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
        });
      }
    );

    return () => {
      keyboardWillShowListener?.remove();
      keyboardWillHideListener?.remove();
    };
  }, []);

  const handleDueDateSelect = (option: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowDueDateDropdown(false);
    
    if (option === 'custom') {
      setShowDatePicker(true);
      return;
    }

    const now = new Date();
    let selectedDate: Date | null = null;

    switch (option) {
      case 'today':
        selectedDate = now;
        break;
      case 'tomorrow':
        selectedDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        break;
      case 'nextWeek':
        selectedDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        break;
      case 'none':
        selectedDate = null;
        break;
    }

    setDueDate(selectedDate ? selectedDate.toISOString() : null);
  };

  const handleCustomDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setCustomDate(selectedDate);
      setDueDate(selectedDate.toISOString());
    }
  };

  const handlePrioritySelect = (selectedPriority: TaskData['priority']) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPriority(selectedPriority);
    setShowPriorityDropdown(false);
  };

  const handleReminderSelect = (selectedReminder: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setReminder(selectedReminder);
    setShowReminderDropdown(false);
  };

  const handleSave = () => {
    if (!taskText.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Task Required', 'Please enter a task title.');
      return;
    }

    const taskData: TaskData = {
      id: editingTask?.id,
      text: taskText.trim(),
      notes: notes.trim(),
      priority,
      dueDate,
      reminder,
      completed: editingTask?.completed || false,
    };

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSave(taskData);
  };

  const formatDueDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    if (date.toDateString() === now.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  const getSelectedDueDateLabel = () => {
    if (!dueDate) return 'No Due Date';
    return formatDueDate(dueDate);
  };

  const getSelectedReminderLabel = () => {
    const option = REMINDER_OPTIONS.find(opt => opt.key === reminder);
    return option ? option.label : 'No Reminder';
  };

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const modalStyle = useAnimatedStyle(() => {
    return {
      opacity: modalOpacity.value,
      transform: [
        { scale: modalScale.value },
        { translateY: modalTranslateY.value },
      ],
    };
  });

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={[styles.container, { backgroundColor: isDark ? '#00000099' : '#00000033' }]}> {/* semi-transparent backdrop */}
        <View style={[styles.modalContainer, { width: '100%' }]}> {/* full width */}
          <Animated.View
            style={[
              styles.modalContent,
              modalStyle,
              {
                backgroundColor: colors.systemGray6, // light gray bg
                borderRadius: 32,
                width: '100%',
                maxWidth: 600,
                alignSelf: 'center',
                paddingHorizontal: 0,
                paddingTop: 0,
                paddingBottom: 0,
              },
            ]}
          >
            {/* Minimal header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 28, paddingBottom: 0 }}>
              <TouchableOpacity
                style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}
                onPress={onClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={28} color={colors.label} />
              </TouchableOpacity>
              <Text style={[styles.title, { color: colors.label, flex: 1, textAlign: 'center', fontWeight: '700', fontSize: 22 }]}>Minimal Modal</Text>
              <View style={{ width: 44 }} />
            </View>

            {/* Only one pill row for Due Date */}
            <View style={{ paddingHorizontal: 28, paddingTop: 24 }}>
              <TouchableOpacity style={styles.pillRowRedesigned} onPress={() => setShowDueDatePicker((v) => !v)}>
                <Text style={[styles.pillLabel, { color: colors.label }]}>Due Date</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={[styles.pillValue, { color: colors.secondaryLabel }]}>{getSelectedDueDateLabel()}</Text>
                  <Ionicons name="chevron-down" size={20} color={colors.secondaryLabel} style={{ marginLeft: 6 }} />
                </View>
              </TouchableOpacity>
              {showDueDatePicker && (
                <View style={{ backgroundColor: '#fff', borderRadius: 16, marginTop: 8, overflow: 'hidden' }}>
                  <Picker
                    selectedValue={dueDate || 'none'}
                    onValueChange={(itemValue) => {
                      if (itemValue === 'custom') {
                        setShowDatePicker(true);
                        setShowDueDatePicker(false);
                        return;
                      }
                      setDueDate(itemValue === 'none' ? null : itemValue);
                      setShowDueDatePicker(false);
                    }}
                    mode="dropdown"
                  >
                    {DUE_DATE_OPTIONS.map((option) => (
                      <Picker.Item key={option.key} label={option.label} value={option.key} />
                    ))}
                  </Picker>
                </View>
              )}
            </View>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  backdropAnimated: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    width: '100%',
    maxHeight: screenHeight * 0.7,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 25,
    elevation: 15,
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 12,
    paddingHorizontal: 20,
    position: 'relative',
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 24,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scrollContentContainer: {
    paddingBottom: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  taskInput: {
    minHeight: 60,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
    textAlignVertical: 'top',
  },
  notesInput: {
    minHeight: 80,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
    textAlignVertical: 'top',
  },
  actionContainer: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 12,
  },
  cancelButton: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  // Settings-style components
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
  },
  textContainer: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '400',
    marginBottom: 2,
  },
  rowSubtitle: {
    fontSize: 14,
    fontWeight: '400',
  },
  rightElement: {
    marginRight: 8,
  },
  chevron: {
    marginLeft: 8,
  },
  settingsSection: {
    marginBottom: 32,
  },
  settingsSectionTitle: {
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
  priorityIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Dropdown styles
  dropdownBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownContainer: {
    width: '80%',
    maxWidth: 300,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 15,
  },
  dropdownTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginBottom: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  dropdownIcon: {
    marginRight: 12,
  },
  dropdownOptionText: {
    fontSize: 16,
    fontWeight: '400',
  },
  pillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 48,
    shadowColor: 'rgba(0,0,0,0.03)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 2,
  },
  pillRowRedesigned: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 22,
    marginBottom: 20,
    paddingHorizontal: 20,
    paddingVertical: 18,
    minHeight: 56,
    shadowColor: 'rgba(0,0,0,0.06)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
  },
  pillLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  pillValue: {
    fontSize: 16,
    fontWeight: '400',
  },
  pillInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '400',
    paddingVertical: 0,
    paddingHorizontal: 0,
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
}); 