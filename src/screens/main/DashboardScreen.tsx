import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { classService, authService } from '../../services/api';
import MacroScreen from './MacroScreen';
import ProfileScreen from './ProfileScreen';

interface Props {
  navigation?: any;
  onSignOut?: () => void;
  user?: any;
}

const DashboardScreen: React.FC<Props> = ({ onSignOut, user: propUser }) => {
  const { theme } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [upcomingClasses, setUpcomingClasses] = useState<any[]>([]);
  const [myBookings, setMyBookings] = useState<any[]>([]);
  const [myWaitlist, setMyWaitlist] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'myClasses' | 'upcoming'>('upcoming');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [checkedInClasses, setCheckedInClasses] = useState<Set<string>>(new Set());
  const [currentView, setCurrentView] = useState<'macros' | 'classes' | 'profile'>('macros');

  useEffect(() => {
    loadUserAndData();
  }, []);

  const loadUserAndData = async () => {
    try {
      console.log('Dashboard: Starting loadUserAndData');
      console.log('Dashboard: propUser:', propUser ? 'Present' : 'Not provided');
      
      // Use propUser if provided, otherwise try to get from authService
      let user = propUser;
      
      if (!user) {
        console.log('Dashboard: No propUser, fetching from authService...');
        const userResult = await authService.getCurrentUser();
        console.log('Dashboard: getCurrentUser result:', { hasUser: !!userResult.user, error: userResult.error });
        user = userResult.user;
      }
      
      if (user) {
        setUserId(user.id);
        // Set user name for welcome message
        const firstName = user.first_name || '';
        setUserName(firstName);
        console.log('Dashboard: Loading data for user:', user.id);
        await loadData(user.id);
      } else {
        console.error('Dashboard: No user found, cannot load data');
        // Still try to load classes even without user (they might be public)
        await loadData('');
      }
    } catch (error) {
      console.error('Dashboard: Error loading user:', error);
      // Try to load classes anyway
      try {
        await loadData('');
      } catch (loadError) {
        console.error('Dashboard: Error loading data without user:', loadError);
      }
    } finally {
      setLoading(false);
      console.log('Dashboard: Finished loadUserAndData, loading set to false');
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await authService.signOut();
              // Call the onSignOut callback from App.tsx to update user state
              // This will trigger navigation back to login screen
              if (onSignOut) {
                onSignOut();
              }
            } catch (error) {
              console.error('Sign out error:', error);
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          },
        },
      ]
    );
  };

  const loadData = async (memberId: string) => {
    try {
      console.log('Dashboard: loadData called for memberId:', memberId);
      
      // Load upcoming classes
      console.log('Dashboard: Fetching upcoming class schedules...');
      const classesResult = await classService.getUpcomingClassSchedules();
      console.log('Dashboard: Classes result:', { 
        hasSchedules: !!classesResult.schedules, 
        scheduleCount: classesResult.schedules?.length || 0,
        error: classesResult.error 
      });
      
      if (classesResult.schedules) {
        console.log('Dashboard: Loaded upcoming classes:', classesResult.schedules.length);
        setUpcomingClasses(classesResult.schedules);
      } else if (classesResult.error) {
        console.error('Dashboard: Error loading classes:', classesResult.error);
        Alert.alert('Error', `Failed to load classes: ${classesResult.error}`);
      } else {
        console.log('Dashboard: No schedules returned and no error - empty result');
        setUpcomingClasses([]);
      }

      // Load user's bookings (confirmed)
      console.log('Dashboard: Fetching user bookings...');
      const bookingsResult = await classService.getUserBookings(memberId);
      console.log('Dashboard: Bookings result:', { 
        hasBookings: !!bookingsResult.bookings, 
        bookingCount: bookingsResult.bookings?.length || 0,
        error: bookingsResult.error 
      });
      
      if (bookingsResult.bookings) {
        // Separate confirmed bookings from waitlist
        const confirmed = bookingsResult.bookings.filter((b: any) => b.status === 'confirmed');
        const waitlist = bookingsResult.bookings.filter((b: any) => b.status === 'waitlist');
        console.log('Dashboard: Loaded user bookings:', confirmed.length, 'confirmed,', waitlist.length, 'waitlist');
        setMyBookings(confirmed);
        setMyWaitlist(waitlist);

        // Load check-in status for all confirmed bookings
        if (confirmed.length > 0) {
          const checkInStatuses = await Promise.all(
            confirmed.map(async (booking: any) => {
              const scheduleId = booking.class_schedule_id || booking.class_schedule?.id;
              if (scheduleId) {
                const status = await classService.getCheckInStatus(scheduleId, memberId);
                return { scheduleId, checkedIn: status.checkedIn };
              }
              return null;
            })
          );
          
          const checkedInSet = new Set<string>();
          checkInStatuses.forEach((status) => {
            if (status && status.checkedIn) {
              checkedInSet.add(status.scheduleId);
            }
          });
          setCheckedInClasses(checkedInSet);
        }
      } else if (bookingsResult.error) {
        console.error('Dashboard: Error loading bookings:', bookingsResult.error);
        setMyBookings([]);
        setMyWaitlist([]);
      } else {
        console.log('Dashboard: No bookings returned - empty result');
        setMyBookings([]);
        setMyWaitlist([]);
      }
    } catch (error) {
      console.error('Dashboard: Error loading data:', error);
      Alert.alert('Error', `Failed to load data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (userId) {
      await loadData(userId);
    }
    setRefreshing(false);
  };

  const handleBookClass = async (classScheduleId: string) => {
    if (!userId) {
      Alert.alert('Error', 'User not found. Please log in again.');
      return;
    }

    Alert.alert(
      'Book Class',
      'Are you sure you want to book this class?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Book',
          onPress: async () => {
            const result = await classService.bookClass(classScheduleId, userId);
            if (result.error) {
              Alert.alert('Booking Failed', result.error);
              // Refresh data to update the UI in case booking exists but wasn't showing
              await loadData(userId);
            } else {
              Alert.alert('Success', 'Class booked successfully!');
              await loadData(userId);
            }
          },
        },
      ]
    );
  };

  const handleCancelBooking = async (classScheduleId: string) => {
    if (!userId) {
      Alert.alert('Error', 'User not found. Please log in again.');
      return;
    }

    Alert.alert(
      'Cancel Booking',
      'Are you sure you want to cancel this booking?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            const result = await classService.cancelBooking(classScheduleId, userId);
            if (result.error) {
              Alert.alert('Cancellation Failed', result.error);
            } else {
              Alert.alert('Success', 'Booking cancelled successfully');
              await loadData(userId);
            }
          },
        },
      ]
    );
  };

  const isBooked = (classScheduleId: string): boolean => {
    return myBookings.some(
      (booking) => booking.class_schedule_id === classScheduleId || booking.class_schedule?.id === classScheduleId
    );
  };

  const isOnWaitlist = (classScheduleId: string): boolean => {
    return myWaitlist.some(
      (booking) => booking.class_schedule_id === classScheduleId || booking.class_schedule?.id === classScheduleId
    );
  };

  const getWaitlistPosition = (classScheduleId: string): number | null => {
    const waitlistBooking = myWaitlist.find(
      (booking) => booking.class_schedule_id === classScheduleId || booking.class_schedule?.id === classScheduleId
    );
    return waitlistBooking?.waitlist_position || null;
  };

  const isCheckedIn = (classScheduleId: string): boolean => {
    return checkedInClasses.has(classScheduleId);
  };

  const canCheckIn = (schedule: any): boolean => {
    if (!isBooked(schedule.id)) return false;
    if (isCheckedIn(schedule.id)) return false;

    const now = new Date();
    const scheduledDateTime = new Date(`${schedule.scheduled_date}T${schedule.scheduled_time}`);
    
    // Check-in window: 15 minutes before to 10 minutes after start time
    const checkInStart = new Date(scheduledDateTime);
    checkInStart.setMinutes(checkInStart.getMinutes() - 15);
    
    const checkInEnd = new Date(scheduledDateTime);
    checkInEnd.setMinutes(checkInEnd.getMinutes() + 10);
    
    return now >= checkInStart && now <= checkInEnd;
  };

  const handleCheckIn = async (classScheduleId: string) => {
    if (!userId) {
      Alert.alert('Error', 'User not found. Please log in again.');
      return;
    }

    const result = await classService.checkIn(classScheduleId, userId);
    if (result.error) {
      Alert.alert('Check-In Failed', result.error);
    } else {
      Alert.alert('Success', 'You have been checked in for this class!');
      // Update check-in status
      setCheckedInClasses(prev => new Set(prev).add(classScheduleId));
      await loadData(userId);
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatDateHeader = (dateString: string): string => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'long', 
        day: 'numeric' 
      });
    }
  };

  const getWeekLabel = (dateString: string): string => {
    const date = new Date(dateString);
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    
    if (startOfWeek.getMonth() === endOfWeek.getMonth()) {
      return `${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    } else {
      return `${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    }
  };

  const groupClassesByDate = (classes: any[]) => {
    const grouped: { [key: string]: any[] } = {};
    classes.forEach((cls) => {
      const date = cls.scheduled_date;
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(cls);
    });
    return grouped;
  };

  const groupClassesByWeek = (classes: any[]) => {
    const grouped: { [key: string]: any[] } = {};
    classes.forEach((cls) => {
      const date = new Date(cls.scheduled_date);
      const startOfWeek = new Date(date);
      startOfWeek.setDate(date.getDate() - date.getDay());
      const weekKey = startOfWeek.toISOString().split('T')[0];
      if (!grouped[weekKey]) {
        grouped[weekKey] = [];
      }
      grouped[weekKey].push(cls);
    });
    return grouped;
  };

  const formatTime = (timeString: string): string => {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  // Generate calendar dates for the next 14 days
  const generateCalendarDates = () => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date.toISOString().split('T')[0]);
    }
    return dates;
  };

  const formatCalendarDay = (dateString: string): { day: string; date: string } => {
    const date = new Date(dateString);
    const today = new Date();
    
    const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const day = dayNames[date.getDay()];
    const dateNum = date.getDate();
    
    if (date.toDateString() === today.toDateString()) {
      return { day: 'TODAY', date: dateNum.toString() };
    } else {
      return { day, date: dateNum.toString() };
    }
  };

  const isClassFull = (schedule: any): boolean => {
    return schedule.current_bookings >= schedule.max_bookings;
  };

  const getSpacesLeft = (schedule: any): number => {
    return Math.max(0, schedule.max_bookings - schedule.current_bookings);
  };

  const getDifficultyColor = (difficulty: string | undefined): string => {
    if (!difficulty) return '#808080'; // Grey for unknown
    const level = difficulty.toLowerCase();
    switch (level) {
      case 'beginner':
        return '#4CAF50'; // Green
      case 'intermediate':
        return '#FF9800'; // Orange
      case 'advanced':
        return '#F44336'; // Red
      case 'all_levels':
        return '#2196F3'; // Blue
      default:
        return '#808080'; // Grey
    }
  };

  const handleJoinWaitlist = async (classScheduleId: string) => {
    if (!userId) {
      Alert.alert('Error', 'User not found. Please log in again.');
      return;
    }

    Alert.alert(
      'Join Waitlist',
      'Would you like to join the waitlist for this class? You will be notified if a spot becomes available.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Join Waitlist',
          onPress: async () => {
            const result = await classService.joinWaitlist(classScheduleId, userId);
            if (result.error) {
              Alert.alert('Waitlist Failed', result.error);
            } else {
              Alert.alert('Success', 'You have been added to the waitlist!');
              await loadData(userId);
            }
          },
        },
      ]
    );
  };

  const handleLeaveWaitlist = async (classScheduleId: string) => {
    if (!userId) {
      Alert.alert('Error', 'User not found. Please log in again.');
      return;
    }

    Alert.alert(
      'Leave Waitlist',
      'Are you sure you want to leave the waitlist for this class?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave Waitlist',
          style: 'destructive',
          onPress: async () => {
            const result = await classService.leaveWaitlist(classScheduleId, userId);
            if (result.error) {
              Alert.alert('Error', result.error);
            } else {
              Alert.alert('Success', 'You have been removed from the waitlist');
              await loadData(userId);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.textSecondary} />
        </View>
      </SafeAreaView>
    );
  }

  // Render classes view (existing content)
  const renderClassesView = () => (
    <ScrollView
      style={styles.scrollView}
      refreshControl={
        <RefreshControl 
          refreshing={refreshing} 
          onRefresh={onRefresh} 
          tintColor={theme.colors.textSecondary}
          colors={[theme.colors.primary]}
        />
      }
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <View style={styles.headerTop}>
          <View style={styles.welcomeContainer}>
            <Text style={[styles.welcomeText, { color: theme.colors.text }]}>
              Welcome{userName ? `, ${userName}` : ''}!
            </Text>
            <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
              Mark Donnegan Fitness
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.logoutButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            onPress={handleSignOut}
          >
            <Ionicons name="log-out-outline" size={20} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
      </View>

        {/* Tabs */}
        <View style={[styles.tabContainer, { borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'myClasses' && styles.tabActive,
              { borderBottomColor: activeTab === 'myClasses' ? theme.colors.text : 'transparent' }
            ]}
            onPress={() => setActiveTab('myClasses')}
          >
            <Text style={[
              styles.tabText,
              { color: activeTab === 'myClasses' ? theme.colors.text : theme.colors.textSecondary }
            ]}>
              My Classes {myBookings.length > 0 && `(${myBookings.length})`}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'upcoming' && styles.tabActive,
              { borderBottomColor: activeTab === 'upcoming' ? theme.colors.text : 'transparent' }
            ]}
            onPress={() => setActiveTab('upcoming')}
          >
            <Text style={[
              styles.tabText,
              { color: activeTab === 'upcoming' ? theme.colors.text : theme.colors.textSecondary }
            ]}>
              Upcoming Classes
            </Text>
          </TouchableOpacity>
        </View>

        {/* Calendar Scroll */}
        {activeTab === 'upcoming' && (
          <View style={[styles.calendarContainer, { borderBottomColor: theme.colors.border }]}>
            <FlatList
              data={generateCalendarDates()}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item}
              contentContainerStyle={styles.calendarContent}
              renderItem={({ item }) => {
                const { day, date } = formatCalendarDay(item);
                const isSelected = selectedDate === item;
                return (
                  <TouchableOpacity
                    style={[
                      styles.calendarDay,
                      { 
                        backgroundColor: isSelected ? theme.colors.text : theme.colors.surface,
                        borderColor: theme.colors.border 
                      }
                    ]}
                    onPress={() => setSelectedDate(item)}
                  >
                    <Text style={[
                      styles.calendarDayText,
                      { color: isSelected ? theme.colors.background : theme.colors.text }
                    ]}>
                      {day}
                    </Text>
                    <Text style={[
                      styles.calendarDateText,
                      { color: isSelected ? theme.colors.background : theme.colors.text }
                    ]}>
                      {date}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        )}

        {/* My Classes Tab Content */}
        {activeTab === 'myClasses' && (
          <View style={styles.section}>
            {loading ? (
              <View style={styles.emptyState}>
                <ActivityIndicator size="large" color={theme.colors.text} />
              </View>
            ) : myBookings.length === 0 && myWaitlist.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="calendar-outline" size={48} color={theme.colors.textSecondary} />
                <Text style={[styles.emptyStateText, { color: theme.colors.textSecondary }]}>
                  {(() => {
                    // Check if there are any classes available today (not past 15 min cutoff)
                    const today = new Date().toISOString().split('T')[0];
                    const todayClasses = (upcomingClasses || []).filter((c: any) => {
                      if (!c || !c.scheduled_date || c.scheduled_date !== today) return false;
                      if (!c.scheduled_time) return false;
                      const now = new Date();
                      const scheduledDateTime = new Date(`${c.scheduled_date}T${c.scheduled_time}`);
                      const cutoffTime = new Date(scheduledDateTime);
                      cutoffTime.setMinutes(cutoffTime.getMinutes() + 15);
                      return now < cutoffTime;
                    });
                    
                    if (todayClasses.length === 0) {
                      return 'No more classes available today';
                    }
                    return 'You haven\'t booked any classes yet';
                  })()}
                </Text>
              </View>
            ) : (
              <>
                {/* Confirmed Bookings */}
                {myBookings.length > 0 && (
                  <>
                    <Text style={[styles.subsectionTitle, { color: theme.colors.text }]}>Confirmed Bookings</Text>
                    {myBookings.map((booking) => {
                      const schedule = booking.class_schedule || booking;
                      const className = schedule.class_name || schedule.classes?.name || 'Class';
                      return (
                        <View key={booking.id} style={[styles.classCardNew, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                          <View style={styles.classCardNewContent}>
                            <View style={styles.classCardNewLeft}>
                              <Text style={[styles.classTimeNew, { color: theme.colors.text }]}>
                                {formatTime(schedule.scheduled_time)}
                              </Text>
                              {isCheckedIn(schedule.id) ? (
                                <Text style={[styles.classStatusNew, { color: theme.colors.success }]}>CHECKED IN</Text>
                              ) : (
                                <Text style={[styles.classStatusNew, { color: theme.colors.error }]}>BOOKED</Text>
                              )}
                              <View style={styles.classNameRow}>
                                <View style={[styles.difficultyIndicator, { backgroundColor: getDifficultyColor(schedule.difficulty_level) }]} />
                                <Text style={[styles.classNameNew, { color: theme.colors.text }]}>
                                  {className}
                                </Text>
                              </View>
                              {schedule.trainer_name && (
                                <Text style={[styles.trainerName, { color: theme.colors.textSecondary }]}>
                                  with {schedule.trainer_name}
                                </Text>
                              )}
                              <View style={styles.classInfoRow}>
                                {schedule.duration && (
                                  <Text style={[styles.classInfoText, { color: theme.colors.textSecondary }]}>
                                    {schedule.duration} min
                                  </Text>
                                )}
                                {schedule.difficulty_level && (
                                  <Text style={[styles.classInfoText, { color: theme.colors.textSecondary }]}>
                                    • {schedule.difficulty_level.charAt(0).toUpperCase() + schedule.difficulty_level.slice(1)}
                                  </Text>
                                )}
                                {schedule.location && (
                                  <Text style={[styles.classInfoText, { color: theme.colors.textSecondary }]}>
                                    • {schedule.location.charAt(0).toUpperCase() + schedule.location.slice(1)}
                                  </Text>
                                )}
                              </View>
                              {schedule.class_description && (
                                <Text style={[styles.classDescriptionNew, { color: theme.colors.textSecondary }]} numberOfLines={2}>
                                  {schedule.class_description}
                                </Text>
                              )}
                              <Text style={[styles.classDateNew, { color: theme.colors.textSecondary }]}>
                                {formatDateHeader(schedule.scheduled_date)}
                              </Text>
                            </View>
                            <View style={styles.classCardNewRight}>
                              {isCheckedIn(schedule.id) ? (
                                <View style={[styles.checkInBadge, { backgroundColor: theme.colors.success }]}>
                                  <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
                                  <Text style={[styles.checkInBadgeText, { color: '#FFFFFF' }]}>CHECKED IN</Text>
                                </View>
                              ) : canCheckIn(schedule) ? (
                                <TouchableOpacity
                                  style={[styles.bookButtonPill, { backgroundColor: theme.colors.info }]}
                                  onPress={() => handleCheckIn(schedule.id)}
                                >
                                  <Text style={[styles.bookButtonPillText, { color: '#FFFFFF' }]}>CHECK IN</Text>
                                </TouchableOpacity>
                              ) : (
                                <TouchableOpacity
                                  style={[styles.bookButtonPill, { backgroundColor: theme.colors.error }]}
                                  onPress={() => handleCancelBooking(schedule.id)}
                                >
                                  <Text style={[styles.bookButtonPillText, { color: '#FFFFFF' }]}>CANCEL</Text>
                                </TouchableOpacity>
                              )}
                            </View>
                          </View>
                        </View>
                      );
                    })}
                  </>
                )}
                
                {/* Waitlist Bookings */}
                {myWaitlist.length > 0 && (
                  <>
                    <Text style={[styles.subsectionTitle, { color: theme.colors.text, marginTop: myBookings.length > 0 ? 20 : 0 }]}>
                      Waitlist
                    </Text>
                    {myWaitlist.map((booking) => {
                      const schedule = booking.class_schedule || booking;
                      const waitlistPos = getWaitlistPosition(schedule.id);
                      const className = schedule.class_name || schedule.classes?.name || 'Class';
                      return (
                        <View key={booking.id} style={[styles.classCardNew, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                          <View style={styles.classCardNewContent}>
                            <View style={styles.classCardNewLeft}>
                              <Text style={[styles.classTimeNew, { color: theme.colors.text }]}>
                                {formatTime(schedule.scheduled_time)}
                              </Text>
                              <Text style={[styles.classStatusNew, { color: theme.colors.warning }]}>
                                WAITLIST {waitlistPos ? `#${waitlistPos}` : ''}
                              </Text>
                              <View style={styles.classNameRow}>
                                <View style={[styles.difficultyIndicator, { backgroundColor: getDifficultyColor(schedule.difficulty_level) }]} />
                                <Text style={[styles.classNameNew, { color: theme.colors.text }]}>
                                  {className}
                                </Text>
                              </View>
                              {schedule.trainer_name && (
                                <Text style={[styles.trainerName, { color: theme.colors.textSecondary }]}>
                                  with {schedule.trainer_name}
                                </Text>
                              )}
                              <View style={styles.classInfoRow}>
                                {schedule.duration && (
                                  <Text style={[styles.classInfoText, { color: theme.colors.textSecondary }]}>
                                    {schedule.duration} min
                                  </Text>
                                )}
                                {schedule.difficulty_level && (
                                  <Text style={[styles.classInfoText, { color: theme.colors.textSecondary }]}>
                                    • {schedule.difficulty_level.charAt(0).toUpperCase() + schedule.difficulty_level.slice(1)}
                                  </Text>
                                )}
                                {schedule.location && (
                                  <Text style={[styles.classInfoText, { color: theme.colors.textSecondary }]}>
                                    • {schedule.location.charAt(0).toUpperCase() + schedule.location.slice(1)}
                                  </Text>
                                )}
                              </View>
                              {schedule.class_description && (
                                <Text style={[styles.classDescriptionNew, { color: theme.colors.textSecondary }]} numberOfLines={2}>
                                  {schedule.class_description}
                                </Text>
                              )}
                              <Text style={[styles.classDateNew, { color: theme.colors.textSecondary }]}>
                                {formatDateHeader(schedule.scheduled_date)}
                              </Text>
                            </View>
                            <View style={styles.classCardNewRight}>
                              <TouchableOpacity
                                style={[styles.bookButtonPill, { backgroundColor: theme.colors.warning }]}
                                onPress={() => handleLeaveWaitlist(schedule.id)}
                              >
                                <Text style={[styles.bookButtonPillText, { color: '#FFFFFF' }]}>LEAVE</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        </View>
                      );
                    })}
                  </>
                )}
              </>
            )}
          </View>
        )}

        {/* Upcoming Classes Tab Content */}
        {activeTab === 'upcoming' && (
          <View style={styles.section}>
            {upcomingClasses.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="calendar-outline" size={48} color={theme.colors.textSecondary} />
                <Text style={[styles.emptyStateText, { color: theme.colors.textSecondary }]}>
                  No upcoming classes available
                </Text>
              </View>
            ) : (() => {
              // Filter classes by selected date if a date is selected
              const filteredClasses = selectedDate 
                ? upcomingClasses.filter(c => c.scheduled_date === selectedDate)
                : upcomingClasses;
              
              const groupedByDate = groupClassesByDate(filteredClasses);
              const sortedDates = Object.keys(groupedByDate).sort();
              
              return sortedDates.map((date) => {
                const dayClasses = groupedByDate[date].sort((a, b) => 
                  a.scheduled_time.localeCompare(b.scheduled_time)
                );
                
                return (
                  <View key={date} style={styles.dayGroup}>
                    <Text style={[styles.dayHeader, { color: theme.colors.text }]}>
                      {formatDateHeader(date)}
                    </Text>
                  {dayClasses.map((schedule) => {
                    const booked = isBooked(schedule.id);
                    const onWaitlist = isOnWaitlist(schedule.id);
                    const full = isClassFull(schedule);
                    const canBook = !booked && !full && !onWaitlist;
                    const spacesLeft = getSpacesLeft(schedule);
                    const className = schedule.class_name || schedule.classes?.name || 'Class';
                    const isRunning = className.toLowerCase() === 'running';

                    return (
                      <View key={schedule.id} style={[styles.classCardNew, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                        <View style={styles.classCardNewContent}>
                            <View style={styles.classCardNewLeft}>
                              <Text style={[styles.classTimeNew, { color: theme.colors.text }]}>
                                {formatTime(schedule.scheduled_time)}
                              </Text>
                              {booked ? (
                                <Text style={[styles.classStatusNew, { color: theme.colors.error }]}>BOOKED</Text>
                              ) : onWaitlist ? (
                                <Text style={[styles.classStatusNew, { color: theme.colors.warning }]}>WAITLIST</Text>
                              ) : null}
                              <View style={styles.classNameRow}>
                                <View style={[styles.difficultyIndicator, { backgroundColor: getDifficultyColor(schedule.difficulty_level) }]} />
                                <Text style={[styles.classNameNew, { color: theme.colors.text }]}>
                                  {className}
                                </Text>
                              </View>
                              {schedule.trainer_name && (
                                <Text style={[styles.trainerName, { color: theme.colors.textSecondary }]}>
                                  with {schedule.trainer_name}
                                </Text>
                              )}
                              <View style={styles.classInfoRow}>
                                {schedule.duration && (
                                  <Text style={[styles.classInfoText, { color: theme.colors.textSecondary }]}>
                                    {schedule.duration} min
                                  </Text>
                                )}
                                {schedule.difficulty_level && (
                                  <Text style={[styles.classInfoText, { color: theme.colors.textSecondary }]}>
                                    • {schedule.difficulty_level.charAt(0).toUpperCase() + schedule.difficulty_level.slice(1)}
                                  </Text>
                                )}
                                {schedule.location && (
                                  <Text style={[styles.classInfoText, { color: theme.colors.textSecondary }]}>
                                    • {schedule.location.charAt(0).toUpperCase() + schedule.location.slice(1)}
                                  </Text>
                                )}
                              </View>
                              {schedule.class_description && (
                                <Text style={[styles.classDescriptionNew, { color: theme.colors.textSecondary }]} numberOfLines={2}>
                                  {schedule.class_description}
                                </Text>
                              )}
                            </View>
                          <View style={styles.classCardNewRight}>
                            {booked ? (
                              <TouchableOpacity
                                style={[styles.bookButtonPill, { backgroundColor: theme.colors.error }]}
                                onPress={() => handleCancelBooking(schedule.id)}
                              >
                                <Text style={[styles.bookButtonPillText, { color: '#FFFFFF' }]}>CANCEL</Text>
                              </TouchableOpacity>
                            ) : onWaitlist ? (
                              <TouchableOpacity
                                style={[styles.bookButtonPill, { backgroundColor: theme.colors.warning }]}
                                onPress={() => handleLeaveWaitlist(schedule.id)}
                              >
                                <Text style={[styles.bookButtonPillText, { color: '#FFFFFF' }]}>WAITLIST</Text>
                              </TouchableOpacity>
                            ) : full ? (
                              <TouchableOpacity
                                style={[styles.bookButtonPill, { backgroundColor: theme.colors.error }]}
                                onPress={() => handleJoinWaitlist(schedule.id)}
                              >
                                <Text style={[styles.bookButtonPillText, { color: '#FFFFFF' }]}>WAITLIST</Text>
                              </TouchableOpacity>
                            ) : (
                              <TouchableOpacity
                                style={[styles.bookButtonPill, { backgroundColor: theme.colors.success }]}
                                onPress={() => handleBookClass(schedule.id)}
                              >
                                <Text style={[styles.bookButtonPillText, { color: '#FFFFFF' }]}>BOOK</Text>
                              </TouchableOpacity>
                            )}
                            {!isRunning && !booked && !onWaitlist && (
                              <View style={styles.spotsContainer}>
                                <Text style={[styles.spotsNumber, { color: theme.colors.textSecondary }]}>
                                  {full ? 'FULL' : `${spacesLeft}/${schedule.max_bookings}`}
                                </Text>
                                {!full && (
                                  <Text style={[styles.spotsLabel, { color: theme.colors.textSecondary }]}>
                                    Spots Remaining
                                  </Text>
                                )}
                              </View>
                            )}
                          </View>
                        </View>
                      </View>
                    );
                  })}
                  </View>
                );
              });
            })()}
          </View>
        )}
    </ScrollView>
  );

  // Render current view based on state
  const renderCurrentView = () => {
    switch (currentView) {
      case 'macros':
        return <MacroScreen user={propUser} />;
      case 'classes':
        return renderClassesView();
      case 'profile':
        return <ProfileScreen onSignOut={onSignOut || (() => {})} user={propUser} />;
      default:
        return <MacroScreen user={propUser} />;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {renderCurrentView()}
      
      {/* Floating Navbar */}
      <View style={[styles.floatingNavbar, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
        <TouchableOpacity
          style={[styles.navbarButton, currentView === 'macros' && styles.navbarButtonActive]}
          onPress={() => setCurrentView('macros')}
        >
          <Ionicons 
            name={currentView === 'macros' ? 'nutrition' : 'nutrition-outline'} 
            size={24} 
            color={currentView === 'macros' ? theme.colors.primary : theme.colors.textSecondary} 
          />
          <Text style={[
            styles.navbarButtonText,
            { color: currentView === 'macros' ? theme.colors.primary : theme.colors.textSecondary }
          ]}>
            Macros
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.navbarButton, currentView === 'classes' && styles.navbarButtonActive]}
          onPress={() => setCurrentView('classes')}
        >
          <Ionicons 
            name={currentView === 'classes' ? 'calendar' : 'calendar-outline'} 
            size={24} 
            color={currentView === 'classes' ? theme.colors.primary : theme.colors.textSecondary} 
          />
          <Text style={[
            styles.navbarButtonText,
            { color: currentView === 'classes' ? theme.colors.primary : theme.colors.textSecondary }
          ]}>
            Classes
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.navbarButton, currentView === 'profile' && styles.navbarButtonActive]}
          onPress={() => setCurrentView('profile')}
        >
          <Ionicons 
            name={currentView === 'profile' ? 'person' : 'person-outline'} 
            size={24} 
            color={currentView === 'profile' ? theme.colors.primary : theme.colors.textSecondary} 
          />
          <Text style={[
            styles.navbarButtonText,
            { color: currentView === 'profile' ? theme.colors.primary : theme.colors.textSecondary }
          ]}>
            Profile
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    marginBottom: 80, // Space for floating navbar
  },
  floatingNavbar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 12,
    paddingBottom: 20,
    borderTopWidth: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  navbarButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  navbarButtonActive: {
    // Active state styling handled by icon/text colors
  },
  navbarButtonText: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 16,
    paddingTop: 10,
    borderBottomWidth: 1,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcomeContainer: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
  },
  logoutButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: 0,
    backgroundColor: 'transparent',
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomWidth: 3,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  section: {
    padding: 16,
    minHeight: 200,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    marginTop: 8,
  },
  classCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  dayGroup: {
    marginBottom: 20,
  },
  dayHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    marginTop: 4,
  },
  classCardCompact: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  classCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  classCardLeft: {
    flex: 1,
    marginRight: 12,
  },
  classCardRight: {
    alignItems: 'flex-end',
  },
  classCardHeaderCompact: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  classNameCompact: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  statusBadgeCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 4,
  },
  statusTextCompact: {
    fontSize: 10,
    fontWeight: '600',
  },
  spotsTextCompact: {
    fontSize: 11,
    fontWeight: '500',
  },
  spotsIndicator: {
    alignItems: 'flex-end',
  },
  spotsIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  indicatorCircle: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  waitlistButtonCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    gap: 4,
    minWidth: 80,
  },
  waitlistButtonTextCompact: {
    fontSize: 14,
    fontWeight: '600',
  },
  classCardNew: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  classCardNewContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  classCardNewLeft: {
    flex: 1,
    marginRight: 12,
  },
  classCardNewRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  classTimeNew: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  classStatusNew: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  classNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  difficultyIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  classNameNew: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  trainerName: {
    fontSize: 13,
    marginTop: 2,
    fontStyle: 'italic',
  },
  bookButtonPill: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookButtonPillText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  checkInBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 6,
  },
  checkInBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  classDateNew: {
    fontSize: 12,
    marginTop: 4,
  },
  classInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
    flexWrap: 'wrap',
  },
  classInfoText: {
    fontSize: 12,
  },
  classDescriptionNew: {
    fontSize: 12,
    marginTop: 6,
    lineHeight: 16,
  },
  spotsContainer: {
    marginTop: 6,
    alignItems: 'center',
  },
  spotsNumber: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  spotsLabel: {
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  calendarContainer: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  calendarContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  calendarDay: {
    width: 70,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginRight: 8,
  },
  calendarDayText: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  calendarDateText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  classDetailsCompact: {
    gap: 4,
  },
  detailRowCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailTextCompact: {
    fontSize: 12,
  },
  bookButtonCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    gap: 4,
    minWidth: 80,
  },
  bookButtonTextCompact: {
    fontSize: 14,
    fontWeight: '600',
  },
  cancelButtonCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    gap: 4,
    borderWidth: 1,
    minWidth: 80,
  },
  cancelButtonTextCompact: {
    fontSize: 14,
    fontWeight: '600',
  },
  classCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  classInfo: {
    flex: 1,
  },
  className: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  classTrainer: {
    fontSize: 14,
  },
  classDescription: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  spotsAvailable: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  spotsText: {
    fontSize: 12,
    fontWeight: '600',
  },
  classDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  detailText: {
    fontSize: 14,
  },
  bookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  bookButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    minHeight: 200,
  },
  emptyStateText: {
    fontSize: 16,
    marginTop: 12,
    textAlign: 'center',
  },
});

export default DashboardScreen;
