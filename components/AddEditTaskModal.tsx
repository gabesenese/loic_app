import { useState, useEffect, useRef } from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, StyleSheet, FlatList, KeyboardAvoidingView, Platform, SafeAreaView, Animated, Dimensions, findNodeHandle, ScrollView, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../ThemeContext';
import { formatDateForDisplay } from '../screens/TodoScreen';
import { Swipeable } from 'react-native-gesture-handler';

const PRIORITIES = ['None', 'Low', 'Medium', 'High'] as const;
const DATE_OPTIONS = [
  { key: 'none', label: 'No Date' },
  { key: 'today', label: 'Today' },
  { key: 'tomorrow', label: 'Tomorrow' },
  { key: 'week', label: 'This Week' },
];

export const PRIORITY_COLORS = {
  None: { bg: '#F2F2F7', color: '#C7C7CC', border: '#E5E5EA' }, // system gray
  Low: { bg: '#E9F8EF', color: '#34C759', border: '#B7F5D8' }, // system green
  Medium: { bg: '#FFF6E5', color: '#FF9500', border: '#FFE5B2' }, // system orange
  High: { bg: '#FFE5E7', color: '#FF3B30', border: '#FFD1D4' }, // system red
};

const DUE_ACTIVE = { bg: '#3b82f6', color: '#fff', border: '#3b82f6' };

interface Subtask {
  id: string;
  text: string;
  completed: boolean;
}

export interface TaskForm {
  id?: string;
  text: string;
  note: string;
  priority: typeof PRIORITIES[number];
  dueType: string;
  dueDate?: string;
  completed: boolean;
  subtasks: Subtask[];
}

interface TaskInfo {
  text: string;
  dueDate: Date | null;
  priority: typeof PRIORITIES[number];
  category: string;
  timeOfDay: string | null;
  recurring: string | null;
  subtasks: string[];
}

// Task Templates for Auto-suggestions
const TASK_TEMPLATES: { [key: string]: string[] } = {
  "plan trip": [
    "Book flights",
    "Reserve hotel",
    "Create itinerary",
    "Check passport/visa requirements",
    "Make packing list",
    "Arrange transportation",
    "Get travel insurance",
    "Exchange currency",
    "Research local attractions"
  ],
  "weekly shopping": [
    "Check pantry inventory",
    "Make grocery list",
    "Plan meals for the week",
    "Check for sales/coupons",
    "Organize shopping route",
    "Check household supplies",
    "Review recipe ingredients"
  ],
  "prepare presentation": [
    "Research topic",
    "Create outline",
    "Design slides",
    "Practice delivery",
    "Prepare handouts",
    "Set up equipment",
    "Time rehearsal",
    "Prepare Q&A responses"
  ],
  "move house": [
    "Research new neighborhoods",
    "Contact real estate agent",
    "Schedule viewings",
    "Get moving quotes",
    "Pack belongings",
    "Update address",
    "Set up utilities",
    "Change locks",
    "Deep clean new place",
    "Arrange internet installation"
  ],
  "job application": [
    "Update resume",
    "Write cover letter",
    "Research company",
    "Prepare portfolio",
    "Follow up on application",
    "Practice interview questions",
    "Prepare references list",
    "Research salary range"
  ],
  "project launch": [
    "Create project timeline",
    "Assign team roles",
    "Set up project tools",
    "Schedule kick-off meeting",
    "Define success metrics",
    "Create documentation",
    "Set up monitoring",
    "Plan marketing strategy"
  ],
  "organize event": [
    "Set date and venue",
    "Create guest list",
    "Send invitations",
    "Plan catering",
    "Arrange decorations",
    "Create schedule",
    "Coordinate with vendors",
    "Plan setup and cleanup"
  ],
  "home maintenance": [
    "Check smoke detectors",
    "Clean gutters",
    "Service HVAC",
    "Check plumbing",
    "Inspect roof",
    "Clean air filters",
    "Test security system",
    "Check appliances"
  ],
  "start workout routine": [
    "Set fitness goals",
    "Create workout schedule",
    "Buy exercise equipment",
    "Plan meal prep",
    "Track progress",
    "Schedule rest days",
    "Find workout videos",
    "Join fitness class"
  ],
  "learn new skill": [
    "Research learning resources",
    "Create study schedule",
    "Join online course",
    "Practice regularly",
    "Track progress",
    "Find study group",
    "Set milestone goals",
    "Schedule review sessions"
  ],
  "clean house": [
    "Vacuum floors",
    "Dust furniture",
    "Clean bathrooms",
    "Mop floors",
    "Clean kitchen",
    "Take out trash",
    "Do laundry",
    "Change bed sheets",
    "Clean windows",
    "Organize closets"
  ],
  "clean kitchen": [
    "Wash dishes",
    "Clean countertops",
    "Clean appliances",
    "Sweep/mop floor",
    "Take out trash",
    "Clean refrigerator",
    "Organize pantry"
  ],
  "clean bathroom": [
    "Clean toilet",
    "Clean shower/tub",
    "Clean sink and mirror",
    "Mop floor",
    "Replace towels",
    "Restock supplies"
  ]
};

// Priority keywords for auto-detection
const PRIORITY_KEYWORDS = {
  high: [
    "urgent", "asap", "important", "critical", "deadline", "due", "emergency",
    "crucial", "vital", "immediate", "priority", "essential", "urgent", "overdue",
    "required", "mandatory", "necessary", "time-sensitive", "expedite", "rush"
  ],
  medium: [
    "soon", "next week", "tomorrow", "review", "prepare", "plan",
    "upcoming", "schedule", "arrange", "organize", "coordinate", "develop",
    "implement", "progress", "advance", "continue", "maintain", "regular"
  ],
  low: [
    "sometime", "when possible", "eventually", "maybe", "consider", "later",
    "optional", "flexible", "casual", "whenever", "if time permits", "backlog",
    "nice to have", "would be nice", "at some point", "not urgent", "can wait"
  ]
};

// Category keywords for better task categorization
const CATEGORY_KEYWORDS = {
  work: [
    "meeting", "project", "client", "deadline", "report", "presentation",
    "email", "call", "conference", "document", "review", "proposal",
    "budget", "analysis", "strategy", "team", "collaborate", "office"
  ],
  personal: [
    "home", "family", "hobby", "read", "exercise", "meditation",
    "self-care", "journal", "relax", "garden", "cook", "learn",
    "practice", "study", "personal", "private", "me time"
  ],
  shopping: [
    "buy", "purchase", "shop", "grocery", "store", "market",
    "mall", "order", "pickup", "delivery", "items", "list",
    "supplies", "goods", "products", "shopping cart"
  ],
  health: [
    "doctor", "appointment", "medication", "exercise", "workout",
    "gym", "diet", "nutrition", "wellness", "checkup", "therapy",
    "mental health", "meditation", "yoga", "run", "jog", "walk"
  ],
  finance: [
    "pay", "bill", "budget", "expense", "bank", "money",
    "invest", "save", "account", "tax", "finance", "payment",
    "balance", "credit", "debit", "transfer", "transaction"
  ],
  social: [
    "meet", "party", "dinner", "lunch", "coffee", "friend",
    "family", "gathering", "celebration", "event", "birthday",
    "anniversary", "reunion", "social", "hangout", "date"
  ],
  home: [
    "clean", "vacuum", "dust", "mop", "laundry", "dishes",
    "trash", "organize", "declutter", "tidy", "sweep",
    "wash", "fold", "bathroom", "kitchen", "bedroom",
    "house", "apartment", "room", "closet", "window"
  ]
};

// Time-based suggestions
const TIME_PATTERNS = {
  morning: ["breakfast", "morning", "early", "wake up", "am", "dawn"],
  afternoon: ["lunch", "noon", "afternoon", "pm", "midday"],
  evening: ["dinner", "evening", "night", "sunset", "late"]
};

// Recurring task patterns
const RECURRING_PATTERNS = {
  daily: ["every day", "daily", "each day"],
  weekly: ["every week", "weekly", "each week"],
  monthly: ["every month", "monthly", "each month"],
  yearly: ["every year", "yearly", "annual", "annually"]
};

const PRIMARY = '#3b82f6';
const TEXT_ON_PRIMARY = '#fff';

const ACTIVE_BG = '#4a5568';
const ACTIVE_TEXT = '#ffffff';

const priorityGridOrder: [typeof PRIORITIES[number], typeof PRIORITIES[number]][] = [
  ['None', 'Medium'],
  ['Low', 'High'],
];

// 1. Define category colors for pill styling:
const CATEGORY_COLORS = {
  work:   { bg: '#e3e8ff', color: '#3b5bdb', border: '#b2bff6' },
  personal: { bg: '#ffe3ec', color: '#d72660', border: '#fbb1c8' },
  shopping: { bg: '#e3fff1', color: '#1c7c54', border: '#b2f6d2' },
  health:   { bg: '#e3faff', color: '#228be6', border: '#b2e6fb' },
  finance:  { bg: '#fffbe3', color: '#b68f00', border: '#fff3b2' },
  social:   { bg: '#f3e3ff', color: '#7c3aed', border: '#d1b2f6' },
  home:     { bg: '#f1f5e3', color: '#5c940d', border: '#d3e6b2' },
  default:  { bg: '#f4f4f4', color: '#666', border: '#e0e0e0' },
};

export const APPLE_COLORS = {
  light: {
    primary: '#007AFF', // iOS system blue
    background: '#FFFFFF',
    card: '#F2F2F7',
    text: '#1C1C1E',
    textSecondary: 'rgba(60,60,67,0.6)',
    textTertiary: 'rgba(60,60,67,0.3)',
    border: '#E5E5EA',
    todayBorder: '#007AFF',
    selectedDay: '#007AFF',
    selectedDayText: '#FFFFFF',
    inactiveDay: 'rgba(60,60,67,0.3)',
    fab: '#007AFF',
    fabIcon: '#FFFFFF'
  },
  dark: {
    primary: '#0A84FF', // iOS system blue (dark)
    background: '#1C1C1E',
    card: '#2C2C2E',
    text: '#FFFFFF',
    textSecondary: 'rgba(235,235,245,0.6)',
    textTertiary: 'rgba(235,235,245,0.3)',
    border: '#3A3A3C',
    todayBorder: '#0A84FF',
    selectedDay: '#0A84FF',
    selectedDayText: '#FFFFFF',
    inactiveDay: 'rgba(235,235,245,0.3)',
    fab: '#0A84FF',
    fabIcon: '#FFFFFF'
  },
};

export default function AddEditTaskModal({ visible, onClose, onSave, editingTask, onCustomDueDate, onDelete }: {
  visible: boolean;
  onClose: () => void;
  onSave: (task: TaskForm) => void;
  editingTask?: TaskForm | null;
  onCustomDueDate?: () => void;
  onDelete?: (task: TaskForm) => void;
}) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [text, setText] = useState('');
  const [note, setNote] = useState('');
  const [priority, setPriority] = useState<typeof PRIORITIES[number]>('None');
  const [dueType, setDueType] = useState('today');
  const [dueDate, setDueDate] = useState<string | undefined>(undefined);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [showDueDateModal, setShowDueDateModal] = useState(false);
  const [showPriorityModal, setShowPriorityModal] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [showSubtasks, setShowSubtasks] = useState(false);
  const [priorityBtnY, setPriorityBtnY] = useState(0);
  const [priorityBtnX, setPriorityBtnX] = useState(0);
  const [priorityBtnWidth, setPriorityBtnWidth] = useState(0);
  const priorityBtnRef = useRef<View | null>(null);
  const [priorityPopoverPos, setPriorityPopoverPos] = useState<{x: number, y: number, width: number, height: number} | null>(null);
  const [calendarSelectedDate, setCalendarSelectedDate] = useState<Date | null>(null);
  const today = new Date();
  const [calendarMonth, setCalendarMonth] = useState(today.getMonth());
  const [calendarYear, setCalendarYear] = useState(today.getFullYear());
  
  // NLP State
  const [taskInfo, setTaskInfo] = useState<TaskInfo>({
    text: '',
    dueDate: null,
    priority: 'None',
    category: 'default',
    timeOfDay: null,
    recurring: null,
    subtasks: []
  });
  const [showSmartSuggestions, setShowSmartSuggestions] = useState(false);

  function getDaysInMonth(year: number, month: number) {
    return new Date(year, month + 1, 0).getDate();
  }
  function getFirstDayOfWeek(year: number, month: number) {
    return new Date(year, month, 1).getDay();
  }
  const daysInMonth = getDaysInMonth(calendarYear, calendarMonth);
  const firstDay = getFirstDayOfWeek(calendarYear, calendarMonth);
  const days: (number | null)[] = Array(firstDay).fill(null).concat(Array.from({ length: daysInMonth }, (_, i) => i + 1));

  useEffect(() => {
    if (editingTask) {
      setText(editingTask.text);
      setNote(editingTask.note || '');
      setPriority(editingTask.priority || 'None');
      setDueType(editingTask.dueType || 'today');
      let parsedDueDate = editingTask.dueDate;
      if (parsedDueDate && /^\d{4}-\d{2}-\d{2}$/.test(parsedDueDate)) {
        const [year, month, day] = parsedDueDate.split('-').map(Number);
        parsedDueDate = new Date(year, month - 1, day).toISOString();
      }
      if (!parsedDueDate || isNaN(new Date(parsedDueDate).getTime())) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        parsedDueDate = today.toISOString();
      }
      setDueDate(parsedDueDate);
      setSubtasks(editingTask.subtasks || []);
      setShowSmartSuggestions(false);
      setShowSubtasks((editingTask.subtasks && editingTask.subtasks.length > 0) ? true : false);
      setShowNotes(!!editingTask.note && editingTask.note.trim().length > 0);
    } else {
      setText(''); setNote(''); setPriority('None'); setDueType('today');
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      setDueDate(today.toISOString());
      setSubtasks([]);
      setShowSmartSuggestions(false);
      setShowSubtasks(false);
      setShowNotes(false);
    }
  }, [editingTask, visible]);

  // NLP Functions
  const detectTaskCategory = (text: string): string => {
    const lowerText = text.toLowerCase();
    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        return category;
      }
    }
    return "default";
  };

  const extractDueDate = (text: string): Date | null => {
    const lowerText = text.toLowerCase();
    const today = new Date();
    
    // Simple date parsing patterns
    const patterns = [
      { regex: /today/i, date: today },
      { regex: /tomorrow/i, date: new Date(today.getTime() + 24 * 60 * 60 * 1000) },
      { regex: /next week/i, date: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000) },
      { regex: /next monday/i, date: getNextDayOfWeek(today, 1) },
      { regex: /next tuesday/i, date: getNextDayOfWeek(today, 2) },
      { regex: /next wednesday/i, date: getNextDayOfWeek(today, 3) },
      { regex: /next thursday/i, date: getNextDayOfWeek(today, 4) },
      { regex: /next friday/i, date: getNextDayOfWeek(today, 5) },
      { regex: /next saturday/i, date: getNextDayOfWeek(today, 6) },
      { regex: /next sunday/i, date: getNextDayOfWeek(today, 0) },
      { regex: /this weekend/i, date: getNextDayOfWeek(today, 6) },
      { regex: /next month/i, date: new Date(today.getFullYear(), today.getMonth() + 1, today.getDate()) },
    ];

    for (const pattern of patterns) {
      if (pattern.regex.test(lowerText)) {
        return pattern.date;
      }
    }

    return null;
  };

  const getNextDayOfWeek = (from: Date, dayOfWeek: number): Date => {
    const result = new Date(from);
    result.setDate(from.getDate() + (7 + dayOfWeek - from.getDay()) % 7);
    return result;
  };

  const predictPriority = (text: string, dueDate: Date | null): typeof PRIORITIES[number] => {
    const lowerText = text.toLowerCase();
    
    // Check for explicit priority keywords
    for (const [priority, keywords] of Object.entries(PRIORITY_KEYWORDS)) {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        return priority.charAt(0).toUpperCase() + priority.slice(1) as typeof PRIORITIES[number];
      }
    }
    
    // Check due date proximity
    if (dueDate) {
      const today = new Date();
      const dueIn = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      if (dueIn <= 1) return "High";
      if (dueIn <= 7) return "Medium";
      return "Low";
    }
    
    return "None";
  };

  const suggestSubtasks = (text: string): string[] => {
    const lowerText = text.toLowerCase();
    for (const [template, subtasks] of Object.entries(TASK_TEMPLATES)) {
      if (lowerText.includes(template) || template.includes(lowerText)) {
        return subtasks;
      }
    }
    return [];
  };

  const detectTimeOfDay = (text: string): string | null => {
    const lowerText = text.toLowerCase();
    for (const [time, patterns] of Object.entries(TIME_PATTERNS)) {
      if (patterns.some(pattern => lowerText.includes(pattern))) {
        return time;
      }
    }
    return null;
  };

  const detectRecurring = (text: string): string | null => {
    const lowerText = text.toLowerCase();
    for (const [pattern, keywords] of Object.entries(RECURRING_PATTERNS)) {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        return pattern;
      }
    }
    return null;
  };

  const parseNaturalLanguage = (input: string): TaskInfo => {
    const text = input.toLowerCase();
    let taskInfo: TaskInfo = {
      text: input,
      dueDate: null,
      priority: "None",
      subtasks: [],
      category: detectTaskCategory(text),
      timeOfDay: detectTimeOfDay(text),
      recurring: detectRecurring(text)
    };

    // Extract due date
    taskInfo.dueDate = extractDueDate(text);

    // Predict priority
    taskInfo.priority = predictPriority(text, taskInfo.dueDate);

    // Suggest subtasks
    taskInfo.subtasks = suggestSubtasks(text);

    return taskInfo;
  };

  // Function to capitalize every word in a string
  const capitalizeWords = (str: string): string => {
    return str
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Function to filter out special characters
  const filterSpecialCharacters = (input: string): string => {
    // Remove special characters but preserve all spaces (including multiple spaces), hyphens, apostrophes for contractions
    // Allow: letters, numbers, spaces, hyphens, apostrophes
    // Remove: . , [ ] ; / ` ! @ # $ % ^ & * ( ) + = { } | : " < > ? ~ \
    return input.replace(/[.,\[\];/`!@#$%^&*()+={}|:\"<>?~\\]/g, '');
  };

  // Function to filter out profanity and unnecessary words
  const filterProfanityAndUnnecessaryWords = (input: string): string => {
    // Common profanity words to filter out
    const profanityWords = [
      'fuck', 'shit', 'bitch', 'ass', 'damn', 'hell', 'crap', 'piss', 'dick', 'cock', 'pussy', 'cunt',
      'fucking', 'shitting', 'bitching', 'asshole', 'damnit', 'hellish', 'crappy', 'pissing', 'dickhead', 'cocky', 'pussycat', 'cuntish',
      'fucker', 'shitter', 'bitchy', 'asshat', 'damned', 'hellish', 'crappy', 'pissed', 'dickish', 'cocky', 'pussyfoot', 'cuntish'
    ];

    // Unnecessary filler words to remove
    const unnecessaryWords = [
      'um', 'uh', 'er', 'ah', 'oh', 'hmm', 'well', 'like', 'you know', 'i mean', 'basically', 'actually', 'literally',
      'just', 'very', 'really', 'quite', 'rather', 'somewhat', 'kind of', 'sort of', 'type of', 'thing', 'stuff', 'things',
      'whatever', 'anyway', 'anyways', 'so', 'then', 'now', 'here', 'there', 'this', 'that', 'these', 'those'
    ];

    let filteredText = input.toLowerCase();

    // Remove profanity words
    profanityWords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      filteredText = filteredText.replace(regex, '');
    });

    // Remove unnecessary words
    unnecessaryWords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      filteredText = filteredText.replace(regex, '');
    });

    // Clean up extra spaces and trim
    return filteredText.replace(/\s+/g, ' ').trim();
  };

  const handleTextChange = (newText: string) => {
    // First filter special characters (preserving all spaces)
    let filteredText = filterSpecialCharacters(newText);
    
    // Then filter profanity and unnecessary words
    const profanityWords = [
      'fuck', 'shit', 'bitch', 'ass', 'damn', 'hell', 'crap', 'piss', 'dick', 'cock', 'pussy', 'cunt',
      'fucking', 'shitting', 'bitching', 'asshole', 'damnit', 'hellish', 'crappy', 'pissing', 'dickhead', 'cocky', 'pussycat', 'cuntish',
      'fucker', 'shitter', 'bitchy', 'asshat', 'damned', 'hellish', 'crappy', 'pissed', 'dickish', 'cocky', 'pussyfoot', 'cuntish'
    ];

    const unnecessaryWords = [
      'um', 'uh', 'er', 'ah', 'oh', 'hmm', 'well', 'like', 'you know', 'i mean', 'basically', 'actually', 'literally',
      'just', 'very', 'really', 'quite', 'rather', 'somewhat', 'kind of', 'sort of', 'type of', 'thing', 'stuff', 'things',
      'whatever', 'anyway', 'anyways', 'so', 'then', 'now', 'here', 'there', 'this', 'that', 'these', 'those'
    ];

    // Remove profanity words
    profanityWords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      filteredText = filteredText.replace(regex, '');
    });

    // Remove unnecessary words
    unnecessaryWords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      filteredText = filteredText.replace(regex, '');
    });

    // Do NOT collapse spaces or trim; preserve all spaces as entered by the user
    setText(filteredText);

    // Parse natural language if text is long enough (ignoring spaces for length check)
    if (filteredText.replace(/\s/g, '').length >= 3) {
      const parsedInfo = parseNaturalLanguage(filteredText);
      setTaskInfo(parsedInfo);
      setShowSmartSuggestions(true);
      if (note.trim().length > 0) {
        setShowNotes(false);
      }
      // Auto-apply detected priority if it's not None
      if (parsedInfo.priority !== 'None') {
        setPriority(parsedInfo.priority);
      }
      
      // Auto-apply detected due date
      if (parsedInfo.dueDate) {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        
        if (parsedInfo.dueDate.toDateString() === today.toDateString()) {
          setDueType('today');
          setDueDate(parsedInfo.dueDate.toISOString());
        } else if (parsedInfo.dueDate.toDateString() === tomorrow.toDateString()) {
          setDueType('tomorrow');
          setDueDate(parsedInfo.dueDate.toISOString());
        } else {
          setDueType('custom');
          setDueDate(parsedInfo.dueDate.toISOString());
        }
      }
    } else {
      setShowSmartSuggestions(false);
    }
  };

  const addSuggestedSubtasks = () => {
    const newSubtasks = taskInfo.subtasks.map(subtask => ({
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      text: subtask,
      completed: false
    }));
    setSubtasks([...subtasks, ...newSubtasks]);
  };

  const addSingleSubtask = (subtaskText: string) => {
    const newSubtask = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      text: subtaskText,
      completed: false
    };
    setSubtasks([...subtasks, newSubtask]);
  };

  const handleSave = () => {
    if (!text.trim()) return;
    
    // Determine the actual due date based on dueType
    let finalDueDate = dueDate;
    if (!finalDueDate) {
      const now = new Date();
      switch (dueType) {
        case 'today':
          finalDueDate = now.toISOString();
          break;
        case 'tomorrow':
          const tomorrow = new Date(now);
          tomorrow.setDate(now.getDate() + 1);
          finalDueDate = tomorrow.toISOString();
          break;
        case 'week':
          const week = new Date(now);
          const dayOfWeek = now.getDay();
          const daysToAdd = dayOfWeek === 0 ? 0 : 7 - dayOfWeek; // Next Sunday
          week.setDate(now.getDate() + daysToAdd);
          finalDueDate = week.toISOString();
          break;
        case 'none':
          // Default to today for tasks with no date
          finalDueDate = now.toISOString();
          break;
        default:
          // For custom dates, dueDate should already be set
          break;
      }
    }
    
    onSave({
      id: editingTask?.id,
      text: capitalizeWords(text.trim()),
      note,
      priority,
      dueType,
      dueDate: finalDueDate,
      completed: editingTask?.completed || false,
      subtasks,
    });
    setShowSubtasks(subtasks.length > 0);
    onClose();
  };

  const addSubtask = () => setSubtasks([...subtasks, { id: Date.now().toString(), text: '', completed: false }]);
  const updateSubtask = (id: string, value: string) => setSubtasks(subtasks.map(st => st.id === id ? { ...st, text: value } : st));
  const toggleSubtask = (id: string) => setSubtasks(subtasks.map(st => st.id === id ? { ...st, completed: !st.completed } : st));
  const removeSubtask = (id: string) => setSubtasks(subtasks.filter(st => st.id !== id));

  const openPriorityPopover = () => {
    if (priorityBtnRef.current) {
      priorityBtnRef.current.measureInWindow((x: number, y: number, width: number, height: number) => {
        setPriorityPopoverPos({ x, y, width, height });
        setShowPriorityModal(true);
      });
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "High": return "🔴";
      case "Medium": return "🟡";
      case "Low": return "🟢";
      default: return "⚪";
    }
  };

  const getCategoryIcon = (category: string) => {
    const icons: { [key: string]: string } = {
      work: "briefcase",
      personal: "user",
      shopping: "shopping-cart",
      health: "heartbeat",
      finance: "money-bill-wave",
      social: "users",
      home: "home",
      default: "tasks"
    };
    return icons[category] || icons.default;
  };

  const capitalizeFirst = (str: string) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  // 1. Copy the renderRightActions function from TodoScreen for subtasks
  function renderSubtaskRightActions(progress: any, dragX: any, onDelete: () => void) {
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

  return (
    <Modal visible={visible} animationType="none" transparent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalMinimalist}>
        <View style={[styles.modalCard, { backgroundColor: isDark ? '#23232a' : '#fff' }]}> 
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }} />
          </View>
          <TextInput
            style={[styles.inputMinimal, { backgroundColor: isDark ? '#23232a' : '#fff', color: isDark ? '#fff' : '#1e293b', borderColor: isDark ? '#333' : '#e0e0e0' }]}
            placeholder="What needs to be done?"
            value={text}
            onChangeText={handleTextChange}
            autoFocus
            placeholderTextColor={isDark ? '#aaa' : '#64748b'}
            returnKeyType="done"
            onSubmitEditing={handleSave}
            keyboardAppearance={isDark ? 'dark' : 'light'}
          />
          
          {/* Smart Suggestions Panel */}
          {showSmartSuggestions && (
            (() => {
              const hasSuggestions =
                (taskInfo.category && taskInfo.category !== "default") ||
                taskInfo.dueDate ||
                taskInfo.timeOfDay ||
                taskInfo.recurring ||
                (taskInfo.priority && taskInfo.priority !== "None") ||
                (taskInfo.subtasks && taskInfo.subtasks.length > 0);
              if (!hasSuggestions) return null;
              // Get category pill colors
              const catColors = Object.prototype.hasOwnProperty.call(CATEGORY_COLORS, taskInfo.category)
                ? CATEGORY_COLORS[taskInfo.category as keyof typeof CATEGORY_COLORS]
                : CATEGORY_COLORS.default;
              return (
                <View style={[styles.smartSuggestions, { backgroundColor: isDark ? 'transparent' : 'transparent' }]}> 
                  <ScrollView style={{ maxHeight: 260 }} keyboardShouldPersistTaps="handled">
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                      {/* Category pill styled like priority pill */}
                      {taskInfo.category && taskInfo.category !== "default" && (
                        <View style={{ backgroundColor: catColors.bg, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1.5, borderColor: catColors.border, marginRight: 4, marginBottom: 4 }}>
                          <Text style={{ color: catColors.color, fontWeight: '600', fontSize: 13 }}>{capitalizeFirst(taskInfo.category)}</Text>
                        </View>
                      )}
                      {/* Other chips remain minimalist */}
                      {taskInfo.dueDate && (
                        <View style={{ backgroundColor: isDark ? '#374151' : '#e0e7ef', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, marginRight: 4, marginBottom: 4 }}>
                          <Text style={{ color: isDark ? '#fff' : '#374151', fontSize: 13 }}>{taskInfo.dueDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</Text>
                        </View>
                      )}
                      {taskInfo.timeOfDay && (
                        <View style={{ backgroundColor: isDark ? '#374151' : '#e0e7ef', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, marginRight: 4, marginBottom: 4 }}>
                          <Text style={{ color: isDark ? '#fff' : '#374151', fontSize: 13 }}>{capitalizeFirst(taskInfo.timeOfDay)}</Text>
                        </View>
                      )}
                      {taskInfo.recurring && (
                        <View style={{ backgroundColor: isDark ? '#374151' : '#e0e7ef', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, marginRight: 4, marginBottom: 4 }}>
                          <Text style={{ color: isDark ? '#fff' : '#374151', fontSize: 13 }}>{capitalizeFirst(taskInfo.recurring)}</Text>
                        </View>
                      )}
                      {taskInfo.priority && taskInfo.priority !== "None" && (
                        <View style={{ backgroundColor: PRIORITY_COLORS[taskInfo.priority].bg, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1.5, borderColor: PRIORITY_COLORS[taskInfo.priority].border, marginRight: 4, marginBottom: 4 }}>
                          <Text style={{ color: PRIORITY_COLORS[taskInfo.priority].color, fontWeight: '600', fontSize: 13 }}>{taskInfo.priority}</Text>
                        </View>
                      )}
                    </View>
                    {/* Minimalist subtasks list, Add All button to the right */}
                    {taskInfo.subtasks.length > 0 && (
                      <View style={[styles.subtasksSection, { backgroundColor: isDark ? '#23232a' : '#f4f6fa', borderRadius: 8, padding: 8, marginTop: 0 }]}> 
                        <View style={[styles.subtasksHeader, { marginBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}> 
                          <Text style={{ color: isDark ? '#aaa' : '#64748b', fontSize: 13, fontWeight: '500' }}>Subtask Suggestions</Text>
                          {(() => {
                            const allAdded = taskInfo.subtasks.every(subtask => subtasks.some(st => st.text === subtask));
                            return (
                              <TouchableOpacity
                                onPress={() => {
                                  if (allAdded) {
                                    setSubtasks(subtasks.filter(st => !taskInfo.subtasks.includes(st.text)));
                                  } else {
                                    addSuggestedSubtasks();
                                  }
                                }}
                                style={[styles.addAllButton, { backgroundColor: isDark ? '#ffffff' : '#e5e9f2', borderRadius: 6, paddingHorizontal: 14, paddingVertical: 6, alignSelf: 'flex-end' }]}
                                activeOpacity={0.7}
                              >
                                <Text style={[styles.addAllButtonText, { color: '#2563eb', fontWeight: '600', fontSize: 14 }]}>{allAdded ? 'Unselect All' : 'Add All'}</Text>
                              </TouchableOpacity>
                            );
                          })()}
                        </View>
                        {taskInfo.subtasks.map((subtaskText, index) => {
                          // subtaskText is a string
                          const alreadyAdded = subtasks.some(st => st.text === subtaskText);
                          const addedSubtask = subtasks.find(st => st.text === subtaskText);
                          return (
                            <Swipeable
                              key={index}
                              renderRightActions={(progress, dragX) =>
                                alreadyAdded && addedSubtask
                                  ? renderSubtaskRightActions(progress, dragX, () => removeSubtask(addedSubtask.id))
                                  : null
                              }
                              overshootRight={false}
                              friction={2}
                              rightThreshold={40}
                              enableTrackpadTwoFingerGesture={true}
                            >
                              <TouchableOpacity
                                onPress={() => {
                                  if (alreadyAdded && addedSubtask) {
                                    removeSubtask(addedSubtask.id);
                                  } else {
                                    addSingleSubtask(subtaskText);
                                  }
                                }}
                                style={[
                                styles.subtaskRow,
                                  {
                                    backgroundColor: alreadyAdded ? '#f1f5e3' : (isDark ? '#23232a' : '#fafbfc'),
                                    borderRadius: 6,
                                    marginBottom: 6,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    padding: 6,
                                    borderWidth: alreadyAdded ? 0.5 : 0,
                                    borderColor: alreadyAdded ? '#d3e6b2' : 'transparent',
                                  }
                                ]}
                              >
                                <Text style={[
                                  styles.subtaskInput,
                                  {
                                    color: alreadyAdded ? '#5c940d' : (isDark ? '#fff' : '#1e293b'),
                                    borderColor: isDark ? '#333' : '#e0e0e0',
                                    backgroundColor: 'transparent',
                                    flex: 1,
                                  },
                                ]}>{subtaskText}</Text>
                                {alreadyAdded && (
                                  <FontAwesome5
                                    name="check"
                                    size={12}
                                    color="#5c940d"
                                    style={{ marginLeft: 8 }}
                                  />
                                )}
                              </TouchableOpacity>
                            </Swipeable>
                          );
                        })}
                      </View>
                    )}
                  </ScrollView>
                </View>
              );
            })()
          )}

          <View style={styles.quickOptionsRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <TouchableOpacity
                style={[
                  styles.duePill,
                  dueType === 'today' && [styles.duePillActive, { backgroundColor: DUE_ACTIVE.bg, borderColor: DUE_ACTIVE.bg }],
                  dueType !== 'today' && (isDark ? { borderColor: '#333' } : { borderColor: '#ddd' })
                ]}
                onPress={() => setShowDueDateModal(true)}
              >
                <FontAwesome5
                  name="calendar-alt"
                  size={16}
                  color={
                    dueType === 'today'
                      ? DUE_ACTIVE.color
                      : dueType === 'none'
                        ? '#3b82f6'
                        : '#ff3037'
                  }
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={{
                    color:
                      dueType === 'today'
                        ? DUE_ACTIVE.color
                        : dueType === 'none'
                          ? '#3b82f6'
                          : '#ff3037',
                    fontWeight: '600',
                    fontSize: 15
                  }}
                >
                  {dueType === 'today' ? 'Today' : 
                   dueType === 'tomorrow' ? 'Tomorrow' :
                   dueType === 'week' ? 'This Week' :
                   dueType === 'none' ? 'No Date' :
                   dueType === 'custom' && dueDate ? 
                     formatDateForDisplay(dueDate) :
                   dueType.charAt(0).toUpperCase() + dueType.slice(1)}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                ref={priorityBtnRef}
                style={[
                  styles.priorityPill,
                  priority === 'None' && isDark
                    ? {
                        backgroundColor: '#18181c',
                        borderColor: '#333',
                      }
                    : priority === 'None'
                      ? {
                          backgroundColor: '#f4f4f4',
                          borderColor: '#e0e0e0',
                        }
                      : {
                    backgroundColor: PRIORITY_COLORS[priority].bg,
                    borderColor: PRIORITY_COLORS[priority].border,
                  }
                ]}
                onPress={openPriorityPopover}
              >
                <FontAwesome5
                  name="flag"
                  size={16}
                  color={priority !== 'None'
                    ? PRIORITY_COLORS[priority].color
                    : isDark
                      ? '#aaa'
                    : PRIORITY_COLORS.None.color}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={{
                    color: priority !== 'None'
                      ? PRIORITY_COLORS[priority].color
                      : isDark
                        ? '#aaa'
                      : PRIORITY_COLORS.None.color,
                    fontWeight: priority !== 'None' ? 'bold' : 'normal',
                    fontSize: 15
                  }}
                >
                  {priority}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickOptionBtn} onPress={() => setShowNotes(v => !v)}>
                <FontAwesome5 name="sticky-note" size={18} color={'#3b82f6'} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickOptionBtn} onPress={() => setShowSubtasks(v => !v)}>
                <FontAwesome5 name="tasks" size={18} color={'#3b82f6'} />
              </TouchableOpacity>
            </View>
          </View>
          {showNotes && (
            <View style={styles.section}><Text style={[styles.sectionLabel, { color: isDark ? '#ccc' : '#666' }]}>Notes</Text>
              <TextInput style={[styles.textarea, { backgroundColor: isDark ? '#23232a' : '#fff', color: isDark ? '#fff' : '#1e293b', borderColor: isDark ? '#333' : '#e0e0e0' }]} placeholder="Add any additional details..." value={note} onChangeText={setNote} multiline placeholderTextColor={isDark ? '#aaa' : '#64748b'} />
            </View>
          )}
          {showSubtasks && (
            <View style={styles.section}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={[styles.sectionLabel, { color: isDark ? '#ccc' : '#666' }]}>Subtasks</Text>
              </View>
              <FlatList
                data={subtasks}
                keyExtractor={item => item.id}
                renderItem={({ item }: { item: Subtask }) => (
                  <Swipeable
                    renderRightActions={(progress, dragX) => renderSubtaskRightActions(progress, dragX, () => removeSubtask(item.id))}
                    overshootRight={false}
                    friction={2}
                    rightThreshold={40}
                    enableTrackpadTwoFingerGesture={true}
                  >
                    <View style={[
                      styles.subtaskRow,
                      { backgroundColor: isDark ? '#23232a' : '#fafbfc', borderRadius: 6, marginBottom: 6, flexDirection: 'row', alignItems: 'center', padding: 6 }
                    ]}>
                      <TouchableOpacity onPress={() => toggleSubtask(item.id)} style={[
                        styles.subtaskCheck,
                        {
                          width: 16,
                          height: 16,
                          borderRadius: 8,
                          borderWidth: 1,
                          backgroundColor: isDark ? '#23232a' : '#f3f4f6',
                          borderColor: isDark ? '#444' : '#d1d5db',
                          justifyContent: 'center',
                          alignItems: 'center',
                          marginRight: 8,
                        }
                      ]}>
                        {item.completed && <Text style={{ color: isDark ? '#fff' : '#222', fontSize: 12, fontWeight: 'bold' }}>✓</Text>}
                      </TouchableOpacity>
                      <TextInput style={[
                        styles.subtaskInput,
                        {
                          color: isDark ? '#fff' : '#1e293b',
                          borderColor: isDark ? '#333' : '#e0e0e0',
                          backgroundColor: 'transparent',
                        },
                      ]} value={item.text} onChangeText={v => updateSubtask(item.id, v)} placeholder="Subtask" placeholderTextColor={isDark ? '#aaa' : '#64748b'} />
                    </View>
                  </Swipeable>
                )}
              />
              <TouchableOpacity onPress={addSubtask} style={[styles.addSubtaskBtn, { backgroundColor: isDark ? '#23232a' : '#fafbfc', borderColor: isDark ? '#333' : '#ccc', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]}>
                <FontAwesome5 name="plus" size={22} color={isDark ? '#fff' : '#3b82f6'} style={{ marginRight: 6 }} />
                <Text style={[styles.addSubtaskBtnText, { color: isDark ? '#fff' : '#3b82f6' }]}>Add subtask</Text>
              </TouchableOpacity>
            </View>
          )}
          <View style={styles.modalActionsMinimal}>
            <TouchableOpacity onPress={onClose} style={[styles.cancelBtn, { backgroundColor: isDark ? '#23232a' : '#f5f5f5', borderColor: isDark ? '#333' : '#e0e0e0' }]}><Text style={{ color: isDark ? '#fff' : '#666' }}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity onPress={handleSave} style={[styles.saveBtn, { backgroundColor: isDark ? '#fff' : '#3b82f6' }]}><Text style={[styles.saveBtnText, { color: isDark ? '#222' : '#fff' }]}>{editingTask ? 'Save' : 'Add'}</Text></TouchableOpacity>
          </View>
        </View>
        {/* Due Date Modal */}
        <Modal visible={showDueDateModal} transparent animationType="fade">
          <View style={styles.calendarOverlay}>
            <View style={styles.calendarPopover}>
              <View style={styles.calendarContainer}>
                <View style={styles.calendarHeader}>
                  <TouchableOpacity onPress={() => setCalendarMonth(m => m === 0 ? 11 : m - 1)} style={styles.calendarNavButton}>
                    <Text style={styles.calendarNavText}>{'<'}</Text>
                  </TouchableOpacity>
                  <Text style={styles.calendarMonthLabel}>
                    {new Date(calendarYear, calendarMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </Text>
                  <TouchableOpacity onPress={() => setCalendarMonth(m => m === 11 ? 0 : m + 1)} style={styles.calendarNavButton}>
                    <Text style={styles.calendarNavText}>{'>'}</Text>
                  </TouchableOpacity>
                </View>
                
                <View style={styles.calendarGrid}>
                  <View style={styles.calendarWeekRow}>
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                      <Text key={day} style={styles.calendarWeekdayHeader}>{day}</Text>
                    ))}
                  </View>
                  {Array.from({ length: Math.ceil((getFirstDayOfWeek(calendarYear, calendarMonth) + getDaysInMonth(calendarYear, calendarMonth)) / 7) }, (_, weekIndex) => (
                    <View key={weekIndex} style={styles.calendarWeekRow}>
                      {Array.from({ length: 7 }, (_, dayIndex) => {
                        const dayNumber = weekIndex * 7 + dayIndex - getFirstDayOfWeek(calendarYear, calendarMonth) + 1;
                        const day = dayNumber > 0 && dayNumber <= getDaysInMonth(calendarYear, calendarMonth) ? dayNumber : null;
                        return (
                          <View key={dayIndex} style={styles.calendarDayWrapper}>
                            {day ? (
                              <TouchableOpacity
                                style={[
                                  styles.calendarDayCell,
                                  day === today.getDate() && calendarMonth === today.getMonth() && calendarYear === today.getFullYear() && styles.calendarToday,
                                  calendarSelectedDate && new Date(calendarYear, calendarMonth, day).toDateString() === calendarSelectedDate.toDateString() && [
                                    styles.calendarSelected,
                                    isDark && { backgroundColor: '#ff3037', shadowColor: '#ff3037' }
                                  ]
                                ]}
                                onPress={() => setCalendarSelectedDate(new Date(calendarYear, calendarMonth, day))}
                              >
                                <Text style={[
                                  styles.calendarDayText,
                                  day === today.getDate() && calendarMonth === today.getMonth() && calendarYear === today.getFullYear() && styles.calendarTodayText,
                                  calendarSelectedDate && new Date(calendarYear, calendarMonth, day).toDateString() === calendarSelectedDate.toDateString() && styles.calendarSelectedText
                                ]}>{day}</Text>
                              </TouchableOpacity>
                            ) : (
                              <View style={styles.calendarDayCell} />
                            )}
                          </View>
                        );
                      })}
                    </View>
                  ))}
                </View>
              </View>
              
              {/* Calendar Action Buttons */}
              <View style={styles.calendarActions}>
                <TouchableOpacity 
                  style={styles.calendarCancelBtn} 
                  onPress={() => setShowDueDateModal(false)}
                >
                  <Text style={styles.calendarCancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.calendarSetBtn} 
                  onPress={() => {
                    // Use selected date or today's date if none selected
                    const selectedDate = calendarSelectedDate || new Date();
                    const d = new Date(selectedDate);
                    setDueType('custom');
                    setDueDate(d.toISOString());
                    setShowDueDateModal(false);
                  }}
                >
                  <Text style={styles.calendarSetBtnText}>Set</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
        {/* Priority Popover - render at root of modal for correct overlay */}
        {showPriorityModal && priorityPopoverPos && (
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowPriorityModal(false)}
          >
            <View
              style={[
                styles.priorityPopover,
                {
                  left: priorityPopoverPos.x,
                  top: priorityPopoverPos.y - 8 - (PRIORITIES.length * 44), // pop above button
                  minWidth: priorityPopoverPos.width,
                  backgroundColor: isDark ? '#23232a' : '#fff',
                },
              ]}
              pointerEvents="box-none"
            >
              <View style={[styles.popoverArrow, { top: (PRIORITIES.length * 44) - 2, borderBottomColor: isDark ? '#23232a' : '#fff' }]} />
              {PRIORITIES.map(p => (
                <TouchableOpacity
                  key={p}
                  style={[
                    styles.priorityPopoverItem,
                    priority === p && p !== 'None' && { backgroundColor: isDark ? '#333' : '#e5e7eb' },
                  ]}
                  onPress={() => { setPriority(p); setShowPriorityModal(false); }}
                >
                  <Text style={{ color: PRIORITY_COLORS[p].color, fontWeight: priority === p ? 'bold' : 'normal', fontSize: 16 }}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalMinimalist: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
  },
  modalCard: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 18,
    paddingBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    marginHorizontal: 0,
    minHeight: 120,
    backgroundColor: '#fff',
  },
  inputMinimal: {
    fontSize: 18,
    fontWeight: '500',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    marginTop: 2,
    backgroundColor: '#f8f9fa',
    color: '#495057',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro' : undefined,
  },
  quickOptionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 8,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro' : undefined,
  },
  quickOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(40,167,69,0.08)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 6,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro' : undefined,
  },
  quickOptionText: {
    marginLeft: 6,
    fontSize: 15,
    fontWeight: '500',
    color: '#28a745',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro' : undefined,
  },
  modalActionsMinimal: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    gap: 8,
  },
  priorityPopover: {
    position: 'absolute',
    zIndex: 100,
    borderRadius: 12,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 8,
    minWidth: 100,
    alignItems: 'stretch',
  },
  popoverArrow: {
    position: 'absolute',
    bottom: -8,
    left: 20,
    width: 16,
    height: 8,
    backgroundColor: 'transparent',
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#fff',
    zIndex: 101,
  },
  priorityPopoverItem: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
  },
  section: { marginBottom: 14 },
  sectionLabel: { fontSize: 14, color: '#666', marginBottom: 4, fontFamily: Platform.OS === 'ios' ? 'SF Pro' : undefined },
  textarea: { borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8, padding: 12, minHeight: 60, fontSize: 15, marginTop: 4, color: '#1e293b', backgroundColor: '#fff', fontFamily: Platform.OS === 'ios' ? 'SF Pro' : undefined },
  subtaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    backgroundColor: '#fafbfc',
    borderRadius: 6,
    padding: 6,
  },
  subtaskCheck: { 
    width: 16, 
    height: 16, 
    borderRadius: 8, 
    borderWidth: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 8, 
  },
  subtaskInput: { flex: 1, borderBottomWidth: 1, borderColor: '#e0e0e0', fontSize: 15, padding: 4, backgroundColor: 'transparent', color: '#1e293b', fontFamily: Platform.OS === 'ios' ? 'SF Pro' : undefined },
  removeSubtask: { color: '#ff453a', fontSize: 18, marginLeft: 8 },
  addSubtaskBtn: { 
    marginTop: 6, 
    padding: 8, 
    borderWidth: 1, 
    borderColor: '#e9ecef', 
    borderRadius: 8, 
    alignItems: 'center', 
    backgroundColor: '#f8f9fa' 
  },
  addSubtaskBtnText: { 
    color: '#3b82f6', 
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro' : undefined,
  },
  cancelBtn: { 
    flex: 1, 
    padding: 12, 
    backgroundColor: '#f8f9fa', 
    borderRadius: 8, 
    alignItems: 'center', 
    borderWidth: 1, 
    borderColor: '#e9ecef',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro' : undefined,
  },
  saveBtn: { 
    flex: 1, 
    padding: 12, 
    backgroundColor: '#3b82f6', 
    borderRadius: 8, 
    alignItems: 'center',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro' : undefined,
  },
  saveBtnText: { 
    color: '#fff', 
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro' : undefined,
  },
  duePill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginRight: 8,
    backgroundColor: 'transparent',
    borderColor: '#ddd',
  },
  duePillActive: {
    backgroundColor: DUE_ACTIVE.bg,
    borderColor: DUE_ACTIVE.bg,
  },
  priorityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginRight: 8,
    backgroundColor: 'transparent',
    borderColor: '#ddd',
  },
  calendarOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarPopover: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: 340,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
    maxHeight: 500,
  },
  calendarContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  calendarNavButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  calendarNavText: {
    fontSize: 18,
    color: '#6c757d',
    fontWeight: '600',
  },
  calendarMonthLabel: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    textAlign: 'center',
    flex: 1,
  },
  calendarGrid: {
    width: 280,
  },
  calendarWeekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  calendarWeekdayHeader: {
    width: 40,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 8,
  },
  calendarDayWrapper: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarDayCell: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  calendarDayText: {
    fontSize: 16,
    color: '#1e293b',
    fontWeight: '500',
  },
  calendarToday: {
    backgroundColor: 'rgba(59, 130, 246, 0.8)',
    borderRadius: 8,
    shadowColor: '#3b82f6',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  calendarTodayText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  calendarSelected: {
    // We'll override this in the component with isDark
    backgroundColor: '#ff3037',
    shadowColor: '#ff3037',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  calendarSelectedText: {
    color: '#fff',
    fontWeight: '600',
  },
  calendarActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    gap: 8,
  },
  calendarCancelBtn: { 
    flex: 1, 
    padding: 12, 
    backgroundColor: '#f8f9fa', 
    borderRadius: 8, 
    alignItems: 'center', 
    borderWidth: 1, 
    borderColor: '#e9ecef' 
  },
  calendarCancelBtnText: { 
    color: '#6c757d', 
    fontWeight: '500' 
  },
  calendarSetBtn: { 
    flex: 1, 
    padding: 12, 
    backgroundColor: '#3b82f6', 
    borderRadius: 8, 
    alignItems: 'center' 
  },
  calendarSetBtnText: { 
    color: '#fff', 
    fontWeight: '600' 
  },
  smartSuggestions: {
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 0,
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  suggestionItem: {
    marginBottom: 2,
    paddingVertical: 2,
  },
  suggestionText: {
    fontSize: 13,
    color: '#6b7280',
    marginLeft: 0,
    fontWeight: '400',
  },
  subtasksSection: {
    marginTop: 8,
    marginBottom: 24,
    padding: 0,
  },
  subtasksHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  subtasksTitle: {
    fontSize: 13,
    fontWeight: '400',
    color: '#6b7280',
  },
  addAllButton: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  addAllButtonText: {
    color: '#3b82f6',
    fontWeight: '400',
    fontSize: 13,
  },
  taskSuggestion: {
    marginBottom: 2,
  },
  taskSuggestionText: {
    fontSize: 13,
    color: '#6b7280',
    marginLeft: 0,
    fontWeight: '400',
  },
  deleteButton: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 60,
    height: '100%',
    borderRadius: 12,
    marginTop: -3,
  },
  deleteButtonTouchable: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 60,
    height: '100%',
    borderRadius: 12,
    marginTop: -3,
  },
}); 