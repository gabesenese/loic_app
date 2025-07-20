import React, { useState, useEffect, useRef, useLayoutEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Platform,
  Dimensions,
  ScrollView,
  Alert,
  SafeAreaView,
  Animated,
  KeyboardAvoidingView,
  Keyboard,
  Easing,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme } from "../ThemeContext";
import DateTimePicker from "@react-native-community/datetimepicker";


const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
const MODAL_HEIGHT = Math.round(screenHeight * 0.65);

// Apple's semantic colors
const APPLE_COLORS = {
  light: {
    background: "#ffffff",
    secondaryBackground: "#f2f2f7",
    tertiaryBackground: "#e5e5ea",
    label: "#000000",
    secondaryLabel: "#3c3c43",
    tertiaryLabel: "#787880",
    separator: "#c6c6c8",
    systemBlue: "#007aff",
    systemGreen: "#34c759",
    systemOrange: "#ff9500",
    systemRed: "#ff3b30",
    systemGray: "#8e8e93",
    systemGray2: "#aeaeb2",
    systemGray3: "#c7c7cc",
    systemGray4: "#d1d1d6",
    systemGray5: "#e5e5ea",
    systemGray6: "#f2f2f7",
  },
  dark: {
    background: "#000000",
    secondaryBackground: "#1c1c1e",
    tertiaryBackground: "#2c2c2e",
    label: "#ffffff",
    secondaryLabel: "#ebebf5",
    tertiaryLabel: "#ebebf599",
    separator: "#38383a",
    systemBlue: "#0a84ff",
    systemGreen: "#30d158",
    systemOrange: "#ff9f0a",
    systemRed: "#ff453a",
    systemGray: "#8e8e93",
    systemGray2: "#636366",
    systemGray3: "#48484a",
    systemGray4: "#3a3a3c",
    systemGray5: "#2c2c2e",
    systemGray6: "#1c1c1e",
  },
};

const PRIORITY_COLORS = {
  None: { bg: "#f2f2f7", color: "#8e8e93", border: "#e5e5ea" },
  Low: { bg: "#e9f8ef", color: "#34c759", border: "#b7f5d8" },
  Medium: { bg: "#fff6e5", color: "#ff9500", border: "#ffe5b2" },
  High: { bg: "#ffe5e7", color: "#ff3b30", border: "#ffd1d4" },
};

const DUE_DATE_OPTIONS = [
  { key: "none", label: "No Due Date", icon: "calendar-outline", color: "#b0b0b0" },
  { key: "today", label: "Today", icon: "calendar", color: "#007aff" },
  { key: "tomorrow", label: "Tomorrow", icon: "calendar-sharp", color: "#34c759" },
  { key: "nextWeek", label: "Next Week", icon: "calendar-number-outline", color: "#ff9500" },
  { key: "custom", label: "Custom Date", icon: "create-outline", color: "#af52de" },
];

const PRIORITY_OPTIONS = [
  { key: "None", label: "None", icon: "ellipse-outline" },
  { key: "Low", label: "Low", icon: "checkmark-circle-outline" },
  { key: "Medium", label: "Medium", icon: "remove-circle-outline" },
  { key: "High", label: "High", icon: "alert-circle-outline" },
];

const REMINDER_OPTIONS = [
  { key: "none", label: "No Reminder", icon: "notifications-off-outline", color: "#b0b0b0" },
  { key: "5min", label: "5 minutes before", icon: "time-outline", color: "#007aff" },
  { key: "15min", label: "15 minutes before", icon: "alarm-outline", color: "#34c759" },
  { key: "1hour", label: "1 hour before", icon: "hourglass-outline", color: "#ff9500" },
  { key: "1day", label: "1 day before", icon: "calendar-outline", color: "#af52de" },
];

interface TaskModalProps {
  visible: boolean;
  onClose: () => void;
  onSave?: (task: TaskData) => void;
  editingTask?: TaskData | null;
  title?: string;
  maxHeight?: number;
  children?: React.ReactNode;
}

interface TaskData {
  id?: string;
  text: string;
  notes: string;
  priority: "None" | "Low" | "Medium" | "High";
  dueDate: string | null;
  reminder: string;
  completed: boolean;
}

// Clean Pill Component
const Pill = React.forwardRef<any, any>((props, ref) => {
  const { title, value, onPress, icon, isDark, showDot = false, dotColor = undefined, pillStyle = {}, valueStyle = {}, iconColor } = props;
  return (
    <TouchableOpacity
      ref={ref}
      style={[
        styles.pill,
        { backgroundColor: isDark ? "#1c1c1e" : "#ffffff" },
        pillStyle,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.pillLeft}>
        <Ionicons name={icon as any} size={20} color={iconColor ?? (isDark ? "#8e8e93" : "#6b7280")} />
        <Text style={[styles.pillTitle, { color: isDark ? "#ffffff" : "#000000" }]}>
          {title}
        </Text>
      </View>
      <View style={styles.pillRight}>
        {showDot && dotColor && pillStyle && (
          <View
            style={{
              width: 18,
              height: 18,
              borderRadius: 9,
              backgroundColor: (pillStyle as any).backgroundColor,
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 8,
            }}
          >
            <View
              style={{
                width: 10,
                height: 10,
                borderRadius: 5,
                backgroundColor: dotColor,
              }}
            />
          </View>
        )}
        <Text style={[styles.pillValue, { color: isDark ? "#8e8e93" : "#6b7280" }, valueStyle]}>
          {value}
        </Text>
        <Ionicons name="chevron-down" size={16} color={isDark ? "#8e8e93" : "#6b7280"} />
      </View>
    </TouchableOpacity>
  );
});

// Clean Dropdown Component
const Dropdown = ({
  visible,
  options,
  onSelect,
  onClose,
  isDark,
  dropdownAnchorRef,
  parentRef,
}: {
  visible: boolean;
  options: Array<{ key: string; label: string; icon: string; color?: string }>;
  onSelect: (key: string) => void;
  onClose: () => void;
  isDark: boolean;
  dropdownAnchorRef: React.RefObject<any>;
  parentRef: React.RefObject<any>;
}) => {
  const [position, setPosition] = useState({ top: 0, left: 0, width: 200 });
  const slideAnim = useRef(new Animated.Value(-20)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useLayoutEffect(() => {
    if (visible && dropdownAnchorRef?.current && parentRef?.current && dropdownAnchorRef.current.measureLayout) {
      dropdownAnchorRef.current.measureLayout(
        parentRef.current,
        (x: number, y: number, width: number, height: number) => {
          setPosition({ top: y + height, left: x, width });
        },
        () => {}
      );
    }
  }, [visible, dropdownAnchorRef, parentRef]);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      slideAnim.setValue(-20);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  if (!visible) return null;

  // Check if this is the Priority dropdown
  const isPriorityDropdown = options.length === 4 && options.some(o => o.key === 'High' && o.icon === 'alert-circle-outline');
  // In Dropdown, check if this is the Due Date dropdown
  const isDueDateDropdown = options.length === 5 && options.some(o => o.key === 'custom' && o.icon === 'create-outline');
  // In Dropdown, check if this is the Reminders dropdown
  const isRemindersDropdown = options.length === 5 && options.some(o => o.key === '1day' && o.icon === 'calendar-outline');

  return (
    <TouchableOpacity
      style={StyleSheet.absoluteFill}
      activeOpacity={1}
      onPress={onClose}
    >
      <Animated.View
        style={[
          styles.dropdownContainer,
          {
            position: 'absolute',
            top: position.top,
            left: position.left,
            width: position.width,
            transform: [{ translateY: slideAnim }],
            opacity: opacityAnim,
            zIndex: 1000,
          },
          { backgroundColor: isDark ? "#1c1c1e" : "#ffffff" },
        ]}
      >
        {options.map((option) => (
          <TouchableOpacity
            key={option.key}
            style={styles.dropdownOption}
            onPress={() => {
              onSelect(option.key);
              onClose();
            }}
          >
            {/* For Priority dropdown, show icon with colored background */}
            {isPriorityDropdown ? (
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: PRIORITY_COLORS[option.key as keyof typeof PRIORITY_COLORS].bg,
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 12,
                }}
              >
                <Ionicons
                  name={option.icon as any}
                  size={18}
                  color={PRIORITY_COLORS[option.key as keyof typeof PRIORITY_COLORS].color}
                />
              </View>
            ) : isDueDateDropdown ? (
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: option.color,
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 12,
                }}
              >
                <Ionicons
                  name={option.icon as any}
                  size={18}
                  color={'#fff'}
                />
              </View>
            ) : isRemindersDropdown ? (
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: option.color,
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 12,
                }}
              >
                <Ionicons
                  name={option.icon as any}
                  size={18}
                  color={'#fff'}
                />
              </View>
            ) : (
              <Ionicons name={option.icon as any} size={20} color={isDark ? "#8e8e93" : "#6b7280"} style={{ marginRight: 12 }} />
            )}
            <Text style={[styles.dropdownOptionText, { color: isDark ? "#ffffff" : "#000000" }]}> 
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </Animated.View>
    </TouchableOpacity>
  );
};

export default function TaskModal({
  visible,
  onClose,
  onSave,
  editingTask,
  title = "New Task",
  maxHeight,
  children,
}: TaskModalProps) {
  // Safety check for required props
  if (typeof visible !== "boolean") {
    console.warn("[TaskModal] Invalid visible prop:", visible);
    return null;
  }

  if (typeof onClose !== "function") {
    console.warn("[TaskModal] Invalid onClose prop:", onClose);
    return null;
  }

  const { theme } = useTheme();
  const colors = APPLE_COLORS[theme];
  const isDark = theme === "dark";

  // Remove keyboard state since we're using KeyboardAvoidingView

  // Safe rendering function for children
  const renderChildrenSafely = () => {
    try {
      if (children === undefined || children === null) {
        return null;
      }
      if (typeof children === "string" || typeof children === "number") {
        const safeText = String(children);
        return <Text style={{ color: colors.label }}>{safeText}</Text>;
      }
      if (React.isValidElement(children)) {
        return children;
      }
      if (Array.isArray(children)) {
        return children.map((child, index) => {
          if (typeof child === "string" || typeof child === "number") {
            const safeText = String(child);
            return (
              <Text key={index} style={{ color: colors.label }}>
                {safeText}
              </Text>
            );
          }
          return React.isValidElement(child)
            ? React.cloneElement(child, { key: index })
            : null;
        });
      }
      return null;
    } catch (error) {
      console.warn("[TaskModal] Error in renderChildrenSafely:", error);
      return null;
    }
  };

  // Form state
  const [taskText, setTaskText] = useState(editingTask?.text || "");
  const [notes, setNotes] = useState(editingTask?.notes || "");
  const [priority, setPriority] = useState<TaskData["priority"]>(
    editingTask?.priority || "None"
  );
  const [dueDate, setDueDate] = useState<string | null>(
    editingTask?.dueDate || null
  );
  const [reminder, setReminder] = useState(editingTask?.reminder || "none");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [customDate, setCustomDate] = useState(new Date());

  // Dropdown states
  const [showDueDateDropdown, setShowDueDateDropdown] = useState(false);
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);
  const [showReminderDropdown, setShowReminderDropdown] = useState(false);

  // Animation values
  const modalOpacity = useRef(new Animated.Value(0)).current;
  const modalScale = useRef(new Animated.Value(0.95)).current;
  const modalTranslateY = useRef(new Animated.Value(20)).current;

  // No manual keyboard animation; rely on KeyboardAvoidingView for Apple-style smoothness

  // Refs
  const taskInputRef = useRef<TextInput>(null);
  const notesInputRef = useRef<TextInput>(null);
  const priorityDropdownRef = useRef<any>(null);
  const dueDateDropdownRef = useRef<any>(null);
  const reminderDropdownRef = useRef<any>(null);
  // In TaskModal, add a ref to the modal content area
  const modalContentRef = useRef<any>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  // Keyboard handling for automatic scrolling only
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', (event) => {
      // Keyboard is shown, we'll handle scrolling in onFocus
    });

    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      // Optional: scroll back to top when keyboard hides
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollTo({ y: 0, animated: true });
      }
    });

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, []);

  // Reset form when editing task changes
  useEffect(() => {
    if (editingTask) {
      setTaskText(editingTask.text);
      setNotes(editingTask.notes);
      setPriority(editingTask.priority);
      setDueDate(editingTask.dueDate);
      setReminder(editingTask.reminder);
    } else {
      setTaskText("");
      setNotes("");
      setPriority("None");
      setDueDate(null);
      setReminder("none");
    }
  }, [editingTask]);

  // Modal animations
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(modalOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(modalScale, {
          toValue: 1,
          damping: 15,
          stiffness: 150,
          useNativeDriver: true,
        }),
        Animated.spring(modalTranslateY, {
          toValue: 0,
          damping: 15,
          stiffness: 150,
          useNativeDriver: true,
        }),
      ]).start();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else {
      Animated.parallel([
        Animated.timing(modalOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(modalScale, {
          toValue: 0.95,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(modalTranslateY, {
          toValue: 20,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, modalOpacity, modalScale, modalTranslateY]);

  const handleDueDateSelect = (option: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (option === "custom") {
      setShowDatePicker(true);
      return;
    }

    const now = new Date();
    let selectedDate: Date | null = null;

    switch (option) {
      case "today":
        selectedDate = now;
        break;
      case "tomorrow":
        selectedDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        break;
      case "nextWeek":
        selectedDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        break;
      case "none":
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

  const handlePrioritySelect = (selectedPriority: TaskData["priority"]) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPriority(selectedPriority);
  };

  const handleReminderSelect = (selectedReminder: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setReminder(selectedReminder);
  };

  const handleSave = () => {
    if (!taskText.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Task Required", "Please enter a task title.");
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

    onSave?.(taskData);
    onClose();
  };

  const getSelectedDueDateLabel = () => {
    if (!dueDate) return "No Due Date";
    try {
      const date = new Date(dueDate);
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);

      if (date.toDateString() === now.toDateString()) {
        return "Today";
      } else if (date.toDateString() === tomorrow.toDateString()) {
        return "Tomorrow";
      } else {
        return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      }
    } catch (error) {
      return "No Due Date";
    }
  };

  const getSelectedReminderLabel = () => {
    const option = REMINDER_OPTIONS.find((opt) => opt.key === reminder);
    return option ? option.label : "No Reminder";
  };

  const animatedStyle = {
    opacity: modalOpacity,
    transform: [
      { scale: modalScale },
      { translateY: modalTranslateY },
    ],
  };

  // Remove height animation to avoid native driver conflicts
  // We'll use KeyboardAvoidingView instead

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <View style={[styles.overlay, { backgroundColor: isDark ? "#00000099" : "#00000033" }]}>
          <Animated.View style={[styles.bottomSheet, animatedStyle]}>
            <SafeAreaView style={[styles.headerSafeArea, { backgroundColor: isDark ? "#1c1c1e" : "#ffffff" }]}>
              <View style={styles.header}>
                <TouchableOpacity
                  style={[styles.closeButton, { backgroundColor: isDark ? "#2c2c2e" : "#f2f2f7" }]}
                  onPress={onClose}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={24} color={isDark ? "#ffffff" : "#000000"} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: isDark ? "#ffffff" : "#000000" }]}>
                  {editingTask ? "Edit Task" : "New"}
                </Text>
                <TouchableOpacity
                  style={styles.checkmarkButton}
                  onPress={handleSave}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="checkmark" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
            </SafeAreaView>
            <View style={[styles.contentArea, { flex: 1, backgroundColor: isDark ? "#1c1c1e" : "#ffffff" }]}>
              <View ref={modalContentRef} style={{ flex: 1 }}>
                {children !== undefined && children !== null ? (
                  <View style={styles.childrenContainer}>
                    {renderChildrenSafely()}
                  </View>
                ) : (
                  <ScrollView
                    ref={scrollViewRef}
                    style={[styles.scrollContent, { flex: 1 }]}
                    contentContainerStyle={{ ...styles.scrollContentContainer, flexGrow: 1 }}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                  >
                {/* Task Input (keep as pill) */}
                <View style={[
                  styles.inputContainer,
                  {
                    backgroundColor: isDark ? "#1c1c1e" : "#ffffff",
                    marginBottom: 20,
                    height: 48,
                    borderRadius: 24,
                    borderWidth: 2,
                    borderColor: '#e3f0ff',
                    shadowColor: '#007aff',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.12,
                    shadowRadius: 8,
                    elevation: 4,
                  },
                ]}>
                  <TextInput
                    ref={taskInputRef}
                    style={[
                      styles.taskInput,
                      { color: isDark ? "#ffffff" : "#000000", fontWeight: 'bold', fontSize: 16 }
                    ]}
                    placeholder="What needs to be done?"
                    placeholderTextColor={isDark ? "#8e8e93" : "#6b7280"}
                    value={taskText}
                    onChangeText={setTaskText}
                    multiline
                    textAlignVertical="top"
                    onFocus={() => {
                      // Scroll to the top for task input
                      if (scrollViewRef.current) {
                        scrollViewRef.current.scrollTo({ y: 0, animated: true });
                      }
                    }}
                  />
                </View>
                {/* Priority Pill */}
                <Pill
                  ref={priorityDropdownRef}
                  title="Priority"
                  value={priority}
                  onPress={() => setShowPriorityDropdown(true)}
                  icon="flag-outline"
                  isDark={isDark}
                  showDot={true}
                  dotColor={PRIORITY_COLORS[priority].color}
                  pillStyle={{
                    backgroundColor: PRIORITY_COLORS[priority].bg,
                    borderColor: PRIORITY_COLORS[priority].border,
                    borderWidth: 1,
                  }}
                  valueStyle={{ color: PRIORITY_COLORS[priority].color }}
                  iconColor={PRIORITY_COLORS[priority].color}
                />
                {/* Due Date Pill */}
                <Pill
                  ref={dueDateDropdownRef}
                  title="Due Date"
                  value={getSelectedDueDateLabel()}
                  onPress={() => setShowDueDateDropdown(true)}
                  icon="calendar-outline"
                  isDark={isDark}
                />
                {/* Reminder Pill */}
                <Pill
                  ref={reminderDropdownRef}
                  title="Reminder"
                  value={getSelectedReminderLabel()}
                  onPress={() => setShowReminderDropdown(true)}
                  icon="notifications-outline"
                  isDark={isDark}
                />
                {/* Notes Input (move to bottom, not pill) */}
                <View style={[styles.notesContainer, { backgroundColor: isDark ? "#1c1c1e" : "#ffffff" }]}>
                  <TextInput
                    ref={notesInputRef}
                    style={[styles.notesInput, { color: isDark ? "#ffffff" : "#000000" }]}
                    placeholder="Add notes..."
                    placeholderTextColor={isDark ? "#8e8e93" : "#6b7280"}
                    value={notes}
                    onChangeText={setNotes}
                    multiline
                    textAlignVertical="top"
                    onFocus={() => {
                      // Scroll to the bottom to show the notes input above keyboard
                      if (scrollViewRef.current) {
                        setTimeout(() => {
                          scrollViewRef.current?.scrollToEnd({ animated: true });
                        }, 100); // Small delay to ensure keyboard is shown
                      }
                    }}
                  />
                </View>
                  </ScrollView>
                )}
              </View>
            </View>
            {/* Dropdowns */}
            <Dropdown
              visible={showPriorityDropdown}
              options={PRIORITY_OPTIONS}
              onSelect={(key) => handlePrioritySelect(key as TaskData["priority"])}
              onClose={() => setShowPriorityDropdown(false)}
              isDark={isDark}
              dropdownAnchorRef={priorityDropdownRef}
              parentRef={modalContentRef}
            />

            <Dropdown
              visible={showDueDateDropdown}
              options={DUE_DATE_OPTIONS}
              onSelect={handleDueDateSelect}
              onClose={() => setShowDueDateDropdown(false)}
              isDark={isDark}
              dropdownAnchorRef={dueDateDropdownRef}
              parentRef={modalContentRef}
            />

            <Dropdown
              visible={showReminderDropdown}
              options={REMINDER_OPTIONS}
              onSelect={handleReminderSelect}
              onClose={() => setShowReminderDropdown(false)}
              isDark={isDark}
              dropdownAnchorRef={reminderDropdownRef}
              parentRef={modalContentRef}
            />

            {/* Date Picker */}
            {showDatePicker ? (
              <DateTimePicker
                value={customDate}
                mode="date"
                display="default"
                onChange={handleCustomDateChange}
              />
            ) : null}
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "stretch",
    backgroundColor: "transparent",
  },
  bottomSheet: {
    width: "100%",
    height: MODAL_HEIGHT,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: "#fff",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 24,
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  modalContent: {
    maxHeight: "80%",
    borderRadius: 24,
    backgroundColor: "transparent",
    padding: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 20
  },
  headerSafeArea: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 16,
    minHeight: 60,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    flex: 1,
  },
  headerSpacer: {
    width: 40,
  },
  contentArea: {
    flex: 1,
    backgroundColor: "transparent",
    position: 'relative',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f2f2f7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  childrenContainer: {
    flex: 1,
    paddingTop: 20,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    padding: 24,
    paddingTop: 20,
    paddingBottom: 2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    borderRadius: 20,
    marginBottom: 24,
    paddingHorizontal: 20,
    paddingVertical: 0,
    borderWidth: 1,
    borderColor: '#e5e5ea',
    backgroundColor: '#fff',
  },
  taskInput: {
    fontSize: 15,
    fontWeight: "600",
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 0,
    padding: 0,
  },
  notesInput: {
    fontSize: 15,
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 0,
    padding: 0,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 40,
    borderRadius: 20,
    marginBottom: 24, // more spacing
    paddingHorizontal: 20,
    paddingVertical: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  pillLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  pillTitle: {
    fontSize: 16,
    fontWeight: "500",
    marginLeft: 12,
  },
  pillRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  pillValue: {
    fontSize: 16,
    marginRight: 8,
  },
  actionContainer: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
  },
  cancelButton: {
    flex: 1,
    height: 50,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  saveButton: {
    flex: 1,
    height: 50,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  dropdownBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  dropdownContainer: {
    width: "70%",
    maxWidth: 220,
    borderRadius: 16,
    padding: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 20,
  },
  dropdownOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginBottom: 4,
  },
  dropdownOptionText: {
    fontSize: 15,
    fontWeight: "400",
    marginLeft: 8,
  },
  checkmarkButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ff3b30', // iOS system red
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  // Add a new style for notesContainer
  notesContainer: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e5ea',
    padding: 12,
    marginTop: 24,
    backgroundColor: '#fff',
  },
});
