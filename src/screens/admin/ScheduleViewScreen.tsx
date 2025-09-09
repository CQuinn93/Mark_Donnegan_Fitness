import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../theme/ThemeContext';
import { scheduleService } from '../../services/api';

interface Props {
  navigation: any;
  route: any;
}

interface ClassSchedule {
  id: string;
  class_name: string;
  trainer_name: string;
  scheduled_date: string;
  scheduled_time: string;
  difficulty_level: string;
  location: string;
  current_bookings: number;
  max_bookings: number;
  status: string;
}

const ScheduleViewScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Ensure it's set to start of day
    return today;
  });
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [availableDates, setAvailableDates] = useState<Date[]>([]);
  const [scheduledClasses, setScheduledClasses] = useState<ClassSchedule[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    console.log('ScheduleView - Initial selected date:', selectedDate.toISOString().split('T')[0]);
    generateAvailableDates();
    loadScheduledClasses();
  }, []);

  // Refresh data when screen comes into focus (e.g., returning from other screens)
  useFocusEffect(
    React.useCallback(() => {
      loadScheduledClasses();
    }, [])
  );

  useEffect(() => {
    // Update classes when selected date changes
    console.log('ScheduleView - Selected date changed to:', selectedDate.toISOString().split('T')[0]);
    const classesForDate = getScheduledClassesForDate(selectedDate);
    console.log('ScheduleView - Classes for new date:', classesForDate.length);
  }, [selectedDate, scheduledClasses]);

  const generateAvailableDates = () => {
    const dates: Date[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get current week start (Monday)
    const currentWeekStart = new Date(today);
    const dayOfWeek = today.getDay();
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Sunday = 0, Monday = 1
    currentWeekStart.setDate(today.getDate() + daysToMonday);
    
    // Generate dates for current week + 2 following weeks (3 weeks total)
    for (let week = 0; week < 3; week++) {
      for (let day = 0; day < 7; day++) {
        const date = new Date(currentWeekStart);
        date.setDate(currentWeekStart.getDate() + (week * 7) + day);
        
        // Only include future dates (including today)
        if (date >= today) {
          dates.push(date);
        }
      }
    }
    
    console.log('ScheduleView - Generated available dates:', dates.length, 'dates starting from', dates[0]?.toISOString().split('T')[0]);
    setAvailableDates(dates);
  };

  const loadScheduledClasses = async () => {
    setLoading(true);
    try {
      // Load only FUTURE class schedules from the database
      console.log('Loading future class schedules for ScheduleView...');
      
      // Only get classes from today onwards
      const today = new Date().toISOString().split('T')[0];
      const endDate = '2030-12-31';   // Far future date
      
      const result = await scheduleService.getScheduledClasses(today, endDate);
      
      if (result.error) {
        console.error('Error loading scheduled classes:', result.error);
        setScheduledClasses([]);
        return;
      }
      
      // Transform the data to match our interface
      const transformedClasses: ClassSchedule[] = (result.schedules || []).map((schedule: any) => ({
        id: schedule.id,
        class_name: schedule.classes?.name || 'Unknown Class',
        trainer_name: schedule.profiles ? `${schedule.profiles.first_name} ${schedule.profiles.last_name}` : 'Unknown Trainer',
        scheduled_date: schedule.scheduled_date,
        scheduled_time: schedule.scheduled_time,
        difficulty_level: schedule.difficulty_level,
        location: schedule.location,
        current_bookings: schedule.current_bookings || 0,
        max_bookings: schedule.max_bookings,
        status: schedule.status
      }));
      
      console.log('Loaded future scheduled classes for ScheduleView:', transformedClasses.length, 'classes');
      console.log('Sample classes:', transformedClasses.slice(0, 3).map(c => ({ date: c.scheduled_date, time: c.scheduled_time, class: c.class_name })));
      setScheduledClasses(transformedClasses);
    } catch (error) {
      console.error('Error loading scheduled classes:', error);
      setScheduledClasses([]);
    } finally {
      setLoading(false);
    }
  };

  const getScheduledClassesForDate = (date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    const matchingClasses = scheduledClasses.filter(cls => cls.scheduled_date === dateString);
    console.log(`ScheduleView - Classes for ${dateString}:`, matchingClasses.length, matchingClasses.map(c => ({ date: c.scheduled_date, time: c.scheduled_time, class: c.class_name })));
    return matchingClasses;
  };

  const handleRemoveClass = (classId: string) => {
    Alert.alert(
      'Remove Class',
      'Are you sure you want to remove this class?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: async () => {
            const result = await scheduleService.deleteClassSchedule(classId);
            if (result.error) {
              Alert.alert('Error', result.error);
              return;
            }
            setScheduledClasses(prev => prev.filter(cls => cls.id !== classId));
            Alert.alert('Success', 'Class removed successfully');
          }
        }
      ]
    );
  };

  const handleChangeClass = (classId: string) => {
    // TODO: Navigate to edit class screen or show edit modal
    Alert.alert('Change Class', 'Edit class functionality will be implemented');
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateShort = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return '#666666';
      case 'intermediate': return '#333333';
      case 'advanced': return '#000000';
      default: return '#666666';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#000000';
      case 'cancelled': return '#666666';
      case 'completed': return '#CCCCCC';
      default: return '#000000';
    }
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const renderClassCard = (schedule: ClassSchedule) => (
    <View key={schedule.id} style={[styles.classCard, { backgroundColor: '#333333' }]}>
      <View style={styles.classHeader}>
        <View style={styles.classTitleContainer}>
          <Text style={[styles.classTitle, { color: 'white' }]}>
            {schedule.class_name}
          </Text>
          <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(schedule.difficulty_level) }]}>
            <Text style={styles.badgeText}>{schedule.difficulty_level}</Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(schedule.status) }]}>
          <Text style={styles.badgeText}>{schedule.status}</Text>
        </View>
      </View>
      
      <View style={styles.classDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="time" size={16} color="#B0B0B0" />
          <Text style={[styles.detailText, { color: '#B0B0B0' }]}>
            {formatTime(schedule.scheduled_time)}
          </Text>
        </View>
        
        <View style={styles.detailRow}>
          <Ionicons name="person" size={16} color="#B0B0B0" />
          <Text style={[styles.detailText, { color: '#B0B0B0' }]}>
            {schedule.trainer_name}
          </Text>
        </View>
        
        <View style={styles.detailRow}>
          <Ionicons name={schedule.location === 'park' ? 'leaf' : 'business'} size={16} color="#B0B0B0" />
          <Text style={[styles.detailText, { color: '#B0B0B0' }]}>
            {schedule.location === 'park' ? 'Park' : 'Gym'}
          </Text>
        </View>
        
        <View style={styles.detailRow}>
          <Ionicons name="people" size={16} color="#B0B0B0" />
          <Text style={[styles.detailText, { color: '#B0B0B0' }]}>
            {schedule.current_bookings}/{schedule.max_bookings === 999 ? '∞' : schedule.max_bookings} booked
          </Text>
        </View>
      </View>
      
      <View style={styles.classActions}>
        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: '#666666' }]}
          onPress={() => handleChangeClass(schedule.id)}
        >
          <Ionicons name="create" size={16} color="white" />
          <Text style={styles.actionText}>Change</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: '#F44336' }]}
          onPress={() => handleRemoveClass(schedule.id)}
        >
          <Ionicons name="trash" size={16} color="white" />
          <Text style={styles.actionText}>Remove</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: '#000000' }]}>
        <ActivityIndicator size="large" color="white" />
      </View>
    );
  }

  const classesForSelectedDate = getScheduledClassesForDate(selectedDate);

  return (
    <View style={[styles.container, { backgroundColor: '#000000' }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: '#000000' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: 'white' }]}>
          View Schedule
        </Text>
        <TouchableOpacity onPress={() => navigation.navigate('SelectDate')} style={styles.addButton}>
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Date Selection */}
      <View style={[styles.dateSection, { backgroundColor: '#333333' }]}>
        <Text style={[styles.sectionTitle, { color: 'white' }]}>
          Select Date to View Classes
        </Text>
        
        <TouchableOpacity
          style={[styles.dateButton, { backgroundColor: '#000000' }]}
          onPress={() => setShowDateDropdown(true)}
        >
          <Ionicons name="calendar" size={24} color="white" />
          <View style={styles.dateInfo}>
            <Text style={[styles.dateText, { color: 'white' }]}>
              {formatDate(selectedDate)}
            </Text>
            <Text style={[styles.dateShort, { color: '#B0B0B0' }]}>
              {formatDateShort(selectedDate)}
            </Text>
          </View>
          <View style={styles.dateCount}>
            <Text style={[styles.dateCountText, { color: 'white' }]}>
              {classesForSelectedDate.length}
            </Text>
            <Text style={[styles.dateCountLabel, { color: '#B0B0B0' }]}>
              classes
            </Text>
          </View>
          <Ionicons name="chevron-down" size={20} color="#B0B0B0" />
        </TouchableOpacity>
      </View>

      {/* Classes List */}
      <ScrollView style={styles.content}>
        {classesForSelectedDate.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: '#333333' }]}>
            <Ionicons name="calendar-outline" size={48} color="#B0B0B0" />
            <Text style={[styles.emptyStateText, { color: '#B0B0B0' }]}>
              No classes scheduled for this date
            </Text>
            <TouchableOpacity
              style={[styles.emptyStateButton, { backgroundColor: '#666666' }]}
              onPress={() => navigation.navigate('SelectDate')}
            >
              <Text style={styles.emptyStateButtonText}>Schedule a Class</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.classesList}>
            {classesForSelectedDate.map(renderClassCard)}
          </View>
        )}
      </ScrollView>

      {/* Date Dropdown Modal */}
      <Modal
        visible={showDateDropdown}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDateDropdown(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.dateDropdownModal, { backgroundColor: '#333333' }]}>
            <View style={styles.dropdownHeader}>
              <Text style={[styles.dropdownTitle, { color: 'white' }]}>
                Select Date
              </Text>
              <TouchableOpacity onPress={() => setShowDateDropdown(false)}>
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.dropdownContent}>
              {availableDates.map((date, index) => {
                const isSelected = date.toDateString() === selectedDate.toDateString();
                const classesCount = getScheduledClassesForDate(date).length;
                const isToday = date.toDateString() === new Date().toDateString();
                
                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.dateOption,
                      { 
                        backgroundColor: isSelected ? '#000000' : 'transparent',
                        borderBottomColor: '#666666' 
                      }
                    ]}
                    onPress={() => {
                      setSelectedDate(date);
                      setShowDateDropdown(false);
                    }}
                  >
                    <View style={styles.dateOptionContent}>
                      <View style={styles.dateOptionMain}>
                        <Text style={[
                          styles.dateOptionText,
                          { color: isSelected ? 'white' : 'white' }
                        ]}>
                          {formatDate(date)}
                        </Text>
                        <Text style={[
                          styles.dateOptionSubtext,
                          { color: isSelected ? '#B0B0B0' : '#B0B0B0' }
                        ]}>
                          {formatDateShort(date)}
                          {isToday && ' • Today'}
                        </Text>
                      </View>
                      <View style={styles.dateOptionCount}>
                        <Text style={[
                          styles.dateCountText,
                          { color: isSelected ? 'white' : 'white' }
                        ]}>
                          {classesCount}
                        </Text>
                        <Text style={[
                          styles.dateCountLabel,
                          { color: isSelected ? '#B0B0B0' : '#B0B0B0' }
                        ]}>
                          classes
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  addButton: {
    padding: 8,
  },
  dateSection: {
    padding: 20,
    borderRadius: 12,
    margin: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  dateInfo: {
    flex: 1,
    marginLeft: 12,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
  },
  dateShort: {
    fontSize: 14,
    marginTop: 2,
  },
  dateCount: {
    alignItems: 'center',
    marginRight: 12,
  },
  dateCountText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  dateCountLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  classesList: {
    paddingBottom: 20,
  },
  classCard: {
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
  classHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  classTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  classTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 8,
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  classDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    marginLeft: 8,
  },
  classActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 8,
  },
  actionText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  emptyState: {
    padding: 40,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 40,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  dateDropdownModal: {
    maxHeight: '70%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  dropdownTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  dropdownContent: {
    maxHeight: 400,
  },
  dateOption: {
    padding: 16,
    borderBottomWidth: 1,
  },
  dateOptionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateOptionMain: {
    flex: 1,
  },
  dateOptionText: {
    fontSize: 16,
    fontWeight: '600',
  },
  dateOptionSubtext: {
    fontSize: 14,
    marginTop: 2,
  },
  dateOptionCount: {
    alignItems: 'center',
  },
});

export default ScheduleViewScreen;