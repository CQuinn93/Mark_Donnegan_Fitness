import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useTheme } from '../theme/ThemeContext';
import { AdminDataProvider } from '../context/AdminDataContext';
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import SelectDateScreen from '../screens/admin/SelectDateScreen';
import ScheduleClassScreen from '../screens/admin/ScheduleClassScreen';
import ScheduleViewScreen from '../screens/admin/ScheduleViewScreen';
import AddUserScreen from '../screens/admin/AddUserScreen';
import AddTrainerScreen from '../screens/admin/AddTrainerScreen';
import AddMemberScreen from '../screens/admin/AddMemberScreen';
import AddClassTemplateScreen from '../screens/admin/AddClassTemplateScreen';
import MemberManagementScreen from '../screens/admin/MemberManagementScreen';
import TrainerManagementScreen from '../screens/admin/TrainerManagementScreen';
import ClassTemplateManagementScreen from '../screens/admin/ClassTemplateManagementScreen';
import { User } from '../types';

export type AdminStackParamList = {
  AdminDashboard: { user: User };
  SelectDate: undefined;
  ScheduleClass: { selectedDate?: string };
  ScheduleView: undefined;
  AddUser: { defaultRole?: 'member' | 'trainer' };
  AddTrainer: undefined;
  AddMember: undefined;
  AddClassTemplate: undefined;
  MemberManagement: undefined;
  TrainerManagement: undefined;
  ClassTemplateManagement: undefined;
};

const Stack = createStackNavigator<AdminStackParamList>();

interface AdminNavigatorProps {
  user: User;
  onSignOut: () => void;
}

const AdminNavigator: React.FC<AdminNavigatorProps> = ({ user, onSignOut }) => {
  const { theme } = useTheme();

  return (
    <AdminDataProvider>
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
          name="SelectDate" 
          component={SelectDateScreen}
          options={{ title: 'Select Date' }}
        />
        <Stack.Screen 
          name="ScheduleClass" 
          component={ScheduleClassScreen}
          options={{ title: 'Schedule Class' }}
        />
        <Stack.Screen 
          name="ScheduleView" 
          component={ScheduleViewScreen}
          options={{ title: 'View Schedule' }}
        />
        <Stack.Screen 
          name="AddUser" 
          component={AddUserScreen}
          options={{ title: 'Add User' }}
        />
        <Stack.Screen 
          name="AddTrainer" 
          component={AddTrainerScreen}
          options={{ title: 'Add Trainer' }}
        />
        <Stack.Screen 
          name="AddMember" 
          component={AddMemberScreen}
          options={{ title: 'Add Member' }}
        />
        <Stack.Screen 
          name="AddClassTemplate" 
          component={AddClassTemplateScreen}
          options={{ title: 'Add Class Template' }}
        />
        <Stack.Screen 
          name="MemberManagement" 
          component={MemberManagementScreen}
          options={{ title: 'Manage Members' }}
        />
        <Stack.Screen 
          name="TrainerManagement" 
          component={TrainerManagementScreen}
          options={{ title: 'Manage Trainers' }}
        />
        <Stack.Screen 
          name="ClassTemplateManagement" 
          component={ClassTemplateManagementScreen}
          options={{ title: 'Manage Class Templates' }}
        />
      </Stack.Navigator>
    </AdminDataProvider>
  );
};

export default AdminNavigator;
