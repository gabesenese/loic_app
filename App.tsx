import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import TodoScreen from './screens/TodoScreen';
import { Ionicons } from '@expo/vector-icons';
import CalendarScreen from './screens/CalendarScreen';
import SettingsScreen from './screens/SettingsScreen';
import FocusScreen from './screens/FocusScreen';
import { ThemeProvider, useTheme } from './ThemeContext';
import { StatusBar } from 'expo-status-bar';
import { View, Animated, StyleSheet, Image, InteractionManager } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect, useRef, useState } from 'react';
import * as SplashScreen from 'expo-splash-screen';



const Tab = createBottomTabNavigator();

// Hide the native expo splash screen immediately
SplashScreen.hideAsync();

// Animated Tab Icon Component
function AnimatedTabIcon({ iconName, color, size, focused }: { iconName: string; color: string; size: number; focused: boolean }) {
  const scale = useRef(new Animated.Value(focused ? 1 : 0.95)).current;
  
  useEffect(() => {
    Animated.spring(scale, {
      toValue: focused ? 1 : 0.95,
      useNativeDriver: true,
      tension: 100,
      friction: 7,
    }).start();
  }, [focused, scale]);
  
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Ionicons name={iconName as any} size={size + 4} color={color} style={{
        textShadowColor: 'transparent',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 0,
      }} />
    </Animated.View>
  );
}

function ThemedTabs() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Tab.Navigator
        initialRouteName="Tasks"
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarIcon: ({ color, size, focused }) => {
            let iconName = 'list-outline';
            if (route.name === 'Focus Zone') iconName = 'bulb-outline';
            else if (route.name === 'Tasks') iconName = 'list-outline';
            else if (route.name === 'Calendar') iconName = 'calendar-outline';
            else if (route.name === 'Settings') iconName = 'settings-outline';
            
            return <AnimatedTabIcon iconName={iconName} color={color} size={size} focused={focused} />;
          },
          tabBarShowLabel: false,
          tabBarStyle: {
            height: 80,
            paddingBottom: 16,
            paddingTop: 12,
            backgroundColor: isDark ? '#000000' : '#fff',
            borderTopWidth: 1,
            borderTopColor: isDark ? '#333' : '#eee',
            overflow: 'visible',
          },
          tabBarItemStyle: {
            paddingVertical: 4,
            overflow: 'visible',
          },
          lazy: false,
          animation: 'none',
          animationEnabled: false,
        })}
      >
        <Tab.Screen name="Focus Zone" component={FocusScreen} />
        <Tab.Screen
          name="Tasks"
          component={TodoScreen}
          initialParams={{ focusView: 'all' }}
        />
        <Tab.Screen name="Calendar" component={CalendarScreen} />
        <Tab.Screen name="Settings" component={SettingsScreen} />
      </Tab.Navigator>
    </>
  );
}

function AppContent() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [isAppReady, setIsAppReady] = useState(false);

  useEffect(() => {
    const prepare = async () => {
      await SplashScreen.preventAutoHideAsync();

      // Let NavigationContainer + ThemeProvider mount fully
      await new Promise(resolve => requestAnimationFrame(resolve));

      setIsAppReady(true);

      await SplashScreen.hideAsync();
    };
    prepare();
  }, []);

  if (!isAppReady) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: isDark ? '#000000' : '#ffffff' }}>
      <SafeAreaProvider>
        <NavigationContainer
          theme={{
            dark: isDark,
            colors: {
              primary: isDark ? '#0A84FF' : '#007AFF',
              background: isDark ? '#000000' : '#ffffff',
              card: isDark ? '#000000' : '#ffffff',
              text: isDark ? '#ffffff' : '#000000',
              border: isDark ? '#333' : '#eee',
              notification: isDark ? '#0A84FF' : '#007AFF',
            },
            fonts: {
              regular: { fontFamily: 'System', fontWeight: '400' },
              medium: { fontFamily: 'System', fontWeight: '500' },
              bold: { fontFamily: 'System', fontWeight: '700' },
              heavy: { fontFamily: 'System', fontWeight: '900' },
            },
          }}
        >
          <ThemedTabs />
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
});
