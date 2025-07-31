import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import TodoScreen from './screens/TodoScreen';
import { Ionicons } from '@expo/vector-icons';
import CalendarScreen from './screens/CalendarScreen';
import SettingsScreen from './screens/SettingsScreen';
import InboxScreen from './screens/InboxScreen';
import { ThemeProvider, useTheme } from './ThemeContext';
import { StatusBar } from 'expo-status-bar';
import { View, Text, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';



const Tab = createBottomTabNavigator();

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
          tabBarIcon: ({ color, size }) => {
            let iconName: any = 'list-outline';
            if (route.name === 'Inbox') iconName = 'mail-outline';
            else if (route.name === 'Tasks') iconName = 'list-outline';
            else if (route.name === 'Calendar') iconName = 'calendar-outline';
            else if (route.name === 'Settings') iconName = 'settings-outline';
            return <Ionicons name={iconName} size={size + 4} color={color} />;
          },
          tabBarShowLabel: false,
          tabBarStyle: {
            height: 72,
            paddingBottom: 16,
            paddingTop: 8,
            backgroundColor: isDark ? '#000000' : '#fff',
            borderTopWidth: 1,
            borderTopColor: isDark ? '#333' : '#eee',
          },
        })}
      >
        <Tab.Screen name="Inbox" component={InboxScreen} />
        <Tab.Screen name="Tasks">
          {() => <TodoScreen smartList="all" />}
        </Tab.Screen>
        <Tab.Screen name="Calendar" component={CalendarScreen} />
        <Tab.Screen name="Settings" component={SettingsScreen} />
      </Tab.Navigator>
    </>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <NavigationContainer>
          <ThemedTabs />
        </NavigationContainer>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
