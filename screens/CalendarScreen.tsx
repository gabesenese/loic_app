import React, { useState, useEffect, useRef, useCallback, memo, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TouchableWithoutFeedback, SafeAreaView, FlatList, Dimensions, Platform, ActivityIndicator, Pressable, InteractionManager} from 'react-native';
import type { ListRenderItemInfo } from 'react-native';
import { useTheme } from '../ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { Profiler } from 'react';
import type { ProfilerOnRenderCallback } from 'react';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, runOnJS, Easing } from 'react-native-reanimated';
import { Animated as RNAnimated } from 'react-native';
import TaskModal, { TaskData } from '../components/TaskModal';

// Add these at the top, after imports

// TaskForm type
interface TaskForm {
  id?: string;
  text: string;
  note: string;
  priority: 'None' | 'Low' | 'Medium' | 'High';
  dueType: string;
  dueDate?: string;
  completed: boolean;
  subtasks: { id: string; text: string; completed: boolean }[];
  archived: boolean;
}

const APPLE_COLORS = {
  light: {
    background: '#ffffff',
    card: '#f2f2f7',
    text: '#000000',
    systemBlue: '#007aff',
    systemGreen: '#34c759',
    systemOrange: '#ff9500',
    systemRed: '#ff3b30',
    systemGray: '#8e8e93',
  },
  dark: {
    background: '#000000',
    card: '#1c1c1e',
    text: '#ffffff',
    systemBlue: '#0a84ff',
    systemGreen: '#30d158',
    systemOrange: '#ff9f0a',
    systemRed: '#ff453a',
    systemGray: '#8e8e93',
  }
};

const PRIORITY_COLORS = {
  None: { bg: '#f2f2f7', color: '#8e8e93', border: '#e5e5ea' },
  Low: { bg: '#a8e6cf', color: '#34c759', border: '#b7f5d8' },
  Medium: { bg: '#ffd6a5', color: '#ff9500', border: '#ffe5b2' },
  High: { bg: '#ffb3ba', color: '#ff3b30', border: '#ffd1d4' },
};

// Memoized event list component
interface MemoizedEventListProps {
  tasks: Task[];
  keyExtractor: (item: Task) => string;
  renderEventCard: ({ item }: { item: Task }) => React.ReactElement;
  ItemSeparator: () => React.ReactElement;
  ListEmptyComponent: () => React.ReactElement;
}

const MemoizedEventList = React.memo(({ tasks, keyExtractor, renderEventCard, ItemSeparator, ListEmptyComponent }: MemoizedEventListProps) => (
  <FlatList
    data={tasks}
    keyExtractor={keyExtractor}
    renderItem={renderEventCard}
    ItemSeparatorComponent={ItemSeparator}
    ListEmptyComponent={ListEmptyComponent}
    initialNumToRender={5}
    maxToRenderPerBatch={5}
    windowSize={3}
    removeClippedSubviews={true}
    style={{ maxHeight: 220 }}
  />
));

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
const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// Restore top-level layout constants
const SCREEN_HEIGHT = Dimensions.get('window').height;
const HEADER_HEIGHT = 80; // Estimate header height (adjust as needed)
const WEEKDAYS_HEIGHT = 32; // Estimate weekdays row height
const BOTTOM_BAR_HEIGHT = 70; // Estimate bottom bar height
const GRID_VERTICAL_PADDING = 16; // Padding above and below grid
const AVAILABLE_HEIGHT = SCREEN_HEIGHT - HEADER_HEIGHT - WEEKDAYS_HEIGHT - BOTTOM_BAR_HEIGHT - (2 * GRID_VERTICAL_PADDING);
const ROWS = 6; // Max rows in a month
const DAY_CELL_HEIGHT = Math.floor(AVAILABLE_HEIGHT / ROWS);
const MONTH_ITEM_HEIGHT = DAY_CELL_HEIGHT * ROWS;

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
function isToday(dateStr: string): boolean {
  const today = new Date();
  const todayStr = formatDate(today);
  return dateStr === todayStr;
}
function getMonthMatrix(year: number, month: number): { date: string; isCurrentMonth: boolean }[] {
  const daysInMonth = getDaysInMonth(year, month);
  return Array.from({ length: daysInMonth }, (_, i) => ({
    date: formatDate(new Date(year, month, i + 1)),
    isCurrentMonth: true
  }));
}
function getPrevMonth(year: number, month: number) {
  return month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 };
}
function getNextMonth(year: number, month: number) {
  return month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 };
}

function getNumRowsForMonth(year: number, month: number): number {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);
  const totalCells = firstDay + daysInMonth;
  return Math.ceil(totalCells / 7);
}


// Memoized DayCell component
const DayCell = memo(({ cell, isTodayDate, dayTasks, handlePress, isHighlighted }: {
  cell: { date: string; isCurrentMonth: boolean };
  isTodayDate: boolean;
  dayTasks: any[];
  handlePress: () => void;
  isHighlighted: boolean;
  handleLongPress?: () => void;
}) => {
  const { theme } = useTheme();
  const colors = APPLE_COLORS[theme];
  return (
    <View style={styles.dayCellWrap}>
      <TouchableWithoutFeedback onPress={handlePress}>
        <View style={styles.dayCellTouchable}>
          <View style={[
            styles.dayCircle,
            isTodayDate ? styles.todayCircle : null,
            !isTodayDate && isHighlighted && { backgroundColor: theme === 'dark' ? '#22272b' : '#f3f4f6' },
          ]}>
            <Text style={[
              styles.dayNumber,
              isTodayDate ? styles.todayNumber : null,
              { color: isTodayDate ? '#fff' : theme === 'dark' ? '#fff' : '#222' }
            ]}>
              {parseInt(cell.date.slice(-2), 10)}
            </Text>
          </View>
          <View style={styles.eventDotsRow}>
            {dayTasks.slice(0, 3).map((task: Task, idx: number) => (
              <View
                key={task.id}
                style={[
                  styles.eventDot,
                  { backgroundColor: PRIORITY_COLORS[task.priority as keyof typeof PRIORITY_COLORS].bg },
                  idx === 2 && dayTasks.length > 3 ? styles.eventDotOverflow : null
                ]}
              />
            ))}
            {dayTasks.length > 3 && (
              <View style={[styles.eventDot, styles.eventDotOverflow]} />
            )}
          </View>
        </View>
      </TouchableWithoutFeedback>
    </View>
  );
});

// Memoized MonthGrid component
const MonthGrid = memo(({ days, firstDayOfWeek, numRows, getTasksForDate, isToday, handleDayPress, highlightedDate, theme, setTaskModalDate, setTaskModalEditingTask, setShowTaskModal }: any) => {
  const grid: ({ date: string; isCurrentMonth: boolean } | null)[] = Array(numRows * 7).fill(null);
  for (let i = 0; i < days.length; i++) {
    grid[firstDayOfWeek + i] = days[i];
  }
  return (
    <View style={styles.monthGridWrap}>
      {Array.from({ length: numRows }).map((_, rowIdx) => {
        const weekStart = rowIdx * 7;
        const weekEnd = weekStart + 7;
        let firstCurrent = -1, lastCurrent = -1;
        for (let i = weekStart; i < weekEnd; i++) {
          if (grid[i] && grid[i]?.isCurrentMonth) {
            if (firstCurrent === -1) firstCurrent = i - weekStart;
            lastCurrent = i - weekStart;
          }
        }
        return (
          <React.Fragment key={rowIdx}>
            {firstCurrent !== -1 && lastCurrent !== -1 && (
              <View style={{
                position: 'relative',
                height: 1,
              }}>
                <View style={{
                  position: 'absolute',
                  left: `${(firstCurrent / 7) * 100}%`,
                  right: `${((6 - lastCurrent) / 7) * 100}%`,
                  height: 1,
                  backgroundColor: theme === 'dark' ? '#222' : '#e5e7eb',
                  borderRadius: 1,
                }} />
              </View>
            )}
            <View style={{ ...styles.weekRow, height: DAY_CELL_HEIGHT, alignItems: 'center', justifyContent: 'center' }}>
              {Array.from({ length: 7 }).map((_, colIdx) => {
                const cell = grid[rowIdx * 7 + colIdx];
                if (!cell) {
                  return <View key={colIdx} style={styles.dayCellWrap} />;
                }
                const isTodayDate = isToday(cell.date);
                const dayTasks = getTasksForDate(cell.date);
                return (
                  <DayCell
                    key={cell.date}
                    cell={cell}
                    isTodayDate={isTodayDate}
                    dayTasks={dayTasks}
                    handlePress={() => handleDayPress(cell.date)}
                    isHighlighted={highlightedDate === cell.date && !isTodayDate}
                  />
                );
              })}
            </View>
          </React.Fragment>
        );
      })}
    </View>
  );
});

export default function CalendarScreen() {
  const isMounted = useRef(true);
  const isProcessingPendingDate = useRef(false);
  const { theme } = useTheme();
  const colors = APPLE_COLORS[theme];

  // Declare all modal/task modal state at the top
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskModalDate, setTaskModalDate] = useState<string | null>(null);
  const [taskModalEditingTask, setTaskModalEditingTask] = useState<any>(null);
  
  // Separate state for adding new tasks
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [addTaskModalDate, setAddTaskModalDate] = useState<string | null>(null);
  
  // Declare pendingDate state at the top so it's available everywhere
  const [pendingDate, setPendingDate] = useState<string | null>(null);
  
  // Memoized style objects for performance and stable props
  const headerWrapStyle = useMemo(() => [styles.headerWrap], []);
  const monthTitleStyle = useMemo(() => [styles.monthTitle, { color: theme === 'dark' ? '#fff' : '#111' }], [theme]);
  const headerActionPillStyle = useMemo(() => [styles.headerActionPill, { backgroundColor: theme === 'dark' ? '#000' : '#f3f4f6', borderColor: theme === 'dark' ? '#222' : 'transparent', borderWidth: theme === 'dark' ? 1 : 0 }], [theme]);
  const weekdaysRowStyle = useMemo(() => [styles.weekdaysRow], []);
  const weekdayTextStyle = useMemo(() => [styles.weekdayText, { color: theme === 'dark' ? '#fff' : '#111' }], [theme]);
  const bottomBarWrapStyle = useMemo(() => [styles.bottomBarWrap], [theme]);
  const bottomBarBtnStyle = useMemo(() => [styles.bottomBarBtn, { 
    backgroundColor: theme === 'dark' ? '#1c1c1e' : '#f2f2f7', 
    borderColor: theme === 'dark' ? '#333' : '#e5e5ea', 
    borderWidth: 1 
  }], [theme]);
  const bottomBarBtnTextStyle = useMemo(() => [styles.bottomBarBtnText, { color: theme === 'dark' ? '#ffffff' : '#000000' }], [theme]);
  const eventListWrapStyle = useMemo(() => [styles.eventListWrap, { padding: 16 }], []);
  const eventListEmptyStyle = useMemo(() => [styles.eventListEmpty, { color: theme === 'dark' ? '#fff' : '#222' }], [theme]);
  
  // Profiler callback for performance monitoring
  const onRenderCallback: ProfilerOnRenderCallback = (id, phase, actualDuration) => {
    // Optional: Log performance data for debugging
    // console.log(`Profiler [${id}] ${phase} took ${actualDuration}ms`);
  };
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState(formatDate(today));
  const [tasks, setTasks] = useState<Task[]>([]);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const flatListRef = useRef<FlatList<any>>(null);
  const [showDayDetailModal, setShowDayDetailModal] = useState(false);
  const [modalDate, setModalDate] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState<{ year: number; month: number }>({
    year: today.getFullYear(),
    month: today.getMonth(),
  });
  // Double-tap state for all dates
  const lastTapRef = useRef<{ [date: string]: number }>({});
  
  // --- Reanimated modal animation ---
  const MODAL_TRANSLATE_Y = SCREEN_HEIGHT * 0.7;
  const MODAL_HEIGHT = SCREEN_HEIGHT * 0.5;
  const MODAL_SCALE_START = 0.96;
  const MODAL_SCALE_END = 1;
  const MODAL_OPACITY_START = 0;
  const MODAL_OPACITY_END = 1;
  const MODAL_ANIMATION_DURATION = 260;
  const MODAL_EASING = Easing.bezier(0.4, 0, 0.2, 1);

  // Animation values for modal (Reanimated)
  const modalOpacity = useSharedValue(0);
  const modalScale = useSharedValue(0.8);
  const modalTranslateY = useSharedValue(MODAL_HEIGHT);

  // 1. Limit monthsOfYear to ±1 year from today for performance
  const yearRange = 1; // Reduced from 3 to 1 for optimization
  const baseYear = today.getFullYear();
  const monthsOfYear = useMemo(() => Array.from({ length: (yearRange * 2 + 1) * 12 }, (_, i) => {
    const year = baseYear - yearRange + Math.floor(i / 12);
    const month = i % 12;
    return { year, month };
  }), [baseYear]);

  // Calculate initial index for current month
  const initialIndex = useMemo(() => {
    return monthsOfYear.findIndex(m => m.year === today.getFullYear() && m.month === today.getMonth());
  }, [monthsOfYear, today]);

  // Set visibleMonth to the correct initial month on mount
  useEffect(() => {
    if (initialIndex >= 0) {
      setVisibleMonth(monthsOfYear[initialIndex]);
    }
  }, [initialIndex, monthsOfYear]);

  // Callback to update visibleMonth as you scroll
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: { item: { year: number; month: number } }[] }) => {
    if (viewableItems && viewableItems.length > 0) {
      const { year, month } = viewableItems[0].item;
      setVisibleMonth({ year, month });
    }
  });

  const [showAgenda, setShowAgenda] = useState(false);

  // Move agendaTasks useMemo to top level
  const agendaTasks = useMemo(
    () => tasks.filter(t => !t.archived && t.dueDate)
               .sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || '')),
    [tasks]
  );

  const [highlightedDate, setHighlightedDate] = useState<string | null>(null);

  // --- AddEditTaskModal and Day Detail Modal Apple-like Animation ---
  const addModalOpacity = useSharedValue(MODAL_OPACITY_START);
  const addModalScale = useSharedValue(MODAL_SCALE_START);
  const addModalTranslateY = useSharedValue(MODAL_TRANSLATE_Y);

  const animateAddModalIn = () => {
    addModalOpacity.value = withTiming(MODAL_OPACITY_END, { duration: MODAL_ANIMATION_DURATION, easing: MODAL_EASING });
    addModalScale.value = withTiming(MODAL_SCALE_END, { duration: MODAL_ANIMATION_DURATION, easing: MODAL_EASING });
    addModalTranslateY.value = withSpring(0, { damping: 14, stiffness: 90, mass: 0.9 });
  };
  const animateAddModalOut = (cb?: () => void) => {
    addModalOpacity.value = withTiming(MODAL_OPACITY_START, { duration: MODAL_ANIMATION_DURATION, easing: MODAL_EASING });
    addModalScale.value = withTiming(MODAL_SCALE_START, { duration: MODAL_ANIMATION_DURATION, easing: MODAL_EASING });
    addModalTranslateY.value = withTiming(MODAL_TRANSLATE_Y, { duration: MODAL_ANIMATION_DURATION, easing: MODAL_EASING }, (finished) => {
      if (finished && cb) runOnJS(cb)();
    });
  };
  const addModalOverlayStyle = useAnimatedStyle(() => ({
    opacity: addModalOpacity.value,
    pointerEvents: addModalOpacity.value > 0.01 ? 'auto' : 'none',
  }));
  const addModalContentStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: addModalScale.value },
      { translateY: addModalTranslateY.value },
    ],
    opacity: addModalOpacity.value,
  }));

  // Animate in when modal is shown
  useEffect(() => {
    if (editingTask) {
      animateAddModalIn();
    }
  }, [editingTask]);

  const handleAddModalClose = useCallback(() => {
    // Ensure all modals are closed
    setEditingTask(null);
    setHighlightedDate(null);
    setShowDayDetailModal(false);
  }, []);

  useEffect(() => {
    isMounted.current = true;
    const task = InteractionManager.runAfterInteractions(() => {
      AsyncStorage.getItem(STORAGE_KEY).then((data) => {
        if (isMounted.current && data) setTasks(JSON.parse(data));
      });
    });
    
    return () => {
      task.cancel();
      isMounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (isMounted.current) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    }
  }, [tasks]);

  // 1. Build a map of tasks by date for O(1) lookup
  const tasksByDate = useMemo(() => {
    const map: { [date: string]: Task[] } = {};
    for (const t of tasks) {
      if (!t.archived && t.dueDate && t.dueDate.length >= 10) {
        const dateStr = t.dueDate.slice(0, 10); // YYYY-MM-DD
        if (!map[dateStr]) map[dateStr] = [];
        map[dateStr].push(t);
      }
    }
    return map;
  }, [tasks]);

  // 2. Replace getTasksForDate with fast lookup
  const getTasksForDate = useCallback((dateStr: string) => tasksByDate[dateStr] || [], [tasksByDate]);

  // Animation functions for modal (Reanimated)
  // Fix animateModalIn to prevent crashes
  const animateModalIn = useCallback(() => {
    try {
      const duration = MODAL_ANIMATION_DURATION;
      const easing = MODAL_EASING;
      
      // Ensure shared values are properly initialized
      if (modalOpacity && modalScale && modalTranslateY) {
        modalOpacity.value = withTiming(1, { duration, easing });
        modalScale.value = withTiming(1, { duration, easing });
        modalTranslateY.value = withTiming(0, { duration, easing });
      }
    } catch (error) {
      console.log('Animation error:', error);
    }
  }, [modalOpacity, modalScale, modalTranslateY, MODAL_ANIMATION_DURATION, MODAL_EASING]);

  // Add smooth close animation function
const animateModalOut = useCallback(() => {
  try {
    const duration = MODAL_ANIMATION_DURATION;
    const easing = MODAL_EASING;
    
    // Ensure shared values are properly initialized
    if (modalOpacity && modalScale && modalTranslateY) {
      modalOpacity.value = withTiming(0, { duration, easing });
      modalScale.value = withTiming(0.95, { duration, easing });
      modalTranslateY.value = withTiming(MODAL_HEIGHT, { duration, easing });
      
      // Use setTimeout to reset state after animation completes
      setTimeout(() => {
        if (isMounted.current) {
          setModalVisible(false);
          setHighlightedDate(null);
          setModalDate(null);
        }
      }, duration);
    }
  } catch (error) {
    console.log('Close animation error:', error);
    // Fallback: just reset state immediately
    if (isMounted.current) {
      setModalVisible(false);
      setHighlightedDate(null);
      setModalDate(null);
    }
  }
}, [modalOpacity, modalScale, modalTranslateY, MODAL_ANIMATION_DURATION, MODAL_EASING, setModalVisible, setHighlightedDate, setModalDate, MODAL_HEIGHT, isMounted]);

  // Animated styles for modal overlay and content
  const modalOverlayStyle = useAnimatedStyle(() => ({
    opacity: modalOpacity.value,
    pointerEvents: modalOpacity.value > 0.01 ? 'auto' : 'none',
  }));
  const modalContentStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: modalScale.value },
      { translateY: modalTranslateY.value },
    ],
  }));

  // Simplify the modal state management to avoid crashes
  // const [modalVisible, setModalVisible] = useState(false);

  // Simplified handleDayPress that just sets the date and shows modal
  const handleDayPress = useCallback((date: string) => {
    setModalDate(date);
    setHighlightedDate(!isToday(date) ? date : null);
    setModalVisible(true);
  }, [setModalDate, setHighlightedDate, setModalVisible]);

  // Update closeModal to use smooth animation
  const closeModal = useCallback(() => {
    animateModalOut();
  }, [animateModalOut]);

  // Remove the complex animateModalOut and animateModalIn functions

  // Memoized event card renderer for better performance
  const renderEventCard = useCallback(({ item }: { item: Task }) => (
    <TouchableOpacity
      style={[styles.eventCard, { backgroundColor: colors.card, shadowColor: '#000' }]}
      onLongPress={() => {
        setTaskModalDate(item.dueDate?.slice(0, 10) || formatDate(today));
        setTaskModalEditingTask({
          id: item.id,
          text: item.text,
          notes: item.note || '',
          priority: item.priority,
          dueDate: item.dueDate || formatDate(today) + 'T00:00:00',
          reminder: 'none',
          completed: item.completed,
          subtasks: item.subtasks || [],
          archived: item.archived,
          category: item.category,
        });
        setShowTaskModal(true);
      }}
      activeOpacity={0.7}
    > 
      <View style={styles.eventCardLeft}>
        <View style={[styles.eventCardDot, { backgroundColor: PRIORITY_COLORS[item.priority as keyof typeof PRIORITY_COLORS].bg }]} />
      </View>
      <View style={styles.eventCardContent}>
        <Text style={[styles.eventCardTitle, { color: colors.text }]} numberOfLines={1}>{item.text}</Text>
        <View style={styles.eventCardMetaRow}>
          {item.note && (
            <Text style={styles.eventCardLocation} numberOfLines={1}>{item.note}</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  ), [colors, setTaskModalDate, setTaskModalEditingTask, setShowTaskModal, today]);

  // Memoized key extractor for better FlatList performance
  const keyExtractor = useCallback((item: Task) => item.id, []);

  // Memoized item separator for better performance
  const ItemSeparator = useCallback(() => <View style={styles.eventCardSeparator} />, []);

  // Memoized empty component for better performance
  const ListEmptyComponent = useCallback(() => <Text style={styles.eventListEmpty}>No events</Text>, []);

  // 3. Memoize all handlers and derived data
  const handleToggleView = useCallback(() => {
    if (showAgenda) {
      const todayIndex = monthsOfYear.findIndex(
        m => m.year === today.getFullYear() && m.month === today.getMonth()
      );
      if (todayIndex !== -1) {
        setTimeout(() => {
          flatListRef.current?.scrollToIndex({ index: todayIndex, animated: true });
        }, 0);
      }
    }
    setShowAgenda((prev) => !prev);
  }, [showAgenda, monthsOfYear, today]);

  // 4. Memoize renderHeader, renderWeekdays, renderMonth, renderBottomBar, renderAgendaView
  const renderHeader = useCallback(() => (
    <View style={headerWrapStyle}>
      <Text style={monthTitleStyle}>
        {showAgenda ? 'List' : `${monthNames[visibleMonth.month]} ${visibleMonth.year}`}
      </Text>
      <View style={styles.headerActions}>
        <TouchableOpacity
          style={headerActionPillStyle}
          onPress={() => {
            // Open AddTaskModal for visible month and today's date (or first day of visible month)
            const date = formatDate(new Date(visibleMonth.year, visibleMonth.month, today.getDate()));
            setAddTaskModalDate(date);
            setShowAddTaskModal(true);
          }}
          accessibilityLabel="Add Task"
        >
          <Ionicons name="add" size={22} color={theme === 'dark' ? '#fff' : '#111'} />
        </TouchableOpacity>
        <TouchableOpacity
          style={headerActionPillStyle}
          onPress={handleToggleView}
          accessibilityLabel={showAgenda ? 'Show Calendar View' : 'Show List View'}
        >
          <Ionicons name={showAgenda ? 'calendar-outline' : 'list-outline'} size={22} color={theme === 'dark' ? '#fff' : '#111'} />
        </TouchableOpacity>
      </View>
    </View>
  ), [headerWrapStyle, monthTitleStyle, showAgenda, visibleMonth, headerActionPillStyle, handleToggleView, theme]);

  const renderWeekdays = useCallback(() => (
    <>
      <View style={weekdaysRowStyle}>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <Text key={i} style={weekdayTextStyle}>{d}</Text>
        ))}
      </View>
      <View style={styles.weekdaysDivider} />
    </>
  ), [weekdaysRowStyle, weekdayTextStyle]);

  // In renderMonth, pass modal state setters to MonthGrid
  const renderMonth = useCallback(({ item }: ListRenderItemInfo<{ year: number; month: number }>) => {
    const days = getMonthMatrix(item.year, item.month);
    const firstDayOfWeek = getFirstDayOfWeek(item.year, item.month);
    const numRows = getNumRowsForMonth(item.year, item.month);
    return (
      <MonthGrid
        days={days}
        firstDayOfWeek={firstDayOfWeek}
        numRows={numRows}
        getTasksForDate={getTasksForDate}
        isToday={isToday}
        handleDayPress={handleDayPress}
        highlightedDate={highlightedDate}
        theme={theme}
        setTaskModalDate={setTaskModalDate}
        setTaskModalEditingTask={setTaskModalEditingTask}
        setShowTaskModal={setShowTaskModal}
      />
    );
  }, [getTasksForDate, handleDayPress, highlightedDate, theme]);

  const renderBottomBar = useCallback(() => (
    // Only show bottom bar when not in agenda/list mode
    !showAgenda ? (
      <View style={bottomBarWrapStyle}>
        <TouchableOpacity style={bottomBarBtnStyle} onPress={() => {
          setSelectedDate(formatDate(today));
          const todayIndex = monthsOfYear.findIndex(
            m => m.year === today.getFullYear() && m.month === today.getMonth()
          );
          if (todayIndex !== -1) {
            flatListRef.current?.scrollToIndex({ index: todayIndex, animated: true });
          }
        }}>
          <Text style={bottomBarBtnTextStyle}>Today</Text>
        </TouchableOpacity>
      </View>
    ) : null
  ), [bottomBarWrapStyle, bottomBarBtnStyle, bottomBarBtnTextStyle, monthsOfYear, today, showAgenda]);

  // Helper function to group tasks by date
  const groupTasksByDate = useCallback((tasks: Task[]) => {
    const grouped: { [date: string]: Task[] } = {};
    tasks.forEach(task => {
      if (task.dueDate) {
        const dateStr = task.dueDate.slice(0, 10); // YYYY-MM-DD
        if (!grouped[dateStr]) {
          grouped[dateStr] = [];
        }
        grouped[dateStr].push(task);
      }
    });
    return grouped;
  }, []);

  // Helper function to format date for display
  const formatDateForDisplay = useCallback((dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString(undefined, { 
        weekday: 'long', 
        month: 'short', 
        day: 'numeric' 
      });
    }
  }, []);

  const renderAgendaView = useCallback(() => {
    const groupedTasks = groupTasksByDate(agendaTasks);
    const sortedDates = Object.keys(groupedTasks).sort();
    
    const renderDateHeader = (dateStr: string) => {
      const tasks = groupedTasks[dateStr];
      const isTodayDate = dateStr === formatDate(today);
      
      return (
        <View key={`header-${dateStr}`} style={[
          styles.agendaDateHeader,
          { 
            backgroundColor: theme === 'dark' ? '#000000' : colors.background,
            borderBottomColor: theme === 'dark' ? '#333' : '#e5e7eb'
          }
        ]}>
          <View style={styles.agendaDateHeaderContent}>
            <Text style={[
              styles.agendaDateText,
              { 
                color: isTodayDate ? '#ff3b30' : (theme === 'dark' ? '#fff' : '#111'),
                fontWeight: isTodayDate ? '700' : '600'
              }
            ]}>
              {formatDateForDisplay(dateStr)}
            </Text>
          </View>
          <View style={styles.agendaTaskIndicator}>
            <Text style={[
              styles.agendaTaskCount,
              { color: theme === 'dark' ? '#666' : '#999' }
            ]}>
              {tasks.length} {tasks.length === 1 ? 'event' : 'events'}
            </Text>
          </View>
        </View>
      );
    };

    const renderTaskItem = (task: Task) => (
      <TouchableOpacity
        key={task.id}
        style={[
          styles.agendaTaskItem,
          { backgroundColor: theme === 'dark' ? '#1c1c1e' : '#fff', marginTop: 10, marginLeft: 0, width: '100%' }
        ]}
        onLongPress={() => {
          setTaskModalDate(task.dueDate?.slice(0, 10) || formatDate(today));
          setTaskModalEditingTask({
            id: task.id,
            text: task.text,
            notes: task.note || '',
            priority: task.priority,
            dueDate: task.dueDate || formatDate(today) + 'T00:00:00',
            reminder: 'none',
            completed: task.completed,
            subtasks: task.subtasks || [],
            archived: task.archived,
            category: task.category,
          });
          setShowTaskModal(true);
        }}
        activeOpacity={0.7}
      >
        <View style={styles.agendaTaskLeft}>
          <View style={[
            styles.agendaTaskDot,
            { backgroundColor: PRIORITY_COLORS[task.priority as keyof typeof PRIORITY_COLORS].bg }
          ]} />
        </View>
        <View style={styles.agendaTaskContent}>
          <Text style={[
            styles.agendaTaskTitle,
            { color: theme === 'dark' ? '#fff' : '#111' }
          ]} numberOfLines={1}>
            {task.text}
          </Text>
          {task.note && (
            <Text style={[
              styles.agendaTaskNote,
              { color: theme === 'dark' ? '#666' : '#666' }
            ]} numberOfLines={1}>
              {task.note}
            </Text>
          )}
        </View>
        <View style={styles.agendaTaskRight}>
          <Text style={[
            styles.agendaTaskTime,
            { color: theme === 'dark' ? '#ff3b30' : '#ff3b30' }
          ]}>
            {task.dueDate && task.dueDate.length > 10 ? 
              new Date(task.dueDate).toLocaleTimeString(undefined, { 
                hour: 'numeric', 
                minute: '2-digit',
                hour12: true 
              }) : 'All day'
            }
          </Text>
        </View>
      </TouchableOpacity>
    );

    const renderDateSection = (dateStr: string) => {
      const tasks = groupedTasks[dateStr];
      return (
        <View key={dateStr}>
          {renderDateHeader(dateStr)}
          <View style={styles.agendaTasksContainer}>
            {tasks.map(renderTaskItem)}
          </View>
        </View>
      );
    };

    return (
      <View style={[styles.container, { backgroundColor: theme === 'dark' ? '#000000' : colors.background }]}> 
        <FlatList
          data={sortedDates}
          keyExtractor={(dateStr) => dateStr}
          renderItem={({ item }) => renderDateSection(item)}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          ListEmptyComponent={() => (
            <View style={styles.agendaEmptyContainer}>
              <Text style={[
                styles.agendaEmptyText,
                { color: theme === 'dark' ? '#666' : '#999' }
              ]}>
                No events
              </Text>
            </View>
          )}
          contentContainerStyle={styles.agendaContentContainer}
          initialNumToRender={5}
          maxToRenderPerBatch={5}
          windowSize={3}
        />
      </View>
    );
  }, [agendaTasks, groupTasksByDate, formatDateForDisplay, theme, colors, today]);

  // Restore missing memoized variables and handlers
  const eventListTasks = useMemo(() => getTasksForDate(selectedDate), [selectedDate, getTasksForDate]);
  const modalTasks = useMemo(() => modalDate ? getTasksForDate(modalDate) : [], [modalDate, getTasksForDate]);

  const handleTaskSave = useCallback((task: TaskForm) => {
    if (task.id) {
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, ...task } : t));
    } else {
      setTasks(prev => [
        { ...task, id: Date.now().toString(), dueDate: task.dueDate || selectedDate, archived: false },
        ...prev
      ]);
    }
    handleAddModalClose();
  }, [selectedDate, handleAddModalClose]);

  const handleTaskDelete = useCallback((task: TaskForm) => {
    setTasks(prev => prev.filter(t => t.id !== task.id));
    handleAddModalClose();
  }, [handleAddModalClose]);

  // Apply the same animation and style to the day detail modal
  const dayModalOpacity = useSharedValue(MODAL_OPACITY_START);
  const dayModalScale = useSharedValue(MODAL_SCALE_START);
  const dayModalTranslateY = useSharedValue(MODAL_TRANSLATE_Y);
  const animateDayModalIn = () => {
    dayModalOpacity.value = withTiming(MODAL_OPACITY_END, { duration: MODAL_ANIMATION_DURATION, easing: MODAL_EASING });
    dayModalScale.value = withTiming(MODAL_SCALE_END, { duration: MODAL_ANIMATION_DURATION, easing: MODAL_EASING });
    dayModalTranslateY.value = withSpring(0, { damping: 14, stiffness: 90, mass: 0.9 });
  };
  const animateDayModalOut = (cb?: () => void) => {
    dayModalOpacity.value = withTiming(MODAL_OPACITY_START, { duration: MODAL_ANIMATION_DURATION, easing: MODAL_EASING });
    dayModalScale.value = withTiming(MODAL_SCALE_START, { duration: MODAL_ANIMATION_DURATION, easing: MODAL_EASING });
    dayModalTranslateY.value = withTiming(MODAL_TRANSLATE_Y, { duration: MODAL_ANIMATION_DURATION, easing: MODAL_EASING }, (finished) => {
      if (finished && cb) runOnJS(cb)();
    });
  };
  const dayModalOverlayStyle = useAnimatedStyle(() => ({
    opacity: dayModalOpacity.value,
    pointerEvents: dayModalOpacity.value > 0.01 ? 'auto' : 'none',
  }));
  const dayModalContentStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: dayModalScale.value },
      { translateY: dayModalTranslateY.value },
    ],
    opacity: dayModalOpacity.value,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: MODAL_HEIGHT,
  }));
  useEffect(() => {
    if (showDayDetailModal) {
      animateDayModalIn();
    }
  }, [showDayDetailModal]);

  // Handler for saving a new task from TaskModal (editing existing task)
  const handleTaskModalSave = (task: TaskData) => {
    // Update existing task
    setTasks(prev => prev.map(t => 
      t.id === taskModalEditingTask?.id 
        ? {
            ...t,
            text: task.text,
            note: task.notes || '',
            priority: task.priority,
            dueDate: task.dueDate || t.dueDate,
          }
        : t
    ));
    setShowTaskModal(false);
    // Clear state immediately to ensure clean state for next operation
    setTaskModalDate(null);
    setTaskModalEditingTask(null);
  };

  // Handler for closing TaskModal (editing)
  const handleTaskModalClose = () => {
    setShowTaskModal(false);
    // Clear state immediately to ensure clean state for next operation
    setTaskModalDate(null);
    setTaskModalEditingTask(null);
  };

  // Handler for saving a new task from AddTaskModal
  const handleAddTaskModalSave = (task: TaskData) => {
    // Convert TaskData to Task
    setTasks(prev => [
      {
        id: Date.now().toString(),
        text: task.text,
        note: task.notes || '',
        priority: task.priority,
        dueType: 'custom',
        dueDate: task.dueDate || addTaskModalDate || '',
        completed: false,
        subtasks: [],
        archived: false,
      },
      ...prev
    ]);
    setShowAddTaskModal(false);
    // Clear state immediately to ensure clean state for next operation
    setAddTaskModalDate(null);
  };

  // Handler for closing AddTaskModal
  const handleAddTaskModalClose = () => {
    setShowAddTaskModal(false);
    // Clear state immediately to ensure clean state for next operation
    setAddTaskModalDate(null);
  };

  // Add useEffect to animate modal in when modalVisible becomes true
  useEffect(() => {
    if (modalVisible && isMounted.current) {
      // Add a small delay to ensure state is stable
      setTimeout(() => {
        if (isMounted.current && modalVisible) {
          animateModalIn();
        }
      }, 10);
    }
  }, [modalVisible, animateModalIn]);

  return (
    <Profiler id="CalendarScreen" onRender={onRenderCallback}>
      <SafeAreaView style={[styles.container, { backgroundColor: theme === 'dark' ? '#000000' : colors.background, flex: 1 }]}>  
        {renderHeader()}
        {showAgenda ? (
          renderAgendaView()
        ) : (
          <>
            {renderWeekdays()}
            <View/>
            <FlatList
              ref={flatListRef}
              data={monthsOfYear}
              keyExtractor={(item: { year: number; month: number }) => `${item.year}-${item.month}`}
              showsVerticalScrollIndicator={false}
              renderItem={renderMonth}
              style={{ flex: 1 }}
              getItemLayout={(_, index) => ({
                length: MONTH_ITEM_HEIGHT,
                offset: MONTH_ITEM_HEIGHT * index,
                index,
              })}
              pagingEnabled
              snapToInterval={MONTH_ITEM_HEIGHT}
              decelerationRate="normal"
              pointerEvents="box-none"
              onViewableItemsChanged={onViewableItemsChanged.current}
              viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
              initialNumToRender={2} // Optimization: minimal render
              maxToRenderPerBatch={2}
              windowSize={3}
              initialScrollIndex={initialIndex}
            />
            {/* Event list for selected day (only when modal is not open and selected date is not today) */}
            {!showDayDetailModal && selectedDate !== formatDate(today) && (
              <View style={[styles.eventListWrap, { paddingTop: 8 }]}> 
                <MemoizedEventList
                  tasks={eventListTasks}
                  keyExtractor={keyExtractor}
                  renderEventCard={renderEventCard}
                  ItemSeparator={ItemSeparator}
                  ListEmptyComponent={ListEmptyComponent}
                />
              </View>
            )}
          </>
        )}
        {/* Modal for day detail - Only rendered when visible */}
        <Animated.View
          style={[
            styles.modalOverlay,
            modalOverlayStyle,
            { 
              display: modalVisible ? 'flex' : 'none',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
              justifyContent: 'flex-end',
              alignItems: 'center',
            }
          ]}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={closeModal}
            />
            <Animated.View
              style={[
                styles.sheetModalContent,
              modalContentStyle,
                {
                  backgroundColor: theme === 'dark' ? '#18181a' : '#fff',
                  paddingHorizontal: 0,
                  paddingTop: 12,
                  paddingBottom: 0,
                  borderTopLeftRadius: 24,
                  borderTopRightRadius: 24,
                  borderBottomLeftRadius: 0,
                  borderBottomRightRadius: 0,
                  shadowOpacity: 0.10,
                  shadowRadius: 18,
                  elevation: 12,
                  width: '100%',
                  maxWidth: undefined,
                  marginBottom: 0,
                height: MODAL_HEIGHT,
                },
              ]}
            >
              {/* Drag indicator */}
              <View style={{ alignItems: 'center', marginBottom: 8 }}>
                <View style={{ width: 36, height: 5, borderRadius: 3, backgroundColor: theme === 'dark' ? '#333' : '#e0e0e5', marginTop: 4, marginBottom: 2 }} />
              </View>
              {/* Date header */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, paddingHorizontal: 16 }}>
                {/* Close button (left, Apple-style) */}
                <TouchableOpacity
                  onPress={closeModal}
                  accessibilityLabel="Close"
                  style={{
                    backgroundColor: theme === 'dark' ? '#2c2c2e' : '#f2f2f7',
                    borderRadius: 24,
                    width: 40,
                    height: 40,
                    justifyContent: 'center',
                    alignItems: 'center',
                    shadowColor: '#000',
                    shadowOpacity: 0.1,
                    shadowRadius: 2,
                    shadowOffset: { width: 0, height: 1 },
                    elevation: 2,
                  }}
                >
                  <Ionicons name="close" size={18} color={theme === 'dark' ? '#fff' : '#000'} />
                </TouchableOpacity>
                
                {/* Date header (center) */}
                <Text style={{
                  fontSize: 20,
                  fontWeight: '700',
                  fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System',
                  color: theme === 'dark' ? '#fff' : '#18181a',
                  flex: 1,
                  textAlign: 'center',
                  marginVertical: 6,
                  marginHorizontal: 4,
                }} numberOfLines={1}>
                  {modalDate ? (() => {
                    // Parse as local date to avoid timezone offset issues
                    const [year, month, day] = modalDate.split('-').map(Number);
                    if (year && month && day) {
                      const localDate = new Date(year, month - 1, day);
                      return localDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
                    }
                    return '';
                  })() : ''}
                </Text>
                
                {/* Add button (right, Apple-style) */}
                <TouchableOpacity
                  onPress={() => {
                    if (modalDate) {
                      setAddTaskModalDate(modalDate);
                      setShowAddTaskModal(true);
                    }
                  }}
                  accessibilityLabel="Add Task"
                  style={{
                    backgroundColor: theme === 'dark' ? '#0a84ff' : '#007aff',
                    borderRadius: 24,
                    width: 40,
                    height: 40,
                    justifyContent: 'center',
                    alignItems: 'center',
                    shadowColor: theme === 'dark' ? '#0a84ff' : '#007aff',
                    shadowOpacity: 0.3,
                    shadowRadius: 4,
                    shadowOffset: { width: 0, height: 2 },
                    elevation: 4,
                  }}
                >
                  <Ionicons name="add" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
              <View style={{ height: 1, backgroundColor: theme === 'dark' ? '#232325' : '#ececec', marginBottom: 2, marginHorizontal: 0 }} />
              {/* Task list */}
              <FlatList
                data={modalTasks}
                keyExtractor={keyExtractor}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={{
                      backgroundColor: theme === 'dark' ? '#232325' : '#f8f8fa',
                      borderRadius: 14,
                      marginHorizontal: 14,
                      marginVertical: 6,
                      paddingVertical: 14,
                      paddingHorizontal: 18,
                      flexDirection: 'row',
                      alignItems: 'center',
                      shadowColor: '#000',
                      shadowOpacity: 0.04,
                      shadowRadius: 4,
                      elevation: 1,
                    }}
                    onLongPress={() => {
                      setTaskModalDate(item.dueDate?.slice(0, 10) || formatDate(today));
                      setTaskModalEditingTask({
                        id: item.id,
                        text: item.text,
                        notes: item.note || '',
                        priority: item.priority,
                        dueDate: item.dueDate || formatDate(today) + 'T00:00:00',
                        reminder: 'none',
                        completed: item.completed,
                        subtasks: item.subtasks || [],
                        archived: item.archived,
                        category: item.category,
                      });
                      setShowTaskModal(true);
                    }}
                    activeOpacity={0.7}
                  >
                    {/* Priority dot */}
                    <View style={{
                      width: 10,
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: PRIORITY_COLORS[item.priority as keyof typeof PRIORITY_COLORS].bg,
                      marginRight: 12,
                    }} />
                    <Text style={{
                      fontSize: 17,
                      fontWeight: '600',
                      color: theme === 'dark' ? '#fff' : '#18181a',
                      flex: 1,
                    }} numberOfLines={2}>{item.text}</Text>
                  </TouchableOpacity>
                )}
                ItemSeparatorComponent={() => <View style={{ height: 0 }} />}
                ListEmptyComponent={() => (
                  <Text style={{
                    fontSize: 15,
                    color: theme === 'dark' ? '#888' : '#b0b3b8',
                    textAlign: 'center',
                    marginTop: 32,
                    fontWeight: '500',
                  }}>No tasks for this day</Text>
                )}
                initialNumToRender={5}
                maxToRenderPerBatch={5}
                windowSize={3}
                removeClippedSubviews={true}
                style={{ minHeight: 120, maxHeight: 320, marginTop: 2, marginBottom: 12 }}
                contentContainerStyle={{ paddingBottom: 12 }}
              />
            </Animated.View>
          </Animated.View>
        {/* TaskModal for editing existing tasks (long press) */}
        <TaskModal
          visible={showTaskModal}
          onClose={handleTaskModalClose}
          onSave={handleTaskModalSave}
          editingTask={taskModalEditingTask}
          title="Edit Task"
          maxHeight={420}
        />

        {/* AddTaskModal for creating new tasks (plus button) */}
        <TaskModal
          visible={showAddTaskModal}
          onClose={handleAddTaskModalClose}
          onSave={handleAddTaskModalSave}
          editingTask={null}
          title="New Task"
          maxHeight={420}
        />
        {renderBottomBar()}
        {/* Comment out AddEditTaskModal usage */}
        {/* {(showAddTask || !!editingTask) && (
            <AddEditTaskModal
              visible={showAddTask || !!editingTask}
              onClose={handleAddModalClose}
              onSave={handleTaskSave}
              onDelete={handleTaskDelete}
              editingTask={
                editingTask
                  ? { ...editingTask, note: editingTask.note || '' }
                  : addTaskDate
                  ? {
                      id: '',
                      text: '',
                      note: '',
                      priority: 'None',
                      dueType: 'custom',
                      dueDate: addTaskDate,
                      completed: false,
                      subtasks: [],
                      archived: false,
                    }
                  : undefined
              }
              animationType="slide"
            />
          )} */}
      </SafeAreaView>
    </Profiler>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 18 : 8,
    paddingBottom: 0,
    paddingHorizontal: 18,
  },
  yearPill: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 4,
    marginRight: 10,
  },
  yearPillText: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'System',
  },
  monthTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    fontFamily: 'System',
    marginTop: 2,
    marginBottom: 12,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerActionPill: {
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: 1,
    marginHorizontal: 0,
    marginBottom: 0,
    backgroundColor: '#e5e7eb',
  },
  weekdaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    marginTop: 2,
    marginBottom: 2,
  },
  weekdaysDivider: {
    height: 1,
    backgroundColor: '#b0b3b8',
    width: '100%',
    marginBottom: 2,
  },
  weekdayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'System',
  },
  monthGridWrap: {
    height: MONTH_ITEM_HEIGHT,
    justifyContent: 'flex-start',
    alignItems: 'stretch',
    marginTop: 0,
    marginBottom: 0,
    paddingTop: GRID_VERTICAL_PADDING,
    paddingBottom: GRID_VERTICAL_PADDING,
  },
  weekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: DAY_CELL_HEIGHT,
    height: DAY_CELL_HEIGHT,
    margin: 0,
    padding: 0,
  },
  weekDivider: {
    height: 1,
    marginHorizontal: 8,
    marginVertical: 0,
    borderRadius: 1,
    backgroundColor: '#e5e7eb',
  },
  dayCellWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    minWidth: 48,
    minHeight: DAY_CELL_HEIGHT,
    marginVertical: 0,
    marginHorizontal: 6,
  },
  dayCellTouchable: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  todayCircle: {
    backgroundColor: '#ff3b30',
  },
  dayNumber: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'System',
    textAlign: 'center',
  },
  currentMonthNumber: {
  },
  overflowMonthNumber: {
    fontWeight: '600',
  },
  todayNumber: {
    color: '#fff',
  },
  eventPillsWrap: {
    minHeight: 18,
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  eventPill: {
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 2,
    marginBottom: 1,
    minWidth: 32,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    maxWidth: 54,
  },
  eventPillText: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'System',
    marginRight: 2,
  },
  eventPillTime: {
    fontSize: 10,
    color: '#ff3b30',
    fontWeight: '500',
    fontFamily: 'System',
  },
  moreEventsText: {
    fontSize: 10,
    marginTop: 1,
    fontFamily: 'System',
  },
  bottomBarWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    paddingTop: 16,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 8,
  },
  bottomBarBtn: {
    borderRadius: 20,
    paddingHorizontal: 28,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomBarBtnText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
    letterSpacing: 0.1,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  ios18Fab: {
    display: 'none',
  },
  eventDotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
    minHeight: 10,
    minWidth: 24,
  },
  eventDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginHorizontal: 1.5,
    marginVertical: 0,
  },
  eventDotOverflow: {
  },
  eventListWrap: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 0,
    backgroundColor: 'transparent',
  },
  eventListHeader: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
    marginLeft: 2,
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 0,
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  eventCardLeft: {
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventCardDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  eventCardContent: {
    flex: 1,
    flexDirection: 'column',
  },
  eventCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  eventCardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eventCardTime: {
    fontSize: 13,
    color: '#ff3b30',
    fontWeight: '500',
    marginRight: 8,
  },
  eventCardLocation: {
    fontSize: 13,
    fontWeight: '400',
    flexShrink: 1,
  },
  eventCardSeparator: {
    height: 1,
    marginVertical: 2,
    marginLeft: 24,
    borderRadius: 1,
    backgroundColor: '#e5e7eb',
  },
  eventListEmpty: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 12,
  },
  modalOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  modalOverlayTouchable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetModalContent: {
    minHeight: 200,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    alignItems: 'stretch',
    width: '90%',
    maxWidth: 420,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sheetHeaderText: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeModalBtn: {
    padding: 8,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    marginLeft: 8,
  },
  closeModalBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
  agendaDateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  agendaDateHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  agendaDateText: {
    fontSize: 18,
    fontWeight: '600',
  },
  agendaTaskIndicator: {
    backgroundColor: '#f2f2f7',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  agendaTaskCount: {
    fontSize: 12,
    fontWeight: '600',
  },
  agendaTaskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  agendaTaskLeft: {
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  agendaTaskDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  agendaTaskContent: {
    flex: 1,
    flexDirection: 'column',
  },
  agendaTaskTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  agendaTaskNote: {
    fontSize: 13,
    fontWeight: '400',
  },
  agendaTaskRight: {
    alignItems: 'flex-end',
  },
  agendaTaskTime: {
    fontSize: 13,
    fontWeight: '500',
  },
  agendaEmptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  agendaEmptyText: {
    fontSize: 16,
    fontWeight: '500',
  },
  agendaContentContainer: {
    paddingBottom: 100, // Add padding to the bottom to account for the bottom bar
  },
  agendaTasksContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
});

