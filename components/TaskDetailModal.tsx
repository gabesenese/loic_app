import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
  Dimensions,
  ScrollView,
  Platform,
  Easing,
} from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../ThemeContext';

// Dynamic imports for blur effects
let BlurView: any = null;
try {
  BlurView = require('expo-blur').BlurView;
} catch (e) {
  // BlurView not available
}

const { height: screenHeight } = Dimensions.get('window');

// Clean, minimal color palette
const COLORS = {
  light: {
    background: '#ffffff',
    surface: '#f8fafc',
    border: '#e2e8f0',
    text: '#0f172a',
    textSecondary: '#64748b',
    textTertiary: '#94a3b8',
    accent: '#3b82f6',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    shadow: 'rgba(0, 0, 0, 0.1)',
  },
  dark: {
    background: '#0f172a',
    surface: '#1e293b',
    border: '#334155',
    text: '#f8fafc',
    textSecondary: '#cbd5e1',
    textTertiary: '#64748b',
    accent: '#3b82f6',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    shadow: 'rgba(0, 0, 0, 0.3)',
  },
};

const PRIORITY_STYLES = {
  light: {
    None: { bg: '#f1f5f9', color: '#64748b', icon: '#94a3b8' },
    Low: { bg: '#dcfce7', color: '#16a34a', icon: '#22c55e' },
    Medium: { bg: '#fef3c7', color: '#d97706', icon: '#f59e0b' },
    High: { bg: '#fee2e2', color: '#dc2626', icon: '#ef4444' },
  },
  dark: {
    None: { bg: '#334155', color: '#94a3b8', icon: '#64748b' },
    Low: { bg: '#14532d', color: '#22c55e', icon: '#16a34a' },
    Medium: { bg: '#451a03', color: '#f59e0b', icon: '#d97706' },
    High: { bg: '#450a0a', color: '#ef4444', icon: '#dc2626' },
  },
};

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
  visible: boolean;
  task: Task | null;
  onClose: () => void;
  onDelete?: (taskId: string) => void;
  onArchive?: (taskId: string) => void;
}

export default function TaskDetailModal({
  visible,
  task,
  onClose,
  onDelete,
  onArchive,
}: TaskDetailModalProps) {
  const { theme } = useTheme();
  const colors = COLORS[theme];
  const priorityStyles = PRIORITY_STYLES[theme];
  const isDark = theme === 'dark';

  // Simple animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.95,
          duration: 200,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!task) return null;

  const handleAction = (action: () => void) => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }
    action();
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isTomorrow = date.toDateString() === new Date(now.getTime() + 24 * 60 * 60 * 1000).toDateString();
    
    if (isToday) return 'Today';
    if (isTomorrow) return 'Tomorrow';
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const isOverdue = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return date < now;
  };

  const totalSubtasks = task.subtasks?.length || 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Animated.View 
        style={[
          styles.overlay,
          { opacity: fadeAnim }
        ]}
      >
        {BlurView && (
          <BlurView
            intensity={10}
            tint={isDark ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />
        )}
        
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.overlayContent}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <Animated.View
                style={[
                  styles.modal,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    shadowColor: colors.shadow,
                    transform: [{ scale: scaleAnim }],
                  },
                ]}
              >
                {/* Header */}
                <View style={[styles.header, { borderBottomColor: colors.border }]}>
                  <TouchableOpacity
                    style={[
                      styles.closeButton,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                      }
                    ]}
                    onPress={() => handleAction(onClose)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="close" size={20} color={colors.text} />
                  </TouchableOpacity>
                  
                  <Text style={[styles.headerTitle, { color: colors.text }]}>
                    Task Details
                  </Text>
                  
                  <View style={styles.headerSpacer} />
                </View>

                {/* Content */}
                <ScrollView 
                  style={styles.content}
                  contentContainerStyle={styles.scrollContent}
                  showsVerticalScrollIndicator={false}
                >
                  {/* Task Title */}
                  <View style={[styles.titleSection, { backgroundColor: colors.surface }]}>
                    <View style={[
                      styles.statusIndicator,
                      { backgroundColor: task.completed ? colors.success : colors.accent }
                    ]} />
                    <Text style={[
                      styles.taskTitle,
                      { 
                        color: colors.text,
                        textDecorationLine: task.completed ? 'line-through' : 'none',
                        opacity: task.completed ? 0.7 : 1,
                      }
                    ]}>
                      {task.text}
                    </Text>
                    {task.completed && (
                      <View style={[styles.completedBadge, { backgroundColor: colors.success }]}>
                        <Ionicons name="checkmark" size={14} color="#ffffff" />
                      </View>
                    )}
                  </View>

                  {/* Details Grid */}
                  <View style={styles.detailsGrid}>
                    {/* Priority */}
                    {task.priority !== 'None' && (
                      <View style={[
                        styles.detailCard,
                        {
                          backgroundColor: priorityStyles[task.priority].bg,
                          borderColor: colors.border,
                        }
                      ]}>
                        <FontAwesome5 
                          name="flag" 
                          size={16} 
                          color={priorityStyles[task.priority].icon} 
                        />
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                          Priority
                        </Text>
                        <Text style={[
                          styles.detailValue,
                          { color: priorityStyles[task.priority].color }
                        ]}>
                          {task.priority}
                        </Text>
                      </View>
                    )}

                    {/* Due Date */}
                    {task.dueDate && (
                      <View style={[
                        styles.detailCard,
                        {
                          backgroundColor: colors.surface,
                          borderColor: colors.border,
                        }
                      ]}>
                        <Ionicons 
                          name="calendar-outline" 
                          size={16} 
                          color={isOverdue(task.dueDate) ? colors.error : colors.accent} 
                        />
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                          Due Date
                        </Text>
                        <Text style={[
                          styles.detailValue,
                          { 
                            color: isOverdue(task.dueDate) ? colors.error : colors.text,
                            fontWeight: isOverdue(task.dueDate) ? '600' : '500',
                          }
                        ]}>
                          {formatDate(task.dueDate)}
                          {isOverdue(task.dueDate) && ' (Overdue)'}
                        </Text>
                      </View>
                    )}

                    {/* Category */}
                    {task.category && (
                      <View style={[
                        styles.detailCard,
                        {
                          backgroundColor: colors.surface,
                          borderColor: colors.border,
                        }
                      ]}>
                        <Ionicons name="folder-outline" size={16} color={colors.warning} />
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                          Category
                        </Text>
                        <Text style={[
                          styles.detailValue,
                          { color: colors.text, textTransform: 'capitalize' }
                        ]}>
                          {task.category}
                        </Text>
                      </View>
                    )}


                  </View>

                  {/* Notes */}
                  {task.note && (
                    <View style={styles.section}>
                      <Text style={[styles.sectionTitle, { color: colors.text }]}>
                        Notes
                      </Text>
                      <View style={[
                        styles.notesCard,
                        {
                          backgroundColor: colors.surface,
                          borderColor: colors.border,
                        }
                      ]}>
                        <Text style={[styles.notesText, { color: colors.textSecondary }]}>
                          {task.note}
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Subtasks List */}
                  {totalSubtasks > 0 && (
                    <View style={styles.section}>
                                             <Text style={[styles.sectionTitle, { color: colors.text }]}>
                         Subtasks
                       </Text>
                      <View style={[
                        styles.subtasksCard,
                        {
                          backgroundColor: colors.surface,
                          borderColor: colors.border,
                        }
                      ]}>
                        {task.subtasks.map((subtask, index) => (
                          <View 
                            key={subtask.id} 
                            style={[
                              styles.subtaskItem,
                              index < task.subtasks.length - 1 && {
                                borderBottomColor: colors.border,
                                borderBottomWidth: StyleSheet.hairlineWidth
                              }
                            ]}
                          >
                            <View style={[
                              styles.subtaskCheck,
                              {
                                backgroundColor: subtask.completed ? colors.success : 'transparent',
                                borderColor: subtask.completed ? colors.success : colors.border,
                              }
                            ]}>
                              {subtask.completed && (
                                <Ionicons name="checkmark" size={12} color="#ffffff" />
                              )}
                            </View>
                            <Text style={[
                              styles.subtaskText,
                              { 
                                color: colors.text,
                                textDecorationLine: subtask.completed ? 'line-through' : 'none',
                                opacity: subtask.completed ? 0.7 : 1,
                              }
                            ]}>
                              {subtask.text}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                </ScrollView>

                {/* Actions */}
                {(onDelete || onArchive) && (
                  <View style={[styles.actions, { borderTopColor: colors.border }]}>
                    {onArchive && !task.archived && (
                      <TouchableOpacity
                        style={[
                          styles.actionButton,
                          {
                            backgroundColor: colors.surface,
                            borderColor: colors.border,
                          }
                        ]}
                        onPress={() => handleAction(() => onArchive(task.id))}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="archive-outline" size={18} color={colors.textSecondary} />
                        <Text style={[styles.actionText, { color: colors.textSecondary }]}>
                          Archive
                        </Text>
                      </TouchableOpacity>
                    )}
                    
                    {onDelete && (
                      <TouchableOpacity
                        style={[
                          styles.actionButton,
                          {
                            backgroundColor: colors.surface,
                            borderColor: colors.border,
                          }
                        ]}
                        onPress={() => handleAction(() => onDelete(task.id))}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="trash-outline" size={18} color={colors.error} />
                        <Text style={[styles.actionText, { color: colors.error }]}>
                          Delete
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </Animated.View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  overlayContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modal: {
    width: '100%',
    maxWidth: 400,
    maxHeight: screenHeight * 0.8,
    borderRadius: 16,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 25,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 36,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  titleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    position: 'relative',
  },
  statusIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginRight: 12,
  },
  taskTitle: {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 28,
    flex: 1,
  },
  completedBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  detailsGrid: {
    gap: 12,
    marginBottom: 20,
  },
  detailCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 12,
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  notesCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  notesText: {
    fontSize: 15,
    lineHeight: 22,
  },
  subtasksCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  subtaskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  subtaskCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  subtaskText: {
    fontSize: 15,
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
  },
  actionText: {
    fontSize: 15,
    fontWeight: '500',
    marginLeft: 8,
  },
});