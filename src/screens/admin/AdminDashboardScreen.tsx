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
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { useAdminData } from '../../context/AdminDataContext';
import { userService, classService } from '../../services/api';
import { supabaseApi } from '../../config/supabase';
import { User } from '../../types';

interface Props {
  navigation: any;
  route: any;
  onSignOut: () => void;
}

const AdminDashboardScreen: React.FC<Props> = ({ navigation, route, onSignOut }) => {
  const { user } = route.params;
  const { theme } = useTheme();
  const { classes, trainers, scheduledClasses, users: cachedUsers, loading, loadAllData, refreshUsers } = useAdminData();
  const [refreshing, setRefreshing] = useState(false);
  const [todayClasses, setTodayClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [classBookings, setClassBookings] = useState<any[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [classModalVisible, setClassModalVisible] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  // Update today's classes when scheduledClasses change (from cache)
  useEffect(() => {
    updateTodayClassesFromCache();
  }, [scheduledClasses]);

  const updateTodayClassesFromCache = () => {
    const today = new Date().toISOString().split('T')[0];
    const todaySchedules = scheduledClasses.filter(
      (schedule: any) => 
        schedule.scheduled_date === today && 
        (schedule.status === 'active' || schedule.status === 'ongoing')
    );
    
    const formattedClasses = todaySchedules.map((schedule: any) => ({
      id: schedule.id,
      scheduled_time: schedule.scheduled_time,
      status: schedule.status,
      current_bookings: schedule.current_bookings || 0,
      max_bookings: schedule.max_bookings,
      class_name: schedule.classes?.name || 'Unknown Class',
      duration: schedule.classes?.duration || 0,
      trainer_name: schedule.profiles 
        ? `${schedule.profiles.first_name} ${schedule.profiles.last_name}` 
        : 'Unknown Trainer',
    })).sort((a, b) => a.scheduled_time.localeCompare(b.scheduled_time));
    
    setTodayClasses(formattedClasses);
  };

  const loadData = async () => {
    try {
      // Load all admin data (users are now cached in context)
      await loadAllData();
      
      // Update today's classes from cached scheduled classes
      updateTodayClassesFromCache();
    } catch (error) {
      console.error('Error loading admin data:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    // Force refresh all data (bypass cache)
    await loadAllData(true);
    updateTodayClassesFromCache();
    setRefreshing(false);
  };

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#4CAF50';
      case 'ongoing': return '#FF9800';
      case 'completed': return '#2196F3';
      case 'cancelled': return '#F44336';
      default: return '#9E9E9E';
    }
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
    navigation.navigate('MemberManagement');
  };

  const handleManageTrainers = () => {
    navigation.navigate('TrainerManagement');
  };

  const handleManageClasses = () => {
    navigation.navigate('ClassTemplateManagement');
  };

  const handleManageSchedule = () => {
    navigation.navigate('ScheduleView');
  };

  const handleAddClassTemplate = () => {
    navigation.navigate('AddClassTemplate');
  };

  const handleClassPress = async (classSchedule: any) => {
    setSelectedClass(classSchedule);
    setClassModalVisible(true);
    await loadClassBookings(classSchedule.id);
  };

  const loadClassBookings = async (classScheduleId: string) => {
    try {
      setLoadingBookings(true);
      const response = await supabaseApi.get(
        `/class_bookings?class_schedule_id=eq.${classScheduleId}&status=in.(confirmed,waitlist)&select=id,member_id,status,booked_at,profiles!inner(first_name,last_name,email)&order=booked_at.asc`
      );
      
      setClassBookings(response.data || []);
    } catch (error) {
      console.error('Error loading class bookings:', error);
      Alert.alert('Error', 'Failed to load registered users');
    } finally {
      setLoadingBookings(false);
    }
  };

  const handleRemoveUser = (bookingId: string, memberName: string) => {
    Alert.alert(
      'Remove User',
      `Are you sure you want to remove ${memberName} from this class?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              // Cancel the booking
              await supabaseApi.patch(`/class_bookings?id=eq.${bookingId}`, {
                status: 'cancelled',
              });

              // Update current_bookings count
              if (selectedClass) {
                const scheduleResponse = await supabaseApi.get(
                  `/class_schedules?id=eq.${selectedClass.id}&select=current_bookings`
                );
                const schedule = scheduleResponse.data[0];
                if (schedule && schedule.current_bookings > 0) {
                  await supabaseApi.patch(`/class_schedules?id=eq.${selectedClass.id}`, {
                    current_bookings: schedule.current_bookings - 1,
                  });
                }
              }

              Alert.alert('Success', 'User has been removed from the class');
              await loadClassBookings(selectedClass.id);
              updateTodayClassesFromCache(); // Refresh today's classes from cache
            } catch (error) {
              console.error('Error removing user:', error);
              Alert.alert('Error', 'Failed to remove user from class');
            }
          },
        },
      ]
    );
  };

  const renderDashboardCard = (
    title: string,
    count: number | null,
    icon: string,
    onPress: () => void,
    subtitle?: string
  ) => (
    <View style={styles.dashboardCardContainer}>
      <TouchableOpacity
        style={[styles.dashboardCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
        onPress={onPress}
      >
        <View style={[styles.cardIcon, { backgroundColor: theme.colors.textSecondary }]}>
          <Ionicons name={icon as any} size={24} color={theme.colors.background} />
        </View>
        <View style={styles.cardContent}>
          {count !== null && (
            <Text style={[styles.cardCount, { color: theme.colors.text }]}>{count}</Text>
          )}
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>{title}</Text>
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



  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.text} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <View style={styles.headerLeft}>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            Admin Dashboard
          </Text>
          <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
            Welcome back, {user.first_name}
          </Text>
        </View>
        <TouchableOpacity 
          onPress={handleSignOut} 
          style={[styles.signOutButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
        >
          <Ionicons name="log-out-outline" size={20} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={theme.colors.text}
          />
        }
      >
        {/* Today's Classes Section */}
        <View style={styles.todaySection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Today's Classes
            </Text>
            <TouchableOpacity onPress={handleManageSchedule}>
              <Text style={[styles.viewAllText, { color: theme.colors.primary }]}>
                View All
              </Text>
            </TouchableOpacity>
          </View>
          
          {loading ? (
            <ActivityIndicator size="small" color={theme.colors.text} style={styles.loadingIndicator} />
          ) : todayClasses.length === 0 ? (
            <View style={[styles.emptyTodayState, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <Ionicons name="calendar-outline" size={32} color={theme.colors.textSecondary} />
              <Text style={[styles.emptyTodayText, { color: theme.colors.textSecondary }]}>
                No classes scheduled for today
              </Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.todayClassesScroll}>
              {todayClasses.map((classSchedule) => (
                <TouchableOpacity
                  key={classSchedule.id}
                  onPress={() => handleClassPress(classSchedule)}
                  style={[styles.todayClassCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                >
                  <View style={styles.todayClassHeader}>
                    <View style={[styles.statusDot, { backgroundColor: getStatusColor(classSchedule.status) }]} />
                    <Text style={[styles.todayClassTime, { color: theme.colors.text }]}>
                      {formatTime(classSchedule.scheduled_time)}
                    </Text>
                  </View>
                  <Text style={[styles.todayClassName, { color: theme.colors.text }]} numberOfLines={1}>
                    {classSchedule.class_name}
                  </Text>
                  <Text style={[styles.todayClassTrainer, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                    {classSchedule.trainer_name}
                  </Text>
                  <View style={styles.todayClassFooter}>
                    <View style={styles.bookingInfo}>
                      <Ionicons name="people-outline" size={14} color={theme.colors.textSecondary} />
                      <Text style={[styles.bookingText, { color: theme.colors.textSecondary }]}>
                        {classSchedule.current_bookings}/{classSchedule.max_bookings}
                      </Text>
                    </View>
                    {classSchedule.duration > 0 && (
                      <Text style={[styles.durationText, { color: theme.colors.textSecondary }]}>
                        {classSchedule.duration}m
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Management Section */}
        <View style={styles.managementSection}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text, marginBottom: 12 }]}>
            Management
          </Text>
          <View style={styles.managementGrid}>
            <TouchableOpacity
              style={[styles.managementCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              onPress={handleManageUsers}
            >
              <View style={styles.managementCardContent}>
                <Ionicons name="people-outline" size={24} color={theme.colors.primary} />
                <Text style={[styles.managementCardTitle, { color: theme.colors.text }]}>
                  Members
                </Text>
                <Text style={[styles.managementCardSubtitle, { color: theme.colors.textSecondary }]}>
                  {cachedUsers.filter(user => user.role === 'member').length} total
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.managementCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              onPress={handleManageTrainers}
            >
              <View style={styles.managementCardContent}>
                <Ionicons name="fitness-outline" size={24} color={theme.colors.primary} />
                <Text style={[styles.managementCardTitle, { color: theme.colors.text }]}>
                  Trainers
                </Text>
                <Text style={[styles.managementCardSubtitle, { color: theme.colors.textSecondary }]}>
                  {trainers.length} total
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.managementCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              onPress={handleManageClasses}
            >
              <View style={styles.managementCardContent}>
                <Ionicons name="library-outline" size={24} color={theme.colors.primary} />
                <Text style={[styles.managementCardTitle, { color: theme.colors.text }]}>
                  Classes
                </Text>
                <Text style={[styles.managementCardSubtitle, { color: theme.colors.textSecondary }]}>
                  {classes.length} total
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.managementCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              onPress={handleManageSchedule}
            >
              <View style={styles.managementCardContent}>
                <Ionicons name="calendar-outline" size={24} color={theme.colors.primary} />
                <Text style={[styles.managementCardTitle, { color: theme.colors.text }]}>
                  Schedule
                </Text>
                <Text style={[styles.managementCardSubtitle, { color: theme.colors.textSecondary }]}>
                  View overall schedule
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Navigation Bar */}
      <View style={[styles.bottomNav, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={handleAddUser}
        >
          <Ionicons name="person-add" size={20} color={theme.colors.text} />
          <Text style={[styles.navButtonText, { color: theme.colors.text }]}>Add User</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navButton}
          onPress={handleAddTrainer}
        >
          <Ionicons name="fitness" size={20} color={theme.colors.text} />
          <Text style={[styles.navButtonText, { color: theme.colors.text }]}>Add Trainer</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navButton}
          onPress={handleAddClassTemplate}
        >
          <Ionicons name="add-circle" size={20} color={theme.colors.text} />
          <Text style={[styles.navButtonText, { color: theme.colors.text }]}>Add Class</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navButton}
          onPress={handleScheduleClass}
        >
          <Ionicons name="calendar" size={20} color={theme.colors.text} />
          <Text style={[styles.navButtonText, { color: theme.colors.text }]}>Schedule</Text>
        </TouchableOpacity>
      </View>

      {/* Class Bookings Modal */}
      <Modal
        visible={classModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setClassModalVisible(false);
          setSelectedClass(null);
          setClassBookings([]);
        }}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
            <TouchableOpacity
              onPress={() => {
                setClassModalVisible(false);
                setSelectedClass(null);
                setClassBookings([]);
              }}
            >
              <Text style={[styles.modalButton, { color: theme.colors.primary }]}>Close</Text>
            </TouchableOpacity>
            <View style={styles.modalTitleContainer}>
              {selectedClass && (
                <>
                  <Text style={[styles.modalTitle, { color: theme.colors.text }]} numberOfLines={1}>
                    {selectedClass.class_name}
                  </Text>
                  <Text style={[styles.modalSubtitle, { color: theme.colors.textSecondary }]}>
                    {formatTime(selectedClass.scheduled_time)}
                  </Text>
                </>
              )}
            </View>
            <View style={styles.placeholder} />
          </View>

          <ScrollView style={styles.modalContent}>
            {loadingBookings ? (
              <ActivityIndicator size="large" color={theme.colors.text} style={styles.modalLoading} />
            ) : classBookings.length === 0 ? (
              <View style={styles.emptyBookingsState}>
                <Ionicons name="people-outline" size={48} color={theme.colors.textSecondary} />
                <Text style={[styles.emptyBookingsText, { color: theme.colors.textSecondary }]}>
                  No users registered for this class
                </Text>
              </View>
            ) : (
              <>
                <Text style={[styles.bookingsHeader, { color: theme.colors.text }]}>
                  Registered Users ({classBookings.length})
                </Text>
                {classBookings.map((booking) => (
                  <View
                    key={booking.id}
                    style={[styles.bookingCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                  >
                    <View style={styles.bookingInfo}>
                      <View style={[styles.bookingAvatar, { backgroundColor: theme.colors.textSecondary }]}>
                        <Text style={[styles.bookingInitials, { color: theme.colors.background }]}>
                          {booking.profiles?.first_name?.charAt(0) || ''}{booking.profiles?.last_name?.charAt(0) || ''}
                        </Text>
                      </View>
                      <View style={styles.bookingDetails}>
                        <Text style={[styles.bookingName, { color: theme.colors.text }]}>
                          {booking.profiles?.first_name} {booking.profiles?.last_name}
                        </Text>
                        <Text style={[styles.bookingEmail, { color: theme.colors.textSecondary }]}>
                          {booking.profiles?.email}
                        </Text>
                        {booking.status === 'waitlist' && (
                          <View style={[styles.waitlistBadge, { backgroundColor: '#FF9800' }]}>
                            <Text style={styles.waitlistText}>Waitlist</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <TouchableOpacity
                      style={[styles.removeButton, { backgroundColor: '#F44336' }]}
                      onPress={() => handleRemoveUser(booking.id, `${booking.profiles?.first_name} ${booking.profiles?.last_name}`)}
                    >
                      <Ionicons name="close-circle" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                ))}
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
  },
  signOutButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 80,
  },
  // Quick Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 24,
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  // Quick Actions
  quickActionsSection: {
    marginBottom: 24,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionCard: {
    width: '48%',
    marginBottom: 12,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 8,
    textAlign: 'center',
  },
  // Management Section
  managementSection: {
    marginBottom: 24,
  },
  managementGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  managementCard: {
    width: '48%',
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  managementCardContent: {
    flex: 1,
  },
  managementCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 4,
  },
  managementCardSubtitle: {
    fontSize: 12,
  },
  dashboardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  dashboardCardContainer: {
    width: '48%',
    marginBottom: 16,
  },
  dashboardCard: {
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  cardCount: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 12,
    paddingBottom: 20,
    borderTopWidth: 1,
  },
  navButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  navButtonText: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 4,
    textAlign: 'center',
  },
  todaySection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  loadingIndicator: {
    paddingVertical: 20,
  },
  emptyTodayState: {
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  emptyTodayText: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  todayClassesScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  todayClassCard: {
    width: 160,
    padding: 12,
    borderRadius: 12,
    marginRight: 12,
    borderWidth: 1,
  },
  todayClassHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  todayClassTime: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  todayClassName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  todayClassTrainer: {
    fontSize: 12,
    marginBottom: 8,
  },
  todayClassFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bookingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bookingText: {
    fontSize: 12,
  },
  durationText: {
    fontSize: 12,
  },
  membersSection: {
    marginBottom: 24,
  },
  membersList: {
    gap: 12,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  memberInitials: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  memberEmail: {
    fontSize: 12,
  },
  countCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  countCardContent: {
    flex: 1,
  },
  countNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  countLabel: {
    fontSize: 14,
  },
  viewMoreCard: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  viewMoreText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  emptyText: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  modalButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  modalLoading: {
    paddingVertical: 40,
  },
  emptyBookingsState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyBookingsText: {
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  bookingsHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  bookingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  bookingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  bookingAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  bookingInitials: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  bookingDetails: {
    flex: 1,
  },
  bookingName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  bookingEmail: {
    fontSize: 12,
  },
  waitlistBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  waitlistText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  removeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default AdminDashboardScreen;