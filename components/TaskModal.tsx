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
  findNodeHandle,
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

export interface TaskData {
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
  const scaleAnim = useRef(new Animated.Value(0.95)).current; // Add scale animation

  useLayoutEffect(() => {
    if (visible && dropdownAnchorRef?.current && parentRef?.current && dropdownAnchorRef.current.measureLayout) {
      setTimeout(() => {
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
          () => {}
        );
      }, 10); // Small delay to ensure layout is complete
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
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 120,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -20,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.95,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
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
                (isDueDateDropdown || isRemindersDropdown) && {
                  paddingTop: 2,
                  paddingBottom: 6,
                  paddingHorizontal: 16,
                  minHeight: 44,
                  borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
                  borderBottomColor: isDark ? '#232325' : '#e5e5ea',
                  justifyContent: 'center',
                }
              ]}
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
                    marginRight: 16,
                  }}
                >
                  <Ionicons
                    name={option.icon as any}
                    size={18}
                    color={PRIORITY_COLORS[option.key as keyof typeof PRIORITY_COLORS].color}
                  />
                </View>
              ) : (isDueDateDropdown || isRemindersDropdown) ? null : (
                <Ionicons name={option.icon as any} size={20} color={isDark ? "#8e8e93" : "#6b7280"} style={{ marginRight: 16 }} />
              )}
              <Text style={[
                styles.dropdownOptionText,
                {
                  color: isDark ? "#ffffff" : "#000000",
                  fontWeight: "400",
                  fontSize: 16,
                  letterSpacing: 0.1,
                  ...(isDueDateDropdown || isRemindersDropdown ? { marginLeft: 0 } : {}),
                }
              ]}>
                {option.label}
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
  house:    { icon: 'home-outline', color: '#5AC8FA' },      // systemTeal/Blue
  work:     { icon: 'briefcase-outline', color: '#007AFF' }, // systemBlue
  personal: { icon: 'person-outline', color: '#AF52DE' },    // systemPurple
  health:   { icon: 'medkit-outline', color: '#34C759' },    // systemGreen
  finance:  { icon: 'card-outline', color: '#FFD60A' },      // systemYellow
  shopping: { icon: 'cart-outline', color: '#FF9500' },      // systemOrange
  travel:   { icon: 'airplane-outline', color: '#FF375F' },  // systemPink/Red
  study:    { icon: 'book-outline', color: '#5856D6' },      // systemIndigo
  social:   { icon: 'people-outline', color: '#30D158' },    // systemMint/Green
  fitness:  { icon: 'barbell-outline', color: '#FF2D55' },   // systemPink
  pets:     { icon: 'paw-outline', color: '#FF9F0A' },       // systemOrange
  errands:  { icon: 'walk-outline', color: '#A2845E' },      // soft brown
  tech:     { icon: 'hardware-chip-outline', color: '#64D2FF' }, // light blue
  garden:   { icon: 'leaf-outline', color: '#32D74B' },      // systemGreen
  car:      { icon: 'car-outline', color: '#FF453A' },       // systemRed
  kids:     { icon: 'happy-outline', color: '#FFD60A' },     // systemYellow
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
    .filter((s, i, arr) => s.value.length > 2 && s.value.length < 50 && arr.findIndex(x => x.value.toLowerCase() === s.value.toLowerCase()) === i && !['and', 'or', 'then', 'next', 'after'].includes(s.value.toLowerCase()));
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
    activeOpacity={0.85}
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
      {suggestion.value}
    </Text>
    <Ionicons name="add" size={20} color={suggestion.color} style={{ marginLeft: 6 }} />
  </TouchableOpacity>
);

// Helper for case-insensitive deduplication
const normalize = (s: string) => s.trim().toLowerCase();

// Add this function above TaskModal
function detectPriorityAndDueDate(text: string): { priority: TaskData["priority"], dueDate: string | null } {
  const lowerText = text.toLowerCase();
  let priority: TaskData["priority"] = "None";
  let dueDate: string | null = null;

  if (lowerText.includes('urgent') || lowerText.includes('asap') || lowerText.includes('critical') || lowerText.includes('emergency') || lowerText.includes('immediately')) {
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
  const [smartSuggestions, setSmartSuggestions] = useState<SmartSuggestion[]>([]);
  const [subtasks, setSubtasks] = useState<string[]>([]);
  const [smartSubtaskSuggestions, setSmartSubtaskSuggestions] = useState<SmartSubtaskSuggestion[]>([]);

  // Dropdown states
  const [showDueDateDropdown, setShowDueDateDropdown] = useState(false);
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);
  const [showReminderDropdown, setShowReminderDropdown] = useState(false);

  // Animation values
  const modalOpacity = useRef(new Animated.Value(0)).current;
  const modalScale = useRef(new Animated.Value(0.95)).current;
  const modalTranslateY = useRef(new Animated.Value(20)).current;

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

  // Reset form when editing task changes or when modal is closed for new task
  useEffect(() => {
    if (editingTask) {
      setTaskText(editingTask.text);
      setNotes(editingTask.notes);
      setPriority(editingTask.priority);
      setDueDate(editingTask.dueDate);
      setReminder(editingTask.reminder);
    } else if (!visible) {
      // Reset fields when modal closes for new task
      setTaskText("");
      setNotes("");
      setPriority("None");
      setDueDate(null);
      setReminder("none");
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
    setSmartSuggestions([]); // Reset smart suggestions
    setSmartSubtaskSuggestions([]); // Reset smart subtask suggestions
  };

  const handleSmartSuggestion = (suggestion: SmartSuggestion) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Only handle subtask suggestions now
    if (!subtasks.some(s => normalize(s) === normalize(suggestion.value))) {
      setSubtasks([...subtasks, suggestion.value]);
    }
    
    // Remove the applied suggestion from the list
    setSmartSuggestions(prev => prev.filter(s => s !== suggestion));
    // Re-focus the task input to keep the keyboard open
    taskInputRef.current?.focus();
  };

  const handleSmartSubtaskSuggestion = (subtask: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!subtasks.some(s => normalize(s) === normalize(subtask))) {
      setSubtasks([...subtasks, subtask]);
    }
    setSmartSubtaskSuggestions(prev => prev.filter(s => s.value !== subtask));
    // Re-focus the task input to keep the keyboard open
    taskInputRef.current?.focus();
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
        keyboardVerticalOffset={0}
      >
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
                      multiline
                      textAlignVertical="top"
                      autoCorrect={true}
                      autoCapitalize="words"
                      onFocus={() => {
                        // Scroll to the top for task input
                        if (scrollViewRef.current) {
                          scrollViewRef.current.scrollTo({ y: 0, animated: true });
                        }
                      }}
                    />
                  </View>
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
                        contentContainerStyle={styles.suggestionsScroll}
                        keyboardShouldPersistTaps="always"
                      >
                        {smartSuggestions
                          .filter(suggestion => {
                            const val = normalize(suggestion.value);
                            return !subtasks.some(s => normalize(s) === val) &&
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
                    <View style={styles.suggestionsContainerApple}>
                      <Text style={styles.suggestionsTitleApple}>
                        Suggested Subtasks
                      </Text>
                      <ScrollView 
                        horizontal 
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={[styles.suggestionsScrollApple, { paddingLeft: 18, paddingRight: 18 }]}
                        style={{ width: '100%' }}
                        keyboardShouldPersistTaps="always"
                      >
                        {smartSubtaskSuggestions
                          .filter(subtask => {
                            const val = normalize(subtask.value);
                            return !subtasks.some(s => normalize(s) === val) &&
                                   !smartSuggestions.some(s => normalize(s.value) === val);
                          })
                          .map((subtask, index) => (
                            <TouchableOpacity
                              key={index}
                              style={[
                                styles.suggestionItemApple,
                                { backgroundColor: isDark ? '#23243a' : '#f7faff' }
                              ]}
                              onPress={() => handleSmartSubtaskSuggestion(subtask.value)}
                              activeOpacity={0.85}
                            >
                              <View style={[styles.suggestionIconApple, { backgroundColor: subtask.color }]}>
                                <Ionicons name={subtask.icon as any} size={16} color="#fff" />
                              </View>
                              <Text style={[
                                styles.suggestionTextApple,
                                { color: isDark ? '#ffffff' : '#000000' }
                              ]}>
                                {subtask.value}
                              </Text>
                              <Ionicons name="add" size={20} color={subtask.color} />
                            </TouchableOpacity>
                          ))}
                      </ScrollView>
                    </View>
                  )}
                  {/* Subtasks Display */}
                  {subtasks.length > 0 && (
                    <View style={styles.subtasksContainer}>
                      <Text style={[
                        styles.subtasksTitle,
                        { color: isDark ? '#8e8e93' : '#6b7280' }
                      ]}>
                        Subtasks
                      </Text>
                      <ScrollView
                        style={{ maxHeight: 120 }}
                        keyboardShouldPersistTaps="always"
                        showsVerticalScrollIndicator={false}
                      >
                        {subtasks.map((subtask, index) => (
                          <View key={index} style={[
                            styles.subtaskItem,
                            { backgroundColor: isDark ? '#2c2c2e' : '#f2f2f7' }
                          ]}>
                            <Ionicons name="list" size={16} color={isDark ? '#8e8e93' : '#6b7280'} />
                            <Text style={[
                              styles.subtaskText,
                              { color: isDark ? '#ffffff' : '#000000' }
                            ]}>
                              {subtask}
                            </Text>
                            <TouchableOpacity
                              onPress={() => {
                                setSubtasks(subtasks.filter((_, i) => i !== index));
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                              }}
                            >
                              <Ionicons name="close-circle" size={16} color={isDark ? '#8e8e93' : '#6b7280'} />
                            </TouchableOpacity>
                          </View>
                        ))}
                      </ScrollView>
                    </View>
                  )}
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
    ...(Platform.OS === 'android' ? { textAlignVertical: 'center' } : {}),
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
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginBottom: 2,
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
    paddingHorizontal: 20,
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
  },
  suggestionText: {
    flex: 1,
    fontSize: 16, // increased size
    fontWeight: '400',
    marginRight: 14, // more space between text and add button
  },
  subtasksContainer: {
    marginTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  subtasksTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  subtaskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#e5e5ea',
  },
  subtaskText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '400',
    marginLeft: 8,
  },
  // Add new Apple-style styles
  suggestionsContainerApple: {
    marginTop: 16,
    marginBottom: 28,
    // paddingHorizontal: 18, // Removed horizontal padding
    paddingVertical: 0,
    backgroundColor: 'transparent',
    width: '100%',
    alignSelf: 'stretch',
  },
  suggestionsTitleApple: {
    fontSize: 12,
    fontWeight: '500',
    color: '#8e8e93',
    marginBottom: 6,
    marginLeft: 18, // Add left margin to title only
    letterSpacing: 0.1,
  },
  suggestionsScrollApple: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingLeft: 0,
    paddingRight: 0,
  },
  suggestionItemApple: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 12, // Reduced from 20 to 12
    marginRight: 16,
    marginBottom: 2,
    backgroundColor: '#f2f2f7',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 1,
    minHeight: 38,
    minWidth: 0,
  },
  suggestionIconApple: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  suggestionTextApple: {
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: 0.1,
    flexShrink: 1,
    color: '#111',
  },
});
