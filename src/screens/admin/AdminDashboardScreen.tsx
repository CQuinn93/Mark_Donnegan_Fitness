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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { userService, classService, trainerService } from '../../services/api';
import { User, Class } from '../../types';

interface Props {
  navigation: any;
  route: any;
  onSignOut: () => void;
}

const AdminDashboardScreen: React.FC<Props> = ({ navigation, route, onSignOut }) => {
  const { user } = route.params;
  const { theme } = useTheme();
  const [users, setUsers] = useState<User[]>([]);
  const [trainers, setTrainers] = useState<any[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'users' | 'trainers' | 'classes'>('users');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load users, trainers, and classes data
      // Note: You'll need to implement these methods in the API service
      const usersData = await userService.getAllUsers();
      const trainersData = await trainerService.getAllTrainers();
      const classesData = await classService.getClasses();
      
      if (usersData.users) setUsers(usersData.users);
      if (trainersData.trainers) setTrainers(trainersData.trainers);
      if (classesData.classes) setClasses(classesData.classes);
    } catch (error) {
      console.error('Error loading admin data:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
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
    navigation.navigate('ScheduleClass');
  };

  const handleAddUser = () => {
    navigation.navigate('AddUser');
  };

  const handleAddTrainer = () => {
    navigation.navigate('AddUser', { defaultRole: 'trainer' });
  };

  const renderUserCard = (user: User) => (
    <View key={user.id} style={[styles.card, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.cardHeader}>
        <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
          {user.first_name} {user.last_name}
        </Text>
        <View style={[styles.roleBadge, { backgroundColor: theme.colors.primary }]}>
          <Text style={styles.roleText}>{user.role}</Text>
        </View>
      </View>
      <Text style={[styles.cardSubtitle, { color: theme.colors.textSecondary }]}>
        {user.email}
      </Text>
      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="eye" size={16} color={theme.colors.primary} />
          <Text style={[styles.actionText, { color: theme.colors.primary }]}>View</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="create" size={16} color={theme.colors.primary} />
          <Text style={[styles.actionText, { color: theme.colors.primary }]}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="trash" size={16} color={theme.colors.error} />
          <Text style={[styles.actionText, { color: theme.colors.error }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderTrainerCard = (trainer: any) => (
    <View key={trainer.id} style={[styles.card, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.cardHeader}>
        <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
          {trainer.name}
        </Text>
        <View style={[styles.roleBadge, { backgroundColor: theme.colors.info }]}>
          <Text style={styles.roleText}>Trainer</Text>
        </View>
      </View>
      <Text style={[styles.cardSubtitle, { color: theme.colors.textSecondary }]}>
        {trainer.email}
      </Text>
      <Text style={[styles.cardSubtitle, { color: theme.colors.textSecondary }]}>
        Code: {trainer.code}
      </Text>
      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="eye" size={16} color={theme.colors.primary} />
          <Text style={[styles.actionText, { color: theme.colors.primary }]}>View</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="create" size={16} color={theme.colors.primary} />
          <Text style={[styles.actionText, { color: theme.colors.primary }]}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="trash" size={16} color={theme.colors.error} />
          <Text style={[styles.actionText, { color: theme.colors.error }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderClassCard = (classItem: Class) => (
    <View key={classItem.id} style={[styles.card, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.cardHeader}>
        <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
          {classItem.name}
        </Text>
        <View style={[styles.difficultyBadge, { backgroundColor: theme.colors.info }]}>
          <Text style={styles.roleText}>{classItem.difficulty_level}</Text>
        </View>
      </View>
      <Text style={[styles.cardSubtitle, { color: theme.colors.textSecondary }]}>
        {classItem.description}
      </Text>
      <Text style={[styles.cardSubtitle, { color: theme.colors.textSecondary }]}>
        Duration: {classItem.duration_minutes} min | Max: {classItem.max_capacity}
      </Text>
      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="eye" size={16} color={theme.colors.primary} />
          <Text style={[styles.actionText, { color: theme.colors.primary }]}>View</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="create" size={16} color={theme.colors.primary} />
          <Text style={[styles.actionText, { color: theme.colors.primary }]}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="trash" size={16} color={theme.colors.error} />
          <Text style={[styles.actionText, { color: theme.colors.error }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Admin Dashboard
        </Text>
        <TouchableOpacity onPress={handleSignOut} style={styles.signOutButton}>
          <Ionicons name="log-out-outline" size={24} color={theme.colors.error} />
        </TouchableOpacity>
      </View>

      {/* Tab Navigation */}
      <View style={[styles.tabContainer, { backgroundColor: theme.colors.surface }]}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'users' && { borderBottomColor: theme.colors.primary, borderBottomWidth: 2 }
          ]}
          onPress={() => setActiveTab('users')}
        >
          <Text style={[
            styles.tabText,
            { color: activeTab === 'users' ? theme.colors.primary : theme.colors.textSecondary }
          ]}>
            Users ({users.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'trainers' && { borderBottomColor: theme.colors.primary, borderBottomWidth: 2 }
          ]}
          onPress={() => setActiveTab('trainers')}
        >
          <Text style={[
            styles.tabText,
            { color: activeTab === 'trainers' ? theme.colors.primary : theme.colors.textSecondary }
          ]}>
            Trainers ({trainers.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'classes' && { borderBottomColor: theme.colors.primary, borderBottomWidth: 2 }
          ]}
          onPress={() => setActiveTab('classes')}
        >
          <Text style={[
            styles.tabText,
            { color: activeTab === 'classes' ? theme.colors.primary : theme.colors.textSecondary }
          ]}>
            Classes ({classes.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {activeTab === 'users' ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Manage Users
              </Text>
              <TouchableOpacity 
                style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
                onPress={handleAddUser}
              >
                <Ionicons name="add" size={20} color="white" />
                <Text style={styles.addButtonText}>Add User</Text>
              </TouchableOpacity>
            </View>
            {users.map(renderUserCard)}
          </View>
        ) : activeTab === 'trainers' ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Manage Trainers
              </Text>
              <TouchableOpacity 
                style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
                onPress={handleAddTrainer}
              >
                <Ionicons name="add" size={20} color="white" />
                <Text style={styles.addButtonText}>Add Trainer</Text>
              </TouchableOpacity>
            </View>
            {trainers.map(renderTrainerCard)}
          </View>
        ) : (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Manage Classes
              </Text>
              <View style={styles.buttonGroup}>
                <TouchableOpacity 
                  style={[styles.addButton, { backgroundColor: theme.colors.secondary, marginRight: 8 }]}
                  onPress={handleScheduleClass}
                >
                  <Ionicons name="calendar" size={20} color="white" />
                  <Text style={styles.addButtonText}>Schedule</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.addButton, { backgroundColor: theme.colors.primary }]}>
                  <Ionicons name="add" size={20} color="white" />
                  <Text style={styles.addButtonText}>Add Class</Text>
                </TouchableOpacity>
              </View>
            </View>
            {classes.map(renderClassCard)}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  signOutButton: {
    padding: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 4,
  },
  card: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  cardSubtitle: {
    fontSize: 14,
    marginBottom: 4,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 16,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  buttonGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default AdminDashboardScreen;
