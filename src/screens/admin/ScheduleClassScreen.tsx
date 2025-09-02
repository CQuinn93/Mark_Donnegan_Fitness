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
import { useTheme } from '../../theme/ThemeContext';
import { classService } from '../../services/api';

interface Class {
  id: string;
  name: string;
  description: string;
  max_capacity: number;
  duration_minutes: number;
  difficulty_level: string;
}

interface Trainer {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface ScheduledClass {
  id: string;
  class_name: string;
  trainer_name: string;
  start_time: string;
  end_time: string;
  max_capacity: number;
  current_enrollment: number;
}

interface TimeSlot {
  time: string;
  startTime: Date;
  endTime: Date;
  isBooked: boolean;
  isSelected: boolean;
  scheduledClass?: ScheduledClass;
}

interface Props {
  navigation: any;
  route: any;
}

const ScheduleClassScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const [classes, setClasses] = useState<Class[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Calendar state
  const [currentDate, setCurrentDate] = useState(new Date());
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

  // Modal state
  const [showClassModal, setShowClassModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedTrainer, setSelectedTrainer] = useState<string>('');
  const [showClassDropdown, setShowClassDropdown] = useState(false);
  const [showTrainerDropdown, setShowTrainerDropdown] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    generateTimeSlots();
  }, [currentDate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [classesData, trainersData] = await Promise.all([
        classService.getClasses(),
        classService.getTrainers(),
      ]);

      if (classesData.classes) setClasses(classesData.classes);
      if (trainersData.trainers) setTrainers(trainersData.trainers);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load classes and trainers');
    } finally {
      setLoading(false);
    }
  };

  const generateTimeSlots = async () => {
    const slots: TimeSlot[] = [];
    const startHour = 6; // 6 AM
    const endHour = 22; // 10 PM
    
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const startTime = new Date(currentDate);
        startTime.setHours(hour, minute, 0, 0);
        
        const endTime = new Date(startTime);
        endTime.setMinutes(endTime.getMinutes() + 30);
        
        const timeString = startTime.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        });

        slots.push({
          time: timeString,
          startTime,
          endTime,
          isBooked: false,
          isSelected: false,
        });
      }
    }
    
    // Load existing scheduled classes for this date
    await loadScheduledClasses(slots);
    
    setTimeSlots(slots);
  };

  const loadScheduledClasses = async (slots: TimeSlot[]) => {
    try {
      const dateString = currentDate.toISOString().split('T')[0];
      const response = await classService.getClassSchedules(dateString);
      
      if (response.schedules) {
        response.schedules.forEach((schedule: any) => {
          const startTime = new Date(`${dateString}T${schedule.start_time}`);
          const slotIndex = slots.findIndex(slot => 
            slot.startTime.getTime() === startTime.getTime()
          );
          
          if (slotIndex !== -1) {
            slots[slotIndex].isBooked = true;
            slots[slotIndex].scheduledClass = {
              id: schedule.id,
              class_name: schedule.class_name,
              trainer_name: schedule.trainer_name,
              start_time: schedule.start_time,
              end_time: schedule.end_time,
              max_capacity: schedule.max_capacity,
              current_enrollment: schedule.current_enrollment,
            };
          }
        });
      }
    } catch (error) {
      console.error('Error loading scheduled classes:', error);
    }
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setDate(newDate.getDate() - 1);
    } else {
      newDate.setDate(newDate.getDate() + 1);
    }
    setCurrentDate(newDate);
  };

  const handleTimeSlotPress = (slot: TimeSlot) => {
    if (slot.isBooked) {
      // Show class details instead of scheduling
      if (slot.scheduledClass) {
        Alert.alert(
          'Scheduled Class',
          `${slot.scheduledClass.class_name}\nTrainer: ${slot.scheduledClass.trainer_name}\nTime: ${slot.scheduledClass.start_time} - ${slot.scheduledClass.end_time}\nEnrolled: ${slot.scheduledClass.current_enrollment}/${slot.scheduledClass.max_capacity}`,
          [{ text: 'OK' }]
        );
      }
      return;
    }

    // Deselect previous slot
    setTimeSlots(prev => prev.map(s => ({ ...s, isSelected: false })));
    
    // Select new slot
    setTimeSlots(prev => prev.map(s => 
      s.time === slot.time ? { ...s, isSelected: true } : s
    ));
    
    setSelectedSlot(slot);
    setShowClassModal(true);
  };

  const handleClassSelect = (classId: string) => {
    setSelectedClass(classId);
    setShowClassDropdown(false);
  };

  const handleTrainerSelect = (trainerId: string) => {
    setSelectedTrainer(trainerId);
    setShowTrainerDropdown(false);
  };

  const handleSubmit = async () => {
    if (!selectedClass || !selectedTrainer || !selectedSlot) {
      Alert.alert('Error', 'Please select class and trainer');
      return;
    }

    const selectedClassData = classes.find(c => c.id === selectedClass);
    if (!selectedClassData) {
      Alert.alert('Error', 'Selected class not found');
      return;
    }

    setSubmitting(true);
    try {
      // Calculate end time based on class duration from class table
      const endTime = new Date(selectedSlot.startTime);
      endTime.setMinutes(endTime.getMinutes() + selectedClassData.duration_minutes);

      const scheduleData = {
        class_id: selectedClass,
        trainer_id: selectedTrainer,
        scheduled_date: selectedSlot.startTime.toISOString().split('T')[0],
        start_time: selectedSlot.startTime.toTimeString().split(' ')[0],
        end_time: endTime.toTimeString().split(' ')[0],
        max_capacity: selectedClassData.max_capacity, // Use from class table
      };

      const result = await classService.createClassSchedule(scheduleData);

      if (result.schedule) {
        Alert.alert(
          'Success',
          'Class scheduled successfully!',
          [
            {
              text: 'OK',
              onPress: () => {
                setShowClassModal(false);
                setSelectedSlot(null);
                setSelectedClass('');
                setSelectedTrainer('');
                generateTimeSlots(); // Refresh slots
              },
            },
          ]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to schedule class');
      }
    } catch (error) {
      console.error('Error scheduling class:', error);
      Alert.alert('Error', 'Failed to schedule class');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

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
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Schedule Class
        </Text>
        <View style={styles.placeholder} />
      </View>

      {/* Date Navigation */}
      <View style={[styles.dateNavigation, { backgroundColor: theme.colors.surface }]}>
        <TouchableOpacity onPress={() => navigateDate('prev')} style={styles.dateButton}>
          <Ionicons name="chevron-back" size={20} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.dateText, { color: theme.colors.text }]}>
          {formatDate(currentDate)}
        </Text>
        <TouchableOpacity onPress={() => navigateDate('next')} style={styles.dateButton}>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Time Slots */}
      <ScrollView style={styles.timeSlotsContainer}>
        <View style={styles.timeSlotsGrid}>
          {timeSlots.map((slot, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.timeSlot,
                { backgroundColor: theme.colors.surface },
                slot.isBooked && { backgroundColor: theme.colors.primary + '20' },
                slot.isSelected && { backgroundColor: theme.colors.secondary + '20' },
              ]}
              onPress={() => handleTimeSlotPress(slot)}
            >
              <Text style={[
                styles.timeSlotText,
                { color: theme.colors.text },
                slot.isSelected && { color: theme.colors.secondary, fontWeight: 'bold' },
              ]}>
                {slot.time}
              </Text>
              {slot.isBooked && slot.scheduledClass && (
                <View style={styles.scheduledClassInfo}>
                  <Text style={[styles.className, { color: theme.colors.primary }]}>
                    {slot.scheduledClass.class_name}
                  </Text>
                  <Text style={[styles.trainerName, { color: theme.colors.textSecondary }]}>
                    {slot.scheduledClass.trainer_name}
                  </Text>
                  <Text style={[styles.enrollmentText, { color: theme.colors.textSecondary }]}>
                    {slot.scheduledClass.current_enrollment}/{slot.scheduledClass.max_capacity}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Class Selection Modal */}
      <Modal
        visible={showClassModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowClassModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                Schedule Class
              </Text>
              <TouchableOpacity onPress={() => setShowClassModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              {/* Class Selection Dropdown */}
              <View style={styles.formSection}>
                <Text style={[styles.formLabel, { color: theme.colors.text }]}>
                  Select Class
                </Text>
                <TouchableOpacity
                  style={[styles.dropdownButton, { borderColor: theme.colors.border }]}
                  onPress={() => setShowClassDropdown(!showClassDropdown)}
                >
                  <Text style={[
                    styles.dropdownText,
                    { color: selectedClass ? theme.colors.text : theme.colors.textSecondary }
                  ]}>
                    {selectedClass 
                      ? classes.find(c => c.id === selectedClass)?.name 
                      : 'Select a class...'
                    }
                  </Text>
                  <Ionicons 
                    name={showClassDropdown ? "chevron-up" : "chevron-down"} 
                    size={20} 
                    color={theme.colors.textSecondary} 
                  />
                </TouchableOpacity>
                
                {showClassDropdown && (
                  <View style={[styles.dropdownList, { backgroundColor: theme.colors.background }]}>
                    {classes.map((cls) => (
                      <TouchableOpacity
                        key={cls.id}
                        style={styles.dropdownItem}
                        onPress={() => handleClassSelect(cls.id)}
                      >
                        <Text style={[styles.dropdownItemText, { color: theme.colors.text }]}>
                          {cls.name} ({cls.duration_minutes}min)
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* Trainer Selection Dropdown */}
              <View style={styles.formSection}>
                <Text style={[styles.formLabel, { color: theme.colors.text }]}>
                  Select Trainer
                </Text>
                <TouchableOpacity
                  style={[styles.dropdownButton, { borderColor: theme.colors.border }]}
                  onPress={() => setShowTrainerDropdown(!showTrainerDropdown)}
                >
                  <Text style={[
                    styles.dropdownText,
                    { color: selectedTrainer ? theme.colors.text : theme.colors.textSecondary }
                  ]}>
                    {selectedTrainer 
                      ? trainers.find(t => t.id === selectedTrainer)?.first_name + ' ' + 
                        trainers.find(t => t.id === selectedTrainer)?.last_name
                      : 'Select a trainer...'
                    }
                  </Text>
                  <Ionicons 
                    name={showTrainerDropdown ? "chevron-up" : "chevron-down"} 
                    size={20} 
                    color={theme.colors.textSecondary} 
                  />
                </TouchableOpacity>
                
                {showTrainerDropdown && (
                  <View style={[styles.dropdownList, { backgroundColor: theme.colors.background }]}>
                    {trainers.map((trainer) => (
                      <TouchableOpacity
                        key={trainer.id}
                        style={styles.dropdownItem}
                        onPress={() => handleTrainerSelect(trainer.id)}
                      >
                        <Text style={[styles.dropdownItemText, { color: theme.colors.text }]}>
                          {trainer.first_name} {trainer.last_name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* Class Details Preview */}
              {selectedClass && (
                <View style={styles.formSection}>
                  <Text style={[styles.formLabel, { color: theme.colors.text }]}>
                    Class Details
                  </Text>
                  <View style={[styles.detailsCard, { backgroundColor: theme.colors.background }]}>
                    {(() => {
                      const cls = classes.find(c => c.id === selectedClass);
                      return cls ? (
                        <>
                          <Text style={[styles.detailText, { color: theme.colors.text }]}>
                            Duration: {cls.duration_minutes} minutes
                          </Text>
                          <Text style={[styles.detailText, { color: theme.colors.text }]}>
                            Max Capacity: {cls.max_capacity} students
                          </Text>
                          <Text style={[styles.detailText, { color: theme.colors.text }]}>
                            Difficulty: {cls.difficulty_level}
                          </Text>
                        </>
                      ) : null;
                    })()}
                  </View>
                </View>
              )}
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.cancelButton, { borderColor: theme.colors.border }]}
                onPress={() => setShowClassModal(false)}
              >
                <Text style={[styles.cancelButtonText, { color: theme.colors.text }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  { backgroundColor: theme.colors.primary },
                  (!selectedClass || !selectedTrainer) && { opacity: 0.5 }
                ]}
                onPress={handleSubmit}
                disabled={!selectedClass || !selectedTrainer || submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.submitButtonText}>Schedule Class</Text>
                )}
              </TouchableOpacity>
            </View>
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
  placeholder: {
    width: 40,
  },
  dateNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  dateButton: {
    padding: 8,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
  },
  timeSlotsContainer: {
    flex: 1,
  },
  timeSlotsGrid: {
    padding: 16,
  },
  timeSlot: {
    padding: 16,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  timeSlotText: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  scheduledClassInfo: {
    marginTop: 4,
  },
  className: {
    fontSize: 14,
    fontWeight: '600',
  },
  trainerName: {
    fontSize: 12,
    marginTop: 2,
  },
  enrollmentText: {
    fontSize: 12,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 12,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalBody: {
    maxHeight: 400,
  },
  formSection: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderRadius: 8,
  },
  dropdownText: {
    fontSize: 16,
  },
  dropdownList: {
    marginTop: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    maxHeight: 200,
  },
  dropdownItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  dropdownItemText: {
    fontSize: 16,
  },
  detailsCard: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  detailText: {
    fontSize: 14,
    marginBottom: 4,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ScheduleClassScreen;



