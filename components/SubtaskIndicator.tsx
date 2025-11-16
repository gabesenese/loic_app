import React, { useState, useRef, useEffect, memo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Animated,
  Dimensions,
  StyleSheet,
  ViewStyle,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

export interface Subtask {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
}

interface SubtaskIndicatorProps {
  isDark?: boolean;
  style?: ViewStyle;
  size?: number;
}

// Keep the original breathing indicator for compatibility
export const SubtaskIndicator: React.FC<SubtaskIndicatorProps> = ({ 
  isDark = false, 
  style,
  size = 9 
}) => {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const breathingAnimation = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scale, {
            toValue: 1.25,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 1200,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(scale, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    breathingAnimation.start();

    return () => breathingAnimation.stop();
  }, [scale, opacity]);

  return (
    <Animated.View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: '#5c940d', // Consistent green color
          transform: [{ scale }],
          opacity,
        },
        style,
      ]}
    />
  );
};

interface SubtaskItemProps {
  subtask: Subtask;
  onToggle: (id: string) => void;
  onEdit: (id: string, newText: string) => void;
  onDelete: (id: string) => void;
  isEditing?: boolean;
  onStartEdit?: () => void;
  onEndEdit?: () => void;
  isDark?: boolean;
}

export const SubtaskItem: React.FC<SubtaskItemProps> = memo(({
  subtask,
  onToggle,
  onEdit,
  onDelete,
  isEditing = false,
  onStartEdit,
  onEndEdit,
  isDark = false,
}) => {
  const [editText, setEditText] = useState(subtask.text);
  const [isPressed, setIsPressed] = useState(false);
  
  const slideAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const checkboxAnim = useRef(new Animated.Value(subtask.completed ? 1 : 0)).current;
  const textOpacity = useRef(new Animated.Value(subtask.completed ? 0.6 : 1)).current;
  const deleteSlideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(checkboxAnim, {
      toValue: subtask.completed ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();

    Animated.timing(textOpacity, {
      toValue: subtask.completed ? 0.6 : 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [subtask.completed]);

  const handlePressIn = () => {
    setIsPressed(true);
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    setIsPressed(false);
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const handleToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggle(subtask.id);
  };

  const handleEdit = () => {
    if (isEditing) {
      if (editText.trim() !== subtask.text) {
        onEdit(subtask.id, editText.trim());
      }
      onEndEdit?.();
    } else {
      onStartEdit?.();
    }
  };

  const handleDelete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.timing(deleteSlideAnim, {
      toValue: -Dimensions.get('window').width,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      onDelete(subtask.id);
    });
  };

  const checkboxColor = checkboxAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [isDark ? '#333' : '#e0e0e0', '#34C759'],
  });

  const checkmarkOpacity = checkboxAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0, 1],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? '#1c1c1e' : '#f8f9fa',
          borderColor: isDark ? '#333' : '#e0e0e0',
          transform: [{ translateX: deleteSlideAnim }, { scale: scaleAnim }],
        },
      ]}
    >
      <TouchableOpacity
        onPress={handleToggle}
        onPressIn={() => {
          Keyboard.dismiss();
          handlePressIn();
        }}
        onPressOut={handlePressOut}
        style={styles.checkboxContainer}
        activeOpacity={0.7}
      >
        <Animated.View
          style={[
            styles.checkbox,
            {
              backgroundColor: checkboxColor,
              borderColor: checkboxColor,
            },
          ]}
        >
          <Animated.View style={{ opacity: checkmarkOpacity }}>
            <Ionicons name="checkmark" size={14} color="white" />
          </Animated.View>
        </Animated.View>
      </TouchableOpacity>

      <View style={styles.contentContainer}>
        {isEditing ? (
          <TextInput
            style={[
              styles.editInput,
              {
                color: isDark ? '#fff' : '#000',
                backgroundColor: isDark ? '#2c2c2e' : '#fff',
                borderColor: isDark ? '#444' : '#ccc',
              },
            ]}
            value={editText}
            onChangeText={setEditText}
            onBlur={handleEdit}
            onSubmitEditing={handleEdit}
            autoFocus
            placeholder="Enter subtask..."
            placeholderTextColor={isDark ? '#666' : '#999'}
          />
        ) : (
          <TouchableOpacity 
            onPress={handleEdit} 
            onPressIn={() => {
              Keyboard.dismiss();
            }}
            style={{ flex: 1 }}
            activeOpacity={0.7}
            delayPressIn={0}
          >
            <Animated.Text
              style={[
                styles.subtaskText,
                {
                  color: isDark ? '#fff' : '#000',
                  opacity: textOpacity,
                  textDecorationLine: subtask.completed ? 'line-through' : 'none',
                },
              ]}
            >
              {subtask.text || ''}
            </Animated.Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.actionsContainer}>
        <TouchableOpacity
          onPress={handleEdit}
          onPressIn={() => {
            Keyboard.dismiss();
          }}
          style={[
            styles.actionButton,
            { backgroundColor: isDark ? '#0A84FF' : '#007AFF' },
          ]}
        >
          <Ionicons 
            name={isEditing ? "checkmark" : "pencil"} 
            size={14} 
            color="white" 
          />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleDelete}
          onPressIn={() => {
            Keyboard.dismiss();
          }}
          style={[
            styles.actionButton,
            { backgroundColor: isDark ? '#FF453A' : '#FF3B30' },
          ]}
        >
          <Ionicons name="trash" size={14} color="white" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
});

interface SubtaskManagerProps {
  subtasks: Subtask[];
  onSubtasksChange: (subtasks: Subtask[]) => void;
  isDark?: boolean;
  maxHeight?: number;
}

export const SubtaskManager: React.FC<SubtaskManagerProps> = ({
  subtasks,
  onSubtasksChange,
  isDark = false,
  maxHeight = 300,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleToggleSubtask = (id: string) => {
    const updatedSubtasks = subtasks.map(subtask =>
      subtask.id === id ? { ...subtask, completed: !subtask.completed } : subtask
    );
    onSubtasksChange(updatedSubtasks);
  };

  const handleEditSubtask = (id: string, newText: string) => {
    if (newText.trim()) {
      const updatedSubtasks = subtasks.map(subtask =>
        subtask.id === id ? { ...subtask, text: newText.trim() } : subtask
      );
      onSubtasksChange(updatedSubtasks);
    }
  };

  const handleDeleteSubtask = (id: string) => {
    const updatedSubtasks = subtasks.filter(subtask => subtask.id !== id);
    onSubtasksChange(updatedSubtasks);
  };

  const completedCount = subtasks.filter(s => s.completed).length;
  const totalCount = subtasks.length;
  const progressPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  // Don't render anything if there are no subtasks
  if (subtasks.length === 0) {
    return null;
  }

  return (
    <View style={styles.managerContainer}>
      {/* Progress Header */}
      <View style={styles.progressHeader}>
        <Text style={[styles.progressText, { color: isDark ? '#fff' : '#000' }]}>
          Subtasks ({completedCount}/{totalCount})
        </Text>
        <View style={[styles.progressBar, { backgroundColor: isDark ? '#333' : '#e0e0e0' }]}>
          <Animated.View
            style={[
              styles.progressFill,
              {
                width: `${progressPercentage}%`,
                backgroundColor: '#34C759',
              },
            ]}
          />
        </View>
      </View>

      {/* Subtasks List */}
      <View style={[styles.subtasksList, { maxHeight }]}>
        {subtasks.map((subtask) => (
          <SubtaskItem
            key={subtask.id}
            subtask={subtask}
            onToggle={handleToggleSubtask}
            onEdit={handleEditSubtask}
            onDelete={handleDeleteSubtask}
            isEditing={editingId === subtask.id}
            onStartEdit={() => setEditingId(subtask.id)}
            onEndEdit={() => setEditingId(null)}
            isDark={isDark}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    minHeight: 56,
  },
  checkboxContainer: {
    marginRight: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentContainer: {
    flex: 1,
    marginRight: 12,
    height: 32,
    justifyContent: 'center',
  },
  subtaskText: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 16,
    textAlignVertical: 'center',
    includeFontPadding: false,
    height: 16,
  },
  editInput: {
    fontSize: 16,
    fontWeight: '400',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  managerContainer: {
    paddingVertical: 4,
  },
  progressHeader: {
    marginBottom: 16,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  subtasksList: {
    marginBottom: 16,
  },
}); 