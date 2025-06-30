import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Modal, TextInput, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SmartLists from '../components/SmartLists';
import AddEditTaskModal, { PRIORITY_COLORS } from '../components/AddEditTaskModal';
import CalendarPopover from '../components/CalendarPopover';
import { Ionicons } from '@expo/vector-icons';
import { FontAwesome5 } from '@expo/vector-icons';
import Header from '../components/Header';
import { useTheme } from '../ThemeContext';
import { BlurView } from 'expo-blur';
import { Animated } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { SubtaskIndicator } from '../components/SubtaskIndicator';

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

function renderRightActions(progress: any, dragX: any, onDelete: () => void) {
  const scale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 1],
    extrapolate: 'clamp',
  });

  const opacity = progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0.8, 1],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View style={[styles.deleteButton, { opacity, transform: [{ scale }] }]}>
      <TouchableOpacity onPress={onDelete} style={styles.deleteButtonTouchable}>
        <Ionicons name="trash" size={24} color="#c62828" />
      </TouchableOpacity>
    </Animated.View>
  );
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

function filterTasks(tasks: Task[], smartList: string): Task[] {
  if (smartList === 'archive') return tasks.filter(t => t.archived);
  return tasks.filter(t => !t.archived && (
    smartList === 'all' ? true :
    smartList === 'important' ? t.priority === 'High' :
    smartList === 'today' ? isToday(t.dueDate) :
    smartList === 'tomorrow' ? isTomorrow(t.dueDate) :
    smartList === 'work' ? t.category === 'work' :
    smartList === 'personal' ? t.category === 'personal' :
    smartList === 'week' ? isThisWeek(t.dueDate) :
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
  const date = new Date(dateString);
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
}

const AnimatedCheckMark = ({ completed, color }: { completed: boolean, color: string }) => {
  const scale = React.useRef(new Animated.Value(completed ? 1 : 0)).current;
  React.useEffect(() => {
    Animated.spring(scale, {
      toValue: completed ? 1 : 0,
      useNativeDriver: true,
      friction: 5,
      tension: 120,
    }).start();
  }, [completed]);
  return (
    <Animated.View style={{ transform: [{ scale: scale.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] }) }] }}>
      {completed && <Text style={{ color, fontWeight: 'bold' }}>✓</Text>}
    </Animated.View>
  );
};

const TaskList = ({ tasks, onToggle, onEdit, onDelete }: { tasks: Task[], onToggle: (id: string) => void, onEdit: (task: Task) => void, onDelete: (id: string) => void }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={tasks}
        keyExtractor={item => item.id}
        scrollEnabled={tasks.length > 1}
        renderItem={({ item }) => (
          <Swipeable
            renderRightActions={(progress, dragX) => renderRightActions(progress, dragX, () => onDelete(item.id))}
            overshootRight={false}
            friction={2}
            rightThreshold={40}
            enableTrackpadTwoFingerGesture={true}
          >
            <TouchableOpacity
              style={[styles.taskItem, { backgroundColor: isDark ? '#23232a' : '#fafbfc', borderColor: isDark ? '#333' : '#eee' }]}
              onPress={() => onEdit(item)}
              activeOpacity={0.8}
            >
              <TouchableOpacity onPress={() => onToggle(item.id)} style={[styles.checkCircle, item.completed && styles.checkCircleCompleted, { borderColor: isDark ? '#3b82f6' : '#3b82f6', backgroundColor: item.completed ? (isDark ? '#3b82f6' : '#3b82f6') : 'transparent' }] }>
                <AnimatedCheckMark completed={item.completed} color={isDark ? '#fff' : '#fff'} />
              </TouchableOpacity>
              <Text style={[styles.taskText, item.completed && styles.taskTextCompleted, { color: isDark ? '#fff' : '#222' }]}>{item.text}</Text>
              {/* Subtask indicator: small green dot if subtasks exist */}
              {item.subtasks && item.subtasks.length > 0 && !item.completed && (
                <SubtaskIndicator style={styles.subtaskDot} />
              )}
              {item.priority && item.priority !== 'None' && (
                <View style={[styles.priorityBadge, { backgroundColor: PRIORITY_COLORS[item.priority].bg, borderColor: PRIORITY_COLORS[item.priority].border }]}> 
                  <Text style={[styles.priorityBadgeText, { color: PRIORITY_COLORS[item.priority].color }]}>{item.priority}</Text>
                </View>
              )}
              <Text style={[styles.dueDateText, { color: isDark ? '#a5b4fc' : '#64748b' }]}>{formatDateForDisplay(item.dueDate || new Date().toISOString())}</Text>
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
  const [text, setText] = useState('');
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modal}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Add Task</Text>
          <TextInput
            style={styles.input}
            placeholder="What needs to be done?"
            value={text}
            onChangeText={setText}
            autoFocus
          />
          <View style={styles.modalActions}>
            <TouchableOpacity onPress={onClose} style={styles.cancelBtn}><Text>Cancel</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => { if (text.trim()) { onAdd(text.trim()); setText(''); onClose(); }}} style={styles.saveBtn}><Text style={{ color: '#fff' }}>Add</Text></TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const SettingsModal = ({ visible, onClose }: { visible: boolean, onClose: () => void }) => (
  <Modal visible={visible} animationType="slide" transparent>
    <View style={styles.modal}><Text>Settings Modal</Text><TouchableOpacity onPress={onClose}><Text>Close</Text></TouchableOpacity></View>
  </Modal>
);

export default function TodoScreen({ smartList = 'all' }: { smartList?: string }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [customDueDate, setCustomDueDate] = useState<string | undefined>(undefined);
  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  });
  const [autoArchive, setAutoArchive] = useState(true);
  const [archiveDays, setArchiveDays] = useState(7);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((data: string | null) => {
      if (data) setTasks(JSON.parse(data));
    });
    
    // Load auto archive settings
    AsyncStorage.getItem(AUTO_ARCHIVE_KEY).then(val => {
      if (val !== null) setAutoArchive(val === 'true');
    });
    
    AsyncStorage.getItem(ARCHIVE_DAYS_KEY).then(val => {
      if (val !== null) {
        const days = parseInt(val, 10);
        if (days >= 1) {
          setArchiveDays(days);
        }
      }
    });
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
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

  let filteredTasks = filterTasks(tasks, smartList);
  filteredTasks = filteredTasks.filter(t => isTaskForDate(t, currentDate));
  const headerTitle =
    smartList === 'all' ? 'All Tasks' :
    smartList === 'today' ? 'Today' :
    smartList === 'important' ? 'Important' :
    smartList === 'week' ? 'This Week' :
    smartList.charAt(0).toUpperCase() + smartList.slice(1);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#18181c' : '#f3f4f6' }]}>
      <View style={styles.mainContent}>
        <Header
          currentDate={currentDate}
          onPrev={() => setCurrentDate(prev => {
            const d = new Date(prev);
            d.setDate(d.getDate() - 1);
            return d;
          })}
          onNext={() => setCurrentDate(prev => {
            const d = new Date(prev);
            d.setDate(d.getDate() + 1);
            return d;
          })}
        />
        <TaskList
          tasks={filteredTasks}
          onToggle={id => setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t))}
          onEdit={task => setEditingTask(task)}
          onDelete={deleteTask}
        />
        <TouchableOpacity
          style={[styles.addTaskBtn, {
            backgroundColor: isDark ? '#fff' : '#111',
            borderColor: 'transparent',
            borderWidth: 0,
            borderRadius: 22,
            width: 44,
            height: 44,
            justifyContent: 'center',
            alignItems: 'center',
          }]}
          onPress={() => setEditingTask({
            id: '', text: '', note: '', priority: 'None', dueType: 'none', dueDate: undefined, completed: false, subtasks: [], category: '', archived: false
          })}
          activeOpacity={0.8}
        >
          <FontAwesome5 name="plus" size={22} color={isDark ? '#111' : '#fff'} />
        </TouchableOpacity>
      </View>
      <AddEditTaskModal
        visible={!!editingTask}
        onClose={() => { setEditingTask(null); setCustomDueDate(undefined); }}
        onSave={task => {
          if (task.id) updateTask(task as Task);
          else addTask(task as Omit<Task, 'id'>);
          if (task.dueDate && task.dueType === 'custom') {
            const dueDate = new Date(task.dueDate);
            dueDate.setHours(0, 0, 0, 0);
            setCurrentDate(dueDate);
          }
          setCustomDueDate(undefined);
        }}
        editingTask={editingTask ? { ...editingTask, note: editingTask.note || '', dueDate: customDueDate || editingTask.dueDate } : undefined}
        onCustomDueDate={() => setCalendarVisible(true)}
        onDelete={task => {
          if (task.id) {
            deleteTask(task.id);
            setEditingTask(null);
            setCustomDueDate(undefined);
          }
        }}
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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  mainContent: { flex: 1, padding: 20, paddingTop: 32 },
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
    right: 32,
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
  },
  modal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', borderRadius: 12, padding: 24, width: 300 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 16 },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between' },
  cancelBtn: { padding: 12 },
  saveBtn: { padding: 12, backgroundColor: '#3b82f6', borderRadius: 8 },
  taskItem: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderColor: '#eee', borderRadius: 10, marginBottom: 8, backgroundColor: '#fafbfc', elevation: 1 },
  checkCircle: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: '#3b82f6', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  checkCircleCompleted: { backgroundColor: '#3b82f6' },
  checkMark: { color: '#fff', fontWeight: 'bold' },
  taskText: { 
    flex: 1, 
    fontSize: 17,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro' : undefined,
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
    borderRadius: 12, 
    paddingHorizontal: 8, 
    paddingVertical: 2, 
    marginLeft: 8, 
    alignSelf: 'center' 
  },
  priorityBadgeText: { 
    fontSize: 13, 
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro' : undefined,
  },
  dueDateText: { 
    fontSize: 13, 
    color: '#64748b', 
    marginLeft: 8, 
    alignSelf: 'center',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro' : undefined,
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
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 10,
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
    width: 60,
    height: 60,
    borderRadius: 12,
    marginLeft: 1,
  },
  deleteButtonTouchable: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 60,
    height: 60,
    borderRadius: 12,
    marginLeft: 1,
  },
  subtaskDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#5c940d', // green for subtasks
    marginLeft: 8,
    marginRight: 0,
    alignSelf: 'center',
  },
}); 