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
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { supabaseApi } from '../../config/supabase';
import { trainerDaysOffService } from '../../services/api';

interface ClassSchedule {
  id: string;
  scheduled_date: string;
  scheduled_time: string;
  status: string;
  max_bookings: number;
  current_bookings: number;
  classes: {
    name: string;
    duration: number;
    description?: string;
  };
  class_bookings?: Array<{
    id: string;
    member_id: string;
    status: string;
    profiles: {
      first_name: string;
      last_name: string;
      email?: string;
    };
  }>;
}

interface Props {
  navigation: any;
  route: any;
  onSignOut: () => void;
}

const TrainerDashboardScreen: React.FC<Props> = ({ navigation, route, onSignOut }) => {
  const { user } = route.params;
  const trainerId = user.id;
  const { theme } = useTheme();
  const [myClasses, setMyClasses] = useState<ClassSchedule[]>([]);
  const [allClasses, setAllClasses] = useState<ClassSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showAttendeesModal, setShowAttendeesModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ClassSchedule | null>(null);
  const [showEditMaxBookings, setShowEditMaxBookings] = useState(false);
  const [newMaxBookings, setNewMaxBookings] = useState('');
  const [daysOff, setDaysOff] = useState<Set<string>>(new Set()); // Store dates as YYYY-MM-DD strings

  useEffect(() => {
    loadAllClasses();
  }, [trainerId, currentMonth]);

  useEffect(() => {
    loadDaysOff();
  }, [trainerId, currentMonth]);

  useEffect(() => {
    filterClassesByDate();
  }, [selectedDate, allClasses]);

  const loadDaysOff = async () => {
    try {
      if (!trainerId) return;
      
      // Get days off for the current month
      const startDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const endDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      
      const result = await trainerDaysOffService.getTrainerDaysOff(trainerId, startDateStr, endDateStr);
      if (result.daysOff) {
        const daysOffSet = new Set(result.daysOff.map((dayOff: any) => dayOff.date));
        setDaysOff(daysOffSet);
      }
    } catch (error) {
      console.error('Error loading days off:', error);
    }
  };

  // Check if a date is a day off
  const isDayOff = (date: Date): boolean => {
    const dateString = date.toISOString().split('T')[0];
    return daysOff.has(dateString);
  };

  // Get today's classes count
  const getTodayClassesCount = (): number => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayString = today.toISOString().split('T')[0];
    
    // If today is a day off, return 0
    if (daysOff.has(todayString)) {
      return 0;
    }
    
    return allClasses.filter(classSchedule => {
      const classDate = new Date(`${classSchedule.scheduled_date}T${classSchedule.scheduled_time}`);
      return classSchedule.scheduled_date === todayString && classDate > new Date();
    }).length;
  };

  // Get next upcoming class
  const getNextClass = (): ClassSchedule | null => {
    const now = new Date();
    const upcomingClasses = allClasses.filter(classSchedule => {
      const classDate = new Date(`${classSchedule.scheduled_date}T${classSchedule.scheduled_time}`);
      return classDate > now;
    });

    if (upcomingClasses.length === 0) return null;

    // Sort by date and time, return the first one
    upcomingClasses.sort((a, b) => {
      const dateA = new Date(`${a.scheduled_date}T${a.scheduled_time}`);
      const dateB = new Date(`${b.scheduled_date}T${b.scheduled_time}`);
      return dateA.getTime() - dateB.getTime();
    });

    return upcomingClasses[0];
  };

  const loadAllClasses = async () => {
    setLoading(true);
    try {
      // Validate trainer ID
      if (!trainerId) {
        console.error('Trainer ID is missing');
        Alert.alert('Error', 'Unable to identify trainer. Please log in again.');
        setLoading(false);
        return;
      }

      const startDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const endDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      
      const today = new Date().toISOString().split('T')[0];
      
      // Fetch classes filtered by trainer_id - only classes assigned to this trainer
      // Using classes!inner ensures we only get schedules with valid class data
      const response = await supabaseApi.get(
        `/class_schedules?trainer_id=eq.${trainerId}&scheduled_date=gte.${today}&scheduled_date=lte.${endDateStr}&select=id,scheduled_date,scheduled_time,status,max_bookings,current_bookings,classes!inner(name,duration,description)&order=scheduled_date.asc,scheduled_time.asc`
      );

      // Filter out expired classes (classes that have already passed)
      const now = new Date();
      const filteredClasses = (response.data || []).filter((schedule: any) => {
        const classDateTime = new Date(`${schedule.scheduled_date}T${schedule.scheduled_time}`);
        return classDateTime > now;
      });

      // Ensure classes object exists for each schedule
      const formattedClasses = filteredClasses.map((schedule: any) => ({
        ...schedule,
        classes: schedule.classes || { name: 'Unknown Class', duration: 0, description: '' }
      }));

      console.log(`Loaded ${formattedClasses.length} classes for trainer ${trainerId}`);
      setAllClasses(formattedClasses);
    } catch (error: any) {
      console.error('Error loading trainer classes:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to load your classes';
      Alert.alert('Error', errorMessage);
      setAllClasses([]); // Set empty array on error to show empty state
    } finally {
      setLoading(false);
    }
  };

  const filterClassesByDate = () => {
    const dateString = selectedDate.toISOString().split('T')[0];
    const filtered = allClasses.filter(cls => cls.scheduled_date === dateString);
    setMyClasses(filtered);
  };

  const loadClassAttendees = async (classScheduleId: string) => {
    try {
      const response = await supabaseApi.get('/class_bookings', {
        params: {
          select: `
            id,
            member_id,
            status,
            profiles!inner(
              first_name,
              last_name,
              email
            )
          `,
          class_schedule_id: `eq.${classScheduleId}`,
          status: `eq.confirmed`,
          order: 'booked_at.asc'
        }
      });

      return response.data || [];
    } catch (error) {
      console.error('Error loading attendees:', error);
      return [];
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadAllClasses(), loadDaysOff()]);
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

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const handleViewAttendees = async (classSchedule: ClassSchedule) => {
    const attendees = await loadClassAttendees(classSchedule.id);
    setSelectedClass({ ...classSchedule, class_bookings: attendees });
    setShowAttendeesModal(true);
  };

  const handleRemoveUser = async (bookingId: string, memberName: string) => {
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
                status: 'cancelled'
              });

              // Update current_bookings count
              if (selectedClass) {
                const updatedCount = (selectedClass.current_bookings || 0) - 1;
                await supabaseApi.patch(`/class_schedules?id=eq.${selectedClass.id}`, {
                  current_bookings: Math.max(0, updatedCount)
                });
              }

              // Refresh attendees
              if (selectedClass) {
                const attendees = await loadClassAttendees(selectedClass.id);
                setSelectedClass({ ...selectedClass, class_bookings: attendees, current_bookings: Math.max(0, (selectedClass.current_bookings || 0) - 1) });
              }

              // Refresh all classes
              await loadAllClasses();
              
              Alert.alert('Success', 'User removed from class');
            } catch (error) {
              console.error('Error removing user:', error);
              Alert.alert('Error', 'Failed to remove user');
            }
          }
        }
      ]
    );
  };

  const handleEditMaxBookings = (classSchedule: ClassSchedule) => {
    setSelectedClass(classSchedule);
    setNewMaxBookings(classSchedule.max_bookings.toString());
    setShowEditMaxBookings(true);
  };

  const handleSaveMaxBookings = async () => {
    if (!selectedClass) return;
    
    const newMax = parseInt(newMaxBookings);
    if (isNaN(newMax) || newMax < 1) {
      Alert.alert('Error', 'Please enter a valid number greater than 0');
      return;
    }

    try {
      await supabaseApi.patch(`/class_schedules?id=eq.${selectedClass.id}`, {
        max_bookings: newMax
      });

      // Update local state
      setAllClasses(prev => prev.map(cls => 
        cls.id === selectedClass.id ? { ...cls, max_bookings: newMax } : cls
      ));
      setMyClasses(prev => prev.map(cls => 
        cls.id === selectedClass.id ? { ...cls, max_bookings: newMax } : cls
      ));

      setShowEditMaxBookings(false);
      setSelectedClass(null);
      Alert.alert('Success', 'Max bookings updated');
    } catch (error) {
      console.error('Error updating max bookings:', error);
      Alert.alert('Error', 'Failed to update max bookings');
    }
  };

  // Calendar functions
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getClassesForDate = (date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    return allClasses.filter(cls => cls.scheduled_date === dateString);
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDay = getFirstDayOfMonth(currentMonth);
    const days: (Date | null)[] = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day));
    }

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December'];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
      <View style={[styles.calendarContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        {/* Month Header */}
        <View style={styles.calendarHeader}>
          <TouchableOpacity
            onPress={() => {
              const prevMonth = new Date(currentMonth);
              prevMonth.setMonth(prevMonth.getMonth() - 1);
              setCurrentMonth(prevMonth);
            }}
          >
            <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.monthTitle, { color: theme.colors.text }]}>
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </Text>
          <TouchableOpacity
            onPress={() => {
              const nextMonth = new Date(currentMonth);
              nextMonth.setMonth(nextMonth.getMonth() + 1);
              setCurrentMonth(nextMonth);
            }}
          >
            <Ionicons name="chevron-forward" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        {/* Day Names */}
        <View style={styles.dayNamesRow}>
          {dayNames.map(day => (
            <View key={day} style={styles.dayNameCell}>
              <Text style={[styles.dayNameText, { color: theme.colors.textSecondary }]}>
                {day}
              </Text>
            </View>
          ))}
        </View>

        {/* Calendar Grid */}
        <View style={styles.calendarGrid}>
          {days.map((date, index) => {
            if (!date) {
              return <View key={index} style={styles.calendarDay} />;
            }

            const dateString = date.toISOString().split('T')[0];
            const classesForDay = getClassesForDate(date);
            const isSelected = dateString === selectedDate.toISOString().split('T')[0];
            const isToday = dateString === new Date().toISOString().split('T')[0];
            const isDayOffDate = isDayOff(date);
            const hasClasses = classesForDay.length > 0;

            // Colors: orange (#FF8C00) for days with classes, yellow (#FFD700) for annual leave
            const getDayBackgroundColor = () => {
              if (isSelected) return theme.colors.primary;
              if (isDayOffDate) return '#FFD700'; // Yellow for days off / annual leave
              if (hasClasses) return '#FF8C00'; // Orange for days with classes scheduled
              return 'transparent';
            };

            const getDayNumberColor = () => {
              if (isSelected || hasClasses) return '#FFFFFF'; // White text on primary/orange
              if (isDayOffDate) return '#000000'; // Black text on yellow
              return theme.colors.text;
            };

            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.calendarDay,
                  { backgroundColor: getDayBackgroundColor() },
                  isToday && !isSelected && !hasClasses && !isDayOffDate && { borderWidth: 2, borderColor: theme.colors.primary }
                ]}
                onPress={() => setSelectedDate(date)}
              >
                <Text style={[
                  styles.dayNumber,
                  { color: getDayNumberColor() }
                ]}>
                  {date.getDate()}
                </Text>
                {hasClasses && !isDayOffDate && (
                  <View style={[
                    styles.classIndicator,
                    { backgroundColor: isSelected ? theme.colors.background : '#FFFFFF' }
                  ]} />
                )}
                {isDayOffDate && (
                  <Ionicons 
                    name="sunny-outline" 
                    size={12} 
                    color="#000000" 
                    style={{ marginTop: 2 }}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  const renderClassCard = (classSchedule: ClassSchedule) => (
    <View key={classSchedule.id} style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
            {classSchedule.classes?.name || 'Unknown Class'}
          </Text>
          <Text style={[styles.cardTime, { color: theme.colors.textSecondary }]}>
            {formatTime(classSchedule.scheduled_time)} • {classSchedule.classes?.duration || 0} min
          </Text>
        </View>
        <View style={[styles.statusBadge, { 
          backgroundColor: classSchedule.status === 'active' ? theme.colors.success : 
                          classSchedule.status === 'cancelled' ? theme.colors.error : 
                          theme.colors.textSecondary 
        }]}>
          <Text style={styles.statusText}>{classSchedule.status.toUpperCase()}</Text>
        </View>
      </View>
      
      <View style={styles.classInfo}>
        <View style={styles.infoRow}>
          <Ionicons name="people" size={16} color={theme.colors.textSecondary} />
          <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
            {classSchedule.current_bookings || 0} / {classSchedule.max_bookings} enrolled
          </Text>
        </View>
      </View>
      
      <View style={styles.cardActions}>
        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}
          onPress={() => handleViewAttendees(classSchedule)}
        >
          <Ionicons name="people-outline" size={16} color={theme.colors.background} />
          <Text style={[styles.actionText, { color: theme.colors.background }]}>Attendees</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: theme.colors.secondary }]}
          onPress={() => handleEditMaxBookings(classSchedule)}
        >
          <Ionicons name="create-outline" size={16} color={theme.colors.background} />
          <Text style={[styles.actionText, { color: theme.colors.background }]}>Edit Max</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          My Classes
        </Text>
        <TouchableOpacity onPress={handleSignOut} style={styles.signOutButton}>
          <Ionicons name="log-out-outline" size={24} color={theme.colors.error} />
        </TouchableOpacity>
      </View>

      {/* Today's Status */}
      <View style={[styles.todayStatusSection, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        {(() => {
          const todayCount = getTodayClassesCount();
          return (
            <View style={styles.todayStatusContent}>
              <Ionicons 
                name={todayCount > 0 ? "calendar" : "calendar-outline"} 
                size={24} 
                color={todayCount > 0 ? theme.colors.primary : theme.colors.textSecondary} 
                style={{ marginRight: 12 }}
              />
              <Text style={[styles.todayStatusText, { color: theme.colors.text }]}>
                {(() => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const todayString = today.toISOString().split('T')[0];
                  const isTodayDayOff = daysOff.has(todayString);
                  
                  if (isTodayDayOff) {
                    return 'Day off today';
                  } else if (todayCount > 0) {
                    return `You have ${todayCount} ${todayCount === 1 ? 'class' : 'classes'} today`;
                  } else {
                    return 'Day off today';
                  }
                })()}
              </Text>
            </View>
          );
        })()}
      </View>

      {/* Next Class Section */}
      {getNextClass() && (
        <View style={[styles.nextClassSection, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
          <View style={styles.nextClassHeader}>
            <Ionicons name="time-outline" size={20} color={theme.colors.primary} />
            <Text style={[styles.nextClassTitle, { color: theme.colors.text }]}>
              Next Class
            </Text>
          </View>
          {(() => {
            const nextClass = getNextClass();
            if (!nextClass) return null;
            
            const classDateTime = new Date(`${nextClass.scheduled_date}T${nextClass.scheduled_time}`);
            const now = new Date();
            const timeUntil = classDateTime.getTime() - now.getTime();
            const hoursUntil = Math.floor(timeUntil / (1000 * 60 * 60));
            const minutesUntil = Math.floor((timeUntil % (1000 * 60 * 60)) / (1000 * 60));
            
            let timeUntilText = '';
            if (hoursUntil > 24) {
              const daysUntil = Math.floor(hoursUntil / 24);
              timeUntilText = `in ${daysUntil} day${daysUntil > 1 ? 's' : ''}`;
            } else if (hoursUntil > 0) {
              timeUntilText = `in ${hoursUntil} hour${hoursUntil > 1 ? 's' : ''} ${minutesUntil > 0 ? `${minutesUntil} min${minutesUntil > 1 ? 's' : ''}` : ''}`;
            } else {
              timeUntilText = `in ${minutesUntil} minute${minutesUntil !== 1 ? 's' : ''}`;
            }

            return (
              <TouchableOpacity
                style={[styles.nextClassCard, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}
                onPress={() => {
                  const classDate = new Date(nextClass.scheduled_date);
                  setSelectedDate(classDate);
                }}
              >
                <View style={styles.nextClassContent}>
                  <View style={styles.nextClassInfo}>
                    <Text style={[styles.nextClassName, { color: theme.colors.text }]}>
                      {nextClass.classes?.name || 'Unknown Class'}
                    </Text>
                    <Text style={[styles.nextClassDateTime, { color: theme.colors.textSecondary }]}>
                      {classDateTime.toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        month: 'long', 
                        day: 'numeric' 
                      })} at {formatTime(nextClass.scheduled_time)}
                    </Text>
                    <Text style={[styles.nextClassTimeUntil, { color: theme.colors.primary }]}>
                      {timeUntilText}
                    </Text>
                  </View>
                  <View style={styles.nextClassStats}>
                    <View style={styles.nextClassStat}>
                      <Ionicons name="people-outline" size={16} color={theme.colors.textSecondary} />
                      <Text style={[styles.nextClassStatText, { color: theme.colors.textSecondary }]}>
                        {nextClass.current_bookings || 0}/{nextClass.max_bookings}
                      </Text>
                    </View>
                    <View style={styles.nextClassStat}>
                      <Ionicons name="time-outline" size={16} color={theme.colors.textSecondary} />
                      <Text style={[styles.nextClassStatText, { color: theme.colors.textSecondary }]}>
                        {nextClass.classes?.duration || 0} min
                      </Text>
                    </View>
                  </View>
                  <View style={styles.nextClassHint}>
                    <Ionicons name="arrow-down-outline" size={14} color={theme.colors.textSecondary} />
                    <Text style={[styles.nextClassHintText, { color: theme.colors.textSecondary }]}>
                      See full details below
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            );
          })()}
        </View>
      )}

      {/* Calendar */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {renderCalendar()}

        {/* Selected Date Classes */}
        <View style={styles.classesSection}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Classes for {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </Text>
          {myClasses.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={48} color={theme.colors.textSecondary} />
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                {(() => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const selected = new Date(selectedDate);
                  selected.setHours(0, 0, 0, 0);
                  
                  if (selected.getTime() === today.getTime()) {
                    return "You've no classes to train today";
                  } else {
                    return "No classes scheduled for this date";
                  }
                })()}
              </Text>
            </View>
          ) : (
            myClasses.map(renderClassCard)
          )}
        </View>
      </ScrollView>

      {/* Attendees Modal */}
      <Modal
        visible={showAttendeesModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAttendeesModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                {selectedClass?.classes?.name || 'Unknown Class'} - Attendees
              </Text>
              <TouchableOpacity onPress={() => setShowAttendeesModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.attendeesList}>
              {selectedClass?.class_bookings && selectedClass.class_bookings.length > 0 ? (
                selectedClass.class_bookings.map((booking) => (
                  <View 
                    key={booking.id} 
                    style={[styles.attendeeRow, { borderBottomColor: theme.colors.border }]}
                  >
                    <View style={styles.attendeeInfo}>
                      <Text style={[styles.attendeeName, { color: theme.colors.text }]}>
                        {booking.profiles.first_name} {booking.profiles.last_name}
                      </Text>
                      {booking.profiles.email && (
                        <Text style={[styles.attendeeEmail, { color: theme.colors.textSecondary }]}>
                          {booking.profiles.email}
                        </Text>
                      )}
                    </View>
                    <TouchableOpacity
                      onPress={() => handleRemoveUser(booking.id, `${booking.profiles.first_name} ${booking.profiles.last_name}`)}
                      style={[styles.removeButton, { backgroundColor: theme.colors.error }]}
                    >
                      <Ionicons name="trash-outline" size={18} color={theme.colors.background} />
                    </TouchableOpacity>
                  </View>
                ))
              ) : (
                <View style={styles.emptyAttendees}>
                  <Text style={[styles.emptyAttendeesText, { color: theme.colors.textSecondary }]}>
                    No attendees for this class
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Edit Max Bookings Modal */}
      <Modal
        visible={showEditMaxBookings}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowEditMaxBookings(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                Edit Max Bookings
              </Text>
              <TouchableOpacity onPress={() => setShowEditMaxBookings(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.editForm}>
              <Text style={[styles.formLabel, { color: theme.colors.text }]}>
                Maximum Bookings
              </Text>
              <TextInput
                style={[styles.formInput, { 
                  backgroundColor: theme.colors.background, 
                  borderColor: theme.colors.border,
                  color: theme.colors.text
                }]}
                value={newMaxBookings}
                onChangeText={setNewMaxBookings}
                keyboardType="numeric"
                placeholder="Enter max bookings"
                placeholderTextColor={theme.colors.textSecondary}
              />
              <Text style={[styles.formHint, { color: theme.colors.textSecondary }]}>
                Current: {selectedClass?.current_bookings || 0} enrolled
              </Text>
              
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: theme.colors.primary }]}
                onPress={handleSaveMaxBookings}
              >
                <Text style={[styles.saveButtonText, { color: theme.colors.background }]}>
                  Save Changes
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
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
    paddingTop: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  signOutButton: {
    padding: 8,
  },
  todayStatusSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  todayStatusContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  todayStatusText: {
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  calendarContainer: {
    margin: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  dayNamesRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dayNameCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  dayNameText: {
    fontSize: 12,
    fontWeight: '600',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDay: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    margin: 2,
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: '600',
  },
  classIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 2,
  },
  classesSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  card: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
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
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  cardTime: {
    fontSize: 14,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  classInfo: {
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    fontSize: 14,
    marginLeft: 8,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 12,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    maxHeight: '80%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  attendeesList: {
    maxHeight: 400,
    padding: 20,
  },
  attendeeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  attendeeInfo: {
    flex: 1,
  },
  attendeeName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  attendeeEmail: {
    fontSize: 14,
  },
  removeButton: {
    padding: 8,
    borderRadius: 8,
  },
  emptyAttendees: {
    padding: 40,
    alignItems: 'center',
  },
  emptyAttendeesText: {
    fontSize: 16,
  },
  editForm: {
    padding: 20,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 8,
  },
  formHint: {
    fontSize: 14,
    marginBottom: 20,
  },
  saveButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  nextClassSection: {
    padding: 20,
    borderBottomWidth: 1,
  },
  nextClassHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  nextClassTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  nextClassCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  nextClassContent: {
    flex: 1,
  },
  nextClassInfo: {
    marginBottom: 12,
  },
  nextClassName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  nextClassDateTime: {
    fontSize: 14,
    marginBottom: 4,
  },
  nextClassTimeUntil: {
    fontSize: 14,
    fontWeight: '600',
  },
  nextClassStats: {
    flexDirection: 'row',
    gap: 16,
  },
  nextClassStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  nextClassStatText: {
    fontSize: 14,
  },
  nextClassHint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  nextClassHintText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
});

export default TrainerDashboardScreen;
