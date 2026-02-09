import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { useAdminData } from '../../context/AdminDataContext';
import { userService, trainerDaysOffService } from '../../services/api';
import { supabaseApi } from '../../config/supabase';
import { User } from '../../types';
import DateTimePicker from '@react-native-community/datetimepicker';

interface TrainerWithStats extends User {
  trainer_code?: string;
  scheduledClassesCount: number;
  upcomingClassesCount: number;
  upcomingClasses: Array<{
    id: string;
    scheduled_date: string;
    scheduled_time: string;
    classes: {
      name: string;
      duration: number;
    };
    status: string;
  }>;
}

interface Props {
  navigation: any;
  route: any;
}

const TrainerManagementScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { users: cachedUsers, scheduledClasses: cachedSchedules, refreshUsers, refreshScheduledClasses } = useAdminData();
  const [trainers, setTrainers] = useState<TrainerWithStats[]>([]);
  const [filteredTrainers, setFilteredTrainers] = useState<TrainerWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingTrainer, setEditingTrainer] = useState<TrainerWithStats | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [expandedTrainer, setExpandedTrainer] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    role: 'trainer' as 'member' | 'trainer' | 'admin',
    trainer_code: '',
  });
  const [reassignModalVisible, setReassignModalVisible] = useState(false);
  const [selectedClassSchedule, setSelectedClassSchedule] = useState<any>(null);
  const [availableTrainers, setAvailableTrainers] = useState<User[]>([]);
  const [daysOffModalVisible, setDaysOffModalVisible] = useState(false);
  const [selectedTrainerForDaysOff, setSelectedTrainerForDaysOff] = useState<TrainerWithStats | null>(null);
  const [daysOffList, setDaysOffList] = useState<any[]>([]);
  const [newDayOffDate, setNewDayOffDate] = useState(new Date());
  const [newDayOffType, setNewDayOffType] = useState<'day_off' | 'annual_leave' | 'sick_leave'>('day_off');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loadingDaysOff, setLoadingDaysOff] = useState(false);

  useEffect(() => {
    loadTrainers();
  }, []);

  useEffect(() => {
    filterTrainers();
  }, [trainers, searchQuery]);

  const loadTrainers = async () => {
    try {
      setLoading(true);
      
      // Use cached users instead of making API call
      if (!cachedUsers || cachedUsers.length === 0) {
        await refreshUsers();
        return;
      }

      // Filter to only show trainers
      const trainerUsers = cachedUsers.filter(user => user.role === 'trainer');
      
      // Calculate statistics from cached scheduled classes (no API calls needed!)
      const today = new Date().toISOString().split('T')[0];
      const trainersWithStats = trainerUsers.map((trainer) => {
        // Filter schedules for this trainer from cache
        const trainerSchedules = cachedSchedules.filter(
          (schedule: any) => schedule.trainer_id === trainer.id
        );
        
        // Count total classes (active, ongoing, completed)
        const totalClasses = trainerSchedules.filter(
          (schedule: any) => ['active', 'ongoing', 'completed'].includes(schedule.status)
        );
        
        // Get upcoming classes (active + ongoing, from today onwards)
        const upcomingClasses = trainerSchedules
          .filter((schedule: any) => 
            ['active', 'ongoing'].includes(schedule.status) &&
            schedule.scheduled_date >= today
          )
          .map((schedule: any) => ({
            id: schedule.id,
            scheduled_date: schedule.scheduled_date,
            scheduled_time: schedule.scheduled_time,
            status: schedule.status,
            classes: schedule.classes || null,
          }))
          .sort((a, b) => {
            const dateCompare = a.scheduled_date.localeCompare(b.scheduled_date);
            return dateCompare !== 0 ? dateCompare : a.scheduled_time.localeCompare(b.scheduled_time);
          });

        return {
          ...trainer,
          scheduledClassesCount: totalClasses.length,
          upcomingClassesCount: upcomingClasses.length,
          upcomingClasses: upcomingClasses,
        };
      });

      setTrainers(trainersWithStats);
    } catch (error) {
      console.error('Error loading trainers:', error);
      Alert.alert('Error', 'Failed to load trainers');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTrainers();
    setRefreshing(false);
  };

  const filterTrainers = () => {
    if (!searchQuery.trim()) {
      setFilteredTrainers(trainers);
      return;
    }

    const filtered = trainers.filter(trainer =>
      trainer.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      trainer.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      trainer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (trainer.trainer_code && trainer.trainer_code.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    setFilteredTrainers(filtered);
  };

  const handleEditTrainer = (trainer: TrainerWithStats) => {
    setEditingTrainer(trainer);
    setEditForm({
      first_name: trainer.first_name,
      last_name: trainer.last_name,
      email: trainer.email,
      phone: trainer.phone || '',
      role: trainer.role as 'member' | 'trainer' | 'admin',
      trainer_code: trainer.trainer_code || '',
    });
    setEditModalVisible(true);
  };

  const handleDeleteTrainer = (trainer: TrainerWithStats) => {
    if (trainer.scheduledClassesCount > 0) {
      Alert.alert(
        'Cannot Delete Trainer',
        `This trainer has ${trainer.scheduledClassesCount} scheduled classes. Please reassign or cancel these classes before deleting the trainer.`,
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Delete Trainer',
      `Are you sure you want to delete ${trainer.first_name} ${trainer.last_name}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteTrainer(trainer.id),
        },
      ]
    );
  };

  const deleteTrainer = async (trainerId: string) => {
    try {
      await userService.deleteUser(trainerId);
      Alert.alert('Success', 'Trainer deleted successfully');
      await loadTrainers();
    } catch (error) {
      console.error('Error deleting trainer:', error);
      Alert.alert('Error', 'Failed to delete trainer');
    }
  };

  const handleSaveEdit = async () => {
    if (!editingTrainer) return;

    try {
      await userService.updateUser(editingTrainer.id, editForm);
      Alert.alert('Success', 'Trainer updated successfully');
      setEditModalVisible(false);
      setEditingTrainer(null);
      await loadTrainers();
    } catch (error) {
      console.error('Error updating trainer:', error);
      Alert.alert('Error', 'Failed to update trainer');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const toggleExpanded = (trainerId: string) => {
    setExpandedTrainer(expandedTrainer === trainerId ? null : trainerId);
  };

  const handleCancelClass = (classSchedule: any) => {
    Alert.alert(
      'Cancel Class',
      `Are you sure you want to cancel this class?\n\n${classSchedule.classes?.name || 'Unknown Class'}\n${formatDate(classSchedule.scheduled_date)} at ${formatTime(classSchedule.scheduled_time)}`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await supabaseApi.patch(`/class_schedules?id=eq.${classSchedule.id}`, {
                status: 'cancelled',
              });
              Alert.alert('Success', 'Class has been cancelled');
              await loadTrainers();
            } catch (error) {
              console.error('Error cancelling class:', error);
              Alert.alert('Error', 'Failed to cancel class');
            }
          },
        },
      ]
    );
  };

  const handleReassignClass = async (classSchedule: any) => {
    // Load available trainers (excluding the current trainer)
    try {
      const usersResponse = await userService.getAllUsers();
      const allTrainers = usersResponse.users?.filter(
        (user) => user.role === 'trainer' && user.id !== classSchedule.trainer_id
      ) || [];
      setAvailableTrainers(allTrainers);
      setSelectedClassSchedule(classSchedule);
      setReassignModalVisible(true);
    } catch (error) {
      console.error('Error loading trainers:', error);
      Alert.alert('Error', 'Failed to load available trainers');
    }
  };

  const confirmReassign = async (newTrainerId: string) => {
    if (!selectedClassSchedule) return;

    try {
      await supabaseApi.patch(`/class_schedules?id=eq.${selectedClassSchedule.id}`, {
        trainer_id: newTrainerId,
      });
      await refreshScheduledClasses();
      Alert.alert('Success', 'Class has been reassigned to the new trainer');
      setReassignModalVisible(false);
      setSelectedClassSchedule(null);
      await loadTrainers();
    } catch (error) {
      console.error('Error reassigning class:', error);
      Alert.alert('Error', 'Failed to reassign class');
    }
  };

  const handleManageDaysOff = async (trainer: TrainerWithStats) => {
    setSelectedTrainerForDaysOff(trainer);
    setDaysOffModalVisible(true);
    await loadTrainerDaysOff(trainer.id);
  };

  const loadTrainerDaysOff = async (trainerId: string) => {
    setLoadingDaysOff(true);
    try {
      // Load days off for the next 90 days
      const today = new Date();
      const endDate = new Date(today);
      endDate.setDate(today.getDate() + 90);
      const todayStr = today.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      
      const result = await trainerDaysOffService.getTrainerDaysOff(trainerId, todayStr, endDateStr);
      if (result.daysOff) {
        setDaysOffList(result.daysOff);
      } else {
        setDaysOffList([]);
      }
    } catch (error) {
      console.error('Error loading days off:', error);
      Alert.alert('Error', 'Failed to load days off');
    } finally {
      setLoadingDaysOff(false);
    }
  };

  const handleAddDayOff = async () => {
    if (!selectedTrainerForDaysOff) return;

    try {
      const dateStr = newDayOffDate.toISOString().split('T')[0];
      const result = await trainerDaysOffService.addTrainerDayOff(
        selectedTrainerForDaysOff.id,
        dateStr,
        newDayOffType
      );

      if (result.error) {
        Alert.alert('Error', result.error);
      } else {
        Alert.alert('Success', 'Day off added successfully');
        setNewDayOffDate(new Date());
        await loadTrainerDaysOff(selectedTrainerForDaysOff.id);
      }
    } catch (error) {
      console.error('Error adding day off:', error);
      Alert.alert('Error', 'Failed to add day off');
    }
  };

  const handleRemoveDayOff = async (dayOffId: string) => {
    Alert.alert(
      'Remove Day Off',
      'Are you sure you want to remove this day off?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await trainerDaysOffService.removeTrainerDayOff(dayOffId);
              if (result.error) {
                Alert.alert('Error', result.error);
              } else {
                Alert.alert('Success', 'Day off removed successfully');
                if (selectedTrainerForDaysOff) {
                  await loadTrainerDaysOff(selectedTrainerForDaysOff.id);
                }
              }
            } catch (error) {
              console.error('Error removing day off:', error);
              Alert.alert('Error', 'Failed to remove day off');
            }
          },
        },
      ]
    );
  };

  // Group classes by date
  const groupClassesByDate = (classes: any[]) => {
    const grouped: { [key: string]: any[] } = {};
    classes.forEach((classSchedule) => {
      const date = classSchedule.scheduled_date;
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(classSchedule);
    });
    // Sort dates
    const sortedDates = Object.keys(grouped).sort();
    // Sort classes within each date by time
    sortedDates.forEach((date) => {
      grouped[date].sort((a, b) => {
        const timeA = a.scheduled_time;
        const timeB = b.scheduled_time;
        return timeA.localeCompare(timeB);
      });
    });
    return { grouped, sortedDates };
  };

  const formatDateHeader = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    }
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

  const renderTrainerCard = (trainer: TrainerWithStats) => (
    <View key={trainer.id} style={[styles.trainerCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <View style={styles.trainerHeader}>
        <View style={styles.trainerInfo}>
          <Text style={[styles.trainerName, { color: theme.colors.text }]}>
            {trainer.first_name} {trainer.last_name}
          </Text>
          <Text style={[styles.trainerEmail, { color: theme.colors.textSecondary }]}>
            {trainer.email}
          </Text>
          {trainer.trainer_code && (
            <Text style={[styles.trainerCode, { color: theme.colors.textSecondary }]}>
              Code: {trainer.trainer_code}
            </Text>
          )}
        </View>
        <View style={styles.trainerActions}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#FFD700', marginRight: 8 }]}
            onPress={() => handleManageDaysOff(trainer)}
          >
            <Ionicons name="calendar-outline" size={16} color="#000000" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.colors.textSecondary }]}
            onPress={() => handleEditTrainer(trainer)}
          >
            <Ionicons name="pencil" size={16} color={theme.colors.background} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.actionButton, 
              { backgroundColor: trainer.scheduledClassesCount > 0 ? theme.colors.textSecondary : '#F44336' }
            ]}
            onPress={() => handleDeleteTrainer(trainer)}
            disabled={trainer.scheduledClassesCount > 0}
          >
            <Ionicons name="trash" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.trainerDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="call" size={16} color={theme.colors.textSecondary} />
          <Text style={[styles.detailText, { color: theme.colors.textSecondary }]}>
            {trainer.phone || 'No phone number'}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="calendar" size={16} color={theme.colors.textSecondary} />
          <Text style={[styles.detailText, { color: theme.colors.textSecondary }]}>
            Joined: {formatDate(trainer.created_at)}
          </Text>
        </View>
      </View>

      {/* Class Statistics */}
      <View style={[styles.statsContainer, { borderTopColor: theme.colors.border }]}>
        <TouchableOpacity 
          style={styles.statItem}
          onPress={() => toggleExpanded(trainer.id)}
        >
          <Text style={[styles.statNumber, { color: theme.colors.text }]}>
            {trainer.upcomingClassesCount}
          </Text>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
            Upcoming Classes
          </Text>
          <Ionicons 
            name={expandedTrainer === trainer.id ? "chevron-up" : "chevron-down"} 
            size={16} 
            color={theme.colors.textSecondary} 
            style={styles.chevronIcon}
          />
        </TouchableOpacity>
      </View>

      {/* Expanded Classes List */}
      {expandedTrainer === trainer.id && (() => {
        const { grouped, sortedDates } = groupClassesByDate(trainer.upcomingClasses);
        
        return (
          <View style={[styles.classesList, { borderTopColor: theme.colors.border }]}>
            {trainer.upcomingClasses.length === 0 ? (
              <Text style={[styles.noClassesText, { color: theme.colors.textSecondary }]}>
                No upcoming classes scheduled
              </Text>
            ) : (
              sortedDates.map((date) => (
                <View key={date} style={styles.dayGroup}>
                  <Text style={[styles.dayHeader, { color: theme.colors.text }]}>
                    {formatDateHeader(date)}
                  </Text>
                  {grouped[date].map((classSchedule) => {
                    const className = classSchedule.classes?.name || 'Unknown Class';
                    const classDuration = classSchedule.classes?.duration || 0;
                    const isCancelled = classSchedule.status === 'cancelled';
                    
                    return (
                      <View key={classSchedule.id} style={[styles.classItem, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                        <View style={styles.classInfo}>
                          <Text style={[styles.className, { color: theme.colors.text, opacity: isCancelled ? 0.6 : 1 }]}>
                            {className}
                          </Text>
                          <Text style={[styles.classDateTime, { color: theme.colors.textSecondary }]}>
                            {formatTime(classSchedule.scheduled_time)}
                          </Text>
                          {classDuration > 0 && (
                            <Text style={[styles.classDuration, { color: theme.colors.textSecondary }]}>
                              {classDuration} minutes
                            </Text>
                          )}
                        </View>
                        <View style={styles.classActions}>
                          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(classSchedule.status) }]}>
                            <Text style={styles.statusText}>{classSchedule.status.toUpperCase()}</Text>
                          </View>
                          {!isCancelled && (
                            <View style={styles.actionButtonsRow}>
                              <TouchableOpacity
                                style={[styles.classActionButton, { backgroundColor: theme.colors.textSecondary }]}
                                onPress={() => handleReassignClass(classSchedule)}
                              >
                                <Ionicons name="person-outline" size={16} color={theme.colors.background} />
                                <Text style={[styles.classActionButtonText, { color: theme.colors.background }]}>
                                  Reassign
                                </Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={[styles.classActionButton, { backgroundColor: '#F44336' }]}
                                onPress={() => handleCancelClass(classSchedule)}
                              >
                                <Ionicons name="close-circle-outline" size={16} color="#FFFFFF" />
                                <Text style={[styles.classActionButtonText, { color: '#FFFFFF' }]}>
                                  Cancel
                                </Text>
                              </TouchableOpacity>
                            </View>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              ))
            )}
          </View>
        );
      })()}
    </View>
  );

  const renderReassignModal = () => (
    <Modal
      visible={reassignModalVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => {
        setReassignModalVisible(false);
        setSelectedClassSchedule(null);
      }}
    >
      <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity onPress={() => {
            setReassignModalVisible(false);
            setSelectedClassSchedule(null);
          }}>
            <Text style={[styles.modalButton, { color: theme.colors.primary }]}>Cancel</Text>
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Reassign Class</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.modalContent}>
          {selectedClassSchedule && (
            <View style={[styles.reassignClassInfo, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <Text style={[styles.reassignClassTitle, { color: theme.colors.text }]}>
                {selectedClassSchedule.classes?.name || 'Unknown Class'}
              </Text>
              <Text style={[styles.reassignClassDetails, { color: theme.colors.textSecondary }]}>
                {formatDate(selectedClassSchedule.scheduled_date)} at {formatTime(selectedClassSchedule.scheduled_time)}
              </Text>
            </View>
          )}

          <Text style={[styles.reassignLabel, { color: theme.colors.text }]}>
            Select New Trainer:
          </Text>

          {availableTrainers.length === 0 ? (
            <Text style={[styles.noTrainersText, { color: theme.colors.textSecondary }]}>
              No other trainers available
            </Text>
          ) : (
            availableTrainers.map((trainer) => (
              <TouchableOpacity
                key={trainer.id}
                style={[styles.trainerOption, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                onPress={() => {
                  Alert.alert(
                    'Confirm Reassignment',
                    `Reassign this class to ${trainer.first_name} ${trainer.last_name}?`,
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Confirm',
                        onPress: () => confirmReassign(trainer.id),
                      },
                    ]
                  );
                }}
              >
                <View style={styles.trainerOptionInfo}>
                  <Text style={[styles.trainerOptionName, { color: theme.colors.text }]}>
                    {trainer.first_name} {trainer.last_name}
                  </Text>
                  <Text style={[styles.trainerOptionEmail, { color: theme.colors.textSecondary }]}>
                    {trainer.email}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  const renderDaysOffModal = () => (
    <Modal
      visible={daysOffModalVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => {
        setDaysOffModalVisible(false);
        setSelectedTrainerForDaysOff(null);
        setDaysOffList([]);
      }}
    >
      <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity onPress={() => {
            setDaysOffModalVisible(false);
            setSelectedTrainerForDaysOff(null);
            setDaysOffList([]);
          }}>
            <Text style={[styles.modalButton, { color: theme.colors.primary }]}>Close</Text>
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
            {selectedTrainerForDaysOff ? `${selectedTrainerForDaysOff.first_name}'s Days Off` : 'Days Off'}
          </Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.modalContent}>
          {/* Add New Day Off Section */}
          <View style={[styles.addDayOffSection, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Add Day Off / Annual Leave</Text>
            
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Date</Text>
              <TouchableOpacity
                style={[styles.datePickerButton, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={[styles.datePickerText, { color: theme.colors.text }]}>
                  {newDayOffDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </Text>
                <Ionicons name="calendar-outline" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={newDayOffDate}
                  mode="date"
                  display="default"
                  onChange={(event, selectedDate) => {
                    setShowDatePicker(false);
                    if (selectedDate) {
                      setNewDayOffDate(selectedDate);
                    }
                  }}
                  minimumDate={new Date()}
                />
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Type</Text>
              <View style={styles.typeSelector}>
                {(['day_off', 'annual_leave', 'sick_leave'] as const).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeOption,
                      {
                        backgroundColor: newDayOffType === type ? theme.colors.primary : theme.colors.background,
                        borderColor: theme.colors.border,
                      },
                    ]}
                    onPress={() => setNewDayOffType(type)}
                  >
                    <Text
                      style={[
                        styles.typeOptionText,
                        { color: newDayOffType === type ? theme.colors.background : theme.colors.text },
                      ]}
                    >
                      {type === 'day_off' ? 'Day Off' : type === 'annual_leave' ? 'Annual Leave' : 'Sick Leave'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
              onPress={handleAddDayOff}
            >
              <Ionicons name="add-circle-outline" size={20} color={theme.colors.background} />
              <Text style={[styles.addButtonText, { color: theme.colors.background }]}>Add Day Off</Text>
            </TouchableOpacity>
          </View>

          {/* Existing Days Off List */}
          <View style={styles.daysOffListSection}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Scheduled Days Off</Text>
            {loadingDaysOff ? (
              <ActivityIndicator size="small" color={theme.colors.primary} style={styles.loadingIndicator} />
            ) : daysOffList.length === 0 ? (
              <View style={styles.emptyDaysOff}>
                <Ionicons name="calendar-outline" size={48} color={theme.colors.textSecondary} />
                <Text style={[styles.emptyDaysOffText, { color: theme.colors.textSecondary }]}>
                  No days off scheduled
                </Text>
              </View>
            ) : (
              daysOffList.map((dayOff: any) => (
                <View key={dayOff.id} style={[styles.dayOffItem, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                  <View style={styles.dayOffInfo}>
                    <Text style={[styles.dayOffDate, { color: theme.colors.text }]}>
                      {new Date(dayOff.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </Text>
                    <Text style={[styles.dayOffType, { color: theme.colors.textSecondary }]}>
                      {dayOff.type === 'day_off' ? 'Day Off' : dayOff.type === 'annual_leave' ? 'Annual Leave' : 'Sick Leave'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.removeDayOffButton, { backgroundColor: theme.colors.error }]}
                    onPress={() => handleRemoveDayOff(dayOff.id)}
                  >
                    <Ionicons name="trash-outline" size={18} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  const renderEditModal = () => (
    <Modal
      visible={editModalVisible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setEditModalVisible(false)}>
            <Text style={[styles.modalButton, { color: theme.colors.primary }]}>Cancel</Text>
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Edit Trainer</Text>
          <TouchableOpacity onPress={handleSaveEdit}>
            <Text style={[styles.modalButton, { color: theme.colors.primary }]}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>First Name</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: theme.colors.surface, color: theme.colors.text }]}
              value={editForm.first_name}
              onChangeText={(text) => setEditForm({ ...editForm, first_name: text })}
              placeholder="First name"
              placeholderTextColor={theme.colors.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Last Name</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: theme.colors.surface, color: theme.colors.text }]}
              value={editForm.last_name}
              onChangeText={(text) => setEditForm({ ...editForm, last_name: text })}
              placeholder="Last name"
              placeholderTextColor={theme.colors.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Email</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: theme.colors.surface, color: theme.colors.text }]}
              value={editForm.email}
              onChangeText={(text) => setEditForm({ ...editForm, email: text })}
              placeholder="Email"
              placeholderTextColor={theme.colors.textSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Phone</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: theme.colors.surface, color: theme.colors.text }]}
              value={editForm.phone}
              onChangeText={(text) => setEditForm({ ...editForm, phone: text })}
              placeholder="Phone number"
              placeholderTextColor={theme.colors.textSecondary}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Trainer Code</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: theme.colors.surface, color: theme.colors.text }]}
              value={editForm.trainer_code}
              onChangeText={(text) => setEditForm({ ...editForm, trainer_code: text })}
              placeholder="Trainer code"
              placeholderTextColor={theme.colors.textSecondary}
              autoCapitalize="characters"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Role</Text>
            <View style={styles.roleSelector}>
              {(['member', 'trainer', 'admin'] as const).map((role) => (
                <TouchableOpacity
                  key={role}
                  style={[
                    styles.roleOption,
                    { backgroundColor: editForm.role === role ? theme.colors.primary : theme.colors.surface },
                    { borderColor: theme.colors.primary }
                  ]}
                  onPress={() => setEditForm({ ...editForm, role })}
                >
                  <Text style={[
                    styles.roleOptionText,
                    { color: editForm.role === role ? 'white' : theme.colors.text }
                  ]}>
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
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
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Manage Trainers ({trainers.length})
        </Text>
        <View style={styles.placeholder} />
      </View>

      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <Ionicons name="search" size={20} color={theme.colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: theme.colors.text }]}
          placeholder="Search trainers..."
          placeholderTextColor={theme.colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={theme.colors.text}
          />
        }
      >
        {filteredTrainers.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="fitness-outline" size={64} color={theme.colors.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              {searchQuery ? 'No trainers found matching your search' : 'No trainers found'}
            </Text>
          </View>
        ) : (
          filteredTrainers.map(renderTrainerCard)
        )}
      </ScrollView>

      {renderEditModal()}
      {renderReassignModal()}
      {renderDaysOffModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  trainerCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  trainerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  trainerInfo: {
    flex: 1,
  },
  trainerName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  trainerEmail: {
    fontSize: 14,
    marginBottom: 2,
  },
  trainerCode: {
    fontSize: 12,
    fontWeight: '600',
  },
  trainerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trainerDetails: {
    gap: 8,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 14,
    marginLeft: 8,
  },
  statsContainer: {
    paddingTop: 12,
    borderTopWidth: 1,
  },
  statItem: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
    marginLeft: 8,
  },
  chevronIcon: {
    marginLeft: 8,
    marginTop: 2,
  },
  classesList: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  classItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
  },
  classInfo: {
    flex: 1,
  },
  className: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  classDateTime: {
    fontSize: 14,
    marginBottom: 2,
  },
  classDuration: {
    fontSize: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  noClassesText: {
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
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
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  roleSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  roleOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  roleOptionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  dayGroup: {
    marginBottom: 16,
  },
  dayHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    marginTop: 8,
  },
  classActions: {
    alignItems: 'flex-end',
    gap: 8,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  classActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  classActionButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  reassignClassInfo: {
    padding: 16,
    marginBottom: 20,
    borderRadius: 8,
    borderWidth: 1,
  },
  reassignClassTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  reassignClassDetails: {
    fontSize: 14,
  },
  reassignLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  trainerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
  },
  trainerOptionInfo: {
    flex: 1,
  },
  trainerOptionName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  trainerOptionEmail: {
    fontSize: 14,
  },
  noTrainersText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
    fontStyle: 'italic',
  },
  addDayOffSection: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  datePickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
  },
  datePickerText: {
    fontSize: 16,
  },
  typeSelector: {
    flexDirection: 'row',
    marginTop: 8,
  },
  typeOption: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    marginRight: 8,
  },
  typeOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 8,
    marginTop: 16,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  daysOffListSection: {
    marginTop: 20,
  },
  loadingIndicator: {
    marginVertical: 20,
  },
  emptyDaysOff: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyDaysOffText: {
    fontSize: 16,
    marginTop: 12,
  },
  dayOffItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  dayOffInfo: {
    flex: 1,
  },
  dayOffDate: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  dayOffType: {
    fontSize: 14,
  },
  removeDayOffButton: {
    padding: 8,
    borderRadius: 8,
    marginLeft: 12,
  },
});

export default TrainerManagementScreen;
