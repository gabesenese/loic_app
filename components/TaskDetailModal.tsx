import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../ThemeContext';
import { PRIORITY_COLORS } from './AddEditTaskModal';
import { SubtaskIndicator } from './SubtaskIndicator';

let BlurView: any = null;
try {
  BlurView = require('expo-blur').BlurView;
} catch {}

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

interface TaskDetailModalProps {
  task: Task | null;
  visible: boolean;
  onClose: () => void;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function TaskDetailModal({ task, visible, onClose }: TaskDetailModalProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const formatDueDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
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

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'High': return 'alert-circle';
      case 'Medium': return 'remove-circle';
      case 'Low': return 'checkmark-circle';
      default: return 'ellipse-outline';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'work': return 'briefcase-outline';
      case 'personal': return 'home-outline';
      default: return 'folder-outline';
    }
  };

  // Calculate if we need scrolling based on content
  const hasNotes = task?.note && task.note.length > 0;
  const hasSubtasks = task?.subtasks && task.subtasks.length > 0;
  const hasCategory = task?.category;
  const hasPriority = task?.priority && task.priority !== 'None';
  const hasDueDate = task?.dueDate;
  
  // Estimate content height and determine if scrolling is needed
  const estimatedContentHeight = 
    100 + // Title and basic spacing
    (hasPriority || hasDueDate ? 50 : 0) + // Meta row
    (hasNotes ? 100 + (task.note?.length || 0) * 0.8 : 0) + // Notes section
    (hasSubtasks ? 80 + (task.subtasks?.length || 0) * 50 : 0) + // Subtasks section
    (hasCategory ? 80 : 0); // Category section

  const needsScrolling = estimatedContentHeight > 400; // Threshold for scrolling

  if (!task) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity 
          style={styles.backdrop} 
          activeOpacity={1} 
          onPress={onClose}
        />
        
        <View style={[styles.modalContainer, { backgroundColor: isDark ? '#1c1c1e' : '#ffffff' }]}>
          {/* Drag Indicator */}
          <View style={styles.dragIndicator}>
            <View style={[styles.dragHandle, { backgroundColor: isDark ? '#48484a' : '#d1d5db' }]} />
          </View>

          {/* Close Button */}
          <TouchableOpacity 
            style={[styles.closeButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]} 
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons 
              name="close" 
              size={20} 
              color={isDark ? '#ffffff' : '#000000'} 
            />
          </TouchableOpacity>

          {needsScrolling ? (
            <ScrollView 
              style={styles.content}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              <TaskContent task={task} isDark={isDark} formatDueDate={formatDueDate} getPriorityIcon={getPriorityIcon} getCategoryIcon={getCategoryIcon} />
            </ScrollView>
          ) : (
            <View style={styles.content}>
              <TaskContent task={task} isDark={isDark} formatDueDate={formatDueDate} getPriorityIcon={getPriorityIcon} getCategoryIcon={getCategoryIcon} />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

// Separate component for task content to avoid duplication
function TaskContent({ 
  task, 
  isDark, 
  formatDueDate, 
  getPriorityIcon,
  getCategoryIcon
}: { 
  task: Task; 
  isDark: boolean; 
  formatDueDate: (date: string) => string; 
  getPriorityIcon: (priority: string) => string; 
  getCategoryIcon: (category: string) => string; 
}) {
  return (
    <View style={styles.scrollContent}>
      {/* Task Title */}
      <Text style={[styles.title, { color: isDark ? '#ffffff' : '#000000' }]}>
        {task.text}
      </Text>

      {/* Status and Priority Row */}
      <View style={styles.metaRow}>
        {task.priority && task.priority !== 'None' && (
          <View style={[styles.priorityContainer, { backgroundColor: PRIORITY_COLORS[task.priority].bg }]}>
            <Ionicons 
              name={getPriorityIcon(task.priority) as any} 
              size={16} 
              color={PRIORITY_COLORS[task.priority].color} 
              style={styles.priorityIcon}
            />
            <Text style={[styles.priorityText, { color: PRIORITY_COLORS[task.priority].color }]}>
              {task.priority} Priority
            </Text>
          </View>
        )}
        
        {task.dueDate && (
          <View style={[styles.dueDateContainer, { backgroundColor: isDark ? 'rgba(165,180,252,0.15)' : 'rgba(100,116,139,0.1)' }]}>
            <Ionicons 
              name="calendar-outline" 
              size={16} 
              color={isDark ? '#a5b4fc' : '#64748b'} 
              style={styles.dueDateIcon}
            />
            <Text style={[styles.dueDateText, { color: isDark ? '#a5b4fc' : '#64748b' }]}>
              {formatDueDate(task.dueDate)}
            </Text>
          </View>
        )}
      </View>

      {/* Notes Section */}
      {task.note && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#8e8e93' : '#6b7280' }]}>
            Notes
          </Text>
          <View style={[styles.notesContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
            <Text style={[styles.notesText, { color: isDark ? '#ffffff' : '#000000' }]}>
              {task.note}
            </Text>
          </View>
        </View>
      )}

      {/* Subtasks Section */}
      {task.subtasks && task.subtasks.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#8e8e93' : '#6b7280' }]}>
            Subtasks ({task.subtasks.filter(st => st.completed).length}/{task.subtasks.length})
          </Text>
          <View style={[styles.subtasksContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
            {task.subtasks.map((subtask, index) => (
              <View key={subtask.id || index} style={styles.subtaskItem}>
                <View style={styles.subtaskIconContainer}>
                  {subtask.completed ? (
                    <Ionicons 
                      name="checkmark-circle" 
                      size={20} 
                      color={isDark ? '#30d158' : '#34c759'} 
                    />
                  ) : (
                    <SubtaskIndicator size={8} />
                  )}
                </View>
                <Text style={[
                  styles.subtaskText, 
                  { 
                    color: isDark ? '#ffffff' : '#000000',
                    textDecorationLine: subtask.completed ? 'line-through' : 'none',
                    opacity: subtask.completed ? 0.6 : 1
                  }
                ]}>
                  {subtask.text}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Category Section */}
      {task.category && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#8e8e93' : '#6b7280' }]}>
            Category
          </Text>
          <View style={[styles.categoryContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
            <Ionicons 
              name={getCategoryIcon(task.category) as any} 
              size={18} 
              color={isDark ? '#8e8e93' : '#6b7280'} 
              style={styles.categoryIcon}
            />
            <Text style={[styles.categoryText, { color: isDark ? '#ffffff' : '#000000' }]}>
              {task.category.charAt(0).toUpperCase() + task.category.slice(1)}
            </Text>
          </View>
        </View>
      )}

      {/* Bottom Spacing */}
      <View style={styles.bottomSpacing} />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalContainer: {
    width: screenWidth * 0.92,
    maxWidth: 420,
    height: screenHeight * 0.7,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 40,
    elevation: 20,
  },
  blurContainer: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
  },
  blurOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
  },
  fallbackContainer: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  dragIndicator: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
    zIndex: 5,
  },
  dragHandle: {
    width: 36,
    height: 5,
    borderRadius: 2.5,
    opacity: 0.6,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  content: {
    flex: 1,
    zIndex: 2,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
    marginBottom: 20,
    letterSpacing: -0.5,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  priorityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  priorityIcon: {
    marginRight: 6,
  },
  priorityText: {
    fontSize: 14,
    fontWeight: '600',
  },
  dueDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  dueDateIcon: {
    marginRight: 6,
  },
  dueDateText: {
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  notesContainer: {
    padding: 16,
    borderRadius: 12,
  },
  notesText: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '400',
  },
  subtasksContainer: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  subtaskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  subtaskIconContainer: {
    width: 24,
    alignItems: 'center',
    marginRight: 12,
  },
  subtaskDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  subtaskText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 20,
  },
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  categoryIcon: {
    marginRight: 12,
  },
  categoryText: {
    fontSize: 16,
    fontWeight: '500',
  },
  bottomSpacing: {
    height: 20,
  },
}); 