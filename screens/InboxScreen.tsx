import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, SafeAreaView, TouchableOpacity, Platform, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SmartLists from '../components/SmartLists';
import TaskDetailModal from '../components/TaskDetailModal';
import { useTheme } from '../ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PRIORITY_COLORS } from '../components/AddEditTaskModal';
import { Ionicons } from '@expo/vector-icons';
import { SubtaskIndicator } from '../components/SubtaskIndicator';

const STORAGE_KEY = 'TODO_TASKS';
const PRIORITY_ORDER = { High: 1, Medium: 2, Low: 3, None: 4 };

// Explicit Task type
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

let BlurView: any = null;
try {
  BlurView = require('expo-blur').BlurView;
} catch {}

export default function InboxScreen() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [selectedList, setSelectedList] = useState('all');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [viewTask, setViewTask] = useState<Task | null>(null);
  const { top } = useSafeAreaInsets();

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((data) => {
      if (data) setTasks(JSON.parse(data));
    });
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }, [tasks]);

  const counts = {
    all: tasks.filter((t: Task) => !t.archived && !t.completed).length,
    important: tasks.filter((t: Task) => t.priority === 'High' && !t.archived && !t.completed).length,
    today: tasks.filter((t: Task) => isToday(t.dueDate ?? '') && !t.archived && !t.completed).length,
    work: tasks.filter((t: Task) => t.category === 'work' && !t.archived && !t.completed).length,
    personal: tasks.filter((t: Task) => t.category === 'personal' && !t.archived && !t.completed).length,
    archive: tasks.filter((t: Task) => t.archived).length,
  };

  function isToday(dateStr: string): boolean {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  }

  function filterTasks(tasks: Task[], smartList: string): Task[] {
    switch (smartList) {
      case 'important':
        return tasks.filter(t => t.priority === 'High' && !t.archived);
      case 'today':
        return tasks.filter(t => isToday(t.dueDate ?? '') && !t.archived);
      case 'work':
        return tasks.filter(t => t.category === 'work' && !t.archived);
      case 'personal':
        return tasks.filter(t => t.category === 'personal' && !t.archived);
      case 'archive':
        return tasks.filter(t => t.archived);
      case 'all':
      default:
        return tasks.filter(t => !t.archived);
    }
  }

  function sortByPriority(tasks: Task[]): Task[] {
    return tasks.slice().sort((a: Task, b: Task) => {
      const pa = PRIORITY_ORDER[a.priority] ?? 99;
      const pb = PRIORITY_ORDER[b.priority] ?? 99;
      return pa - pb;
    });
  }

  // Apple-style: sort by priority, then by due date (optional)
  const filteredTasks = sortByPriority(filterTasks(tasks, selectedList)).sort((a: Task, b: Task) => {
    if (a.dueDate && b.dueDate) return new Date(a.dueDate ?? '').getTime() - new Date(b.dueDate ?? '').getTime();
    return 0;
  });

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#18181c' : '#fff', paddingTop: top + 32 }]}> 
      <SmartLists selected={selectedList} onSelect={setSelectedList} counts={counts} />
      
      {/* Task List Container */}
      <View style={styles.taskListContainer}>
        <FlatList
          data={filteredTasks}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setViewTask(item)}
              style={[
                styles.taskRow, 
                { 
                  backgroundColor: isDark ? '#23232a' : '#ffffff',
                  borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                }
              ]}
            >
              <Text style={[styles.taskText, { color: isDark ? '#fff' : '#222' }]} numberOfLines={2}>{item.text}</Text>
              {item.subtasks && item.subtasks.length > 0 && !item.completed && (
                <SubtaskIndicator style={styles.subtaskDot} />
              )}
              {item.priority && item.priority !== 'None' && (
                <View style={[styles.priorityBadge, { backgroundColor: PRIORITY_COLORS[item.priority].bg, borderColor: PRIORITY_COLORS[item.priority].border }]}> 
                  <Text style={[styles.priorityBadgeText, { color: PRIORITY_COLORS[item.priority].color }]}>{item.priority}</Text>
                </View>
              )}
              {item.dueDate && (
                <Text style={[styles.dueDateText, { color: isDark ? '#a5b4fc' : '#64748b' }]}>{new Date(item.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
              )}
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyTitle, { color: isDark ? '#aaa' : '#888' }]}>No tasks here yet</Text>
              <Text style={[styles.emptySubtitle, { color: isDark ? '#666' : '#bbb' }]}>Add a new task to get started!</Text>
            </View>
          }
          contentContainerStyle={styles.flatListContent}
          showsVerticalScrollIndicator={false}
        />
      </View>
      
      {/* Apple-style Task Detail Modal */}
      <TaskDetailModal
        task={viewTask}
        visible={!!viewTask}
        onClose={() => setViewTask(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    paddingHorizontal: 0, 
    paddingTop: 0, 
    paddingBottom: 8 
  },
  taskListContainer: {
    flex: 1,
    marginTop: 0,
    paddingHorizontal: 16,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 20,
    marginBottom: 10,
    borderRadius: 16,
    minHeight: 64,
    gap: 12,
    borderBottomWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  taskText: {
    flex: 1,
    fontSize: 17,
    fontWeight: '500',
    letterSpacing: 0.1,
    lineHeight: 22,
  },
  priorityBadge: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginLeft: 8,
    alignSelf: 'center',
    borderWidth: 1.5,
  },
  priorityBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  subtaskDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#5c940d',
    marginLeft: 8,
    marginRight: 0,
    alignSelf: 'center',
  },
  dueDateText: {
    fontSize: 13,
    color: '#64748b',
    marginLeft: 8,
    alignSelf: 'center',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 80,
  },
  emptyTitle: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: '600',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.7,
  },
  flatListContent: {
    paddingBottom: 100,
  },
}); 