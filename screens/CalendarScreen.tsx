import React, { useState, useEffect, useRef, useCallback, memo, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TouchableWithoutFeedback, SafeAreaView, FlatList, Dimensions, Platform, ActivityIndicator } from 'react-native';
import type { ListRenderItemInfo } from 'react-native';
import { useTheme } from '../ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { Profiler } from 'react';
import type { ProfilerOnRenderCallback } from 'react';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, runOnJS, Easing } from 'react-native-reanimated';
import { Animated as RNAnimated } from 'react-native';

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
  Low: { bg: '#e9f8ef', color: '#34c759', border: '#b7f5d8' },
  Medium: { bg: '#fff6e5', color: '#ff9500', border: '#ffe5b2' },
  High: { bg: '#ffe5e7', color: '#ff3b30', border: '#ffd1d4' },
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
const MODAL_HEIGHT = 420;

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

// Add a custom double-tap handler
function useDoubleTap(callback: () => void, delay = 250) {
  const lastTap = useRef<number | null>(null);
  return () => {
    const now = Date.now();
    if (lastTap.current && now - lastTap.current < delay) {
      callback();
    }
    lastTap.current = now;
  };
}

// Memoized DayCell component
const DayCell = memo(({ cell, isTodayDate, dayTasks, handlePress, isHighlighted }: {
  cell: { date: string; isCurrentMonth: boolean };
  isTodayDate: boolean;
  dayTasks: Task[];
  handlePress: () => void;
  isHighlighted: boolean;
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
const MonthGrid = memo(({ days, firstDayOfWeek, numRows, getTasksForDate, isToday, handleDayPress, highlightedDate, theme }: any) => {
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
  const { theme } = useTheme();
  const colors = APPLE_COLORS[theme];
  
  // Declare pendingDate state at the top so it's available everywhere
  const [pendingDate, setPendingDate] = useState<string | null>(null);
  
  // Memoized style objects for performance and stable props
  const headerWrapStyle = useMemo(() => [styles.headerWrap], []);
  const monthTitleStyle = useMemo(() => [styles.monthTitle, { color: theme === 'dark' ? '#fff' : '#111' }], [theme]);
  const headerActionPillStyle = useMemo(() => [styles.headerActionPill, { backgroundColor: theme === 'dark' ? '#000' : '#f3f4f6', borderColor: theme === 'dark' ? '#222' : 'transparent', borderWidth: theme === 'dark' ? 1 : 0 }], [theme]);
  const weekdaysRowStyle = useMemo(() => [styles.weekdaysRow], []);
  const weekdayTextStyle = useMemo(() => [styles.weekdayText, { color: theme === 'dark' ? '#fff' : '#111' }], [theme]);
  const bottomBarWrapStyle = useMemo(() => [styles.bottomBarWrap, { backgroundColor: theme === 'dark' ? '#000' : 'rgba(255,255,255,0.95)', borderTopWidth: theme === 'dark' ? 1 : 0, borderTopColor: theme === 'dark' ? '#222' : 'transparent' }], [theme]);
  const bottomBarBtnStyle = useMemo(() => [styles.bottomBarBtn, { backgroundColor: theme === 'dark' ? '#000' : '#fff', borderColor: theme === 'dark' ? '#222' : 'transparent', borderWidth: theme === 'dark' ? 1 : 0 }], [theme]);
  const bottomBarBtnTextStyle = useMemo(() => [styles.bottomBarBtnText, { color: theme === 'dark' ? '#fff' : '#111' }], [theme]);
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
  const [showAddTask, setShowAddTask] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const flatListRef = useRef<FlatList<any>>(null);
  const [showDayDetailModal, setShowDayDetailModal] = useState(false);
  const [modalDate, setModalDate] = useState<string | null>(null);
  const [visibleMonth, setVisibleMonth] = useState<{ year: number; month: number }>({
    year: today.getFullYear(),
    month: today.getMonth(),
  });
  // Double-tap state for all dates
  const lastTapRef = useRef<{ [date: string]: number }>({});
  
  // Animation values for modal (Reanimated)
  // --- Reanimated modal animation ---
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

  const [addTaskDate, setAddTaskDate] = useState<string | null>(null);
  const [showAgenda, setShowAgenda] = useState(false);

  // Move agendaTasks useMemo to top level
  const agendaTasks = useMemo(
    () => tasks.filter(t => !t.archived && t.dueDate)
               .sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || '')),
    [tasks]
  );

  const [highlightedDate, setHighlightedDate] = useState<string | null>(null);

  // --- AddEditTaskModal and Day Detail Modal Apple-like Animation ---
  const MODAL_TRANSLATE_Y = 40; // Shorter for popover feel
  const MODAL_SCALE_START = 0.96;
  const MODAL_SCALE_END = 1;
  const MODAL_OPACITY_START = 0;
  const MODAL_OPACITY_END = 1;
  const MODAL_ANIMATION_DURATION = 260;
  const MODAL_EASING = Easing.bezier(0.4, 0, 0.2, 1);

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
    if (showAddTask || editingTask) {
      animateAddModalIn();
    }
  }, [showAddTask, editingTask]);

  const handleAddModalClose = useCallback(() => {
    // Ensure all modals are closed
    setShowAddTask(false);
    setEditingTask(null);
    setAddTaskDate(null);
    setHighlightedDate(null);
    setShowDayDetailModal(false);
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((data) => {
      if (data) setTasks(JSON.parse(data));
    });
  }, []);
  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
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
  const animateModalIn = useCallback(() => {
    modalOpacity.value = withTiming(1, { duration: 200 });
    modalScale.value = withSpring(1, { damping: 8, stiffness: 100 });
    modalTranslateY.value = withSpring(0, { damping: 10, stiffness: 80 });
  }, [modalOpacity, modalScale, modalTranslateY]);

  const animateModalOut = useCallback(() => {
    modalOpacity.value = withTiming(0, { duration: 100 });
    modalScale.value = withTiming(0.98, { duration: 100 });
    modalTranslateY.value = withTiming(MODAL_HEIGHT, { duration: 120 }, (finished) => {
      if (finished) {
        runOnJS(() => {
          setShowDayDetailModal(false);
          setShowAddTask(false); // Ensure add task modal is closed
          setEditingTask(null);
          if (pendingDate) {
            actuallyHandleDayPress(pendingDate);
            setPendingDate(null);
          }
        })();
      }
    });
  }, [modalOpacity, modalScale, modalTranslateY, pendingDate]);

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

  // Memoized handler for day press - show popover
  const handleDayPress = useCallback((date: string) => {
    // If modal is open, close it first and queue the next date
    if (showDayDetailModal) {
      setPendingDate(date);
      animateModalOut();
      return;
    }
    actuallyHandleDayPress(date);
  }, [getTasksForDate, showDayDetailModal, animateModalOut]);

  const actuallyHandleDayPress = (date: string) => {
    const tasksForDate = getTasksForDate(date);
    if (!isToday(date)) {
      setHighlightedDate(date);
    }
    // Ensure only one modal is open at a time
    setShowDayDetailModal(false);
    setShowAddTask(false);
    setEditingTask(null);
    if (tasksForDate.length === 0) {
      setAddTaskDate(date);
      setShowAddTask(true);
    } else {
      setModalDate(date);
      setShowDayDetailModal(true);
    }
  };

  // Add useEffect to animate modal in when showDayDetailModal becomes true
  useEffect(() => {
    if (showDayDetailModal) {
      animateModalIn();
    }
  }, [showDayDetailModal, animateModalIn]);

  // Ensure pendingDate is handled after modal closes
  useEffect(() => {
    if (!showDayDetailModal && pendingDate) {
      actuallyHandleDayPress(pendingDate);
      setPendingDate(null);
    }
  }, [showDayDetailModal, pendingDate]);

  // Memoized event card renderer for better performance
  const renderEventCard = useCallback(({ item }: { item: Task }) => (
    <View style={[styles.eventCard, { backgroundColor: colors.card, shadowColor: '#000' }]}> 
      <View style={styles.eventCardLeft}>
        <View style={[styles.eventCardDot, { backgroundColor: PRIORITY_COLORS[item.priority as keyof typeof PRIORITY_COLORS].bg }]} />
      </View>
      <View style={styles.eventCardContent}>
        <Text style={[styles.eventCardTitle, { color: colors.text }]} numberOfLines={1}>{item.text}</Text>
        <View style={styles.eventCardMetaRow}>
          {item.dueDate && (
            <Text style={styles.eventCardTime}>{item.dueDate.split('T')[1]?.slice(0,5)}</Text>
          )}
          {item.note && (
            <Text style={styles.eventCardLocation} numberOfLines={1}>{item.note}</Text>
          )}
        </View>
      </View>
    </View>
  ), [colors]);

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
      <TouchableOpacity
        style={headerActionPillStyle}
        onPress={handleToggleView}
        accessibilityLabel={showAgenda ? 'Show Calendar View' : 'Show List View'}
      >
        <Ionicons name={showAgenda ? 'calendar-outline' : 'list-outline'} size={22} color={theme === 'dark' ? '#fff' : '#111'} />
      </TouchableOpacity>
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
      />
    );
  }, [getTasksForDate, handleDayPress, highlightedDate, theme]);

  const renderBottomBar = useCallback(() => (
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
  ), [bottomBarWrapStyle, bottomBarBtnStyle, bottomBarBtnTextStyle, monthsOfYear, today]);

  const renderAgendaView = useCallback(() => (
    <View style={[styles.container, { backgroundColor: theme === 'dark' ? '#000' : colors.background }]}> 
      <FlatList
        data={agendaTasks}
        keyExtractor={keyExtractor}
        renderItem={renderEventCard}
        ItemSeparatorComponent={ItemSeparator}
        ListEmptyComponent={() => <Text style={eventListEmptyStyle}>No events</Text>}
        contentContainerStyle={eventListWrapStyle}
        initialNumToRender={5} // Optimization: minimal render
        maxToRenderPerBatch={5}
        windowSize={3}
      />
    </View>
  ), [agendaTasks, keyExtractor, renderEventCard, ItemSeparator, eventListEmptyStyle, eventListWrapStyle, theme, colors]);

  // Restore missing memoized variables and handlers
  const eventListTasks = useMemo(() => getTasksForDate(selectedDate), [selectedDate, getTasksForDate]);
  const modalTasks = useMemo(() => modalDate ? getTasksForDate(modalDate) : [], [modalDate, getTasksForDate]);

  const handleTaskSave = useCallback((task: TaskForm) => {
    if (task.id) {
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, ...task } : t));
    } else {
      setTasks(prev => [
        { ...task, id: Date.now().toString(), dueDate: task.dueDate || addTaskDate || selectedDate, archived: false },
        ...prev
      ]);
    }
    handleAddModalClose();
  }, [addTaskDate, selectedDate, handleAddModalClose]);

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
  }));
  useEffect(() => {
    if (showDayDetailModal) {
      animateDayModalIn();
    }
  }, [showDayDetailModal]);

  return (
    <Profiler id="CalendarScreen" onRender={onRenderCallback}>
      <SafeAreaView style={[styles.container, { backgroundColor: theme === 'dark' ? '#000' : colors.background, flex: 1 }]}>  
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
            {/* Event list for selected day */}
            <View style={[styles.eventListWrap, { paddingTop: 8 }]}>
              <MemoizedEventList
                tasks={eventListTasks}
                keyExtractor={keyExtractor}
                renderEventCard={renderEventCard}
                ItemSeparator={ItemSeparator}
                ListEmptyComponent={ListEmptyComponent}
              />
            </View>
          </>
        )}
        {/* Modal for day detail - Only rendered when visible */}
        {showDayDetailModal && (
          <Animated.View style={[styles.modalOverlay, dayModalOverlayStyle, { backgroundColor: 'rgba(0,0,0,0.18)' }]}> 
            <TouchableWithoutFeedback
              style={{ flex: 1, position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
              onPress={() => animateDayModalOut()}
            >
              <Animated.View style={[styles.sheetModalContent, dayModalContentStyle, { backgroundColor: theme === 'dark' ? '#000' : '#fff', padding: 32, borderRadius: 24, shadowOpacity: 0.08, shadowRadius: 16, elevation: 8 /*, fontFamily: Platform.OS === 'ios' ? 'SF Pro' : undefined*/ }]}> 
                <View style={[styles.sheetHeader, { backgroundColor: theme === 'dark' ? '#000' : '#f3f4f6' }]}> 
                  <Text style={[styles.sheetHeaderText, { color: theme === 'dark' ? '#fff' : '#222' }]}>Tasks for {modalDate}</Text>
                  <TouchableOpacity
                    onPress={() => { setShowDayDetailModal(false); setAddTaskDate(modalDate); setShowAddTask(true); }}
                    style={[styles.closeModalBtn, { backgroundColor: theme === 'dark' ? '#000' : '#f3f4f6', borderColor: theme === 'dark' ? '#222' : 'transparent', borderWidth: theme === 'dark' ? 1 : 0 }]}
                    accessibilityLabel="Add Task"
                  >
                    <Ionicons name="add" size={24} color={theme === 'dark' ? '#fff' : '#111'} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => animateDayModalOut()} style={[styles.closeModalBtn, { backgroundColor: theme === 'dark' ? '#000' : '#f3f4f6', borderColor: theme === 'dark' ? '#222' : 'transparent', borderWidth: theme === 'dark' ? 1 : 0 }]} accessibilityLabel="Close">
                    <Ionicons name="close" size={22} color={theme === 'dark' ? '#fff' : '#111'} />
                  </TouchableOpacity>
                </View>
                <View>
                  <FlatList
                    data={modalTasks}
                    keyExtractor={keyExtractor}
                    renderItem={renderEventCard}
                    ItemSeparatorComponent={ItemSeparator}
                    ListEmptyComponent={() => <Text style={eventListEmptyStyle}>No events</Text>}
                    initialNumToRender={5} // Optimization: minimal render
                    maxToRenderPerBatch={5}
                    windowSize={3}
                    removeClippedSubviews={true}
                  />
                </View>
              </Animated.View>
            </TouchableWithoutFeedback>
          </Animated.View>
        )}
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
    paddingTop: 8,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 8,
  },
  bottomBarBtn: {
    borderRadius: 18,
    paddingHorizontal: 24,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  bottomBarBtnText: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'System',
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
});

