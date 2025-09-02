import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useTheme } from '../theme/ThemeContext';
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import ScheduleClassScreen from '../screens/admin/ScheduleClassScreen';
import AddUserScreen from '../screens/admin/AddUserScreen';
import { User } from '../types';

export type AdminStackParamList = {
  AdminDashboard: { user: User };
  ScheduleClass: undefined;
  AddUser: { defaultRole?: 'member' | 'trainer' };
};

const Stack = createStackNavigator<AdminStackParamList>();

interface AdminNavigatorProps {
  user: User;
  onSignOut: () => void;
}

const AdminNavigator: React.FC<AdminNavigatorProps> = ({ user, onSignOut }) => {
  const { theme } = useTheme();

  return (
    <Stack.Navigator screenOptions={{ 
      headerShown: false,
      cardStyle: { backgroundColor: theme.colors.background }
    }}>
      <Stack.Screen 
        name="AdminDashboard" 
        options={{ title: 'Admin Dashboard' }}
      >
        {(props) => (
          <AdminDashboardScreen 
            {...props} 
            route={{ ...props.route, params: { user } }} 
            onSignOut={onSignOut} 
          />
        )}
      </Stack.Screen>
      <Stack.Screen 
        name="ScheduleClass" 
        component={ScheduleClassScreen}
        options={{ title: 'Schedule Class' }}
      />
      <Stack.Screen 
        name="AddUser" 
        component={AddUserScreen}
        options={{ title: 'Add User' }}
      />
    </Stack.Navigator>
  );
};

export default AdminNavigator;
