import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, Platform, Animated, TextInput, Keyboard, KeyboardAvoidingView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import FocusTimer from '../components/FocusTimer';

const PROBLEMS_STORAGE_KEY = 'FOCUS_ZONE_PROBLEMS';
const TASKS_STORAGE_KEY = 'TODO_TASKS';

interface Problem {
  id: string;
  title: string;
  description: string;
  framework: 'five-whys' | 'first-principles' | 'eighty-twenty' | 'constraint-theory';
  insights: string[];
  actionableTasks: string[];
  createdAt: string;
  status: 'analyzing' | 'solved' | 'in-progress';
}

interface FocusSession {
  id: string;
  type: 'pomodoro' | 'custom';
  duration: number;
  startedAt: string;
  completedAt?: string;
  notes?: string;
}

export default function FocusZoneScreen() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { top } = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);

  // Focus Zone States
  const [activeTab, setActiveTab] = useState<'problem-solver' | 'goal-solver' | 'pomodoro' | 'brain-dump'>('problem-solver');
  const [problems, setProblems] = useState<Problem[]>([]);
  const [currentProblem, setCurrentProblem] = useState<Problem | null>(null);
  const [problemStep, setProblemStep] = useState<'input' | 'framework' | 'analysis' | 'tasks'>('input');

  // Problem Solver States
  const [problemTitle, setProblemTitle] = useState('');
  const [problemDescription, setProblemDescription] = useState('');
  const [selectedFramework, setSelectedFramework] = useState<Problem['framework'] | null>(null);
  const [detailedPlan, setDetailedPlan] = useState(false);
  // Plan execution state (turn page into checklist)
  const [planExecutionActive, setPlanExecutionActive] = useState(false);
  const [planExecutionTitle, setPlanExecutionTitle] = useState<string>('');
  const [planExecutionTasks, setPlanExecutionTasks] = useState<{ id: string; text: string; completed: boolean }[]>([]);

  // Goal planner state
  const [goalTitle, setGoalTitle] = useState('');
  const [goalDescription, setGoalDescription] = useState('');
  const [goalFramework, setGoalFramework] = useState<Problem['framework'] | null>(null);
  const [goalTasks, setGoalTasks] = useState<string[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(PROBLEMS_STORAGE_KEY).then((data) => {
      if (data) setProblems(JSON.parse(data));
    });
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(PROBLEMS_STORAGE_KEY, JSON.stringify(problems));
  }, [problems]);

  // Problem Solving Frameworks
  const frameworks = {
    'five-whys': {
      name: '5 Whys',
      description: 'Dig deep to find the root cause',
      icon: 'help-circle-outline',
      color: '#3b82f6',
      questions: [
        'What is the problem?',
        'Why is this happening?',
        'Why is that the case?',
        'What\'s the deeper reason?',
        'What\'s the root cause?'
      ]
    },
    'first-principles': {
      name: 'First Principles',
      description: 'Break down to fundamental truths',
      icon: 'cube-outline',
      color: '#10b981',
      questions: [
        'What are the basic facts?',
        'What assumptions can we remove?',
        'What would this look like from scratch?',
        'What are the fundamental constraints?'
      ]
    },
    'eighty-twenty': {
      name: '80/20 Analysis',
      description: 'Find the vital few actions',
      icon: 'analytics-outline',
      color: '#f59e0b',
      questions: [
        'What 20% would solve 80% of this?',
        'What are the highest-impact actions?',
        'What would make everything else easier?',
        'Where should you focus first?'
      ]
    },
    'constraint-theory': {
      name: 'Constraint Theory',
      description: 'Identify and eliminate bottlenecks',
      icon: 'link-outline',
      color: '#ef4444',
      questions: [
        'What\'s the main bottleneck?',
        'What\'s limiting progress?',
        'If this was solved, what would be next?',
        'What resource is most scarce?'
      ]
    }
  };

  const handleStartProblemSolving = () => {
    if (!problemTitle.trim() || !problemDescription.trim()) return;
    
    setProblemStep('framework');
  };

  const handleSelectFramework = (framework: Problem['framework']) => {
    setSelectedFramework(framework);
  };

  const handleCreateProblem = () => {
    if (!selectedFramework) return;

    const newProblem: Problem = {
      id: Date.now().toString(),
      title: problemTitle,
      description: problemDescription,
      framework: selectedFramework,
      insights: [],
      actionableTasks: [],
      createdAt: new Date().toISOString(),
      status: 'analyzing'
    };

    setProblems(prev => [...prev, newProblem]);
    setCurrentProblem(newProblem);
    setProblemStep('analysis');
  };

  // Generate actionable steps (micro-steps when detailedPlan is true)
  const generateActionItems = (problem: Problem): string[] => {
    const actions: string[] = [];
    const push = (s: string) => actions.push(s);

    if (problem.framework === 'five-whys') {
      if (!detailedPlan) {
        push('Write the problem statement clearly');
        push('Ask "Why?" five times to trace the cause');
        push('Confirm the root cause with evidence');
        push('Design a fix that addresses the root cause');
        push('Schedule a follow-up to ensure the fix holds');
      } else {
        push('Write a one-line problem statement');
        push('List observable symptoms and where they appear');
        push('Run 5 Whys: capture each answer in bullets');
        push('Pick the most plausible root cause');
        push('Gather 1–2 data points/logs to validate it');
        push('Brainstorm 3 small fixes; pick the safest');
        push('Implement the fix (timebox 30–60 minutes)');
        push('Verify with the same data/symptoms');
        push('Document before/after and learning');
        push('Set a reminder to review in 7 days');
      }
    }

    if (problem.framework === 'first-principles') {
      if (!detailedPlan) {
        push('List the undeniable facts about this problem');
        push('Remove assumptions and restate constraints');
        push('Sketch a fresh solution from first principles');
        push('Define the smallest test to validate it');
        push('Execute the test and capture results');
      } else {
        push('Write 5 bullet facts (no opinions)');
        push('Underline assumptions; rewrite without them');
        push('List constraints (time, money, tools)');
        push('Draft a minimal solution ignoring legacy');
        push('Define a 30-minute test and success metric');
        push('Run the test and log the outcome');
        push('Decide: scale, tweak, or discard');
      }
    }

    if (problem.framework === 'eighty-twenty') {
      if (!detailedPlan) {
        push('List all candidate actions quickly');
        push('Pick the top 3 highest leverage actions');
        push('Discard or park low-impact items');
        push('Start with the top action today');
        push('Review impact after 48 hours');
      } else {
        push('Brain-dump 10 actions in 2 minutes');
        push('Score each by impact (1–5) and effort (1–5)');
        push('Pick 3 with highest impact / lowest effort');
        push('Break the #1 action into 3 micro-steps');
        push('Schedule step 1 for today (15–30 min)');
        push('Set a 48-hour check-in to assess results');
      }
    }

    if (problem.framework === 'constraint-theory') {
      if (!detailedPlan) {
        push('Identify the single biggest bottleneck');
        push('Map how it limits the outcome');
        push('Choose one change to elevate the constraint');
        push('Implement change and monitor');
        push('Re-evaluate if constraint moved');
      } else {
        push('Write the target outcome and current throughput');
        push('List process steps and where queues form');
        push('Select the top bottleneck (data > intuition)');
        push('Design one change (policy, resource, tool)');
        push('Apply change in a small, reversible way');
        push('Measure throughput for 1–2 days');
        push('If improved, lock in; else, try the next change');
      }
    }

    return actions;
  };

  // Create a parent task with subtasks in the main Todo list
  const addPlanToMyTasks = async (problem: Problem) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const steps = generateActionItems(problem);
      // Start in-page execution mode
      const pid = Date.now().toString();
      setPlanExecutionTitle(problem.title);
      setPlanExecutionTasks(steps.map((s, idx) => ({ id: `${pid}-${idx}`, text: s, completed: false })));
      setPlanExecutionActive(true);
      const existing = await AsyncStorage.getItem(TASKS_STORAGE_KEY);
      const tasks = existing ? JSON.parse(existing) : [];
      const parentId = pid;
      const parent = {
        id: parentId,
        text: `Plan: ${problem.title}`,
        note: `${problem.framework} plan from Problem Solver`,
        priority: 'None',
        dueType: 'none',
        completed: false,
        subtasks: steps.map((s, idx) => ({ id: `${parentId}-${idx}`, text: s, completed: false })),
        archived: false,
      };
      const updated = [parent, ...tasks];
      await AsyncStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      // noop
    }
  };

  const togglePlanTask = (id: string) => {
    setPlanExecutionTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };
  const exitPlanExecution = () => {
    setPlanExecutionActive(false);
    setPlanExecutionTitle('');
    setPlanExecutionTasks([]);
  };

  const handleCompleteProblem = () => {
    if (!currentProblem) return;

    const updatedProblem: Problem = {
      ...currentProblem,
      status: 'solved',
      actionableTasks: generateActionItems(currentProblem)
    };

    setProblems(prev => prev.map(p => p.id === currentProblem.id ? updatedProblem : p));
    setCurrentProblem(null);
    setProblemStep('input');
    setProblemTitle('');
    setProblemDescription('');
    setSelectedFramework(null);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#000000' : '#f2f2f7' }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: isDark ? '#ffffff' : '#000000' }]}>
          Focus Zone
        </Text>
        <Text style={[styles.headerSubtitle, { color: isDark ? '#8e8e93' : '#6b7280' }]}>
          Transform problems into action
        </Text>
      </View>

      {/* Tab Navigation */}
      <View style={[
        styles.tabContainer,
        {
          backgroundColor: isDark ? '#1c1c1e' : '#ffffff',
          borderColor: isDark ? '#2a2a2c' : '#e5e5ea',
          borderWidth: StyleSheet.hairlineWidth,
        }
      ]}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'problem-solver' && styles.activeTab,
            { 
              backgroundColor: activeTab === 'problem-solver' ? '#dbeafe' : (isDark ? 'rgba(255,255,255,0.04)' : '#f7f7fb'),
              borderWidth: 1,
              borderColor: activeTab === 'problem-solver' ? '#1d4ed8' : (isDark ? '#2a2a2c' : '#e5e5ea')
            }
          ]}
          onPress={() => setActiveTab('problem-solver')}
        >
          <Text style={[
            styles.tabText,
            { 
              color: activeTab === 'problem-solver' ? '#1d4ed8' : (isDark ? '#8e8e93' : '#6b7280'),

            }
          ]}>
            Problem Solver
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'goal-solver' && styles.activeTab,
            { 
              backgroundColor: activeTab === 'goal-solver' ? '#ede9fe' : (isDark ? 'rgba(255,255,255,0.04)' : '#f7f7fb'),
              borderWidth: 1,
              borderColor: activeTab === 'goal-solver' ? '#6d28d9' : (isDark ? '#2a2a2c' : '#e5e5ea')
            }
          ]}
          onPress={() => setActiveTab('goal-solver')}
        >
          <Text style={[
            styles.tabText,
            { color: activeTab === 'goal-solver' ? '#6d28d9' : (isDark ? '#8e8e93' : '#6b7280') }
          ]}>
            Goal Planner
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'pomodoro' && styles.activeTab,
            { 
              backgroundColor: activeTab === 'pomodoro' ? '#fee2e2' : (isDark ? 'rgba(255,255,255,0.04)' : '#f7f7fb'),
              borderWidth: 1,
              borderColor: activeTab === 'pomodoro' ? '#b91c1c' : (isDark ? '#2a2a2c' : '#e5e5ea')
            }
          ]}
          onPress={() => setActiveTab('pomodoro')}
        >
          <Text style={[
            styles.tabText,
            { color: activeTab === 'pomodoro' ? '#b91c1c' : (isDark ? '#8e8e93' : '#6b7280') }
          ]}>
            Focus Timer
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'brain-dump' && styles.activeTab,
            { 
              backgroundColor: activeTab === 'brain-dump' ? '#d1fae5' : (isDark ? 'rgba(255,255,255,0.04)' : '#f7f7fb'),
              borderWidth: 1,
              borderColor: activeTab === 'brain-dump' ? '#047857' : (isDark ? '#2a2a2c' : '#e5e5ea')
            }
          ]}
          onPress={() => setActiveTab('brain-dump')}
        >
          <Text style={[
            styles.tabText,
            { color: activeTab === 'brain-dump' ? '#047857' : (isDark ? '#8e8e93' : '#6b7280') }
          ]}>
            Brain Dump
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView 
        ref={scrollViewRef}
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Plan Execution Mode (inline todo view) */}
        {planExecutionActive && (
          <View style={styles.planContainer}>
            <View style={styles.stepHeader}>
              <View style={[styles.stepIcon, { backgroundColor: '#10b981' + '20' }]}> 
                <Ionicons name="checkmark-done-outline" size={24} color="#10b981" />
              </View>
              <Text style={[styles.stepTitle, { color: isDark ? '#ffffff' : '#000000' }]}>{planExecutionTitle}</Text>
              <Text style={[styles.stepDescription, { color: isDark ? '#8e8e93' : '#6b7280' }]}>Your step-by-step plan</Text>
            </View>
            <View style={[styles.tasksCard, { backgroundColor: isDark ? '#1c1c1e' : '#ffffff' }]}> 
              {planExecutionTasks.map(t => (
                <TouchableOpacity key={t.id} style={styles.actionItem} onPress={() => togglePlanTask(t.id)} activeOpacity={0.8}>
                  <View style={[styles.actionIcon, { backgroundColor: t.completed ? '#10b98133' : '#10b98122' }]}> 
                    <Ionicons name={t.completed ? 'checkmark-circle' : 'ellipse-outline'} size={16} color="#10b981" />
                  </View>
                  <Text style={[styles.actionText, { color: isDark ? '#ffffff' : '#000000', textDecorationLine: t.completed ? 'line-through' : 'none', opacity: t.completed ? 0.6 : 1 }]}>
                    {t.text}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={[styles.nextButton, { backgroundColor: '#3b82f6', marginTop: 8 }]} onPress={exitPlanExecution}>
                <Text style={[styles.nextButtonText, { color: '#ffffff' }]}>Back to Problem Solver</Text>
                <Ionicons name="arrow-undo" size={20} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {!planExecutionActive && activeTab === 'problem-solver' && (
          <View style={styles.problemSolverContainer}>
            {problemStep === 'input' && (
              <View style={styles.inputStep}>
                <View style={styles.stepHeader}>
                  <View style={[styles.stepIcon, { backgroundColor: '#3b82f6' + '20' }]}>
                    <Ionicons name="create-outline" size={24} color="#3b82f6" />
                  </View>
                  <Text style={[styles.stepTitle, { color: isDark ? '#ffffff' : '#000000' }]}>
                    What's the problem?
                  </Text>
                  <Text style={[styles.stepDescription, { color: isDark ? '#8e8e93' : '#6b7280' }]}>
                    Describe the challenge you're facing. Be as specific as possible.
                  </Text>
                </View>

                <View style={[styles.inputCard, { backgroundColor: isDark ? '#1c1c1e' : '#ffffff' }]}>
                  <Text style={[styles.inputLabel, { color: isDark ? '#8e8e93' : '#6b7280' }]}>
                    Problem Title
                  </Text>
                  <TextInput
                    style={[styles.titleInput, { 
                      color: isDark ? '#ffffff' : '#000000',
                      borderColor: isDark ? '#38383a' : '#e5e5ea'
                    }]}
                    placeholder="Give your problem a clear title..."
                    placeholderTextColor={isDark ? '#8e8e93' : '#6b7280'}
                    value={problemTitle}
                    onChangeText={setProblemTitle}
                  />

                  <Text style={[styles.inputLabel, { color: isDark ? '#8e8e93' : '#6b7280' }]}>
                    Detailed Description
                  </Text>
                  <TextInput
                    style={[styles.descriptionInput, { 
                      color: isDark ? '#ffffff' : '#000000',
                      borderColor: isDark ? '#38383a' : '#e5e5ea'
                    }]}
                    placeholder="Explain the problem in detail. What's happening? What have you tried? What's the impact?"
                    placeholderTextColor={isDark ? '#8e8e93' : '#6b7280'}
                    value={problemDescription}
                    onChangeText={setProblemDescription}
                    multiline
                    numberOfLines={6}
                    textAlignVertical="top"
                    onFocus={() => {
                      // Scroll to the description input when it's focused
                      setTimeout(() => {
                        scrollViewRef.current?.scrollToEnd({ animated: true });
                      }, 100);
                    }}
                  />

                  <TouchableOpacity
                    style={[
                      styles.nextButton,
                      { 
                        backgroundColor: (problemTitle.trim() && problemDescription.trim()) ? '#3b82f6' : (isDark ? '#38383a' : '#e5e5ea'),
                        opacity: (problemTitle.trim() && problemDescription.trim()) ? 1 : 0.5
                      }
                    ]}
                    onPress={handleStartProblemSolving}
                    disabled={!problemTitle.trim() || !problemDescription.trim()}
                  >
                    <Text style={[styles.nextButtonText, { 
                      color: (problemTitle.trim() && problemDescription.trim()) ? '#ffffff' : (isDark ? '#8e8e93' : '#6b7280')
                    }]}>
                      Choose Framework
                    </Text>
                    <Ionicons name="arrow-forward" size={20} color={(problemTitle.trim() && problemDescription.trim()) ? '#ffffff' : (isDark ? '#8e8e93' : '#6b7280')} />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {problemStep === 'framework' && (
              <View style={styles.frameworkStep}>
                <View style={styles.stepHeader}>
                  <View style={[styles.stepIcon, { backgroundColor: '#10b981' + '20' }]}>
                    <Ionicons name="library-outline" size={24} color="#10b981" />
                  </View>
                  <Text style={[styles.stepTitle, { color: isDark ? '#ffffff' : '#000000' }]}>
                    Choose Your Framework
                  </Text>
                  <Text style={[styles.stepDescription, { color: isDark ? '#8e8e93' : '#6b7280' }]}>
                    Select the thinking framework that best fits your problem type.
                  </Text>
                </View>

                <View style={styles.frameworkGrid}>
                  {Object.entries(frameworks).map(([key, framework]) => (
                    <TouchableOpacity
                      key={key}
                      style={[
                        styles.frameworkCard,
                        { 
                          backgroundColor: isDark ? '#1c1c1e' : '#ffffff',
                          borderColor: selectedFramework === key ? framework.color : (isDark ? '#38383a' : '#e5e5ea'),
                          borderWidth: selectedFramework === key ? 2 : 1
                        }
                      ]}
                      onPress={() => handleSelectFramework(key as Problem['framework'])}
                    >
                      <View style={[styles.frameworkIcon, { backgroundColor: framework.color + '20' }]}>
                        <Ionicons name={framework.icon as any} size={24} color={framework.color} />
                      </View>
                      <Text style={[styles.frameworkName, { color: isDark ? '#ffffff' : '#000000' }]}>
                        {framework.name}
                      </Text>
                      <Text style={[styles.frameworkDescription, { color: isDark ? '#8e8e93' : '#6b7280' }]}>
                        {framework.description}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity
                  style={[
                    styles.nextButton,
                    { 
                      backgroundColor: selectedFramework ? '#10b981' : (isDark ? '#38383a' : '#e5e5ea'),
                      opacity: selectedFramework ? 1 : 0.5
                    }
                  ]}
                  onPress={handleCreateProblem}
                  disabled={!selectedFramework}
                >
                  <Text style={[styles.nextButtonText, { color: '#ffffff' }]}>
                    Start Analysis
                  </Text>
                  <Ionicons name="arrow-forward" size={20} color="#ffffff" />
                </TouchableOpacity>
              </View>
            )}

            {problemStep === 'analysis' && currentProblem && (
              <View style={styles.analysisStep}>
                <View style={styles.stepHeader}>
                  <View style={[styles.stepIcon, { backgroundColor: '#f59e0b' + '20' }]}>
                    <Ionicons name="analytics-outline" size={24} color="#f59e0b" />
                  </View>
                  <Text style={[styles.stepTitle, { color: isDark ? '#ffffff' : '#000000' }]}>
                    Analyzing Your Problem
                  </Text>
                  <Text style={[styles.stepDescription, { color: isDark ? '#8e8e93' : '#6b7280' }]}>
                    Using {frameworks[currentProblem.framework].name} to break down your challenge.
                  </Text>
                </View>

                <View style={[styles.analysisCard, { backgroundColor: isDark ? '#1c1c1e' : '#ffffff' }]}>
                  <Text style={[styles.analysisTitle, { color: isDark ? '#ffffff' : '#000000' }]}>
                    {currentProblem.title}
                  </Text>
                  <Text style={[styles.analysisDescription, { color: isDark ? '#8e8e93' : '#6b7280' }]}>
                    {currentProblem.description}
                  </Text>
                  
                  <View style={styles.frameworkQuestions}>
                    <Text style={[styles.questionsTitle, { color: isDark ? '#ffffff' : '#000000' }]}>
                      Key Questions to Consider:
                    </Text>
                    {frameworks[currentProblem.framework].questions.map((question, index) => (
                      <View key={index} style={styles.questionItem}>
                        <Text style={[styles.questionNumber, { color: frameworks[currentProblem.framework].color }]}>
                          {index + 1}.
                        </Text>
                        <Text style={[styles.questionText, { color: isDark ? '#ffffff' : '#000000' }]}>
                          {question}
                        </Text>
                      </View>
                    ))}
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.nextButton,
                      { backgroundColor: '#f59e0b' }
                    ]}
                    onPress={() => setProblemStep('tasks')}
                  >
                    <Text style={[styles.nextButtonText, { color: '#ffffff' }]}>
                      Generate Action Items
                    </Text>
                    <Ionicons name="arrow-forward" size={20} color="#ffffff" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.secondaryButton, { borderColor: isDark ? '#38383a' : '#e5e5ea' }]}
                    onPress={() => setDetailedPlan(prev => !prev)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name={detailedPlan ? 'list-circle' : 'list-circle-outline'} size={20} color={isDark ? '#8e8e93' : '#6b7280'} />
                    <Text style={[styles.secondaryButtonText, { color: isDark ? '#8e8e93' : '#6b7280' }]}>
                      {detailedPlan ? 'Detailed Plan On' : 'Detailed Plan Off'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {problemStep === 'tasks' && currentProblem && (
              <View style={styles.tasksStep}>
                <View style={styles.stepHeader}>
                  <View style={[styles.stepIcon, { backgroundColor: '#10b981' + '20' }]}>
                    <Ionicons name="checkmark-circle-outline" size={24} color="#10b981" />
                  </View>
                  <Text style={[styles.stepTitle, { color: isDark ? '#ffffff' : '#000000' }]}>
                    Action Items
                  </Text>
                  <Text style={[styles.stepDescription, { color: isDark ? '#8e8e93' : '#6b7280' }]}>
                    Based on your {frameworks[currentProblem.framework].name} analysis.
                  </Text>
                </View>

                <View style={[styles.tasksCard, { backgroundColor: isDark ? '#1c1c1e' : '#ffffff' }]}>
                  <Text style={[styles.tasksTitle, { color: isDark ? '#ffffff' : '#000000' }]}>
                    Recommended Actions:
                  </Text>
                  
                  <View style={styles.actionItems}>
                    {generateActionItems(currentProblem).map((task, index) => (
                      <View key={index} style={styles.actionItem}>
                        <View style={[styles.actionIcon, { backgroundColor: '#10b981' + '20' }]}>
                          <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                        </View>
                        <Text style={[styles.actionText, { color: isDark ? '#ffffff' : '#000000' }]}>
                          {task}
                        </Text>
                      </View>
                    ))}
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.nextButton,
                      { backgroundColor: '#10b981' }
                    ]}
                    onPress={handleCompleteProblem}
                  >
                    <Text style={[styles.nextButtonText, { color: '#ffffff' }]}>
                      Complete Analysis
                    </Text>
                    <Ionicons name="checkmark" size={20} color="#ffffff" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.secondaryButton, { borderColor: isDark ? '#38383a' : '#e5e5ea' }]}
                    onPress={() => currentProblem && addPlanToMyTasks(currentProblem)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="add-circle-outline" size={20} color={isDark ? '#8e8e93' : '#6b7280'} />
                    <Text style={[styles.secondaryButtonText, { color: isDark ? '#8e8e93' : '#6b7280' }]}>
                      Add Plan to My Tasks
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}

        {!planExecutionActive && activeTab === 'goal-solver' && (
          <View style={styles.problemSolverContainer}>
            {/* Simple goal input reusing the same framework logic */}
            <View style={styles.inputStep}>
              <View style={styles.stepHeader}>
                <View style={[styles.stepIcon, { backgroundColor: '#8b5cf6' + '20' }]}>
                  <Ionicons name="trophy-outline" size={24} color="#8b5cf6" />
                </View>
                <Text style={[styles.stepTitle, { color: isDark ? '#ffffff' : '#000000' }]}>What’s your goal?</Text>
                <Text style={[styles.stepDescription, { color: isDark ? '#8e8e93' : '#6b7280' }]}>We’ll break it into actionable steps.</Text>
              </View>
              <View style={[styles.inputCard, { backgroundColor: isDark ? '#1c1c1e' : '#ffffff' }]}> 
                <Text style={[styles.inputLabel, { color: isDark ? '#8e8e93' : '#6b7280' }]}>Goal Title</Text>
                <TextInput
                  style={[styles.titleInput, { color: isDark ? '#ffffff' : '#000000', borderColor: isDark ? '#38383a' : '#e5e5ea' }]}
                  placeholder="Describe your goal..."
                  placeholderTextColor={isDark ? '#8e8e93' : '#6b7280'}
                  value={goalTitle}
                  onChangeText={setGoalTitle}
                />
                <Text style={[styles.inputLabel, { color: isDark ? '#8e8e93' : '#6b7280' }]}>Why it matters</Text>
                <TextInput
                  style={[styles.descriptionInput, { color: isDark ? '#ffffff' : '#000000', borderColor: isDark ? '#38383a' : '#e5e5ea' }]}
                  placeholder="Add a short description for motivation or context"
                  placeholderTextColor={isDark ? '#8e8e93' : '#6b7280'}
                  value={goalDescription}
                  onChangeText={setGoalDescription}
                  multiline
                />
                <View style={styles.frameworkGrid}>
                  {Object.entries(frameworks).map(([key, framework]) => (
                    <TouchableOpacity
                      key={`goal-${key}`}
                      style={[styles.frameworkCard, { backgroundColor: isDark ? '#1c1c1e' : '#ffffff', borderColor: goalFramework === key ? framework.color : (isDark ? '#38383a' : '#e5e5ea'), borderWidth: goalFramework === key ? 2 : 1 }]}
                      onPress={() => setGoalFramework(key as Problem['framework'])}
                    >
                      <View style={[styles.frameworkIcon, { backgroundColor: framework.color + '20' }]}> 
                        <Ionicons name={framework.icon as any} size={24} color={framework.color} />
                      </View>
                      <Text style={[styles.frameworkName, { color: isDark ? '#ffffff' : '#000000' }]}>{framework.name}</Text>
                      <Text style={[styles.frameworkDescription, { color: isDark ? '#8e8e93' : '#6b7280' }]}>{framework.description}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity
                  style={[styles.nextButton, { backgroundColor: goalTitle.trim() && goalFramework ? '#8b5cf6' : (isDark ? '#38383a' : '#e5e5ea') }]}
                  disabled={!goalTitle.trim() || !goalFramework}
                  onPress={() => {
                    const pseudoProblem: Problem = {
                      id: Date.now().toString(),
                      title: goalTitle,
                      description: goalDescription,
                      framework: goalFramework!,
                      insights: [],
                      actionableTasks: [],
                      createdAt: new Date().toISOString(),
                      status: 'in-progress',
                    };
                    setPlanExecutionTitle(goalTitle);
                    setPlanExecutionTasks(generateActionItems(pseudoProblem).map((s, idx) => ({ id: `${Date.now()}-${idx}`, text: s, completed: false })));
                    setPlanExecutionActive(true);
                  }}
                >
                  <Text style={[styles.nextButtonText, { color: goalTitle.trim() && goalFramework ? '#ffffff' : (isDark ? '#8e8e93' : '#6b7280') }]}>Create Plan</Text>
                  <Ionicons name="arrow-forward" size={20} color={goalTitle.trim() && goalFramework ? '#ffffff' : (isDark ? '#8e8e93' : '#6b7280')} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {!planExecutionActive && activeTab === 'pomodoro' && (
          <View style={styles.pomodoroContainer}>
            <FocusTimer 
              onSessionComplete={(duration: number, type: 'focus' | 'break') => {
                // Handle session completion
                console.log(`Completed ${type} session: ${duration} minutes`);
              }}
            />
          </View>
        )}

        {!planExecutionActive && activeTab === 'brain-dump' && (
          <View style={styles.brainDumpContainer}>
            <Text style={[styles.comingSoon, { color: isDark ? '#8e8e93' : '#6b7280' }]}>
              🧠 Brain Dump Coming Soon
            </Text>
          </View>
        )}
              </ScrollView>
      </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  
  // Header Styles
  header: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    paddingTop: 8,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 17,
    fontWeight: '400',
    letterSpacing: -0.24,
    opacity: 0.8,
  },

  // Tab Navigation Styles
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 8,
    borderRadius: 999,
    padding: 6,
    marginBottom: 20,
    gap: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 999,
    gap: 0,
    minHeight: 40,
  },
  activeTab: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.1,
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
    lineHeight: 16,
    width: '100%',
  },
  tabIconWrap: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconPill: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },

  // Content Styles
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
  },

  // Problem Solver Styles
  problemSolverContainer: {
    paddingBottom: 28,
    rowGap: 16,
  },
  inputStep: {
    gap: 20,
  },
  frameworkStep: {
    gap: 20,
  },
  stepHeader: {
    alignItems: 'center',
    marginBottom: 12,
    paddingTop: 12,
  },
  stepIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.24,
    textAlign: 'center',
    marginBottom: 6,
  },
  stepDescription: {
    fontSize: 15,
    fontWeight: '400',
    letterSpacing: -0.08,
    textAlign: 'center',
    lineHeight: 20,
    opacity: 0.8,
  },

  // Input Card Styles
  inputCard: {
    borderRadius: 18,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    marginBottom: 6,
    marginTop: 12,
  },
  titleInput: {
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: -0.24,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  descriptionInput: {
    fontSize: 16,
    fontWeight: '400',
    letterSpacing: -0.08,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 112,
    marginBottom: 20,
  },

  // Framework Grid Styles
  frameworkGrid: {
    gap: 12,
  },
  frameworkCard: {
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  frameworkIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  frameworkName: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
    marginBottom: 6,
    textAlign: 'center',
  },
  frameworkDescription: {
    fontSize: 13,
    fontWeight: '400',
    letterSpacing: -0.05,
    textAlign: 'center',
    lineHeight: 18,
    opacity: 0.8,
  },

  // Analysis Step Styles
  analysisStep: {
    gap: 20,
  },
  analysisCard: {
    borderRadius: 18,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  analysisTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.24,
    marginBottom: 10,
  },
  analysisDescription: {
    fontSize: 15,
    fontWeight: '400',
    letterSpacing: -0.08,
    lineHeight: 20,
    marginBottom: 18,
    opacity: 0.8,
  },
  frameworkQuestions: {
    marginBottom: 16,
  },
  questionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.08,
    marginBottom: 12,
  },
  questionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  questionNumber: {
    fontSize: 16,
    fontWeight: '700',
    marginRight: 8,
    minWidth: 20,
  },
  questionText: {
    fontSize: 16,
    fontWeight: '400',
    letterSpacing: -0.08,
    lineHeight: 22,
    flex: 1,
  },

  // Tasks Step Styles
  tasksStep: {
    gap: 20,
  },
  tasksCard: {
    borderRadius: 18,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  tasksTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.24,
    marginBottom: 14,
  },
  planContainer: {
    paddingBottom: 28,
  },
  actionItems: {
    marginBottom: 16,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  actionIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  actionText: {
    fontSize: 15,
    fontWeight: '400',
    letterSpacing: -0.08,
    lineHeight: 20,
    flex: 1,
  },

  // Button Styles
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 14,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
  },

  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    marginTop: 10,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.2,
  },

  // Coming Soon Styles
  pomodoroContainer: {
    flex: 1,
    paddingTop: 8,
  },
  brainDumpContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  comingSoon: {
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: -0.2,
    textAlign: 'center',
  },
}); 