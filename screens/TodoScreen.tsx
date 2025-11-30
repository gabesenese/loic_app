import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, FlatList, Platform, TouchableWithoutFeedback, Keyboard, InteractionManager, Animated as RNAnimated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';

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
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
// FocusViews removed - functionality moved to Focus Zone
import CalendarPopover from '../components/CalendarPopover';
import { Ionicons } from '@expo/vector-icons';
import { FontAwesome5 } from '@expo/vector-icons';
import Header from '../components/Header';
import { useTheme } from '../ThemeContext';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, runOnJS, Easing } from 'react-native-reanimated';
import { Swipeable } from 'react-native-gesture-handler';
import { SubtaskIndicator } from '../components/SubtaskIndicator';
import TaskModal from '../components/TaskModal';

interface Task {
  id: string;
  text: string;
  note?: string;
  priority: 'None' | 'Low' | 'Medium' | 'High';
  dueType: string;
  dueDate?: string;
  completed: boolean;
  subtasks: { id: string; text: string; completed: boolean }[];
  category?: string;
  archived: boolean;
}

const STORAGE_KEY = 'TODO_TASKS';
const AUTO_ARCHIVE_KEY = 'AUTO_ARCHIVE_ENABLED';
const ARCHIVE_DAYS_KEY = 'ARCHIVE_DAYS';

// Priority colors for compatibility
const PRIORITY_COLORS = {
  None: {
    light: { bg: "#f2f2f7", color: "#8e8e93", border: "#e5e5ea" },
    dark: { bg: "#23232b", color: "#8e8e93", border: "#353542" }
  },
  Low: {
    light: { bg: "#e9f8ef", color: "#34c759", border: "#b7f5d8" },
    dark: { bg: "#19392b", color: "#30d158", border: "#295c44" }
  },
  Medium: {
    light: { bg: "#fff6e5", color: "#ff9500", border: "#ffe5b2" },
    dark: { bg: "#3a2a13", color: "#ff9f0a", border: "#5c4420" }
  },
  High: {
    light: { bg: "#ffe5e7", color: "#ff3b30", border: "#ffd1d4" },
    dark: { bg: "#3a191b", color: "#ff453a", border: "#5c292c" }
  }
};

// Move styles definition to the top, after imports
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  mainContent: { flex: 1, padding: 0, paddingTop: 32 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
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
    fontFamily: Platform.OS === 'ios' ? 'SF Pro' : undefined,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 12,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro' : undefined,
  },
  addTaskBtn: {
    position: 'absolute',
    bottom: 32,
    alignSelf: 'center',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  modal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalBackdrop: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    position: 'relative',
  },
  modalBackdropTouchable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContainer: { 
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: '-50%' }, { translateY: '-50%' }],
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 20,
  },
  modalContent: { 
    backgroundColor: 'rgba(255, 255, 255, 0.95)', 
    borderRadius: 20, 
    padding: 24, 
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 40,
    elevation: 20,
    marginBottom: 0,
  },
  modalTitle: { 
    fontSize: 20, 
    fontWeight: '600', 
    marginBottom: 20, 
    textAlign: 'center',
    color: '#1a1a1a',
  },
  inputContainer: {
    width: '100%',
    flexShrink: 0,
    flexGrow: 0,
  },
  input: { 
    borderWidth: 1, 
    borderColor: 'rgba(225, 229, 233, 0.6)', 
    borderRadius: 12, 
    padding: 16, 
    marginBottom: 24, 
    fontSize: 16,
    backgroundColor: 'rgba(248, 249, 250, 0.8)',
    minHeight: 48,
    maxHeight: 48,
    height: 48,
    width: '100%',
    flex: 0,
  },
  modalActions: { 
    flexDirection: 'row', 
    justifyContent: 'space-between',
    gap: 12,
  },
  cancelBtn: { 
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(241, 243, 244, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#5f6368',
  },
  saveBtn: { 
    flex: 1,
    padding: 16, 
    backgroundColor: 'rgba(26, 115, 232, 0.9)', 
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  taskItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 18, 
    borderBottomWidth: 0, 
    borderColor: 'transparent', 
    borderRadius: 16, 
    marginBottom: 12, 
    marginHorizontal: 0,
    backgroundColor: 'rgba(250, 251, 252, 0.95)', 
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  checkCircle: { 
    width: 24, 
    height: 24, 
    borderRadius: 12, 
    borderWidth: 2.5, 
    borderColor: '#3b82f6', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 16,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  checkCircleCompleted: { backgroundColor: '#3b82f6' },
  checkMark: { color: '#fff', fontWeight: 'bold' },
  taskText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 22,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro' : undefined,
    letterSpacing: 0.2,
  },
  taskTextCompleted: {
    textDecorationLine: 'line-through',
    color: '#aaa',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro' : undefined,
  },
  deleteBtn: { marginLeft: 8, padding: 4 },
  deleteBtnText: { fontSize: 20, color: '#ff453a' },
  editBtn: { marginLeft: 8, padding: 4 },
  editBtnText: { fontSize: 16, color: '#3b82f6' },
  priorityBadge: {
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginLeft: 10,
    alignSelf: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  priorityBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  moreOptionsBtn: {
    marginLeft: 8,
    padding: 8,
    borderRadius: 4,
  },
  moreOptionsText: {
    fontSize: 18,
    color: '#3b82f6',
    fontWeight: 'bold',
  },
  menuContainer: {
    position: 'relative',
    zIndex: 100,
    elevation: 10,
  },
  menuDropdown: {
    position: 'absolute',
    right: 0,
    top: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(224, 224, 224, 0.6)',
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 15,
    minWidth: 120,
    zIndex: 100,
  },
  menuItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemText: {
    fontSize: 14,
    fontWeight: '500',
  },
  menuIcon: {
    marginRight: 8
  },
  deleteButton: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 90,
    marginBottom: 12,
    overflow: 'hidden',
  },
  deleteButtonTouchable: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
    flexDirection: 'column',
    gap: 2,
  },
  deleteButtonText: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  subtaskDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#34c759',
    marginLeft: 10,
    marginRight: 0,
    alignSelf: 'center',
    shadowColor: '#34c759',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.4,
    shadowRadius: 2,
  },
});

function renderRightActions(progress: Animated.AnimatedInterpolation<number>, dragX: Animated.AnimatedInterpolation<number>, onDelete: () => void, isDark: boolean = false) {
  try {
    // Advanced scale animation with elastic feel
    const scale = progress.interpolate({
      inputRange: [0, 0.3, 0.6, 1],
      outputRange: [0.7, 0.95, 1.05, 1],
      extrapolate: 'clamp',
    });

    // Smooth opacity with faster reveal
    const opacity = progress.interpolate({
      inputRange: [0, 0.2, 1],
      outputRange: [0, 0.95, 1],
      extrapolate: 'clamp',
    });

    // Refined slide-in from right
    const translateX = progress.interpolate({
      inputRange: [0, 0.4, 1],
      outputRange: [50, 8, 0],
      extrapolate: 'clamp',
    });

    // Dynamic border radius that merges with task item
    const borderRadius = progress.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [16, 14, 12],
      extrapolate: 'clamp',
    });

    // Icon scale animation for emphasis
    const iconScale = progress.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0.6, 1.1, 1],
      extrapolate: 'clamp',
    });

    // Ensure all values are numbers
    const scaleValue = typeof scale === 'number' ? scale : 1;
    const opacityValue = typeof opacity === 'number' ? opacity : 1;
    const translateXValue = typeof translateX === 'number' ? translateX : 0;
    const borderRadiusValue = typeof borderRadius === 'number' ? borderRadius : 12;
    const iconScaleValue = typeof iconScale === 'number' ? iconScale : 1;

    // Use High priority colors based on theme
    const bgColor = isDark ? '#3a191b' : '#ffe5e7';
    const textColor = isDark ? '#ff453a' : '#ff3b30';
    const borderColor = isDark ? '#5c292c' : '#ffd1d4';

    return (
      <Animated.View
        style={[
          styles.deleteButton,
          {
            opacity: opacityValue,
            backgroundColor: bgColor,
            transform: [
              { scale: scaleValue },
              { translateX: translateXValue }
            ],
            borderRadius: borderRadiusValue,
            borderWidth: 1,
            borderColor: borderColor,
            shadowColor: textColor,
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: opacityValue * 0.15,
            shadowRadius: 4,
            elevation: 2,
          }
        ]}
      >
        <TouchableOpacity
          onPress={onDelete}
          style={styles.deleteButtonTouchable}
          activeOpacity={0.7}
        >
          <Animated.View style={{ transform: [{ scale: iconScaleValue }] }}>
            <Ionicons name="trash" size={22} color={textColor} />
          </Animated.View>
          <Text style={[styles.deleteButtonText, { color: textColor }]}>Delete</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  } catch (error) {
    console.warn('[TodoScreen] Error in renderRightActions:', error);
    // Fallback to static values
    const bgColor = isDark ? '#3a191b' : '#ffe5e7';
    const textColor = isDark ? '#ff453a' : '#ff3b30';
    return (
      <Animated.View style={[styles.deleteButton, { opacity: 1, transform: [{ scale: 1 }], backgroundColor: bgColor }]}>
        <TouchableOpacity onPress={onDelete} style={styles.deleteButtonTouchable}>
          <Ionicons name="trash" size={22} color={textColor} />
          <Text style={[styles.deleteButtonText, { color: textColor }]}>Delete</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  }
}

function isToday(dateStr?: string) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}
function isTomorrow(dateStr?: string) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  now.setDate(now.getDate() + 1);
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}
function isThisWeek(dateStr?: string) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - now.getDay());
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return d >= start && d <= end;
}

function daysBetween(date1: Date, date2: Date) {
  const d1 = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
  const d2 = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());
  return Math.floor((d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24));
}

// Helper function to check if a task belongs to a specific date
function isTaskForDate(task: Task, targetDate: Date): boolean {
  // If task has no due date, it defaults to today
  if (!task.dueDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return targetDate.getTime() === today.getTime();
  }

  // If task has a due date, check if it matches the target date
  const taskDate = new Date(task.dueDate);
  taskDate.setHours(0, 0, 0, 0);
  return taskDate.getTime() === targetDate.getTime();
}

function filterTasks(tasks: Task[], focusView: string): Task[] {
  if (focusView === 'archive') return tasks.filter(t => t.archived);
  return tasks.filter(t => !t.archived && (
    focusView === 'all' ? true :
      focusView === 'important' ? t.priority === 'High' :
        focusView === 'today' ? isToday(t.dueDate) :
          focusView === 'tomorrow' ? isTomorrow(t.dueDate) :
            focusView === 'work' ? t.category === 'work' :
              focusView === 'personal' ? t.category === 'personal' :
                focusView === 'week' ? isThisWeek(t.dueDate) :
                  true
  ));
}

function getHeaderDateLabel(date: Date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  if (d.getTime() === today.getTime()) return 'Today';
  if (d.getTime() === tomorrow.getTime()) return 'Tomorrow';
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
}

export function formatDateForDisplay(dateString: string): string {
  try {
    if (!dateString) return '';

    const date = new Date(dateString);

    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.warn('[TodoScreen] Invalid date string:', dateString);
      return '';
    }

    const month = date.toLocaleDateString('en-US', { month: 'long' });
    const day = date.getDate();

    // Add ordinal suffix to day
    const getOrdinalSuffix = (day: number) => {
      if (day > 3 && day < 21) return 'th';
      switch (day % 10) {
        case 1: return 'st';
        case 2: return 'nd';
        case 3: return 'rd';
        default: return 'th';
      }
    };

    return `${month} ${day}${getOrdinalSuffix(day)}`;
  } catch (error) {
    console.warn('[TodoScreen] Error in formatDateForDisplay:', error);
    return '';
  }
}

const AnimatedCheckMark = ({ completed, color }: { completed: boolean, color: string }) => {
  const scale = useSharedValue(completed ? 1 : 0);
  React.useEffect(() => {
    scale.value = withTiming(completed ? 1 : 0, { duration: 300 });
  }, [completed]);
  const animatedStyle = useAnimatedStyle(() => {
    const scaleValue = typeof scale.value === 'number' ? scale.value : 0;
    return {
      transform: [{ scale: 0.2 + 0.8 * scaleValue }],
    };
  });
  return (
    <Animated.View style={animatedStyle}>
      {completed ? <Text style={{ color, fontWeight: 'bold' }}>✓</Text> : null}
    </Animated.View>
  );
};

const TaskList = ({ tasks, onToggle, onEdit, onDelete }: { tasks: Task[], onToggle: (id: string) => void, onEdit: (task: Task) => void, onDelete: (id: string) => void }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [longPressedId, setLongPressedId] = useState<string | null>(null);

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={tasks}
        keyExtractor={item => item.id}
        scrollEnabled={tasks.length > 1}
        renderItem={({ item }) => (
          <Swipeable
            renderRightActions={(progress, dragX) => renderRightActions(progress, dragX, () => onDelete(item.id), isDark)}
            overshootRight={false}
            friction={2}
            rightThreshold={40}
            enableTrackpadTwoFingerGesture={true}
          >
            <TouchableOpacity
              style={[
                styles.taskItem, 
                { 
                  backgroundColor: isDark ? '#23232a' : '#fafbfc', 
                  borderColor: isDark ? '#333' : '#eee',
                  transform: [{ scale: longPressedId === item.id ? 0.98 : 1 }]
                }
              ]}
              activeOpacity={0.9}
              onPressOut={() => {
                setLongPressedId(null);
              }}
            >
              <TouchableOpacity 
                onPress={() => onToggle(item.id)} 
                style={[styles.checkCircle, item.completed ? styles.checkCircleCompleted : null, { borderColor: isDark ? '#3b82f6' : '#3b82f6', backgroundColor: item.completed ? (isDark ? '#3b82f6' : '#3b82f6') : 'transparent' }]}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                activeOpacity={0.8}
              >
                <AnimatedCheckMark completed={item.completed} color={isDark ? '#fff' : '#fff'} />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <TouchableOpacity
                  style={{ flex: 1 }}
                  onLongPress={() => {
                    // console.log('Long press detected for task:', item.text);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setLongPressedId(item.id);
                    setTimeout(() => setLongPressedId(null), 200);
                    // Use the existing onEdit function
                    onEdit(item);
                  }}
                  delayLongPress={300}
                  activeOpacity={1}
                >
                  <Text style={[styles.taskText, item.completed ? styles.taskTextCompleted : null, { color: isDark ? '#fff' : '#222' }]}>{item.text}</Text>
                </TouchableOpacity>
              </View>
              {/* Subtask indicator: small green dot if subtasks exist */}
              {item.subtasks && item.subtasks.length > 0 && !item.completed ? (
                <SubtaskIndicator style={styles.subtaskDot} />
              ) : null}
              {item.priority && item.priority !== 'None' ? (
                <View style={[styles.priorityBadge, {
                  backgroundColor: PRIORITY_COLORS[item.priority][isDark ? "dark" : "light"].bg,
                  borderColor: PRIORITY_COLORS[item.priority][isDark ? "dark" : "light"].border,
                },
                ]}>
                  <Text style={[styles.priorityBadgeText, { 
                    color: PRIORITY_COLORS[item.priority][isDark ? "dark" : "light"].color }]}>{item.priority}</Text>
                </View>
              ) : null}
            </TouchableOpacity>
          </Swipeable>
        )}
        ListEmptyComponent={<Text style={{ color: '#888', textAlign: 'center', marginTop: 32 }}>No tasks yet</Text>}
        contentContainerStyle={{ paddingBottom: 100 }}
      />
    </View>
  );
};

const AddTaskModal = ({ visible, onClose, onAdd }: { visible: boolean, onClose: () => void, onAdd: (text: string) => void }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [text, setText] = useState('');
  const inputRef = useRef<TextInput>(null);
  const modalTranslateY = useRef(new RNAnimated.Value(0)).current;
  
  useEffect(() => {
    if (visible && inputRef.current) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  // Keyboard handling for TodoScreen modal
  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      'keyboardWillShow', 
      (e) => {
        RNAnimated.timing(modalTranslateY, {
          toValue: -e.endCoordinates.height * 0.3,
          duration: 250,
          useNativeDriver: false,
        }).start();
      }
    );

    const keyboardWillHide = Keyboard.addListener(
      'keyboardWillHide', 
      () => {
        RNAnimated.timing(modalTranslateY, {
          toValue: 0,
          duration: 250,
          useNativeDriver: false,
        }).start();
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);
  
  const handleClose = () => {
    setText(''); // Clear text when closing
    onClose();
  };

  const handleBackdropPress = () => {
    handleClose();
  };

  return (
    <Modal 
      visible={visible} 
      animationType="fade" 
      transparent
      hardwareAccelerated={true}
      statusBarTranslucent={false}
      onRequestClose={handleClose}
    >
      <View style={styles.modalBackdrop}>
        <TouchableWithoutFeedback onPress={handleBackdropPress}>
          <View style={styles.modalBackdropTouchable} />
        </TouchableWithoutFeedback>
        <RNAnimated.View style={[styles.modalContainer, { transform: [{ translateY: modalTranslateY }] }]}>
          <TouchableWithoutFeedback onPress={() => {
            // Dismiss keyboard when tapping in modal content but outside input
            if (inputRef.current) {
              inputRef.current.blur();
            }
          }}>
            <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Add Task</Text>
                <TouchableWithoutFeedback onPress={() => {}}>
                  <View style={styles.inputContainer}>
                    <TextInput
                      ref={inputRef}
                      style={styles.input}
                      placeholder="What needs to be done?"
                      placeholderTextColor="#999"
                      value={text}
                      onChangeText={setText}
                      autoFocus={true}
                      returnKeyType="done"
                      blurOnSubmit={false}
                      selectTextOnFocus={false}
                      clearButtonMode="while-editing"
                      enablesReturnKeyAutomatically={true}
                      keyboardAppearance={isDark ? "dark" : "light"}
                      scrollEnabled={false}
                      editable={true}
                      onSubmitEditing={() => {
                        if (text.trim()) {
                          onAdd(text.trim());
                          handleClose();
                        }
                      }}
                    />
                  </View>
                </TouchableWithoutFeedback>
                <View style={styles.modalActions}>
                  <TouchableOpacity onPress={handleClose} style={styles.cancelBtn}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => { 
                      if (text.trim()) { 
                        onAdd(text.trim()); 
                        handleClose(); 
                      } 
                    }} 
                    style={styles.saveBtn}
                  >
                    <Text style={styles.saveBtnText}>Add</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </RNAnimated.View>
        </View>
    </Modal>
  );
};

const SettingsModal = ({ visible, onClose }: { visible: boolean, onClose: () => void }) => (
  <Modal visible={visible} animationType="slide" transparent>
    <View style={styles.modal}>
      <Text>Settings Modal</Text>
      <TouchableOpacity onPress={onClose}>
        <Text>Close</Text>
      </TouchableOpacity>
    </View>
  </Modal>
);

export default function TodoScreen() {
  const route = useRoute();
  const focusView = ((route.params as { focusView?: string })?.focusView) ?? 'all';
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const buttonScale = useSharedValue(1);
  const [customDueDate, setCustomDueDate] = useState<string | undefined>(undefined);
  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  });
  const [autoArchive, setAutoArchive] = useState(true);
  const [archiveDays, setArchiveDays] = useState(7);

  const animatedButtonStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: buttonScale.value },
      ],
    };
  });




  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await AsyncStorage.getItem(STORAGE_KEY);
        if (!mounted) return;
        if (data) setTasks(JSON.parse(data));
        else setTasks([]);
        
        // Load auto archive settings
        const autoArchiveVal = await AsyncStorage.getItem(AUTO_ARCHIVE_KEY);
        if (mounted && autoArchiveVal !== null) setAutoArchive(autoArchiveVal === 'true');
        
        const archiveDaysVal = await AsyncStorage.getItem(ARCHIVE_DAYS_KEY);
        if (mounted && archiveDaysVal !== null) {
          const days = parseInt(archiveDaysVal, 10);
          if (days >= 1) setArchiveDays(days);
        }
      } catch (err) {
        console.warn('Failed to load data', err);
        if (mounted) {
          setTasks([]);
          setAutoArchive(true);
          setArchiveDays(7);
        }
      }
    })();
    return () => { 
      mounted = false; 
    };
  }, []);

  // Debounce AsyncStorage writes to improve performance
  useEffect(() => {
    if (tasks.length === 0) return; // Don't save empty array on initial load
    
    const timeoutId = setTimeout(() => {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)).catch((err) => {
        console.warn('Failed to save tasks', err);
      });
    }, 500); // 500ms debounce delay
    
    return () => {
      clearTimeout(timeoutId);
    };
  }, [tasks]);

  useEffect(() => {
    if (!autoArchive) return;
    const now = new Date();
    setTasks(prev => {
      let changed = false;
      const updated = prev.map(task => {
        if (
          task.completed &&
          !task.archived &&
          task.dueDate &&
          daysBetween(now, new Date(task.dueDate)) >= archiveDays
        ) {
          changed = true;
          return { ...task, archived: true };
        }
        return task;
      });
      return changed ? updated : prev;
    });
  }, [autoArchive, archiveDays]);

  const addTask = (task: Omit<Task, 'id'>) => {
    setTasks(prev => [{ ...task, id: Date.now().toString(), archived: false }, ...prev]);
  };
  const updateTask = (task: Task) => {
    setTasks(prev => prev.map(t => t.id === task.id ? task : t));
  };
  const deleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  let filteredTasks = filterTasks(tasks, focusView);
  filteredTasks = filteredTasks.filter(t => isTaskForDate(t, currentDate));
    const headerTitle = 
    focusView === 'all' ? 'All Tasks' :
    focusView === 'today' ? 'Today' :
    focusView === 'important' ? 'Important' :
    focusView === 'week' ? 'This Week' :
    focusView.charAt(0).toUpperCase() + focusView.slice(1);

  return (
    <ScreenWrapper>
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#000000' : '#f3f4f6' }]} edges={['top', 'left', 'right']}>
        <View style={styles.mainContent}>
          <Header
            currentDate={currentDate}
            onPrev={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setCurrentDate(prev => {
                const d = new Date(prev);
                d.setDate(d.getDate() - 1);
                return d;
              });
            }}
            onNext={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setCurrentDate(prev => {
                const d = new Date(prev);
                d.setDate(d.getDate() + 1);
                return d;
              });
            }}
          />
        <TaskList
          tasks={filteredTasks}
          onToggle={id => setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t))}
          onEdit={task => {
            setEditingTask(task);
            setShowTaskForm(true);
          }}
          onDelete={deleteTask}
        />
        <TouchableOpacity
          onPress={async () => {
            buttonScale.value = withSpring(0.88, { damping: 15, stiffness: 500 });
            
            try {
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            } catch (error) {
              console.log('Haptic feedback not available');
            }
            
            setTimeout(() => {
              buttonScale.value = withSpring(1, { damping: 15, stiffness: 500 });
              setShowTaskForm(true);
            }, 100);
          }}
          activeOpacity={1}
        >
          <Animated.View
            style={[styles.addTaskBtn, {
              position: 'absolute',
              bottom: 24,
              left: '50%',
              marginLeft: -28,
              backgroundColor: isDark 
                ? 'rgba(255, 255, 255, 0.08)'
                : 'rgba(0, 0, 0, 0.09)',
              borderRadius: 28,
              width: 56,
              height: 56,
              justifyContent: 'center',
              alignItems: 'center',
              shadowColor: isDark ? '#ffffff' : '#000000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: isDark ? 0.35 : 0.6,
              shadowRadius: 6,
              elevation: 8,
              borderWidth: isDark ? 0.5 : 0,
              borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
            }, animatedButtonStyle]}
          >
            <FontAwesome5 name="plus" size={24} color={isDark ? '#ffffff' : '#000000'} />
          </Animated.View>
        </TouchableOpacity>
        </View>
        {/* Task Form Modal */}
        <TaskModal
          visible={!!editingTask || showTaskForm}
          onClose={() => {
            setEditingTask(null);
            setShowTaskForm(false);
            setCustomDueDate(undefined);
          }}
          onSave={(taskData) => {
            if (taskData.id) {
              updateTask({
                id: taskData.id,
                text: taskData.text,
                note: taskData.notes,
                priority: taskData.priority,
                dueType: taskData.dueDate ? 'custom' : 'none',
                dueDate: taskData.dueDate || undefined,
                completed: taskData.completed,
                subtasks: taskData.subtasks?.map(st => ({
                  id: st.id,
                  text: st.text,
                  completed: st.completed,
                })) || [],
                archived: false,
              });
            } else {
              addTask({
                text: taskData.text,
                note: taskData.notes,
                priority: taskData.priority,
                dueType: taskData.dueDate ? 'custom' : 'none',
                dueDate: taskData.dueDate || undefined,
                completed: false,
                subtasks: taskData.subtasks?.map(st => ({
                  id: st.id,
                  text: st.text,
                  completed: st.completed,
                })) || [],
                archived: false,
              });
            }
            setEditingTask(null);
            setShowTaskForm(false);
            setCustomDueDate(undefined);
          }}
          editingTask={editingTask ? {
            id: editingTask.id,
            text: editingTask.text,
            notes: editingTask.note || '',
            priority: editingTask.priority,
            dueDate: editingTask.dueDate || null,
            reminder: 'none',
            completed: editingTask.completed,
            subtasks: editingTask.subtasks?.map(st => ({
              id: st.id,
              text: st.text,
              completed: st.completed,
              createdAt: Date.now(),
            })) || [],
          } : null}
        />

        <CalendarPopover
          visible={calendarVisible}
          onClose={() => setCalendarVisible(false)}
          onSelectDate={date => {
            setCustomDueDate(date);
            setCalendarVisible(false);
          }}
        />
        <SettingsModal visible={settingsVisible} onClose={() => setSettingsVisible(false)} />
      </SafeAreaView>
    </ScreenWrapper>
  );
}