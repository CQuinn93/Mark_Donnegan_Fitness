import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import Ionicons from '@expo/vector-icons/Ionicons';
import { View, Text, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { RootStackParamList, MainTabParamList, User } from './src/types';
import { authService } from './src/services/api';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';

// Import screens
import LoginScreen from './src/screens/auth/LoginScreen';
import PlansScreen from './src/screens/auth/PlansScreen';
import ForgotPasswordScreen from './src/screens/auth/ForgotPasswordScreen';
import FirstTimeSetupScreen from './src/screens/auth/FirstTimeSetupScreen';
import DashboardScreen from './src/screens/main/DashboardScreen';
import ClassesScreen from './src/screens/main/ClassesScreen';
import NutritionScreen from './src/screens/main/NutritionScreen';
import ProgressScreen from './src/screens/main/ProgressScreen';
import ProfileScreen from './src/screens/main/ProfileScreen';
import AddUserScreen from './src/screens/admin/AddUserScreen';

// Import role-based navigators
import AdminNavigator from './src/navigation/AdminNavigator';
import TrainerNavigator from './src/navigation/TrainerNavigator';

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// Loading screen component
const LoadingScreen = () => {
  const { theme } = useTheme();
  return (
    <LinearGradient
      colors={[theme.colors.primary, theme.colors.secondary]}
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <View style={{ alignItems: 'center' }}>
        <Text style={{ 
          fontSize: 32, 
          fontWeight: 'bold', 
          color: 'white', 
          marginBottom: 20 
        }}>
          MD Fitness
        </Text>
        <ActivityIndicator size="large" color="white" />
      </View>
    </LinearGradient>
  );
};

// Main tab navigator
const MainTabNavigator = ({ onSignOut }: { onSignOut: () => void }) => {
  const { theme } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Dashboard') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Classes') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'Nutrition') {
            iconName = focused ? 'restaurant' : 'restaurant-outline';
          } else if (route.name === 'Progress') {
            iconName = focused ? 'trending-up' : 'trending-up-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          } else {
            iconName = 'help-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        headerStyle: {
          backgroundColor: theme.colors.primary,
        },
        headerTintColor: 'white',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      })}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardScreen}
        options={{ title: 'Dashboard' }}
      />
      <Tab.Screen 
        name="Classes" 
        component={ClassesScreen}
        options={{ title: 'Classes' }}
      />
      <Tab.Screen 
        name="Nutrition" 
        component={NutritionScreen}
        options={{ title: 'Nutrition' }}
      />
      <Tab.Screen 
        name="Progress" 
        component={ProgressScreen}
        options={{ title: 'Progress' }}
      />
      <Tab.Screen 
        name="Profile" 
        component={(props: any) => (
          <ProfileScreen {...props} onSignOut={onSignOut} />
        )}
        options={{ title: 'Profile' }}
      />
    </Tab.Navigator>
  );
};

// Auth stack navigator
const AuthStackNavigator = ({ onLoginSuccess }: {
  onLoginSuccess: (user: User) => void;
}) => {
  const { theme } = useTheme();
  
  // Wrapper components to handle props
  const LoginScreenWrapper = (props: any) => (
    <LoginScreen {...props} onLoginSuccess={onLoginSuccess} />
  );
  
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.primary,
        },
        headerTintColor: 'white',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen 
        name="Login" 
        component={LoginScreenWrapper}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="Plans" 
        component={PlansScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="ForgotPassword" 
        component={ForgotPasswordScreen}
        options={{ headerShown: false }}
      />

    </Stack.Navigator>
  );
};

function AppContent() {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    console.log('=== USER STATE CHANGED ===');
    console.log('Current user state:', user);
    console.log('User email:', user?.email);
    console.log('Is user logged in:', !!user);
  }, [user]);

  const checkUser = async () => {
    try {
      console.log('Checking for existing user session...');
      const { user, error } = await authService.getCurrentUser();
      
      if (user && !error) {
        console.log('User found:', user.email);
        setUser(user);
      } else {
        console.log('No user found or error:', error);
        setUser(null);
      }
    } catch (error) {
      console.log('Error checking user:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginSuccess = (user: User) => {
    console.log('=== LOGIN SUCCESS CALLBACK ===');
    console.log('User received:', user);
    console.log('User email:', user.email);
    console.log('Setting user state...');
    setUser(user);
    console.log('User state should now be set');
  };

  const handleSignOut = async () => {
    try {
      await authService.signOut();
      console.log('Sign out successful');
      setUser(null);
    } catch (error) {
      console.log('Sign out error:', error);
      // Even if sign out fails, clear the user state
      setUser(null);
    }
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  // Determine which navigator to use based on user role
  const renderUserNavigator = () => {
    if (!user) {
      return <AuthStackNavigator onLoginSuccess={handleLoginSuccess} />;
    }

    // Check if member needs to complete profile setup
    if (user.role === 'member' && (!user.last_name || user.last_name === '')) {
      // Create a simple navigator for first-time setup
      return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen 
            name="FirstTimeSetup" 
            component={FirstTimeSetupScreen}
            initialParams={{ 
              user,
              onComplete: () => {
                // Refresh user data to check if profile is complete
                checkUser();
              }
            }}
          />
        </Stack.Navigator>
      );
    }

    // Route based on user role
    switch (user.role) {
      case 'admin':
        return <AdminNavigator user={user} onSignOut={handleSignOut} />;
      case 'trainer':
        return <TrainerNavigator user={user} onSignOut={handleSignOut} />;
      case 'member':
      default:
        return <MainTabNavigator onSignOut={handleSignOut} />;
    }
  };

  return (
    <NavigationContainer>
      <StatusBar style="light" />
      {renderUserNavigator()}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
