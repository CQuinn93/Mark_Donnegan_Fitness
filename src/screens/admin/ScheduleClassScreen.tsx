import React, { useState, useEffect, useMemo } from 'react';
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
import { useAdminData } from '../../context/AdminDataContext';
import { scheduleService } from '../../services/api';

interface Props {
  navigation: any;
  route: any;
}

interface Class {
  id: string;
  name: string;
  description: string;
  duration: number;
  max_members: number;
}

interface Trainer {
  id: string;
  first_name: string;
  last_name: string;
}

const ScheduleClassScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { classes, trainers, scheduledClasses, addScheduledClass } = useAdminData();
  const { selectedDate: selectedDateParam } = route.params || {};
  
  // Convert selectedDate from string to Date object if needed and memoize it
  const selectedDate = useMemo(() => {
    return selectedDateParam ? new Date(selectedDateParam) : new Date();
  }, [selectedDateParam]);
  
  // Form state
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [selectedTrainer, setSelectedTrainer] = useState<Trainer | null>(null);
  const [selectedHour, setSelectedHour] = useState<number>(6);
  const [selectedMinute, setSelectedMinute] = useState<number>(0);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('beginner');
  const [selectedLocation, setSelectedLocation] = useState<string>('gym');
  
  // Time selection state
  const [timeSelectionMode, setTimeSelectionMode] = useState<'preset' | 'custom'>('preset');
  const [selectedPresetTime, setSelectedPresetTime] = useState<string>('06:00');
  const [scheduledTimes, setScheduledTimes] = useState<string[]>([]);
  
  // Step-by-step selection state
  const [currentStep, setCurrentStep] = useState<'class' | 'time' | 'location' | 'trainer' | 'conflicts' | 'details'>('class');
  
  // UI state
  const [showTimePicker, setShowTimePicker] = useState(false);
  
  // Data state
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Conflict checking state
  const [conflictCheckResult, setConflictCheckResult] = useState<{
    hasConflicts: boolean;
    conflicts: string[];
  } | null>(null);
  const [checkingConflicts, setCheckingConflicts] = useState(false);

  // Predefined times
  const predefinedTimes = [
    { label: '6:00 AM', value: '06:00' },
    { label: '7:00 AM', value: '07:00' },
    { label: '9:00 AM', value: '09:00' },
    { label: '9:30 AM', value: '09:30' },
    { label: '5:00 PM', value: '17:00' },
    { label: '7:00 PM', value: '19:00' },
  ];

  useEffect(() => {
    if (selectedDate) {
      loadScheduledTimes();
    }
  }, [selectedDate, scheduledClasses]);

  const loadScheduledTimes = () => {
    if (!selectedDate) return;
    
    try {
      // Format the date properly
      const dateString = selectedDate instanceof Date 
        ? selectedDate.toISOString().split('T')[0]
        : new Date(selectedDate).toISOString().split('T')[0];
      
      // Filter scheduled classes for the selected date from cached data
      const classesForDate = scheduledClasses.filter((schedule: any) => 
        schedule.scheduled_date === dateString
      );
      
      // Extract scheduled times for the selected date
      const times = classesForDate
        .map((schedule: any) => schedule.scheduled_time)
        .filter((time: string) => time);
      
      setScheduledTimes(times);
    } catch (error) {
      console.error('Error loading scheduled times:', error);
      setScheduledTimes([]);
    }
  };


  const handleSave = async () => {
    if (!selectedClass || !selectedTrainer) {
      Alert.alert('Error', 'Please select a class and trainer');
      return;
    }

    setSaving(true);
    try {
      // Get time string based on selection mode
      const timeString = timeSelectionMode === 'preset' 
        ? selectedPresetTime 
        : `${selectedHour.toString().padStart(2, '0')}:${selectedMinute.toString().padStart(2, '0')}`;
      
      // Ensure we have a valid date in YYYY-MM-DD format
      let formattedDate: string;
      if (selectedDate) {
        // If selectedDate is already in YYYY-MM-DD format, use it
        if (typeof selectedDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) {
          formattedDate = selectedDate;
        } else {
          // Convert to YYYY-MM-DD format
          const date = new Date(selectedDate);
          formattedDate = date.toISOString().split('T')[0];
        }
      } else {
        // Fallback to today's date
        formattedDate = new Date().toISOString().split('T')[0];
      }

      // Check for conflicts before saving
      const conflicts = await checkForConflicts(formattedDate, timeString, selectedLocation, selectedTrainer.id);
      if (conflicts.length > 0) {
        Alert.alert('Scheduling Conflict', conflicts.join('\n\n'));
        setSaving(false);
        return;
      }

      const scheduleData = {
        class_id: selectedClass.id,
        trainer_id: selectedTrainer.id,
        scheduled_date: formattedDate,
        scheduled_time: timeString,
        difficulty_level: selectedDifficulty,
        location: selectedLocation,
        max_bookings: selectedClass.max_members || 10,
        is_recurring: false,
      };

      
      // Create single schedule
      const result = await scheduleService.createClassSchedule(scheduleData);

      if (result.error) {
        Alert.alert('Error', result.error);
        return;
      }

      // Add the new class to the cache instead of refreshing from database
      if (result.schedule && result.schedule[0]) {
        const newScheduledClass = {
          ...result.schedule[0],
          classes: { name: selectedClass.name },
          profiles: { 
            first_name: selectedTrainer.first_name, 
            last_name: selectedTrainer.last_name 
          }
        };
        addScheduledClass(newScheduledClass);
      }

      Alert.alert('Success', 'Class scheduled successfully!', [
        { text: 'OK', onPress: () => {
          // Navigate back to SelectDate screen
          navigation.navigate('SelectDate');
        }}
      ]);
    } catch (error) {
      console.error('Error saving schedule:', error);
      Alert.alert('Error', 'Failed to save schedule');
    } finally {
      setSaving(false);
    }
  };

  const formatTime = () => {
    if (timeSelectionMode === 'preset') {
      const presetTime = predefinedTimes.find(t => t.value === selectedPresetTime);
      return presetTime ? presetTime.label : 'Select Time';
    } else {
      const hour = selectedHour % 12 || 12;
      const ampm = selectedHour >= 12 ? 'PM' : 'AM';
      return `${hour}:${selectedMinute.toString().padStart(2, '0')} ${ampm}`;
    }
  };

  const isTimeScheduled = (timeValue: string) => {
    return scheduledTimes.includes(timeValue);
  };

  // Helper function to get current time value safely
  const getCurrentTimeValue = () => {
    if (timeSelectionMode === 'preset') {
      return selectedPresetTime;
    } else {
      return `${selectedHour.toString().padStart(2, '0')}:${selectedMinute.toString().padStart(2, '0')}`;
    }
  };

  // Check if a location is booked for a specific time
  const isLocationBooked = (timeValue: string, location: string) => {
    if (!selectedDate || !timeValue || !location || !(selectedDate instanceof Date) || isNaN(selectedDate.getTime())) {
      return false;
    }
    try {
      const dateString = selectedDate.toISOString().split('T')[0];
      return scheduledClasses.some(cls => 
        cls.scheduled_date === dateString && 
        cls.scheduled_time === timeValue && 
        cls.location === location
      );
    } catch (error) {
      console.error('Error in isLocationBooked:', error);
      return false;
    }
  };

  // Check if a trainer is booked for a specific time
  const isTrainerBooked = (timeValue: string, trainerId: string) => {
    if (!selectedDate || !timeValue || !trainerId || !(selectedDate instanceof Date) || isNaN(selectedDate.getTime())) {
      return false;
    }
    try {
      const dateString = selectedDate.toISOString().split('T')[0];
      return scheduledClasses.some(cls => 
        cls.scheduled_date === dateString && 
        cls.scheduled_time === timeValue && 
        cls.trainer_id === trainerId
      );
    } catch (error) {
      console.error('Error in isTrainerBooked:', error);
      return false;
    }
  };

  // Get the class name that's booked for a specific time and location
  const getBookedClassName = (timeValue: string, location: string) => {
    if (!selectedDate || !timeValue || !location || !(selectedDate instanceof Date) || isNaN(selectedDate.getTime())) {
      return '';
    }
    try {
      const dateString = selectedDate.toISOString().split('T')[0];
      const bookedClass = scheduledClasses.find(cls => 
        cls.scheduled_date === dateString && 
        cls.scheduled_time === timeValue && 
        cls.location === location
      );
      return bookedClass ? (bookedClass.classes?.name || 'Unknown Class') : '';
    } catch (error) {
      console.error('Error in getBookedClassName:', error);
      return '';
    }
  };

  // Get the class name that's booked for a specific time and trainer
  const getBookedClassNameForTrainer = (timeValue: string, trainerId: string) => {
    if (!selectedDate || !timeValue || !trainerId || !(selectedDate instanceof Date) || isNaN(selectedDate.getTime())) {
      return '';
    }
    try {
      const dateString = selectedDate.toISOString().split('T')[0];
      const bookedClass = scheduledClasses.find(cls => 
        cls.scheduled_date === dateString && 
        cls.scheduled_time === timeValue && 
        cls.trainer_id === trainerId
      );
      return bookedClass ? (bookedClass.classes?.name || 'Unknown Class') : '';
    } catch (error) {
      console.error('Error in getBookedClassNameForTrainer:', error);
      return '';
    }
  };


  // Step navigation functions
  const handleClassSelected = (classItem: Class) => {
    setSelectedClass(classItem);
    setCurrentStep('time');
  };

  const handleTimeSelected = (timeValue: string) => {
    if (timeSelectionMode === 'preset') {
      setSelectedPresetTime(timeValue);
    } else {
      const [hours, minutes] = timeValue.split(':').map(Number);
      setSelectedHour(hours);
      setSelectedMinute(minutes);
    }
    setCurrentStep('location');
  };

  const handleLocationSelected = (location: string) => {
    setSelectedLocation(location);
    setCurrentStep('trainer');
  };

  const handleTrainerSelected = (trainer: Trainer) => {
    setSelectedTrainer(trainer);
    setCurrentStep('conflicts');
  };

  const goBackToStep = (step: 'class' | 'time' | 'location' | 'trainer' | 'conflicts' | 'details') => {
    setCurrentStep(step);
  };

  // Conflict checking function - now uses cached data instead of database call
  const checkForConflicts = (date: string, time: string, location: string, trainerId: string): string[] => {
    const conflicts: string[] = [];
    
    try {
      // Filter scheduled classes for this date from cached data
      const classesForDate = scheduledClasses.filter((cls: any) => 
        cls.scheduled_date === date
      );

      // Handle time format mismatch - database stores "07:00:00" but we have "07:00"
      const classesAtTime = classesForDate.filter((cls: any) => {
        const dbTime = cls.scheduled_time;
        const checkTime = time;
        
        // Remove seconds from database time for comparison
        const dbTimeWithoutSeconds = dbTime.substring(0, 5); // "07:00:00" -> "07:00"
        
        return dbTimeWithoutSeconds === checkTime;
      });

      // Check if time slot exists and count occurrences
      if (classesAtTime.length >= 2) {
        conflicts.push(`Time slot ${time} already has ${classesAtTime.length} classes scheduled. Maximum of 2 classes allowed per time slot.`);
      }

      // Check location conflict
      const locationConflict = classesAtTime.find((cls: any) => cls.location === location);
      if (locationConflict) {
        conflicts.push(`Location "${location.charAt(0).toUpperCase() + location.slice(1)}" is already booked for ${time} by "${locationConflict.classes?.name || 'Unknown Class'}"`);
      }

      // Check trainer conflict
      const trainerConflict = classesAtTime.find((cls: any) => cls.trainer_id === trainerId);
      if (trainerConflict) {
        conflicts.push(`Trainer is already assigned to "${trainerConflict.classes?.name || 'Unknown Class'}" at ${time}`);
      }

    } catch (error) {
      console.error('Error in conflict check:', error);
      conflicts.push('Unable to check for conflicts. Please try again.');
    }

    return conflicts;
  };

  // Handle conflict check button press - now synchronous using cached data
  const handleCheckConflicts = () => {
    if (!selectedClass || !selectedTrainer) {
      Alert.alert('Error', 'Please select a class and trainer first');
      return;
    }

    setCheckingConflicts(true);
    setConflictCheckResult(null);

    try {
      // Get time string based on selection mode
      const timeString = timeSelectionMode === 'preset' 
        ? selectedPresetTime 
        : `${selectedHour.toString().padStart(2, '0')}:${selectedMinute.toString().padStart(2, '0')}`;
      
      // Ensure we have a valid date in YYYY-MM-DD format
      let formattedDate: string;
      if (selectedDate) {
        if (typeof selectedDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) {
          formattedDate = selectedDate;
        } else {
          const date = new Date(selectedDate);
          formattedDate = date.toISOString().split('T')[0];
        }
      } else {
        formattedDate = new Date().toISOString().split('T')[0];
      }

      const conflicts = checkForConflicts(formattedDate, timeString, selectedLocation, selectedTrainer.id);
      
      setConflictCheckResult({
        hasConflicts: conflicts.length > 0,
        conflicts: conflicts
      });

    } catch (error) {
      console.error('Error checking conflicts:', error);
      setConflictCheckResult({
        hasConflicts: true,
        conflicts: ['Unable to check for conflicts. Please try again.']
      });
    } finally {
      setCheckingConflicts(false);
    }
  };

  // Handle continue after conflict check
  const handleContinueAfterConflicts = () => {
    if (conflictCheckResult && !conflictCheckResult.hasConflicts) {
      setCurrentStep('details');
    } else {
      Alert.alert('Conflicts Found', 'Please resolve the conflicts before continuing.');
    }
  };

  // Step indicator component
  const renderStepIndicator = () => {
    const steps = [
      { key: 'class', label: 'Class', icon: '📚' },
      { key: 'time', label: 'Time', icon: '⏰' },
      { key: 'location', label: 'Location', icon: '📍' },
      { key: 'trainer', label: 'Trainer', icon: '👨‍🏫' },
      { key: 'conflicts', label: 'Conflicts', icon: '⚠️' },
      { key: 'details', label: 'Details', icon: '⚙️' }
    ];

    return (
      <View style={styles.stepIndicator}>
        {steps.map((step, index) => {
          const isActive = currentStep === step.key;
          const isCompleted = steps.findIndex(s => s.key === currentStep) > index;
          
          return (
            <View key={step.key} style={styles.stepItem}>
              <View style={[
                styles.stepCircle,
                isActive && styles.stepCircleActive,
                isCompleted && styles.stepCircleCompleted
              ]}>
                <Text style={[
                  styles.stepIcon,
                  isActive && styles.stepIconActive,
                  isCompleted && styles.stepIconCompleted
                ]}>
                  {step.icon}
                </Text>
              </View>
              <Text style={[
                styles.stepLabel,
                isActive && styles.stepLabelActive,
                isCompleted && styles.stepLabelCompleted
              ]}>
                {step.label}
              </Text>
      </View>
    );
        })}
      </View>
    );
  };

  // Step components
  const renderClassSelectionStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Select Class</Text>
      <Text style={styles.stepDescription}>Choose the class you want to schedule</Text>
      
      <View style={styles.classList}>
        {classes.map((classItem) => (
          <TouchableOpacity
            key={classItem.id}
            style={styles.classListItem}
            onPress={() => handleClassSelected(classItem)}
          >
            <Text style={styles.className}>{classItem.name}</Text>
            <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderTimeSelectionStep = () => {
    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>Select Time</Text>
        <Text style={styles.stepDescription}>Choose when the class will be held</Text>
        
        {/* Time selection mode tabs */}
        <View style={styles.timeModeTabs}>
          <TouchableOpacity
            style={[styles.timeModeTab, timeSelectionMode === 'preset' && { backgroundColor: '#000000' }]}
            onPress={() => setTimeSelectionMode('preset')}
          >
            <Text style={[styles.timeModeTabText, timeSelectionMode === 'preset' && { color: 'white' }]}>
              Preset Times
            </Text>
        </TouchableOpacity>
          <TouchableOpacity
            style={[styles.timeModeTab, timeSelectionMode === 'custom' && { backgroundColor: '#000000' }]}
            onPress={() => setTimeSelectionMode('custom')}
          >
            <Text style={[styles.timeModeTabText, timeSelectionMode === 'custom' && { color: 'white' }]}>
              Custom Time
        </Text>
        </TouchableOpacity>
      </View>

        {timeSelectionMode === 'preset' ? (
          <View style={styles.presetTimesContainer}>
            {predefinedTimes.map((time) => {
              const isSelected = selectedPresetTime === time.value;
              
              return (
            <TouchableOpacity
                  key={time.value}
              style={[
                    styles.presetTimeButton,
                    isSelected && { backgroundColor: '#000000', borderColor: '#000000' }
                  ]}
                  onPress={() => handleTimeSelected(time.value)}
            >
              <Text style={[
                    styles.presetTimeText,
                    isSelected && { color: 'white' }
              ]}>
                    {time.label}
              </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <View style={styles.customTimeContainer}>
            <TouchableOpacity
              style={styles.customTimeButton}
              onPress={() => setShowTimePicker(true)}
            >
              <Text style={styles.customTimeText}>
                {`${selectedHour.toString().padStart(2, '0')}:${selectedMinute.toString().padStart(2, '0')}`}
                  </Text>
              <Text style={styles.customTimeLabel}>Tap to set custom time</Text>
            </TouchableOpacity>
                </View>
              )}
        </View>
    );
  };

  const renderLocationSelectionStep = () => {
    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>Select Location</Text>
        <Text style={styles.stepDescription}>Choose where the class will be held</Text>
        
        <View style={styles.locationGrid}>
          {['gym', 'park'].map((location) => {
            const isSelected = selectedLocation === location;
            
            return (
              <TouchableOpacity
                key={location}
                style={[
                  styles.locationCard,
                  isSelected && styles.locationCardSelected
                ]}
                onPress={() => handleLocationSelected(location)}
              >
                <Text style={[
                  styles.locationName,
                  isSelected && styles.locationNameSelected
                ]}>
                  {location.charAt(0).toUpperCase() + location.slice(1)}
              </Text>
              </TouchableOpacity>
            );
          })}
            </View>
      </View>
    );
  };

  const renderTrainerSelectionStep = () => {
    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>Select Trainer</Text>
        <Text style={styles.stepDescription}>Choose who will teach the class</Text>
        
        <View style={styles.trainerGrid}>
          {trainers.map((trainer) => {
            const isSelected = selectedTrainer?.id === trainer.id;
            
            return (
                <TouchableOpacity
                key={trainer.id}
                style={[
                  styles.trainerCard,
                  isSelected && styles.trainerCardSelected
                ]}
                onPress={() => handleTrainerSelected(trainer)}
                >
                  <Text style={[
                  styles.trainerName,
                  isSelected && styles.trainerNameSelected
                  ]}>
                  {trainer.first_name} {trainer.last_name}
                  </Text>
                </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  const renderConflictsStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Check for Conflicts</Text>
      <Text style={styles.stepDescription}>Verify that your selections don't conflict with existing schedules</Text>
      
      <View style={styles.conflictsSummary}>
        <TouchableOpacity
          style={styles.detailRow}
          onPress={() => setCurrentStep('class')}
        >
          <Text style={styles.detailLabel}>Class:</Text>
          <Text style={styles.detailValue}>{selectedClass?.name}</Text>
          <Ionicons name="chevron-forward" size={16} color="#666" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.detailRow}
          onPress={() => setCurrentStep('time')}
        >
          <Text style={styles.detailLabel}>Time:</Text>
          <Text style={styles.detailValue}>{getCurrentTimeValue()}</Text>
          <Ionicons name="chevron-forward" size={16} color="#666" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.detailRow}
          onPress={() => setCurrentStep('location')}
        >
          <Text style={styles.detailLabel}>Location:</Text>
          <Text style={styles.detailValue}>{selectedLocation.charAt(0).toUpperCase() + selectedLocation.slice(1)}</Text>
          <Ionicons name="chevron-forward" size={16} color="#666" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.detailRow}
          onPress={() => setCurrentStep('trainer')}
        >
          <Text style={styles.detailLabel}>Trainer:</Text>
          <Text style={styles.detailValue}>{selectedTrainer?.first_name} {selectedTrainer?.last_name}</Text>
          <Ionicons name="chevron-forward" size={16} color="#666" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.checkConflictsButton, { backgroundColor: '#000000' }]}
        onPress={handleCheckConflicts}
        disabled={checkingConflicts}
      >
        {checkingConflicts ? (
          <ActivityIndicator color="white" />
        ) : (
          <>
            <Ionicons name="search" size={20} color="white" />
            <Text style={styles.checkConflictsText}>Check for Conflicts</Text>
          </>
        )}
      </TouchableOpacity>

      {conflictCheckResult && (
        <View style={[
          styles.conflictResult,
          { backgroundColor: conflictCheckResult.hasConflicts ? '#FFF5F5' : '#F0F9F0' }
        ]}>
          {conflictCheckResult.hasConflicts ? (
            <View>
              <View style={styles.conflictHeader}>
                <Ionicons name="warning" size={20} color="#FF6B6B" />
                <Text style={[styles.conflictTitle, { color: '#FF6B6B' }]}>Conflicts Found</Text>
              </View>
              {conflictCheckResult.conflicts.map((conflict, index) => (
                <Text key={index} style={[styles.conflictText, { color: '#FF6B6B' }]}>
                  • {conflict}
                </Text>
              ))}
            </View>
          ) : (
            <View style={styles.conflictHeader}>
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
              <Text style={[styles.conflictTitle, { color: '#4CAF50' }]}>No Conflicts Found</Text>
            </View>
          )}
        </View>
      )}

      {conflictCheckResult && !conflictCheckResult.hasConflicts && (
        <TouchableOpacity
          style={[styles.continueButtonConflicts, { backgroundColor: '#4CAF50' }]}
          onPress={handleContinueAfterConflicts}
        >
          <Ionicons name="arrow-forward" size={20} color="white" />
          <Text style={styles.continueButtonText}>Continue to Details</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderDetailsStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Final Details</Text>
      <Text style={styles.stepDescription}>Review and complete the class details</Text>
      
      <View style={styles.detailsSummary}>
                      <TouchableOpacity
          style={styles.detailRow}
          onPress={() => setCurrentStep('class')}
        >
          <Text style={styles.detailLabel}>Class:</Text>
          <Text style={styles.detailValue}>{selectedClass?.name}</Text>
          <Ionicons name="chevron-forward" size={16} color="#666" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.detailRow}
          onPress={() => setCurrentStep('time')}
        >
          <Text style={styles.detailLabel}>Time:</Text>
          <Text style={styles.detailValue}>{getCurrentTimeValue()}</Text>
          <Ionicons name="chevron-forward" size={16} color="#666" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.detailRow}
          onPress={() => setCurrentStep('location')}
        >
          <Text style={styles.detailLabel}>Location:</Text>
          <Text style={styles.detailValue}>{selectedLocation.charAt(0).toUpperCase() + selectedLocation.slice(1)}</Text>
          <Ionicons name="chevron-forward" size={16} color="#666" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.detailRow}
          onPress={() => setCurrentStep('trainer')}
        >
          <Text style={styles.detailLabel}>Trainer:</Text>
          <Text style={styles.detailValue}>{selectedTrainer?.first_name} {selectedTrainer?.last_name}</Text>
          <Ionicons name="chevron-forward" size={16} color="#666" />
        </TouchableOpacity>
      </View>

      {/* Difficulty options */}
      <View style={styles.detailsForm}>
        {renderHorizontalSelector(
          'Difficulty Level',
          [
            { value: 'beginner', label: 'Beginner' },
            { value: 'intermediate', label: 'Intermediate' },
            { value: 'advanced', label: 'Advanced' },
            { value: 'all_levels', label: 'All Levels' }
          ],
          selectedDifficulty,
          setSelectedDifficulty
        )}
      </View>
    </View>
  );

  const renderDropdown = (
    label: string,
    value: string,
    onPress: () => void,
    required: boolean = false
  ) => (
    <View style={styles.formField}>
      <Text style={[styles.fieldLabel, { color: theme.colors.text }]}>
        {label} {required && <Text style={{ color: '#FF0000' }}>*</Text>}
                </Text>
                <TouchableOpacity
        style={[styles.dropdown, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
        onPress={onPress}
      >
        <Text style={[styles.dropdownText, { color: value ? theme.colors.text : theme.colors.textSecondary }]}>
          {value || `Select ${label.toLowerCase()}...`}
                  </Text>
        <Ionicons name="chevron-down" size={20} color={theme.colors.textSecondary} />
                </TouchableOpacity>
            </View>
  );

  const renderHorizontalSelector = (
    label: string,
    options: { value: string; label: string }[],
    selectedValue: string,
    onSelect: (value: string) => void
  ) => (
    <View style={styles.formField}>
      <Text style={[styles.fieldLabel, { color: theme.colors.text }]}>
        {label}
                </Text>
      <View style={styles.horizontalSelector}>
        {options.map((option) => (
                      <TouchableOpacity
            key={option.value}
            style={[
              styles.selectorButton,
              { 
                backgroundColor: selectedValue === option.value ? '#000000' : '#F5F5F5',
                borderColor: selectedValue === option.value ? '#000000' : '#E0E0E0'
              }
            ]}
            onPress={() => onSelect(option.value)}
                >
                  <Text style={[
              styles.selectorText,
              { color: selectedValue === option.value ? 'white' : theme.colors.text }
                  ]}>
              {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
              </View>
  );

  const renderTimeSelection = () => (
    <View style={styles.formField}>
      <Text style={[styles.fieldLabel, { color: theme.colors.text }]}>
        Time <Text style={{ color: '#FF0000' }}>*</Text>
                  </Text>
      
      {/* Time Selection Mode Tabs */}
      <View style={[styles.timeModeTabs, { backgroundColor: theme.colors.surface }]}>
                      <TouchableOpacity
          style={[styles.timeModeTab, timeSelectionMode === 'preset' && { backgroundColor: '#000000' }]}
          onPress={() => setTimeSelectionMode('preset')}
                      >
          <Text style={[styles.timeModeTabText, { color: timeSelectionMode === 'preset' ? 'white' : theme.colors.text }]}>
            Preset Times
                          </Text>
                      </TouchableOpacity>
        <TouchableOpacity
          style={[styles.timeModeTab, timeSelectionMode === 'custom' && { backgroundColor: '#000000' }]}
          onPress={() => setTimeSelectionMode('custom')}
        >
          <Text style={[styles.timeModeTabText, { color: timeSelectionMode === 'custom' ? 'white' : theme.colors.text }]}>
            Custom Time
                          </Text>
        </TouchableOpacity>
                  </View>

      {/* Preset Times */}
      {timeSelectionMode === 'preset' && (
        <View style={styles.presetTimesContainer}>
          {predefinedTimes.map((time) => {
            const isScheduled = isTimeScheduled(time.value);
            const isSelected = selectedPresetTime === time.value;
            
            return (
            <TouchableOpacity
                key={time.value}
              style={[
                  styles.presetTimeButton,
                  { 
                    backgroundColor: isSelected ? '#000000' : theme.colors.surface,
                    borderColor: isScheduled ? '#FF6B6B' : theme.colors.border,
                    opacity: isScheduled ? 0.5 : 1
                  }
                ]}
                onPress={() => {
                  if (!isScheduled) {
                    setSelectedPresetTime(time.value);
                  }
                }}
                disabled={isScheduled}
            >
              <Text style={[
                  styles.presetTimeText,
                  { 
                    color: isSelected ? 'white' : isScheduled ? '#FF6B6B' : theme.colors.text 
                  }
                ]}>
                  {time.label}
                          </Text>
                {isScheduled && (
                  <Ionicons name="close-circle" size={16} color="#FF6B6B" />
                )}
              </TouchableOpacity>
            );
          })}
                </View>
              )}

      {/* Custom Time */}
      {timeSelectionMode === 'custom' && (
        <TouchableOpacity
          style={[styles.timeButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
          onPress={() => setShowTimePicker(true)}
        >
          <Ionicons name="time" size={20} color={theme.colors.text} />
          <Text style={[styles.timeText, { color: theme.colors.text }]}>
            {formatTime()}
                </Text>
          <Ionicons name="chevron-down" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
              )}
            </View>
  );

  const renderTimePickerModal = () => (
      <Modal
      visible={showTimePicker}
        transparent={true}
      animationType="slide"
      onRequestClose={() => setShowTimePicker(false)}
      >
        <View style={styles.modalOverlay}>
        <View style={[styles.timePickerModal, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.timePickerHeader}>
            <Text style={[styles.timePickerTitle, { color: theme.colors.text }]}>
              Select Time
              </Text>
            <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

          <View style={styles.timePickerContent}>
            <View style={styles.timeColumn}>
              <Text style={[styles.timeColumnLabel, { color: theme.colors.text }]}>Hour</Text>
              <ScrollView style={styles.timeScrollView} showsVerticalScrollIndicator={false}>
                {Array.from({ length: 24 }, (_, i) => (
              <TouchableOpacity
                    key={i}
                    style={[
                      styles.timeOption,
                      { backgroundColor: selectedHour === i ? '#000000' : 'transparent' }
                    ]}
                    onPress={() => setSelectedHour(i)}
                >
                  <Text style={[
                      styles.timeOptionText,
                      { color: selectedHour === i ? 'white' : theme.colors.text }
                  ]}>
                      {i % 12 || 12}
                </Text>
              </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            
            <View style={styles.timeColumn}>
              <Text style={[styles.timeColumnLabel, { color: theme.colors.text }]}>Minute</Text>
              <ScrollView style={styles.timeScrollView} showsVerticalScrollIndicator={false}>
                {Array.from({ length: 60 }, (_, i) => (
              <TouchableOpacity
                    key={i}
                style={[
                      styles.timeOption,
                      { backgroundColor: selectedMinute === i ? '#000000' : 'transparent' }
                    ]}
                    onPress={() => setSelectedMinute(i)}
                  >
                    <Text style={[
                      styles.timeOptionText,
                      { color: selectedMinute === i ? 'white' : theme.colors.text }
                    ]}>
                      {i.toString().padStart(2, '0')}
                        </Text>
              </TouchableOpacity>
                    ))}
              </ScrollView>
            </View>
              </View>

          <TouchableOpacity
            style={[styles.timePickerDone, { backgroundColor: '#000000' }]}
            onPress={() => setShowTimePicker(false)}
          >
            <Text style={styles.timePickerDoneText}>Done</Text>
          </TouchableOpacity>
          </View>
        </View>
      </Modal>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.text} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Schedule Class
                  </Text>
        <View style={styles.placeholder} />
      </View>

      {/* Step Indicator */}
      {renderStepIndicator()}

      <ScrollView style={styles.content}>
        {/* Step Content */}
        {currentStep === 'class' && renderClassSelectionStep()}
        {currentStep === 'time' && renderTimeSelectionStep()}
        {currentStep === 'location' && renderLocationSelectionStep()}
        {currentStep === 'trainer' && renderTrainerSelectionStep()}
        {currentStep === 'conflicts' && renderConflictsStep()}
        {currentStep === 'details' && renderDetailsStep()}

        {/* Navigation Buttons */}
        <View style={styles.navigationButtons}>
          {currentStep !== 'class' && currentStep !== 'conflicts' && (
            <TouchableOpacity
              style={[styles.navButton, { backgroundColor: theme.colors.surface }]}
              onPress={() => {
                const steps = ['class', 'time', 'location', 'trainer', 'conflicts', 'details'];
                const currentIndex = steps.indexOf(currentStep);
                if (currentIndex > 0) {
                  setCurrentStep(steps[currentIndex - 1] as any);
                }
              }}
            >
              <Text style={[styles.navButtonText, { color: theme.colors.text }]}>Back</Text>
            </TouchableOpacity>
          )}
          
          {currentStep === 'details' && (
            <TouchableOpacity
              style={[styles.navButton, { backgroundColor: '#000000' }]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={20} color="white" />
                  <Text style={styles.saveButtonText}>Schedule Class</Text>
                </>
              )}
            </TouchableOpacity>
              )}
            </View>
      </ScrollView>




      {/* Time Picker Modal */}
      {renderTimePickerModal()}
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
  content: {
    flex: 1,
    padding: 20,
  },
  formField: {
    marginBottom: 24,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  dropdownText: {
    fontSize: 16,
    flex: 1,
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  timeText: {
    fontSize: 16,
    marginLeft: 12,
    flex: 1,
  },
  horizontalSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectorButton: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  selectorText: {
    fontSize: 14,
    fontWeight: '600',
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  recurringInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  infoText: {
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 20,
    marginBottom: 40,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  dropdownModal: {
    maxHeight: '70%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20, // Add bottom padding for better visibility
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
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  dropdownOptionText: {
    fontSize: 16,
    flex: 1,
  },
  dropdownOptionSubtext: {
    fontSize: 14,
    marginLeft: 8,
  },
  timePickerModal: {
    height: '60%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  timePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  timePickerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  timePickerContent: {
    flexDirection: 'row',
    flex: 1,
    padding: 20,
  },
  timeColumn: {
    flex: 1,
    alignItems: 'center',
  },
  timeColumnLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  timeScrollView: {
    flex: 1,
    width: '100%',
  },
  timeOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginVertical: 2,
    alignItems: 'center',
  },
  timeOptionText: {
    fontSize: 16,
    fontWeight: '600',
  },
  timePickerDone: {
    padding: 16,
    margin: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  timePickerDoneText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  timeModeTabs: {
    flexDirection: 'row',
    marginBottom: 16,
    borderRadius: 8,
    padding: 4,
  },
  timeModeTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  timeModeTabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  presetTimesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: '30%',
    justifyContent: 'center',
  },
  presetTimeText: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 4,
  },
  locationOptionContent: {
    flex: 1,
  },
  trainerOptionContent: {
    flex: 1,
  },
  conflictTextOld: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 2,
  },
  
  // Step-by-step styles
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#f5f5f5',
  },
  stepItem: {
    alignItems: 'center',
    flex: 1,
  },
  stepCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepCircleActive: {
    backgroundColor: '#000000',
  },
  stepCircleCompleted: {
    backgroundColor: '#4CAF50',
  },
  stepIcon: {
    fontSize: 16,
  },
  stepIconActive: {
    color: 'white',
  },
  stepIconCompleted: {
    color: 'white',
  },
  stepLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  stepLabelActive: {
    color: '#000000',
    fontWeight: '600',
  },
  stepLabelCompleted: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  
  // Step container styles
  stepContainer: {
    padding: 20,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  
  // Class selection styles
  classList: {
    gap: 8,
  },
  classListItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  className: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  
  // Custom time styles
  customTimeContainer: {
    marginTop: 16,
  },
  customTimeButton: {
    backgroundColor: '#f8f8f8',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  customTimeText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  customTimeLabel: {
    fontSize: 12,
    color: '#666',
  },
  
  // Location selection styles
  locationGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  locationCard: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  locationCardSelected: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  locationCardDisabled: {
    backgroundColor: '#f0f0f0',
    borderColor: '#ff6b6b',
    opacity: 0.5,
  },
  locationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  locationNameSelected: {
    color: 'white',
  },
  locationNameDisabled: {
    color: '#ff6b6b',
  },
  
  // Trainer selection styles
  trainerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  trainerCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f8f8f8',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  trainerCardSelected: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  trainerCardDisabled: {
    backgroundColor: '#f0f0f0',
    borderColor: '#ff6b6b',
    opacity: 0.5,
  },
  trainerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
  },
  trainerNameSelected: {
    color: 'white',
  },
  trainerNameDisabled: {
    color: '#ff6b6b',
  },
  
  // Details step styles
  detailsSummary: {
    backgroundColor: '#f8f8f8',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f8f8f8',
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    color: '#000000',
  },
  detailsForm: {
    marginTop: 16,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },
  recurringContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  recurringToggle: {
    width: 50,
    height: 30,
    backgroundColor: '#e0e0e0',
    borderRadius: 15,
    padding: 2,
    marginRight: 12,
  },
  recurringToggleActive: {
    backgroundColor: '#000000',
  },
  recurringToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
    lineHeight: 26,
  },
  recurringToggleTextActive: {
    color: 'white',
  },
  recurringLabel: {
    fontSize: 14,
    color: '#666',
  },
  recurringOptions: {
    marginTop: 16,
  },
  
  // Navigation styles
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    gap: 12,
  },
  navButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Conflicts step styles
  conflictsSummary: {
    backgroundColor: '#f8f8f8',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  checkConflictsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 20,
  },
  checkConflictsText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  conflictResult: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  conflictHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  conflictTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  conflictText: {
    fontSize: 14,
    marginBottom: 4,
    lineHeight: 20,
  },
  continueButtonConflicts: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  continueButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default ScheduleClassScreen;