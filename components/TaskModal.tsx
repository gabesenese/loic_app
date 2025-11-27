import React, { useState, useEffect, useRef, useLayoutEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  Modal,
  Platform,
  Dimensions,
  ScrollView,
  Alert,
  Animated,
  Keyboard,
  Easing,
  findNodeHandle,
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme } from "../ThemeContext";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Subtask, SubtaskManager } from "./SubtaskIndicator";

// Type alias for Animated.View to help TypeScript
const AnimatedView = Animated.View;


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

export type Priority = "None" | "Low" | "Medium" | "High";
export type Theme = "light" | "dark";

interface TaskModalProps {
  visible: boolean;
  onClose: () => void;
  onSave?: (task: TaskData) => void;
  editingTask?: TaskData | null;
  title?: string;
  maxHeight?: number;
  children?: React.ReactNode;
}

export interface TaskData {
  id?: string;
  text: string;
  notes: string;
  priority: Priority;
  dueDate: string | null;
  reminder: string;
  completed: boolean;
  subtasks?: Subtask[];
}

interface PillProps {
  title: string;
  value: string;
  onPress: () => void;
  icon: string;
  isDark: boolean;
  showDot?: boolean;
  dotColor?: string;
  pillStyle?: object;
  valueStyle?: object;
  iconColor?: string;
}

// Clean Pill Component
const Pill = React.forwardRef<View, PillProps>((props, ref) => {
  const { title, value, onPress, icon, isDark, showDot = false, dotColor = undefined, pillStyle = {}, valueStyle = {}, iconColor } = props;
  return (
    <TouchableOpacity
      ref={ref} // Attach ref directly to TouchableOpacity
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
          {title || ''}
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
          {value || ''}
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
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  // Reset animation values when visibility changes
  useEffect(() => {
    if (!visible) {
      slideAnim.setValue(-20);
      opacityAnim.setValue(0);
      scaleAnim.setValue(0.9);
    }
  }, [visible]);

  useLayoutEffect(() => {
    if (visible && dropdownAnchorRef?.current && parentRef?.current && dropdownAnchorRef.current.measureLayout) {
      setTimeout(() => {
        if (dropdownAnchorRef.current && parentRef.current) {
          dropdownAnchorRef.current.measureLayout(
            parentRef.current,
            (x: number, y: number, pillWidth: number, height: number) => {
              const dropdownWidth = 180;
              setPosition({
                top: y + height + 40, // increase offset to lower the dropdown
                left: x + (pillWidth - dropdownWidth),
                width: dropdownWidth,
              });
            },
            () => { }
          );
        }
      }, 10); // Small delay to ensure layout is complete
    }
  }, [visible, dropdownAnchorRef, parentRef]);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          damping: 20,
          stiffness: 300,
          mass: 1,
          useNativeDriver: true,
        }),
        Animated.spring(opacityAnim, {
          toValue: 1,
          damping: 20,
          stiffness: 300,
          mass: 1,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          damping: 18,
          stiffness: 250,
          mass: 1,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: -20,
          damping: 25,
          stiffness: 350,
          mass: 0.8,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 150,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 0.9,
          damping: 20,
          stiffness: 300,
          mass: 0.8,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  // Check if this is the Priority dropdown
  const isPriorityDropdown = options.length === 4 && options.some(o => o.key === 'High' && o.icon === 'alert-circle-outline');
  // In Dropdown, check if this is the Due Date dropdown
  const isDueDateDropdown = options.length === 5 && options.some(o => o.key === 'custom' && o.icon === 'create-outline');
  // In Dropdown, check if this is the Reminders dropdown
  const isRemindersDropdown = options.length === 5 && options.some(o => o.key === '1day' && o.icon === 'calendar-outline');

  // Don't unmount, just hide with pointer events
  if (!visible) {
    return null;
  }

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
            transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
            opacity: opacityAnim,
            zIndex: 1000,
          },
          { backgroundColor: isDark ? "#1c1c1e" : "#ffffff" },
        ]}
      >
        {options.map((option, idx) => {
          const isLast = idx === options.length - 1;
          return (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.dropdownOption,
                {
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  minHeight: 44,
                  ...(isDueDateDropdown || isRemindersDropdown) && {
                    borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
                    borderBottomColor: isDark ? '#232325' : '#e5e5ea',
                  },
                }
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onSelect(option.key);
                onClose();
              }}
            >
              {/* For Priority dropdown, show icon with colored background */}
              {isPriorityDropdown ? (
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: PRIORITY_COLORS[option.key as keyof typeof PRIORITY_COLORS][isDark ? "dark" : "light"].bg,
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: 12,
                  }}
                >
                  <Ionicons
                    name={option.icon as any}
                    size={18}
                    color={PRIORITY_COLORS[option.key as keyof typeof PRIORITY_COLORS][isDark ? "dark" : "light"].color}
                    style={{
                      textShadowColor: PRIORITY_COLORS[option.key as keyof typeof PRIORITY_COLORS][isDark ? "dark" : "light"].color,
                      textShadowOffset: { width: 0, height: 1 },
                      textShadowRadius: 3,
                    }}
                  />
                </View>
              ) : (isDueDateDropdown || isRemindersDropdown) ? (
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: isDark 
                      ? `${option.color}15`
                      : `${option.color}20`,
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: 12,
                  }}
                >
                  <Ionicons
                    name={option.icon as any}
                    size={18}
                    color={option.color}
                    style={{
                      textShadowColor: option.color,
                      textShadowOffset: { width: 0, height: 1 },
                      textShadowRadius: 2,
                    }}
                  />
                </View>
              ) : (
                <Ionicons name={option.icon as any} size={20} color={isDark ? "#8e8e93" : "#6b7280"} style={{ marginRight: 12 }} />
              )}
              <Text style={[
                styles.dropdownOptionText,
                {
                  color: isDark ? "#ffffff" : "#000000",
                  fontWeight: "400",
                  fontSize: 16,
                  letterSpacing: 0.1,
                }
              ]}>
                {option.label || ''}
              </Text>
            </TouchableOpacity>
          );
        })}
      </Animated.View>
    </TouchableOpacity>
  );
};

// Smart suggestion types
interface SmartSuggestion {
  type: 'subtask';
  value: string;
  label: string;
  icon: string;
  color: string;
}

// Smart suggestion parsing function
const parseSmartSuggestions = (text: string): SmartSuggestion[] => {
  const suggestions: SmartSuggestion[] = [];
  const lowerText = text.toLowerCase();

  // Subtask suggestions (look for patterns like "including", "with", "also")
  const subtaskPatterns = [
    { pattern: /including (.+)/gi, prefix: '' },
    { pattern: /with (.+)/gi, prefix: '' },
    { pattern: /also (.+)/gi, prefix: '' },
    { pattern: /and (.+)/gi, prefix: '' }
  ];

  subtaskPatterns.forEach(({ pattern, prefix }) => {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach(match => {
        const subtaskText = match.replace(pattern, '$1').trim();
        if (subtaskText.length > 2 && subtaskText.length < 50) {
          suggestions.push({
            type: 'subtask',
            value: subtaskText,
            label: `Subtask: ${subtaskText}`,
            icon: 'list',
            color: '#8e8e93'
          });
        }
      });
    }
  });

  return suggestions;
};

// Expanded segment subtask libraries
const SEGMENT_SUBTASKS: Record<string, string[]> = {
  house: [
    "Clean kitchen", "Vacuum living room", "Take out trash", "Water plants", "Organize closet", "Wipe windows", "Sweep floors", "Change bed sheets", "Do laundry", "Restock supplies", "Check smoke detectors"
  ],
  work: [
    "Check emails", "Prepare meeting agenda", "Review project plan", "Submit report", "Schedule 1:1", "Update task board", "Send status update", "Review pull requests", "Plan next sprint", "Backup files", "Organize workspace"
  ],
  personal: [
    "Call family", "Journal", "Meditate", "Plan week", "Read a book", "Go for a walk", "Reflect on goals", "Organize photos", "Write gratitude list", "Schedule self-care", "Declutter phone"
  ],
  health: [
    "Book doctor appointment", "Take medication", "Track symptoms", "Prepare healthy meal", "Do stretching", "Drink water", "Go for a checkup", "Schedule dentist", "Order prescriptions", "Log exercise", "Check blood pressure"
  ],
  finance: [
    "Pay bills", "Review budget", "Check bank balance", "Set savings goal", "Update expense tracker", "Review investments", "Transfer funds", "Download statements", "Plan monthly budget", "Check credit score", "Set up autopay"
  ],
  shopping: [
    "Make shopping list", "Compare prices", "Check pantry", "Buy essentials", "Look for discounts", "Check expiration dates", "Plan meals", "Order online", "Pick up groceries", "Check loyalty points", "Return items"
  ],
  travel: [
    "Book flights", "Reserve hotel", "Pack bags", "Check weather", "Print itinerary", "Arrange airport transfer", "Check passport", "Buy travel insurance", "Download maps", "Charge devices", "Notify bank"
  ],
  study: [
    "Review notes", "Practice problems", "Watch lecture", "Make flashcards", "Summarize chapter", "Join study group", "Schedule study session", "Organize materials", "Set study goals", "Take practice test", "Update planner"
  ],
  social: [
    "Send invitations", "RSVP to event", "Buy gift", "Plan menu", "Book venue", "Create playlist", "Coordinate with friends", "Order decorations", "Send thank you notes", "Share photos", "Arrange carpool"
  ],
  fitness: [
    "Plan workout", "Pack gym bag", "Track progress", "Stretch", "Warm up", "Log workout", "Set fitness goal", "Prepare water bottle", "Charge fitness tracker", "Schedule rest day", "Try new exercise"
  ],
  pets: [
    "Feed pet", "Walk dog", "Clean litter box", "Schedule vet", "Buy pet food", "Groom pet", "Play with pet", "Check vaccinations", "Order pet supplies", "Wash pet bed", "Trim nails"
  ],
  errands: [
    "Go to post office", "Pick up prescription", "Drop off dry cleaning", "Buy stamps", "Return library books", "Get car washed", "Pick up package", "Buy birthday card", "Refill gas", "Buy batteries", "Donate items"
  ],
  tech: [
    "Update software", "Backup data", "Charge devices", "Clean keyboard", "Organize files", "Change passwords", "Install updates", "Check storage", "Order accessories", "Test WiFi", "Sync calendar"
  ],
  garden: [
    "Water plants", "Prune bushes", "Mow lawn", "Plant seeds", "Fertilize soil", "Check for pests", "Harvest vegetables", "Clean tools", "Compost waste", "Mulch beds", "Plan garden layout"
  ],
  car: [
    "Check oil", "Refuel", "Wash car", "Check tire pressure", "Schedule maintenance", "Clean interior", "Check wipers", "Top up fluids", "Inspect brakes", "Update insurance", "Check registration"
  ],
  kids: [
    "Pack lunch", "Check homework", "Prepare clothes", "Schedule playdate", "Read story", "Sign permission slip", "Organize backpack", "Plan activity", "Check grades", "Label supplies", "Arrange pickup"
  ],
};

// Segment to icon and color mapping
const SEGMENT_ICONS: Record<string, { icon: string; color: string }> = {
  house: { icon: 'home-outline', color: '#5AC8FA' },      // systemTeal/Blue
  work: { icon: 'briefcase-outline', color: '#007AFF' }, // systemBlue
  personal: { icon: 'person-outline', color: '#AF52DE' },    // systemPurple
  health: { icon: 'medkit-outline', color: '#34C759' },    // systemGreen
  finance: { icon: 'card-outline', color: '#FFD60A' },      // systemYellow
  shopping: { icon: 'cart-outline', color: '#FF9500' },      // systemOrange
  travel: { icon: 'airplane-outline', color: '#FF375F' },  // systemPink/Red
  study: { icon: 'book-outline', color: '#5856D6' },      // systemIndigo
  social: { icon: 'people-outline', color: '#30D158' },    // systemMint/Green
  fitness: { icon: 'barbell-outline', color: '#FF2D55' },   // systemPink
  pets: { icon: 'paw-outline', color: '#FF9F0A' },       // systemOrange
  errands: { icon: 'walk-outline', color: '#A2845E' },      // soft brown
  tech: { icon: 'hardware-chip-outline', color: '#64D2FF' }, // light blue
  garden: { icon: 'leaf-outline', color: '#32D74B' },      // systemGreen
  car: { icon: 'car-outline', color: '#FF453A' },       // systemRed
  kids: { icon: 'happy-outline', color: '#FFD60A' },     // systemYellow
};

// 1. Robust explicit subtask extraction
function extractExplicitSubtasks(text: string): string[] {
  const lower = text.toLowerCase();
  // Patterns: steps:, to do:, tasks:, checklist:, bullets, numbers, and/or, commas, semicolons
  const listPatterns = [
    /steps?:\s*([\s\S]+)/i,
    /to do:?\s*([\s\S]+)/i,
    /tasks?:\s*([\s\S]+)/i,
    /checklist:?\s*([\s\S]+)/i
  ];
  for (const pattern of listPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      // Split by newlines, commas, semicolons, and/or
      return match[1].split(/\n|,|;| and | or |•|\d+\./)
        .map(s => s.trim())
        .filter(Boolean);
    }
  }
  // Fallback: look for verbs followed by lists
  const actionVerbs = [
    'buy', 'get', 'call', 'email', 'prepare', 'pack', 'bring', 'make', 'pick up', 'schedule', 'send', 'clean', 'organize', 'cook', 'pay', 'study', 'learn', 'review', 'plan', 'book', 'check', 'gather', 'set', 'create', 'practice', 'invite', 'decorate', 'shop', 'research', 'compare', 'measure', 'collect', 'write', 'read', 'order', 'visit', 'arrange', 'list', 'update', 'backup', 'install', 'fix', 'replace', 'wash', 'feed', 'walk', 'exercise', 'workout', 'meal', 'meal prep', 'meal-prep', 'mealplan', 'meal plan'
  ];
  const verbPattern = new RegExp(`(?:${actionVerbs.join('|')}) (.+)`, 'i');
  const verbMatch = lower.match(verbPattern);
  if (verbMatch && verbMatch[1]) {
    let items = verbMatch[1].split(/,|;| and | or |•|\d+\./).map(s => s.trim()).filter(Boolean);
    if (items.length > 1) return items;
  }
  return [];
}

// 2. Allow detectSegment to return multiple segments
function detectSegments(text: string): string[] {
  const lower = text.toLowerCase();
  const segments: string[] = [];
  if (/(house|kitchen|living room|closet|clean|organize|vacuum|plants|home|laundry|bed sheets|windows|floors|supplies|smoke detector)/.test(lower)) segments.push("house");
  if (/(work|project|report|meeting|agenda|emails|office|submit|review|sprint|pull request|workspace|status update|task board|backup)/.test(lower)) segments.push("work");
  if (/(personal|family|journal|meditate|plan week|read|mom|dad|call|walk|goals|photos|gratitude|self-care|declutter)/.test(lower)) segments.push("personal");
  if (/(health|doctor|medication|symptoms|meal|appointment|medicine|stretch|water|checkup|dentist|prescription|exercise|blood pressure)/.test(lower)) segments.push("health");
  if (/(finance|bills|budget|bank|savings|pay|payment|expense|investments|funds|statements|credit|autopay)/.test(lower)) segments.push("finance");
  if (/(shop|shopping|grocery|buy|pantry|essentials|list|discount|expiration|meals|order|groceries|loyalty|return)/.test(lower)) segments.push("shopping");
  if (/(travel|trip|hotel|flight|pack|itinerary|vacation|reserve|airport|passport|insurance|maps|devices|bank)/.test(lower)) segments.push("travel");
  if (/(study|learn|course|lecture|notes|practice|flashcards|chapter|group|session|materials|planner|test)/.test(lower)) segments.push("study");
  if (/(social|party|event|gift|menu|invite|rsvp|celebration|venue|playlist|friends|decorations|thank you|photos|carpool)/.test(lower)) segments.push("social");
  if (/(fitness|workout|gym|exercise|stretch|progress|warm up|goal|water bottle|tracker|rest|new exercise)/.test(lower)) segments.push("fitness");
  if (/(pet|dog|cat|litter|vet|food|groom|play|vaccination|supplies|bed|nails)/.test(lower)) segments.push("pets");
  if (/(errand|post office|prescription|dry cleaning|stamps|library|car wash|package|birthday|gas|batteries|donate)/.test(lower)) segments.push("errands");
  if (/(tech|software|backup|devices|keyboard|files|password|updates|storage|accessories|wifi|calendar)/.test(lower)) segments.push("tech");
  if (/(garden|plants|bushes|lawn|seeds|soil|pests|vegetables|tools|compost|mulch|beds|layout)/.test(lower)) segments.push("garden");
  if (/(car|oil|refuel|wash|tire|maintenance|interior|wipers|fluids|brakes|insurance|registration)/.test(lower)) segments.push("car");
  if (/(kid|lunch|homework|clothes|playdate|story|permission|backpack|activity|grades|supplies|pickup)/.test(lower)) segments.push("kids");
  return segments;
}

// 3. Refactor generateSmartSubtasks
interface SmartSubtaskSuggestion {
  value: string;
  icon: string;
  color: string;
}

const generateSmartSubtasks = (taskText: string): SmartSubtaskSuggestion[] => {
  const lowerText = taskText.toLowerCase();
  // 1. Extract explicit subtasks
  let explicit = extractExplicitSubtasks(taskText);
  // 2. Detect all relevant segments
  const segments = detectSegments(taskText);
  // 3. Gather all segment-based suggestions with segment info
  let segmentBased: { value: string; segment: string }[] = [];
  for (const seg of segments) {
    if (SEGMENT_SUBTASKS[seg]) {
      segmentBased = segmentBased.concat(
        SEGMENT_SUBTASKS[seg].map(s => ({ value: s, segment: seg }))
      );
    }
  }
  // 4. Merge, deduplicate, prioritize explicit
  let all: { value: string; segment?: string }[] = [
    ...explicit.map(s => ({ value: s })),
    ...segmentBased
  ];
  all = all
    .map(s => {
      let clean = s.value.replace(/^to /, '').replace(/\.$/, '').trim();
      if (clean.length > 0) clean = clean.charAt(0).toUpperCase() + clean.slice(1);
      return { value: clean, segment: s.segment };
    })
    .filter((s, i, arr) => {
      // Check basic length and content requirements
      if (s.value.length <= 2 || s.value.length >= 50) return false;
      if (['and', 'or', 'then', 'next', 'after'].indexOf(s.value.toLowerCase()) !== -1) return false;
      
      // Check for duplicates using indexOf instead of findIndex
      const firstIndex = arr.map(x => x.value.toLowerCase()).indexOf(s.value.toLowerCase());
      return firstIndex === i;
    });
  // 5. Only suggest if more than one actionable subtask
  if (all.length < 2) return [];
  // 6. Prioritize explicit subtasks, then segment-based, limit to 7
  const explicitSet = new Set(explicit.map(s => s.toLowerCase()));
  const prioritized = [
    ...all.filter(s => explicitSet.has(s.value.toLowerCase())),
    ...all.filter(s => !explicitSet.has(s.value.toLowerCase())),
  ];
  // 7. Attach icon and color
  return prioritized.slice(0, 7).map(s => {
    let icon = 'bulb-outline';
    let color = '#007aff';
    if (s.segment && SEGMENT_ICONS[s.segment]) {
      icon = SEGMENT_ICONS[s.segment].icon;
      color = SEGMENT_ICONS[s.segment].color;
    }
    return { value: s.value, icon, color };
  });
};

// Smart Suggestion Component
const SmartSuggestionItem = ({
  suggestion,
  onApply,
  isDark
}: {
  suggestion: SmartSuggestion;
  onApply: (suggestion: SmartSuggestion) => void;
  isDark: boolean;
}) => (
  <TouchableOpacity
    style={[
      styles.suggestionItemApple,
      {
        backgroundColor: fadedColor(suggestion.color, isDark ? 0.18 : 0.13),
        shadowColor: isDark ? '#000' : suggestion.color,
      }
    ]}
    onPress={() => onApply(suggestion)}
    onPressIn={() => {
      Keyboard.dismiss();
    }}
    onLongPress={() => {
      Keyboard.dismiss();
      onApply(suggestion);
    }}
    activeOpacity={0.7}
    delayPressIn={0}
    delayPressOut={0}
    delayLongPress={200}
    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
  >
    <View style={[
      styles.suggestionIconApple,
      { backgroundColor: suggestion.color }
    ]}>
      <Ionicons name={suggestion.icon as any} size={16} color="#fff" />
    </View>
    <Text style={[
      styles.suggestionTextApple,
      { color: isDark ? '#fff' : '#222' }
    ]}>
      {suggestion.value || ''}
    </Text>
    <Ionicons name="add" size={20} color={suggestion.color} style={{ marginLeft: 6 }} />
  </TouchableOpacity>
);

// Helper for case-insensitive deduplication
const normalize = (s: string | undefined | null) => (s || '').trim().toLowerCase();

// Add this function above TaskModal
function detectPriorityAndDueDate(text: string): { priority: TaskData["priority"], dueDate: string | null } {
  const lowerText = text.toLowerCase();
  let priority: TaskData["priority"] = "None";
  let dueDate: string | null = null;

  if (lowerText.includes('urgent') || lowerText.includes('asap') || lowerText.includes('critical') || lowerText.includes('emergency') || lowerText.includes('immediately') || lowerText.includes('as soon as possible')) {
    priority = "High";
  } else if (lowerText.includes('important') || lowerText.includes('priority') || lowerText.includes('soon') || lowerText.includes('quickly')) {
    priority = "Medium";
  } else if (lowerText.includes('low priority') || lowerText.includes('not urgent') || lowerText.includes('when possible') || lowerText.includes('sometime')) {
    priority = "Low";
  }

  if (lowerText.includes('today') || lowerText.includes('tonight') || lowerText.includes('this evening')) {
    dueDate = new Date().toISOString();
  } else if (lowerText.includes('tomorrow') || lowerText.includes('tomorrow morning') || lowerText.includes('tomorrow evening')) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    dueDate = tomorrow.toISOString();
  } else if (lowerText.includes('next week') || lowerText.includes('this week') || lowerText.includes('weekend') || lowerText.includes('saturday') || lowerText.includes('sunday')) {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    dueDate = nextWeek.toISOString();
  } else if (lowerText.includes('next month') || lowerText.includes('this month')) {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    dueDate = nextMonth.toISOString();
  }

  return { priority, dueDate };
}

// Helper to get a faded color for backgrounds
function fadedColor(hex: string, alpha: number = 0.12) {
  // Convert hex to rgba string
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export default function TaskModal({
  visible,
  onClose,
  onSave,
  editingTask,
  title = "New Task",
  maxHeight,
  children,
}: TaskModalProps) {
  // Move all hooks BEFORE any conditional returns (React 19 requirement)
  const { theme } = useTheme();
  const colors = APPLE_COLORS[theme as keyof typeof APPLE_COLORS];
  const isDark = theme === "dark";

  // Create animated value for keyboard height
  const keyboardHeight = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(1)).current;

  // Form state with safety validation
  const [taskText, setTaskText] = useState(typeof editingTask?.text === 'string' ? editingTask.text : "");
  const [notes, setNotes] = useState(typeof editingTask?.notes === 'string' ? editingTask.notes : "");
  const [priority, setPriority] = useState<TaskData["priority"]>(
    editingTask?.priority || "None"
  );
  const [dueDate, setDueDate] = useState<string | null>(
    typeof editingTask?.dueDate === 'string' ? editingTask.dueDate : null
  );
  const [reminder, setReminder] = useState(editingTask?.reminder || "none");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [customDate, setCustomDate] = useState(new Date());
  const [smartSuggestions, setSmartSuggestions] = useState<SmartSuggestion[]>([]);
  const [subtasks, setSubtasks] = useState<Subtask[]>(editingTask?.subtasks || []);
  const [smartSubtaskSuggestions, setSmartSubtaskSuggestions] = useState<SmartSubtaskSuggestion[]>([]);

  // Dropdown states
  const [showDueDateDropdown, setShowDueDateDropdown] = useState(false);
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);
  const [showReminderDropdown, setShowReminderDropdown] = useState(false);

  // Animation values
  const modalOpacity = useRef(new Animated.Value(0)).current;
  const modalScale = useRef(new Animated.Value(0.95)).current;
  const modalTranslateY = useRef(new Animated.Value(20)).current;
  
  // Submit button animation
  const checkmarkOpacity = useRef(new Animated.Value(0)).current;

  // Date picker animation
  const datePickerOpacity = useRef(new Animated.Value(0)).current;
  const datePickerScale = useRef(new Animated.Value(0.9)).current;

  // Input focus animation values (similar to calendar modal)
  const taskInputFocusScale = useRef(new Animated.Value(1)).current;
  const taskInputFocusOpacity = useRef(new Animated.Value(1)).current;
  const taskInputFocusTranslateY = useRef(new Animated.Value(0)).current;
  
  const notesInputFocusScale = useRef(new Animated.Value(1)).current;
  const notesInputFocusOpacity = useRef(new Animated.Value(1)).current;

  // Refs
  const taskInputRef = useRef<TextInput>(null);
  const notesInputRef = useRef<TextInput>(null);
  const priorityDropdownRef = useRef<any>(null);
  const dueDateDropdownRef = useRef<any>(null);
  const reminderDropdownRef = useRef<any>(null);
  const modalContentRef = useRef<any>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const activeInputRef = useRef<'task' | 'notes' | 'subtask' | null>(null);

  // Keyboard handling - Smart scrolling to center active input
  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      'keyboardWillShow', 
      (e) => {
        // Small delay to ensure layout is complete
        setTimeout(() => {
          if (scrollViewRef.current && activeInputRef.current) {
            if (activeInputRef.current === 'notes') {
              // Scroll to show notes input
              scrollViewRef.current.scrollToEnd({ animated: true });
            } else if (activeInputRef.current === 'subtask') {
              // Scroll to middle for subtask editing
              scrollViewRef.current.scrollTo({ y: 200, animated: true });
            }
            // For 'task', no scroll needed as it's at the top
          }
        }, 100);
      }
    );

    const keyboardWillHide = Keyboard.addListener(
      'keyboardWillHide', 
      () => {
        activeInputRef.current = null;
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  // Reset form when editing task changes or when modal is closed for new task
  useEffect(() => {
    if (editingTask) {
      setTaskText(editingTask.text);
      setNotes(editingTask.notes);
      setPriority(editingTask.priority);
      setDueDate(editingTask.dueDate);
      setReminder(editingTask.reminder);
      setSubtasks(editingTask.subtasks || []);
    } else if (!visible) {
      // Reset fields when modal closes for new task
      setTaskText("");
      setNotes("");
      setPriority("None");
      setDueDate(null);
      setReminder("none");
      setSubtasks([]);
      setSmartSuggestions([]); // Reset smart suggestions
      setSmartSubtaskSuggestions([]); // Reset smart subtask suggestions
    }
  }, [editingTask, visible]);

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

  const closeDatePicker = () => {
    setShowDatePicker(false);
  };

  const handleDueDateSelect = (option: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Keyboard.dismiss();

    if (option === "custom") {
      console.log('Custom date selected, showing date picker');
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
    try {
      if (Platform.OS === 'android') {
        setShowDatePicker(false);
        return;
      }
      
      if (event.type === 'set' && selectedDate) {
        setCustomDate(selectedDate);
        setDueDate(selectedDate.toISOString());
        setShowDatePicker(false);
      } else if (event.type === 'dismissed') {
        setShowDatePicker(false);
      }
    } catch (error) {
      console.error('Error handling date change:', error);
      setShowDatePicker(false);
    }
  };

  const handlePrioritySelect = (selectedPriority: TaskData["priority"]) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Keyboard.dismiss();
    setPriority(selectedPriority);
  };

  const handleReminderSelect = (selectedReminder: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Keyboard.dismiss();
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
      subtasks: subtasks,
    };

    onSave?.(taskData);
    onClose();
    setSmartSuggestions([]); // Reset smart suggestions
    setSmartSubtaskSuggestions([]); // Reset smart subtask suggestions
  };

  const handleSmartSuggestion = (suggestion: SmartSuggestion) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Only handle subtask suggestions now
    const newSubtask: Subtask = {
      id: Date.now().toString(),
      text: suggestion.value,
      completed: false,
      createdAt: Date.now(),
    };
    
    if (!subtasks.some(s => normalize(s.text) === normalize(suggestion.value))) {
      setSubtasks([...subtasks, newSubtask]);
    }

    // Remove the applied suggestion from the list
    setSmartSuggestions(prev => prev.filter(s => s !== suggestion));
    
    // Keep focus on input with smooth transition
    setTimeout(() => {
      taskInputRef.current?.focus();
    }, 100);
  };

  const handleSmartSubtaskSuggestion = (subtaskValue: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const newSubtask: Subtask = {
      id: Date.now().toString(),
      text: subtaskValue,
      completed: false,
      createdAt: Date.now(),
    };
    
    if (!subtasks.some(s => normalize(s.text) === normalize(subtaskValue))) {
      setSubtasks([...subtasks, newSubtask]);
    }
    setSmartSubtaskSuggestions(prev => prev.filter(s => s.value !== subtaskValue));
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

  // Add Fade-in animation for the submit button while typing
  useEffect(() => {
    Animated.timing(checkmarkOpacity, {
      toValue: notes.trim().length > 0 ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [notes]);

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

  // Safety checks AFTER all hooks (React 19 requirement)
  if (typeof visible !== "boolean") {
    console.warn("[TaskModal] Invalid visible prop:", visible);
    return null;
  }

  if (typeof onClose !== "function") {
    console.warn("[TaskModal] Invalid onClose prop:", onClose);
    return null;
  }

  // Early return if modal is not visible to prevent unnecessary renders
  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={(e: any) => e.stopPropagation()}>
            <Animated.View style={[styles.bottomSheet, animatedStyle, { backgroundColor: isDark ? "#1c1c1e" : "#ffffff" }]}>
              {/* Wrap everything in a safer container */}
              <View style={{ flex: 1 }}>
          <SafeAreaView style={[styles.headerSafeArea, { backgroundColor: isDark ? "#1c1c1e" : "#ffffff" }]}>
            <View style={styles.header}>
              <TouchableOpacity
                style={[
                  styles.closeButton,
                  {
                    backgroundColor: isDark
                      ? 'rgba(255, 255, 255, 0.08)'
                      : 'rgba(0, 0, 0, 0.09)',
                    shadowColor: isDark ? '#ffffff' : '#000000',
                    shadowOpacity: isDark ? 0.15 : 0.6,
                    borderWidth: isDark ? 0.5 : 0,
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                  },
                ]}
                onPress={onClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={24} color={isDark ? "#ffffff" : "#000000"} />
              </TouchableOpacity>
              <Text style={[styles.headerTitle, { color: isDark ? "#ffffff" : "#000000" }]}>
                {editingTask ? "Edit Task" : title}
              </Text>
              <TouchableOpacity
                style={styles.checkmarkButton}
                onPress={handleSave}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="checkmark" size={24} color="#ff3b30" />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
          <View style={{
            height: 1,
            backgroundColor: isDark ? '#2c2c2e' : '#e5e5ea',
            width: '100%',
          }} />
          <Animated.View style={[styles.contentArea, { flex: 1, backgroundColor: isDark ? "#1c1c1e" : "#ffffff" }]}>
            <TouchableWithoutFeedback onPress={() => {
              // Dismiss keyboard when tapping in content area but outside inputs
              if (taskInputRef.current) {
                taskInputRef.current.blur();
              }
              if (notesInputRef.current) {
                notesInputRef.current.blur();
              }
            }}>
              <View ref={modalContentRef} style={{ flex: 1 }}>
              {false && children !== undefined && children !== null ? (
                <View style={styles.childrenContainer}>
                  {renderChildrenSafely()}
                </View>
              ) : (
                <ScrollView
                  ref={scrollViewRef}
                  style={[styles.scrollContent, { flex: 1 }]}
                  contentContainerStyle={{ ...styles.scrollContentContainer, paddingBottom: 400 }}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                  scrollEventThrottle={16}
                  bounces={true}
                  overScrollMode="auto"
                  nestedScrollEnabled={true}
                >
                  {/* Task Input (keep as pill) */}
                  <Animated.View style={[
                    styles.inputContainer,
                    {
                      backgroundColor: isDark ? "#1c1c1e" : "#ffffff",
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
                    <TouchableWithoutFeedback onPress={() => {}}>
                      <View style={{ flex: 1 }}>
                        <TextInput
                          ref={taskInputRef}
                      style={[
                        styles.taskInput,
                        { color: isDark ? "#ffffff" : "#000000", fontWeight: 'normal', fontSize: 16 }
                      ]}
                      placeholder="What needs to be done?"
                      placeholderTextColor={isDark ? "#8e8e93" : "#6b7280"}
                      value={taskText}
                      onChangeText={(text) => {
                        // Profanity filter (simple list, can be expanded)
                        const profanities = [
                          'fuck', 'shit', 'bitch', 'asshole', 'bastard', 'dick', 'cunt', 'piss', 'darn', 'crap', 'damn', 'cock', 'pussy', 'fag', 'slut', 'douche', 'bollocks', 'bugger', 'bloody', 'arse', 'wank', 'twat', 'prick', 'tit', 'tosser', 'wanker', 'shag', 'git', 'knob', 'minger', 'pillock', 'twit', 'sod', 'numpty', 'plonker', 'berk', 'muppet', 'prat', 'twonk', 'bellend', 'nonce', 'slag', 'tart', 'scrubber', 'sket', 'gash', 'minge', 'munter'
                        ];
                        // Remove special characters except spaces
                        let clean = text.replace(/[^a-zA-Z0-9 ]+/g, "");
                        // Remove profanities (case insensitive, word boundaries)
                        profanities.forEach(word => {
                          const regex = new RegExp(`\\b${word}\\b`, 'gi');
                          clean = clean.replace(regex, '');
                        });
                        // Only capitalize the first letter of the first word
                        if (clean.length > 0) {
                          clean = clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
                        }
                        setTaskText(clean);

                        // Automatically detect priority and due date
                        const { priority: detectedPriority, dueDate: detectedDueDate } = detectPriorityAndDueDate(clean);
                        setPriority(detectedPriority);
                        if (detectedDueDate) {
                          setDueDate(detectedDueDate);
                        }

                        // Parse subtask patterns from text
                        const patternSubtasks = parseSmartSuggestions(clean);
                        setSmartSuggestions(patternSubtasks);

                        // Generate smart subtask suggestions based on context
                        const contextSubtasks = generateSmartSubtasks(clean);
                        setSmartSubtaskSuggestions(contextSubtasks);
                      }}
                      multiline={false}
                      numberOfLines={1}
                      textAlignVertical="center"
                      autoCorrect={true}
                      autoCapitalize="words"
                      blurOnSubmit={false}
                      selectTextOnFocus={false}
                      enablesReturnKeyAutomatically={true}
                      keyboardAppearance={isDark ? "dark" : "light"}
                      scrollEnabled={false}
                      editable={true}
                      returnKeyType="next"
                      onSubmitEditing={() => {
                        notesInputRef.current?.focus();
                      }}
                      onFocus={() => {
                        activeInputRef.current = 'task';
                        // Scroll to the top for task input
                        if (scrollViewRef.current) {
                          scrollViewRef.current.scrollTo({ y: 0, animated: true });
                        }
                      }}
                      onBlur={() => {
                        // No animation needed
                      }}
                    />
                      </View>
                    </TouchableWithoutFeedback>
                  </Animated.View>
                  {/* Smart Suggestions */}
                  {smartSuggestions.length > 0 && (
                    <View style={styles.suggestionsContainer}>
                      <Text style={[
                        styles.suggestionsTitle,
                        { color: isDark ? '#8e8e93' : '#6b7280' }
                      ]}>
                        Detected Subtasks
                      </Text>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={[
                          styles.suggestionsScroll,
                          { paddingLeft: 0, paddingRight: 0, marginLeft: 0, marginRight: 0 }
                        ]}
                        keyboardShouldPersistTaps="always"
                        keyboardDismissMode="none"
                        scrollEventThrottle={16}
                        decelerationRate="fast"
                        bounces={false}
                        overScrollMode="never"
                      >
                        {smartSuggestions
                          .filter(suggestion => {
                            // Add safety check for valid suggestion object
                            if (!suggestion || typeof suggestion.value !== 'string') {
                              return false;
                            }
                            const val = normalize(suggestion.value);
                            return !subtasks.some(s => normalize(s.text) === val) &&
                              !smartSubtaskSuggestions.some(s => normalize(s.value) === val);
                          })
                          .map((suggestion, index) => (
                            <SmartSuggestionItem
                              key={index}
                              suggestion={suggestion}
                              onApply={handleSmartSuggestion}
                              isDark={isDark}
                            />
                          ))}
                      </ScrollView>
                    </View>
                  )}
                  {/* Smart Subtask Suggestions */}
                  {smartSubtaskSuggestions.length > 0 && (
                    <View style={[styles.suggestionsContainerApple, { marginBottom: 20 }]}>
                      <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
                        <Text style={styles.suggestionsTitleApple}>
                          Suggested Subtasks
                        </Text>
                      </TouchableWithoutFeedback>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={[styles.suggestionsScrollApple, { paddingLeft: 0, paddingRight: 0, paddingBottom: 20}]}
                        style={{ width: 'auto' }}
                        keyboardShouldPersistTaps="always"
                        keyboardDismissMode="none"
                        scrollEventThrottle={16}
                        decelerationRate="fast"
                        bounces={false}
                        overScrollMode="never"
                        scrollEnabled={true}
                      >
                        {smartSubtaskSuggestions
                          .filter(subtask => {
                            // Add safety check for valid subtask object
                            if (!subtask || typeof subtask.value !== 'string') {
                              return false;
                            }
                            const val = normalize(subtask.value);
                            return !subtasks.some(s => normalize(s.text) === val) &&
                              !smartSuggestions.some(s => normalize(s.value) === val);
                          })
                          .map((subtask, index, array) => (
                            <TouchableOpacity
                              key={index}
                              style={[
                                styles.suggestionItemApple,
                                { 
                                  backgroundColor: isDark ? '#23243a' : '#f7faff',
                                  marginLeft: index === 0 ? 18 : 0,
                                  marginRight: index === array.length - 1 ? 18 : 16,
                                }
                              ]}
                              onPress={() => {
                                try {
                                  if (subtask && subtask.value) {
                                    handleSmartSubtaskSuggestion(subtask.value);
                                  }
                                } catch (error) {
                                  console.warn('Error handling subtask suggestion:', error);
                                }
                              }}
                              onPressIn={() => {
                                try {
                                  Keyboard.dismiss();
                                } catch (error) {
                                  console.warn('Error dismissing keyboard:', error);
                                }
                              }}
                              onLongPress={() => {
                                try {
                                  Keyboard.dismiss();
                                  if (subtask && subtask.value) {
                                    handleSmartSubtaskSuggestion(subtask.value);
                                  }
                                } catch (error) {
                                  console.warn('Error handling long press:', error);
                                }
                              }}
                              activeOpacity={0.7}
                              delayPressIn={50}
                              delayPressOut={50}
                              delayLongPress={300}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                              disabled={!subtask || !subtask.value}
                            >
                              {subtask && (
                                <>
                                  <View style={[styles.suggestionIconApple, { backgroundColor: subtask.color || '#007AFF' }]}>
                                    <Ionicons name={(subtask.icon as any) || 'add'} size={16} color="#fff" />
                                  </View>
                                  <Text style={[
                                    styles.suggestionTextApple,
                                    { color: isDark ? '#ffffff' : '#000000' }
                                  ]}>
                                    {subtask.value || ''}
                                  </Text>
                                  <Ionicons name="add" size={20} color={subtask.color || '#007AFF'} style={{ marginLeft: 5 }} />
                                </>
                              )}
                            </TouchableOpacity>
                          ))}
                      </ScrollView>
                    </View>
                  )}
                  
                  {/* Enhanced Subtask Manager */}
                  <SubtaskManager
                    subtasks={subtasks}
                    onSubtasksChange={setSubtasks}
                    isDark={isDark}
                    maxHeight={200}
                    onSubtaskEditStart={() => {
                      activeInputRef.current = 'subtask';
                    }}
                  />
                  
                  {/* Priority Pill */}
                  <Pill
                    ref={priorityDropdownRef}
                    title="Priority"
                    value={priority}
                    onPress={() => {
                      Keyboard.dismiss();
                      setShowPriorityDropdown(true);
                    }}
                    icon="flag-outline"
                    isDark={isDark}
                    showDot={true}
                    dotColor={PRIORITY_COLORS[priority as keyof typeof PRIORITY_COLORS][isDark ? "dark" : "light"].color}
                    pillStyle={
                      isDark && priority === "None"
                        ? {

                        }
                        : !isDark && priority !== "None"
                          ? {
                            shadowColor: PRIORITY_COLORS[priority as keyof typeof PRIORITY_COLORS].light.color,
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.1,
                            shadowRadius: 8,
                            elevation: 4,
                            backgroundColor: PRIORITY_COLORS[priority as keyof typeof PRIORITY_COLORS].light.bg,
                            borderColor: PRIORITY_COLORS[priority as keyof typeof PRIORITY_COLORS].light.border,
                            borderWidth: 1,
                          }
                          : isDark && priority !== "None"
                            ? {
                              backgroundColor: PRIORITY_COLORS[priority as keyof typeof PRIORITY_COLORS].dark.bg,
                              borderColor: PRIORITY_COLORS[priority as keyof typeof PRIORITY_COLORS].dark.border,
                              borderWidth: 1,
                              shadowColor: PRIORITY_COLORS[priority as keyof typeof PRIORITY_COLORS].dark.color,
                              shadowOffset: { width: 0, height: 2 },
                              shadowOpacity: 0.1,
                              shadowRadius: 8,
                              elevation: 4,
                            }
                            : {}
                    }
                    valueStyle={{ color: PRIORITY_COLORS[priority as keyof typeof PRIORITY_COLORS][isDark ? "dark" : "light"].color }}
                    iconColor={PRIORITY_COLORS[priority as keyof typeof PRIORITY_COLORS][isDark ? "dark" : "light"].color}
                  />
                  {/* Due Date Pill */}
                  <Pill
                    ref={dueDateDropdownRef}
                    title="Due Date"
                    value={getSelectedDueDateLabel()}
                    onPress={() => {
                      Keyboard.dismiss();
                      setShowDueDateDropdown(true);
                    }}
                    icon="calendar-outline"
                    isDark={isDark}
                  />
                  {/* Reminder Pill */}
                  <Pill
                    ref={reminderDropdownRef}
                    title="Reminder"
                    value={getSelectedReminderLabel()}
                    onPress={() => {
                      Keyboard.dismiss();
                      setShowReminderDropdown(true);
                    }}
                    icon="notifications-outline"
                    isDark={isDark}
                  />
                  {/* Notes Input (move to bottom, not pill) */}
                  <TouchableWithoutFeedback onPress={() => {
                    // Focus the notes input when tapping anywhere on the container
                    if (notesInputRef.current) {
                      notesInputRef.current.focus();
                    }
                  }}>
                    <View style={[styles.notesContainer, { backgroundColor: isDark ? "#1c1c1e" : "#ffffff", borderColor: "#535353ff", borderWidth: 0.5 }]}>
                      <Ionicons
                        name="document-text-outline"
                        size={20}
                        color={isDark ? "#8e8e93" : "#6b7280"}
                        style={{ marginRight: 12 }}
                      />
                      <TouchableWithoutFeedback onPress={() => {}}>
                        <View style={{ flex: 1 }}>
                        <TextInput
                          ref={notesInputRef}
                          style={[styles.notesInput, { color: isDark ? "#ffffff" : "#000000" }]}
                          placeholder="Add notes..."
                          placeholderTextColor={isDark ? "#a1a1aa" : "#6b7280"}
                          value={notes}
                          onChangeText={setNotes}
                          multiline={false}
                          textAlignVertical="center"
                          blurOnSubmit={true}
                          selectTextOnFocus={false}
                          enablesReturnKeyAutomatically={true}
                          keyboardAppearance={isDark ? "dark" : "light"}
                          returnKeyType="done"
                          autoCorrect={true}
                          autoCapitalize="sentences"
                          onFocus={() => {
                            activeInputRef.current = 'notes';
                            // Scroll to bottom to show notes input
                            setTimeout(() => {
                              if (scrollViewRef.current) {
                                scrollViewRef.current.scrollToEnd({ animated: true });
                              }
                            }, 100);
                      }}
                    />
                      </View>
                    </TouchableWithoutFeedback>
                    <Animated.View style={{ opacity: checkmarkOpacity }}>
                      <TouchableOpacity
                        onPress={() => {
                          if (notes.trim()) {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            // Add the note (you can extend this functionality as needed)
                            console.log('Adding note:', notes);
                            // Optional: clear the input after adding
                            setNotes('');
                            Keyboard.dismiss();
                          }
                        }}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        style={{
                          marginLeft: 10,
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                      >
                        <Ionicons name="add-circle" size={28} color={notes.trim() ? "#007AFF" : (isDark ? "#8e8e93" : "#6b7280")} />
                      </TouchableOpacity>
                    </Animated.View>
                  </View>
                  </TouchableWithoutFeedback>
                </ScrollView>
              )}
            </View>
            </TouchableWithoutFeedback>
          </Animated.View>
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
          {showDatePicker && (
            <>
              <TouchableWithoutFeedback onPress={closeDatePicker}>
                <View style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  zIndex: 999,
                }} />
              </TouchableWithoutFeedback>
              <View style={{
                backgroundColor: isDark ? '#1c1c1e' : '#ffffff',
                borderRadius: 12,
                marginTop: 12,
                marginBottom: 8,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.06,
                shadowRadius: 4,
                elevation: 2,
                overflow: 'hidden',
                zIndex: 1000,
                borderWidth: 1,
                borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                alignItems: 'center',
              }}>
                <View style={{
                  paddingTop: 16,
                  paddingHorizontal: 12,
                  paddingBottom: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '100%',
                }}>
                  <DateTimePicker
                    value={customDate}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={handleCustomDateChange}
                    minimumDate={new Date()}
                    maximumDate={new Date(new Date().setMonth(new Date().getMonth() + 6))}
                    themeVariant={isDark ? 'dark' : 'light'}
                    accentColor="#007aff"
                  />
                </View>
              </View>
            </>
          )}
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
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
    maxHeight: "100%",
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
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 8,
  },
  childrenContainer: {
    flex: 1,
    paddingTop: 20,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    padding: 28,
    paddingTop: 24,
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
    fontSize: 17,
    fontWeight: '400',
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 0,
    padding: 0,
    margin: 0,
    height: 40,
    lineHeight: 20,
    includeFontPadding: false,
    textAlignVertical: 'center',
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
    // width and left will be set dynamically
    borderRadius: 16,
    padding: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 20,
  },
  dropdownOption: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    marginBottom: 2,
  },
  dropdownOptionText: {
    fontSize: 16,
    fontWeight: "400",
    flex: 1,
  },
  checkmarkButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ff3b3018', // iOS system red with transparency
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    shadowColor: '#ff3b30',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 8,
  },
  // Add a new style for notesContainer
  notesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    borderRadius: 20,
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 0,
    borderWidth: 1,
    borderColor: '#e5e5ea',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  // New styles for smart suggestions
  suggestionsContainer: {
    marginTop: 16,
    paddingHorizontal: "auto",
    paddingVertical: 0,
    paddingBottom: 12,
    backgroundColor: 'transparent',
    borderRadius: 16,
    // No shadow for the container
  },
  suggestionsTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  suggestionsScroll: {
    paddingVertical: 4,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 12,
    borderWidth: 1.5,
    borderColor: '#b3d1ff', // more contrast for light mode
    minHeight: 44,
    backgroundColor: '#eaf3ff', // more vibrant for light mode
    shadowColor: '#007aff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  suggestionIcon: {
    width: 28, // increased size
    height: 28, // increased size
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14, // more space between icon and text
    backgroundColor: "#434343",
  },
  suggestionText: {
    flex: 1,
    fontSize: 16, // increased size
    fontWeight: '400',
    marginRight: 14, // more space between text and add button
  },
  // New Apple-style styles
  suggestionsContainerApple: {
    marginBottom: 8,
    paddingVertical: 0,
    backgroundColor: 'transparent',
    width: '100%',
    alignSelf: 'stretch',
    overflow: 'visible',
  },
  suggestionsTitleApple: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8e8e93',
    marginBottom: 8,
    marginLeft: 0,
    paddingHorizontal: 18,
    letterSpacing: 0.3,
  },
  suggestionsScrollApple: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingLeft: 0,
    paddingRight: 0,
    overflow: 'visible',
  },
  suggestionItemApple: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 12,
    marginBottom: 2,
    backgroundColor: '#f2f2f7',
    shadowColor: '#007aff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
    minHeight: 42,
    minWidth: 0,
  },
  suggestionIconApple: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  suggestionTextApple: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.1,
    flexShrink: 1,
    color: '#111',
  },
});