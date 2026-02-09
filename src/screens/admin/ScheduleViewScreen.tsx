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
  TextInput,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../../theme/ThemeContext';
import { useAdminData } from '../../context/AdminDataContext';
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

const predefinedTimes = [
  { label: '6:00 AM', value: '06:00' },
  { label: '7:00 AM', value: '07:00' },
  { label: '9:00 AM', value: '09:00' },
  { label: '9:30 AM', value: '09:30' },
  { label: '5:00 PM', value: '17:00' },
  { label: '7:00 PM', value: '19:00' },
];

const ScheduleViewScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { scheduledClasses: cachedSchedules, classes: adminClasses, trainers: adminTrainers, refreshScheduledClasses } = useAdminData();
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Ensure it's set to start of day
    return today;
  });
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [availableDates, setAvailableDates] = useState<Date[]>([]);
  const [scheduledClasses, setScheduledClasses] = useState<ClassSchedule[]>([]);
  const [loading, setLoading] = useState(false);

  // Edit modal state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<any>(null);
  const [editTrainerId, setEditTrainerId] = useState<string>('');
  const [editClassId, setEditClassId] = useState<string>('');
  const [editMaxBookings, setEditMaxBookings] = useState<string>('');
  const [editDate, setEditDate] = useState<Date>(new Date());
  const [editTime, setEditTime] = useState<string>('09:00');
  const [editDifficulty, setEditDifficulty] = useState<string>('beginner');
  const [editLocation, setEditLocation] = useState<string>('gym');
  const [editStatus, setEditStatus] = useState<string>('active');
  const [showEditDatePicker, setShowEditDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);

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
      // Use cached scheduled classes from context instead of API call
      if (cachedSchedules && cachedSchedules.length > 0) {
        // Filter to only future classes (from today onwards)
        const today = new Date().toISOString().split('T')[0];
        const futureSchedules = cachedSchedules.filter(
          (schedule: any) => schedule.scheduled_date >= today
        );
        
        // Transform the data to match our interface
        const transformedClasses: ClassSchedule[] = futureSchedules.map((schedule: any) => ({
          id: schedule.id,
          class_name: schedule.classes?.name || 'Unknown Class',
          trainer_name: schedule.profiles 
            ? `${schedule.profiles.first_name} ${schedule.profiles.last_name}` 
            : 'Unknown Trainer',
          scheduled_date: schedule.scheduled_date,
          scheduled_time: schedule.scheduled_time,
          difficulty_level: schedule.difficulty_level,
          location: schedule.location,
          current_bookings: schedule.current_bookings || 0,
          max_bookings: schedule.max_bookings,
          status: schedule.status
        }));
        
        console.log('Loaded future scheduled classes from cache for ScheduleView:', transformedClasses.length, 'classes');
        setScheduledClasses(transformedClasses);
      } else {
        // Fallback to API if cache is empty (shouldn't happen)
        console.log('Cache empty, loading from API...');
        const today = new Date().toISOString().split('T')[0];
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 90); // Only 90 days ahead
        
        const result = await scheduleService.getScheduledClasses(today, endDate.toISOString().split('T')[0]);
        
        if (result.error) {
          console.error('Error loading scheduled classes:', result.error);
          setScheduledClasses([]);
          return;
        }
        
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
        
        setScheduledClasses(transformedClasses);
      }
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

  const handleChangeClass = (scheduleId: string) => {
    const rawSchedule = cachedSchedules?.find((s: any) => s.id === scheduleId);
    if (!rawSchedule) {
      Alert.alert('Error', 'Could not find schedule details');
      return;
    }
    setEditingSchedule(rawSchedule);
    setEditTrainerId(rawSchedule.trainer_id || '');
    setEditClassId(rawSchedule.class_id || '');
    setEditMaxBookings(String(rawSchedule.max_bookings ?? 10));
    setEditDate(new Date(`${rawSchedule.scheduled_date}T${rawSchedule.scheduled_time || '09:00'}`));
    setEditTime(rawSchedule.scheduled_time || '09:00');
    setEditDifficulty(rawSchedule.difficulty_level || 'beginner');
    setEditLocation(rawSchedule.location || 'gym');
    setEditStatus(rawSchedule.status || 'active');
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!editingSchedule) return;

    const maxBookingsNum = parseInt(editMaxBookings, 10);
    if (isNaN(maxBookingsNum) || maxBookingsNum < 1) {
      Alert.alert('Error', 'Max bookings must be at least 1');
      return;
    }
    if (maxBookingsNum < (editingSchedule.current_bookings || 0)) {
      Alert.alert('Error', `Max bookings cannot be less than current bookings (${editingSchedule.current_bookings})`);
      return;
    }

    setSaving(true);
    try {
      const updates: Record<string, any> = {};
      if (editTrainerId !== editingSchedule.trainer_id) updates.trainer_id = editTrainerId;
      if (editClassId !== editingSchedule.class_id) updates.class_id = editClassId;
      if (maxBookingsNum !== editingSchedule.max_bookings) updates.max_bookings = maxBookingsNum;
      const dateStr = editDate.toISOString().split('T')[0];
      if (dateStr !== editingSchedule.scheduled_date) updates.scheduled_date = dateStr;
      if (editTime !== editingSchedule.scheduled_time) updates.scheduled_time = editTime;
      if (editDifficulty !== editingSchedule.difficulty_level) updates.difficulty_level = editDifficulty;
      if (editLocation !== editingSchedule.location) updates.location = editLocation;
      if (editStatus !== editingSchedule.status) updates.status = editStatus;

      if (Object.keys(updates).length === 0) {
        setEditModalVisible(false);
        setEditingSchedule(null);
        setSaving(false);
        return;
      }

      const result = await scheduleService.updateClassSchedule(editingSchedule.id, updates);
      if (result.error) {
        Alert.alert('Error', result.error);
        return;
      }

      await refreshScheduledClasses();
      loadScheduledClasses();
      setEditModalVisible(false);
      setEditingSchedule(null);
      Alert.alert('Success', 'Class updated successfully');
    } catch (error) {
      console.error('Error updating class:', error);
      Alert.alert('Error', 'Failed to update class');
    } finally {
      setSaving(false);
    }
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
      case 'beginner': return theme.colors.textSecondary;
      case 'intermediate': return theme.colors.secondary;
      case 'advanced': return theme.colors.primary;
      default: return theme.colors.textSecondary;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return theme.colors.primary;
      case 'cancelled': return theme.colors.textSecondary;
      case 'completed': return theme.colors.border;
      default: return theme.colors.primary;
    }
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const renderClassCard = (schedule: ClassSchedule) => (
    <View key={schedule.id} style={[styles.classCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <View style={styles.classHeader}>
        <View style={styles.classTitleContainer}>
          <Text style={[styles.classTitle, { color: theme.colors.text }]}>
            {schedule.class_name}
          </Text>
          <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(schedule.difficulty_level) }]}>
            <Text style={[styles.badgeText, { color: theme.colors.background }]}>{schedule.difficulty_level}</Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(schedule.status) }]}>
          <Text style={[styles.badgeText, { color: theme.colors.background }]}>{schedule.status}</Text>
        </View>
      </View>
      
      <View style={styles.classDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="time" size={16} color={theme.colors.textSecondary} />
          <Text style={[styles.detailText, { color: theme.colors.textSecondary }]}>
            {formatTime(schedule.scheduled_time)}
          </Text>
        </View>
        
        <View style={styles.detailRow}>
          <Ionicons name="person" size={16} color={theme.colors.textSecondary} />
          <Text style={[styles.detailText, { color: theme.colors.textSecondary }]}>
            {schedule.trainer_name}
          </Text>
        </View>
        
        <View style={styles.detailRow}>
          <Ionicons name={schedule.location === 'park' ? 'leaf' : 'business'} size={16} color={theme.colors.textSecondary} />
          <Text style={[styles.detailText, { color: theme.colors.textSecondary }]}>
            {schedule.location === 'park' ? 'Park' : 'Gym'}
          </Text>
        </View>
        
        <View style={styles.detailRow}>
          <Ionicons name="people" size={16} color={theme.colors.textSecondary} />
          <Text style={[styles.detailText, { color: theme.colors.textSecondary }]}>
            {schedule.current_bookings}/{schedule.max_bookings === 999 ? '∞' : schedule.max_bookings} booked
          </Text>
        </View>
      </View>
      
      <View style={styles.classActions}>
        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: theme.colors.secondary }]}
          onPress={() => handleChangeClass(schedule.id)}
        >
          <Ionicons name="create" size={16} color={theme.colors.background} />
          <Text style={[styles.actionText, { color: theme.colors.background }]}>Change</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: theme.colors.error }]}
          onPress={() => handleRemoveClass(schedule.id)}
        >
          <Ionicons name="trash" size={16} color={theme.colors.background} />
          <Text style={[styles.actionText, { color: theme.colors.background }]}>Remove</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEditModal = () => (
    <Modal
      visible={editModalVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => {
        setEditModalVisible(false);
        setEditingSchedule(null);
      }}
    >
      <SafeAreaView style={[editStyles.modalContainer, { backgroundColor: theme.colors.background }]}>
        <View style={[editStyles.modalHeader, { borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity onPress={() => { setEditModalVisible(false); setEditingSchedule(null); }}>
            <Text style={[editStyles.modalButton, { color: theme.colors.primary }]}>Cancel</Text>
          </TouchableOpacity>
          <Text style={[editStyles.modalTitle, { color: theme.colors.text }]}>Edit Class</Text>
          <TouchableOpacity onPress={handleSaveEdit} disabled={saving}>
            <Text style={[editStyles.modalButton, { color: theme.colors.primary, opacity: saving ? 0.5 : 1 }]}>
              {saving ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={editStyles.modalContent}>
          {editingSchedule && (
            <>
              {/* Trainer */}
              <Text style={[editStyles.label, { color: theme.colors.text }]}>Trainer</Text>
              {adminTrainers.map((trainer: any) => (
                <TouchableOpacity
                  key={trainer.id}
                  style={[
                    editStyles.option,
                    { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                    editTrainerId === trainer.id && { borderColor: theme.colors.primary, borderWidth: 2 }
                  ]}
                  onPress={() => setEditTrainerId(trainer.id)}
                >
                  <Text style={[editStyles.optionText, { color: theme.colors.text }]}>
                    {trainer.first_name} {trainer.last_name}
                  </Text>
                  {editTrainerId === trainer.id && <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />}
                </TouchableOpacity>
              ))}

              {/* Class Type */}
              <Text style={[editStyles.label, { color: theme.colors.text }]}>Class Type</Text>
              {adminClasses.map((cls: any) => (
                <TouchableOpacity
                  key={cls.id}
                  style={[
                    editStyles.option,
                    { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                    editClassId === cls.id && { borderColor: theme.colors.primary, borderWidth: 2 }
                  ]}
                  onPress={() => setEditClassId(cls.id)}
                >
                  <Text style={[editStyles.optionText, { color: theme.colors.text }]}>{cls.name}</Text>
                  {editClassId === cls.id && <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />}
                </TouchableOpacity>
              ))}

              {/* Max Bookings */}
              <Text style={[editStyles.label, { color: theme.colors.text }]}>Max Spaces</Text>
              <TextInput
                style={[editStyles.input, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text }]}
                value={editMaxBookings}
                onChangeText={setEditMaxBookings}
                keyboardType="number-pad"
                placeholder="e.g. 10"
                placeholderTextColor={theme.colors.textSecondary}
              />
              <Text style={[editStyles.hint, { color: theme.colors.textSecondary }]}>
                Current bookings: {editingSchedule.current_bookings || 0}. Must be ≥ current bookings.
              </Text>

              {/* Date */}
              <Text style={[editStyles.label, { color: theme.colors.text }]}>Date</Text>
              <TouchableOpacity
                style={[editStyles.dateButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                onPress={() => setShowEditDatePicker(true)}
              >
                <Text style={[editStyles.dateButtonText, { color: theme.colors.text }]}>
                  {editDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </Text>
                <Ionicons name="calendar" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
              {showEditDatePicker && (
                <DateTimePicker
                  value={editDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(_, date) => {
                    setShowEditDatePicker(Platform.OS === 'android');
                    if (date) setEditDate(date);
                  }}
                  minimumDate={new Date()}
                />
              )}

              {/* Time */}
              <Text style={[editStyles.label, { color: theme.colors.text }]}>Time</Text>
              <View style={editStyles.timeRow}>
                {predefinedTimes.map((t) => (
                  <TouchableOpacity
                    key={t.value}
                    style={[
                      editStyles.timeOption,
                      { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                      editTime === t.value && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                    ]}
                    onPress={() => setEditTime(t.value)}
                  >
                    <Text style={[editStyles.timeOptionText, { color: editTime === t.value ? theme.colors.background : theme.colors.text }]}>
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Difficulty */}
              <Text style={[editStyles.label, { color: theme.colors.text }]}>Difficulty</Text>
              <View style={editStyles.row}>
                {['beginner', 'intermediate', 'advanced'].map((d) => (
                  <TouchableOpacity
                    key={d}
                    style={[
                      editStyles.chip,
                      { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                      editDifficulty === d && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                    ]}
                    onPress={() => setEditDifficulty(d)}
                  >
                    <Text style={[editStyles.chipText, { color: editDifficulty === d ? theme.colors.background : theme.colors.text }]}>
                      {d.charAt(0).toUpperCase() + d.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Location */}
              <Text style={[editStyles.label, { color: theme.colors.text }]}>Location</Text>
              <View style={editStyles.row}>
                <TouchableOpacity
                  style={[
                    editStyles.chip,
                    { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                    editLocation === 'gym' && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                  ]}
                  onPress={() => setEditLocation('gym')}
                >
                  <Text style={[editStyles.chipText, { color: editLocation === 'gym' ? theme.colors.background : theme.colors.text }]}>Gym</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    editStyles.chip,
                    { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                    editLocation === 'park' && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                  ]}
                  onPress={() => setEditLocation('park')}
                >
                  <Text style={[editStyles.chipText, { color: editLocation === 'park' ? theme.colors.background : theme.colors.text }]}>Park</Text>
                </TouchableOpacity>
              </View>

              {/* Status */}
              <Text style={[editStyles.label, { color: theme.colors.text }]}>Status</Text>
              <View style={editStyles.row}>
                {['active', 'cancelled', 'completed'].map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[
                      editStyles.chip,
                      { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                      editStatus === s && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                    ]}
                    onPress={() => setEditStatus(s)}
                  >
                    <Text style={[editStyles.chipText, { color: editStatus === s ? theme.colors.background : theme.colors.text }]}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.text} />
      </View>
    );
  }

  const classesForSelectedDate = getScheduledClassesForDate(selectedDate);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.background, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          View Schedule
        </Text>
        <TouchableOpacity onPress={() => navigation.navigate('SelectDate')} style={styles.addButton}>
          <Ionicons name="add" size={24} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      {/* Date Selection */}
      <View style={[styles.dateSection, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          Select Date to View Classes
        </Text>
        
        <TouchableOpacity
          style={[styles.dateButton, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}
          onPress={() => setShowDateDropdown(true)}
        >
          <Ionicons name="calendar" size={24} color={theme.colors.text} />
          <View style={styles.dateInfo}>
            <Text style={[styles.dateText, { color: theme.colors.text }]}>
              {formatDate(selectedDate)}
            </Text>
            <Text style={[styles.dateShort, { color: theme.colors.textSecondary }]}>
              {formatDateShort(selectedDate)}
            </Text>
          </View>
          <View style={styles.dateCount}>
            <Text style={[styles.dateCountText, { color: theme.colors.text }]}>
              {classesForSelectedDate.length}
            </Text>
            <Text style={[styles.dateCountLabel, { color: theme.colors.textSecondary }]}>
              classes
            </Text>
          </View>
          <Ionicons name="chevron-down" size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Classes List */}
      <ScrollView style={styles.content}>
        {classesForSelectedDate.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Ionicons name="calendar-outline" size={48} color={theme.colors.textSecondary} />
            <Text style={[styles.emptyStateText, { color: theme.colors.textSecondary }]}>
              No classes scheduled for this date
            </Text>
            <TouchableOpacity
              style={[styles.emptyStateButton, { backgroundColor: theme.colors.secondary }]}
              onPress={() => navigation.navigate('SelectDate')}
            >
              <Text style={[styles.emptyStateButtonText, { color: theme.colors.background }]}>Schedule a Class</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.classesList}>
            {classesForSelectedDate.map(renderClassCard)}
          </View>
        )}
      </ScrollView>

      {/* Edit Class Modal */}
      {renderEditModal()}

      {/* Date Dropdown Modal */}
      <Modal
        visible={showDateDropdown}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDateDropdown(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.dateDropdownModal, { backgroundColor: theme.colors.surface }]}>
            <View style={[styles.dropdownHeader, { borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.dropdownTitle, { color: theme.colors.text }]}>
                Select Date
              </Text>
              <TouchableOpacity onPress={() => setShowDateDropdown(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
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
                        backgroundColor: isSelected ? theme.colors.primary : 'transparent',
                        borderBottomColor: theme.colors.border 
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
                          { color: isSelected ? theme.colors.background : theme.colors.text }
                        ]}>
                          {formatDate(date)}
                        </Text>
                        <Text style={[
                          styles.dateOptionSubtext,
                          { color: isSelected ? theme.colors.textSecondary : theme.colors.textSecondary }
                        ]}>
                          {formatDateShort(date)}
                          {isToday && ' • Today'}
                        </Text>
                      </View>
                      <View style={styles.dateOptionCount}>
                        <Text style={[
                          styles.dateCountText,
                          { color: isSelected ? theme.colors.background : theme.colors.text }
                        ]}>
                          {classesCount}
                        </Text>
                        <Text style={[
                          styles.dateCountLabel,
                          { color: isSelected ? theme.colors.textSecondary : theme.colors.textSecondary }
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
    borderWidth: 1,
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
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  emptyState: {
    padding: 40,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 40,
    borderWidth: 1,
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

const editStyles = StyleSheet.create({
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  optionText: {
    fontSize: 16,
  },
  input: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
  },
  hint: {
    fontSize: 12,
    marginTop: 4,
    marginBottom: 0,
  },
  dateButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  dateButtonText: {
    fontSize: 16,
  },
  timeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  timeOptionText: {
    fontSize: 14,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 14,
  },
});

export default ScheduleViewScreen;