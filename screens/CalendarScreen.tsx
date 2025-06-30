import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, SafeAreaView, ScrollView, Animated } from 'react-native';
import { useTheme } from '../ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { FontAwesome5 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PRIORITY_COLORS } from '../components/AddEditTaskModal';
import AddEditTaskModal from '../components/AddEditTaskModal';
import { Swipeable } from 'react-native-gesture-handler';
import { BlurView } from 'expo-blur';

const STORAGE_KEY = 'TODO_TASKS';

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

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isToday(dateStr: string) {
  const today = new Date();
  const todayStr = formatDate(today);
  return dateStr === todayStr;
}

function isTaskForDate(task: Task, targetDate: string): boolean {
  if (!task.dueDate) return false;
  // Convert task due date to YYYY-MM-DD format for comparison
  const taskDate = new Date(task.dueDate);
  const taskDateStr = formatDate(taskDate);
  return taskDateStr === targetDate;
}

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

// Helper to get days for the calendar grid, including prev/next month days
function getCalendarGrid(year: number, month: number) {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDayOfWeek = getFirstDayOfWeek(year, month);
  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  const daysInPrevMonth = getDaysInMonth(prevYear, prevMonth);
  // Days from previous month
  const prevMonthDays = Array.from({ length: firstDayOfWeek }, (_, i) => ({
    date: formatDate(new Date(prevYear, prevMonth, daysInPrevMonth - firstDayOfWeek + i + 1)),
    isCurrentMonth: false
  }));
  // Days in current month
  const thisMonthDays = Array.from({ length: daysInMonth }, (_, i) => ({
    date: formatDate(new Date(year, month, i + 1)),
    isCurrentMonth: true
  }));
  // Days from next month to fill the grid
  const totalCells = prevMonthDays.length + thisMonthDays.length;
  const nextMonthDays = Array.from({ length: (7 - (totalCells % 7)) % 7 }, (_, i) => ({
    date: formatDate(new Date(month === 11 ? year + 1 : year, month === 11 ? 0 : month + 1, i + 1)),
    isCurrentMonth: false
  }));
  return [...prevMonthDays, ...thisMonthDays, ...nextMonthDays];
}

// Helper to chunk an array into arrays of length n
function chunkArray<T>(arr: T[], n: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += n) {
    result.push(arr.slice(i, i + n));
  }
  return result;
}

export default function CalendarScreen() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showAddTask, setShowAddTask] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);

  // Load tasks from storage
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((data: string | null) => {
      if (data) setTasks(JSON.parse(data));
    });
  }, []);

  // Save tasks to storage whenever tasks change
  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }, [tasks]);

  const calendarDays = getCalendarGrid(currentYear, currentMonth);

  // Get tasks for selected date
  const tasksForDate = tasks.filter(t => !t.archived && isTaskForDate(t, selectedDate || ''));

  // Get task counts for each date
  const getTaskCountForDate = (dateStr: string) => {
    return tasks.filter(t => !t.archived && isTaskForDate(t, dateStr)).length;
  };

  // Get priority indicators for a date
  const getPriorityIndicators = (dateStr: string) => {
    const dateTasks = tasks.filter(t => !t.archived && isTaskForDate(t, dateStr));
    const priorities = dateTasks.map(t => t.priority).filter(p => p !== 'None');
    return [...new Set(priorities)]; // Remove duplicates
  };

  function changeMonth(offset: number) {
    let newMonth = currentMonth + offset;
    let newYear = currentYear;
    if (newMonth < 0) {
      newMonth = 11;
      newYear--;
    } else if (newMonth > 11) {
      newMonth = 0;
      newYear++;
    }
    setCurrentMonth(newMonth);
    setCurrentYear(newYear);
  }

  function goToToday() {
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
    setSelectedDate(formatDate(today));
  }

  function toggleTaskCompletion(taskId: string) {
    setTasks(prev => prev.map(t => 
      t.id === taskId ? { ...t, completed: !t.completed } : t
    ));
  }

  // Add/Edit Task handlers
  function handleSaveTask(task: any) {
    if (task.id) {
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, ...task } : t));
    } else {
      setTasks(prev => [
        { ...task, id: Date.now().toString(), dueDate: task.dueDate || selectedDate, archived: false },
        ...prev
      ]);
    }
    setShowAddTask(false);
    setEditingTask(null);
  }

  function handleDeleteTask(task: any) {
    setTasks(prev => prev.filter(t => t.id !== task.id));
    setShowAddTask(false);
    setEditingTask(null);
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#18181c' : '#f8fafc' }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={{ flex: 1 }} />
          <TouchableOpacity
            onPress={goToToday}
            style={[
              styles.todayBtn,
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.10)' : '#f1f5f9',
                borderColor: isDark ? 'rgba(255,255,255,0.10)' : '#e2e8f0',
              },
            ]}
          >
            <Text style={[styles.todayBtnText, { color: '#3b82f6' }]}>Today</Text>
          </TouchableOpacity>
        </View>
        
        {/* Month Navigation */}
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.navBtn}>
            <Ionicons name="chevron-back" size={24} color={isDark ? '#fff' : '#64748b'} />
          </TouchableOpacity>
          <Text style={[styles.monthLabel, { color: isDark ? '#fff' : '#1e293b' }]}>
            {monthNames[currentMonth]} {currentYear}
          </Text>
          <TouchableOpacity onPress={() => changeMonth(1)} style={styles.navBtn}>
            <Ionicons name="chevron-forward" size={24} color={isDark ? '#fff' : '#64748b'} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Calendar Grid */}
      <BlurView
        intensity={30}
        tint={isDark ? 'dark' : 'light'}
        style={[
          styles.calendarGlassContainer,
          { backgroundColor: isDark ? 'rgba(30,41,59,0.18)' : 'rgba(255,255,255,0.28)' }
        ]}
      >
        {/* Day Headers */}
        <View style={styles.dayHeaders}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => (
            <View key={i} style={styles.headerCell}>
              <Text style={[styles.dayHeader, { color: isDark ? '#fff' : '#1e293b' }]}>{day}</Text>
            </View>
          ))}
        </View>

        {/* Calendar Days */}
        <View style={styles.calendarGrid}>
          {chunkArray(calendarDays, 7).map((week, weekIdx) => (
            <View key={weekIdx} style={{ flexDirection: 'row' }}>
              {week.map(({ date, isCurrentMonth }, i) => {
            const isTodayDate = isToday(date);
                const isSelected = selectedDate !== null && date === selectedDate;
            const taskCount = getTaskCountForDate(date);
                // Colors
                const blue = '#3b82f6';
                const red = '#ff3037';
                const fadedColor = isDark ? '#374151' : '#cbd5e1';
            return (
              <TouchableOpacity
                    key={date + i}
                    style={styles.dayCell}
                onPress={() => setSelectedDate(date)}
                    activeOpacity={isCurrentMonth ? 0.7 : 1}
                    disabled={!isCurrentMonth}
                  >
                    <View style={{
                      width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
                      backgroundColor: isSelected
                        ? red
                        : isTodayDate
                          ? 'rgba(59,130,246,0.12)'
                          : 'transparent',
                      borderWidth: 0,
                      marginBottom: 2,
                    }}>
                      <Text style={{
                        color: isSelected
                          ? '#fff'
                          : isTodayDate
                            ? blue
                            : isCurrentMonth
                              ? (isDark ? '#fff' : '#1e293b')
                              : fadedColor,
                        fontWeight: isSelected || isTodayDate ? '700' : '500',
                        fontSize: 16,
                      }}>{parseInt(date.slice(-2), 10)}</Text>
                    </View>
                    {/* Dot for tasks */}
                    {taskCount > 0 && isCurrentMonth && (
                      <View style={{ alignItems: 'center', height: 6 }}>
                        <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: isSelected ? '#fff' : blue, marginTop: 1 }} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
          ))}
      </View>
      </BlurView>

      {/* Selected Date Tasks */}
      {selectedDate && (
      <View style={styles.tasksSection}>
        <View style={styles.tasksHeader}>
          <Text style={[styles.tasksTitle, { color: isDark ? '#fff' : '#1e293b' }]}>
            {isToday(selectedDate) ? 'Today' : (() => {
              const [year, month, day] = selectedDate.split('-').map(Number);
              const date = new Date(year, month - 1, day);
              return date.toLocaleDateString('en-US', { 
                weekday: 'long', 
                month: 'short', 
                day: 'numeric' 
              });
            })()}
          </Text>
        </View>

        <FlatList
          data={tasksForDate}
          keyExtractor={item => item.id}
          scrollEnabled={tasksForDate.length > 1}
          renderItem={({ item }) => (
            <Swipeable
              renderRightActions={(progress, dragX) => renderRightActions(progress, dragX, () => handleDeleteTask(item))}
              overshootRight={false}
              friction={2}
              rightThreshold={40}
              enableTrackpadTwoFingerGesture={true}
            >
              <TouchableOpacity
                style={[styles.taskItem, { backgroundColor: isDark ? '#23232a' : '#fff' }]}
                onPress={() => {
                  setEditingTask({
                    ...item,
                    note: item.note || ''
                  });
                }}
              >
                <View style={styles.taskContent}>
                  <View style={[
                    styles.checkCircle,
                    item.completed && styles.checkCircleCompleted,
                    { borderColor: isDark ? '#3b82f6' : '#3b82f6' }
                  ]}>
                    {item.completed && <Ionicons name="checkmark" size={16} color="#fff" />}
                  </View>
                  <View style={styles.taskTextContainer}>
                    <Text style={[
                      styles.taskText,
                      item.completed && styles.taskTextCompleted,
                      { color: isDark ? '#fff' : '#1e293b' }
                    ]}>
                      {item.text}
                    </Text>
                    {item.priority !== 'None' && (
                      <View style={[
                        styles.priorityBadge,
                        { backgroundColor: PRIORITY_COLORS[item.priority].bg }
                      ]}>
                        <Text style={[
                          styles.priorityText,
                          { color: PRIORITY_COLORS[item.priority].color }
                        ]}>
                          {item.priority}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            </Swipeable>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={48} color={isDark ? '#64748b' : '#cbd5e1'} />
              <Text style={[styles.emptyText, { color: isDark ? '#64748b' : '#64748b' }]}>
                No tasks for this date
              </Text>
              <TouchableOpacity 
                onPress={() => setShowAddTask(true)}
                style={[styles.addFirstTaskBtn, { backgroundColor: isDark ? '#3b82f6' : '#3b82f6' }]}
              >
                <Text style={styles.addFirstTaskText}>Add Task</Text>
              </TouchableOpacity>
            </View>
          }
          contentContainerStyle={styles.tasksList}
        />
      </View>
      )}

      <AddEditTaskModal
        visible={showAddTask || !!editingTask}
        onClose={() => { setShowAddTask(false); setEditingTask(null); }}
        onSave={handleSaveTask}
        editingTask={editingTask}
        onDelete={handleDeleteTask}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
  },
  todayBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  todayBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navBtn: {
    padding: 8,
    borderRadius: 8,
  },
  monthLabel: {
    fontSize: 20,
    fontWeight: '600',
  },
  calendarGlassContainer: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    marginBottom: 36,
    borderRadius: 32,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.10)',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 8,
    overflow: 'hidden',
  },
  dayHeaders: {
    flexDirection: 'row',
    marginBottom: 2,
    paddingHorizontal: 0,
    width: 328,
    alignSelf: 'center',
  },
  headerCell: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 4,
  },
  dayHeader: {
    flex: 1,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  calendarGrid: {
    width: 328,
    alignSelf: 'center',
    paddingBottom: 6,
  },
  dayCell: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    margin: 4,
    borderWidth: 0,
  },
  selectedCell: {
    backgroundColor: '#3b82f6',
  },
  dayNumber: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 0,
  },
  todayText: {
    fontWeight: '700',
  },
  selectedText: {
    fontWeight: '700',
  },
  taskIndicators: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  priorityDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  taskCount: {
    fontSize: 10,
    fontWeight: '500',
    marginLeft: 2,
  },
  tasksSection: {
    flex: 1,
    paddingHorizontal: 20,
  },
  tasksHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  tasksTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  addTaskBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tasksList: {
    flexGrow: 1,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  taskContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkCircleCompleted: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  taskTextContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  taskText: {
    fontSize: 16,
    flex: 1,
  },
  taskTextCompleted: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
    marginBottom: 24,
  },
  addFirstTaskBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
  },
  addFirstTaskText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
}); 