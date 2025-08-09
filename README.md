# Loïc App - Focus Timer

A beautiful, Apple-inspired focus timer built with React Native and Expo.

## Features

### 🍅 Focus Timer
- **Clean, Futuristic Design**: Following Apple's Human Interface Guidelines
- **Smooth Animations**: Fluid progress rings and subtle pulse effects
- **Multiple Presets**: Pomodoro (25m), Short Break (5m), Long Break (15m), Deep Work (90m), Quick Focus (15m)
- **Custom Timer**: Set your own duration with intuitive controls
- **Haptic Feedback**: Tactile responses for all interactions
- **Dark/Light Mode**: Seamless theme integration
- **Session Tracking**: Callback support for session completion

### 🎯 Key Design Principles
- **No Clutter**: Clean, minimal interface with purposeful spacing
- **Intuitive UX**: Clear visual hierarchy and logical flow
- **Smooth Performance**: Optimized animations and efficient state management
- **Accessibility**: Proper contrast ratios and touch targets
- **Responsive**: Adapts to different screen sizes

### 🛠 Technical Features
- **TypeScript**: Full type safety
- **React Native Animated**: Smooth, native animations
- **Expo Haptics**: Platform-specific haptic feedback
- **Theme Integration**: Seamless dark/light mode support
- **Modular Design**: Reusable component architecture

## Usage

```tsx
import FocusTimer from './components/FocusTimer';

<FocusTimer 
  onSessionComplete={(duration, type) => {
    console.log(`Completed ${type} session: ${duration} minutes`);
  }}
/>
```

## Timer Presets

| Preset | Duration | Color | Use Case |
|--------|----------|-------|----------|
| Pomodoro | 25m | Red | Standard focus sessions |
| Short Break | 5m | Green | Quick recovery |
| Long Break | 15m | Blue | Extended rest |
| Deep Work | 90m | Purple | Intensive focus |
| Quick Focus | 15m | Orange | Short tasks |
| Custom | Variable | Gray | Personal preference |

## Design Philosophy

The FocusTimer component embodies Apple's design principles:

- **Clarity**: Clear visual hierarchy and intuitive controls
- **Deference**: Content-focused design with subtle animations
- **Depth**: Layered interface with appropriate shadows and depth

The timer features a circular progress ring that smoothly animates as time progresses, with a subtle pulse effect when active to provide gentle visual feedback without being distracting.

## Performance Optimizations

- Efficient animation drivers using `useNativeDriver` where possible
- Minimal re-renders through proper state management
- Optimized timer logic with proper cleanup
- Smooth 60fps animations

## Accessibility

- Proper contrast ratios for all text and UI elements
- Adequate touch target sizes (minimum 44pt)
- Haptic feedback for all interactions
- Support for system accessibility features 