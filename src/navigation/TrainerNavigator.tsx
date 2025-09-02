import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useTheme } from '../theme/ThemeContext';
import TrainerDashboardScreen from '../screens/trainer/TrainerDashboardScreen';
import { User } from '../types';

export type TrainerStackParamList = {
  TrainerDashboard: { user: User };
};

const Stack = createStackNavigator<TrainerStackParamList>();

interface TrainerNavigatorProps {
  user: User;
  onSignOut: () => void;
}

const TrainerNavigator: React.FC<TrainerNavigatorProps> = ({ user, onSignOut }) => {
  const { theme } = useTheme();

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
        name="TrainerDashboard" 
        component={TrainerDashboardScreen}
        initialParams={{ user }}
        options={{ 
          title: 'Trainer Dashboard',
          headerShown: false // Hide header since TrainerDashboardScreen has its own
        }}
      />
    </Stack.Navigator>
  );
};

export default TrainerNavigator;
