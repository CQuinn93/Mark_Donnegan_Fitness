import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { useAdminData } from '../../context/AdminDataContext';
import { userService } from '../../services/api';
import { User } from '../../types';

interface Props {
  navigation: any;
  route: any;
  onSignOut: () => void;
}

const AdminDashboardScreen: React.FC<Props> = ({ navigation, route, onSignOut }) => {
  const { user } = route.params;
  const { theme } = useTheme();
  const { classes, trainers, scheduledClasses, loading, loadAllData, refreshScheduledClasses } = useAdminData();
  const [users, setUsers] = useState<User[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load users data (not cached as it changes frequently)
      const usersData = await userService.getAllUsers();
      if (usersData.users) setUsers(usersData.users);
      
      // Load all other admin data (classes, trainers, schedules) - cached
      await loadAllData();
    } catch (error) {
      console.error('Error loading admin data:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', onPress: onSignOut, style: 'destructive' }
      ]
    );
  };

  const handleScheduleClass = () => {
    navigation.navigate('SelectDate');
  };

  const handleAddUser = () => {
    navigation.navigate('AddMember');
  };

  const handleAddTrainer = () => {
    navigation.navigate('AddTrainer');
  };

  const handleManageUsers = () => {
    // TODO: Navigate to users management screen
    Alert.alert('Coming Soon', 'Users management screen will be implemented');
  };

  const handleManageTrainers = () => {
    // TODO: Navigate to trainers management screen
    Alert.alert('Coming Soon', 'Trainers management screen will be implemented');
  };

  const handleManageClasses = () => {
    // TODO: Navigate to classes management screen
    Alert.alert('Coming Soon', 'Classes management screen will be implemented');
  };

  const handleManageSchedule = () => {
    navigation.navigate('ScheduleView');
  };

  const handleAddClassTemplate = () => {
    navigation.navigate('AddClassTemplate');
  };

  const renderDashboardCard = (
    title: string,
    count: number,
    icon: string,
    onPress: () => void,
    subtitle?: string
  ) => (
    <View style={styles.dashboardCardContainer}>
      <Text style={[styles.cardHeader, { color: theme.colors.text }]}>{title}</Text>
      <TouchableOpacity
        style={[styles.dashboardCard, { backgroundColor: theme.colors.surface }]}
        onPress={onPress}
      >
        <View style={[styles.cardIcon, { backgroundColor: '#333333' }]}>
          <Ionicons name={icon as any} size={32} color="white" />
        </View>
        <View style={styles.cardContent}>
          <Text style={[styles.cardCount, { color: theme.colors.text }]}>{count}</Text>
          {subtitle && (
            <Text style={[styles.cardSubtitle, { color: theme.colors.textSecondary }]}>
              {subtitle}
            </Text>
          )}
        </View>
        <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
      </TouchableOpacity>
    </View>
  );

  const renderQuickActions = () => (
    <View style={styles.quickActionsContainer}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Quick Actions</Text>
      <View style={styles.quickActionsGrid}>
        <TouchableOpacity
          style={[styles.quickActionButton, { backgroundColor: '#000000' }]}
          onPress={handleAddUser}
        >
          <Ionicons name="person-add" size={24} color="white" />
          <Text style={styles.quickActionText}>Add User</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.quickActionButton, { backgroundColor: '#000000' }]}
          onPress={handleAddTrainer}
        >
          <Ionicons name="fitness" size={24} color="white" />
          <Text style={styles.quickActionText}>Add Trainer</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.quickActionButton, { backgroundColor: '#000000' }]}
          onPress={handleAddClassTemplate}
        >
          <Ionicons name="add-circle" size={24} color="white" />
          <Text style={styles.quickActionText}>Add Class Template</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.quickActionButton, { backgroundColor: '#000000' }]}
          onPress={handleScheduleClass}
        >
          <Ionicons name="calendar" size={24} color="white" />
          <Text style={styles.quickActionText}>Schedule Class</Text>
        </TouchableOpacity>
      </View>
    </View>
  );


  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: '#000000' }]}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#000000' }]}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      {/* Header */}
      <View style={[styles.header, { backgroundColor: '#000000' }]}>
        <View>
          <Text style={[styles.headerTitle, { color: 'white' }]}>
            Admin Dashboard
          </Text>
          <Text style={[styles.headerSubtitle, { color: '#B0B0B0' }]}>
            Welcome back, {user.first_name}
          </Text>
        </View>
        <TouchableOpacity onPress={handleSignOut} style={styles.signOutButton}>
          <Ionicons name="log-out-outline" size={24} color="#F44336" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={[styles.contentContainer, { backgroundColor: theme.colors.background }]}>
        <ScrollView
          style={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
        {/* Dashboard Cards */}
        <View style={styles.dashboardGrid}>
          {renderDashboardCard(
            'Users',
            users.length,
            'people',
            handleManageUsers,
            'Manage members'
          )}
          {renderDashboardCard(
            'Trainers',
            trainers.length,
            'fitness',
            handleManageTrainers,
            'Manage trainers'
          )}
          {renderDashboardCard(
            'Classes',
            classes.length,
            'library',
            handleManageClasses,
            'Manage class templates'
          )}
          {renderDashboardCard(
            'Schedule',
            scheduledClasses.length,
            'calendar',
            handleManageSchedule,
            'Manage class schedule'
          )}
        </View>

        {/* Quick Actions */}
        {renderQuickActions()}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  signOutButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  dashboardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  dashboardCardContainer: {
    width: '48%',
    marginBottom: 20,
  },
  cardHeader: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  dashboardCard: {
    padding: 20,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  cardCount: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 12,
  },
  quickActionsContainer: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionButton: {
    width: '48%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  quickActionText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  upcomingClassesContainer: {
    marginBottom: 30,
  },
  emptyState: {
    padding: 40,
    borderRadius: 16,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    marginTop: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  emptyStateButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  scheduleCard: {
    width: 200,
    padding: 16,
    borderRadius: 12,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scheduleTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  scheduleTime: {
    fontSize: 14,
    marginBottom: 4,
  },
  scheduleTrainer: {
    fontSize: 12,
  },
});

export default AdminDashboardScreen;