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
  const [currentStep, setCurrentStep] = useState<'class' | 'time' | 'location' | 'trainer' | 'conflicts' | 'recurrence' | 'details'>('class');
  
  // Recurrence state
  const [recurrenceType, setRecurrenceType] = useState<'single' | 'weekly' | 'custom'>('single');
  const [selectedDaysOfWeek, setSelectedDaysOfWeek] = useState<number[]>([]); // 0 = Sunday, 1 = Monday, etc.
  const [customDates, setCustomDates] = useState<Date[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
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

  const goBackToStep = (step: 'class' | 'time' | 'location' | 'trainer' | 'conflicts' | 'recurrence' | 'details') => {
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
      setCurrentStep('recurrence');
    } else {
      Alert.alert('Conflicts Found', 'Please resolve the conflicts before continuing.');
    }
  };

  // Generate dates based on recurrence type
  const generateRecurrenceDates = (): string[] => {
    if (!selectedDate) return [];
    
    const baseDate = selectedDate instanceof Date ? selectedDate : new Date(selectedDate);
    const dates: string[] = [];
    
    switch (recurrenceType) {
      case 'single':
        // Just the selected date
        dates.push(baseDate.toISOString().split('T')[0]);
        break;
        
      case 'weekly':
        // For the next 3 weeks on selected days
        if (selectedDaysOfWeek.length === 0) {
          // If no days selected, just use the base date
          dates.push(baseDate.toISOString().split('T')[0]);
          break;
        }
        
        for (let week = 0; week < 3; week++) {
          selectedDaysOfWeek.forEach(dayOfWeek => {
            const date = new Date(baseDate);
            // Get the day of week of the base date (0 = Sunday, 1 = Monday, etc.)
            const baseDayOfWeek = date.getDay();
            // Calculate days to add
            let daysToAdd = dayOfWeek - baseDayOfWeek;
            // If the target day is earlier in the week, add 7 days to get to next week
            if (daysToAdd < 0) daysToAdd += 7;
            // Add weeks and days
            date.setDate(date.getDate() + (week * 7) + daysToAdd);
            const dateString = date.toISOString().split('T')[0];
            // Only add future dates (including today)
            if (date >= new Date(new Date().setHours(0, 0, 0, 0))) {
              dates.push(dateString);
            }
          });
        }
        // Remove duplicates and sort
        return [...new Set(dates)].sort();
        
      case 'custom':
        // Use custom selected dates
        return customDates
          .map(date => date.toISOString().split('T')[0])
          .filter(date => date >= new Date().toISOString().split('T')[0])
          .sort();
        
      default:
        dates.push(baseDate.toISOString().split('T')[0]);
    }
    
    return dates;
  };

  // Step indicator component - Compact version
  const renderStepIndicator = () => {
    const steps = [
      { key: 'class', label: 'Class', shortLabel: 'Class' },
      { key: 'time', label: 'Time', shortLabel: 'Time' },
      { key: 'location', label: 'Location', shortLabel: 'Location' },
      { key: 'trainer', label: 'Trainer', shortLabel: 'Trainer' },
      { key: 'conflicts', label: 'Conflicts', shortLabel: 'Conflicts' },
      { key: 'recurrence', label: 'Recurrence', shortLabel: 'Recurrence' },
      { key: 'details', label: 'Details', shortLabel: 'Details' }
    ];

    const currentIndex = steps.findIndex(s => s.key === currentStep);
    const currentStepInfo = steps[currentIndex];
    const progress = ((currentIndex + 1) / steps.length) * 100;

    return (
      <View style={[styles.stepIndicatorCompact, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        {/* Progress Bar */}
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBarBackground, { backgroundColor: theme.colors.border }]}>
            <View 
              style={[
                styles.progressBarFill, 
                { 
                  width: `${progress}%`,
                  backgroundColor: theme.colors.primary 
                }
              ]} 
            />
          </View>
          <Text style={[styles.progressText, { color: theme.colors.textSecondary }]}>
            Step {currentIndex + 1} of {steps.length}
          </Text>
        </View>

        {/* Current Step Name */}
        <View style={styles.currentStepContainer}>
          <Text style={[styles.currentStepLabel, { color: theme.colors.text }]}>
            {currentStepInfo?.label || 'Schedule Class'}
          </Text>
        </View>

        {/* Step Dots - Compact */}
        <View style={styles.stepDotsContainer}>
          {steps.map((step, index) => {
            const isActive = currentStep === step.key;
            const isCompleted = index < currentIndex;
            
            return (
              <React.Fragment key={step.key}>
                <View 
                  style={[
                    styles.stepDot,
                    {
                      backgroundColor: isActive 
                        ? theme.colors.primary 
                        : isCompleted 
                        ? theme.colors.success 
                        : theme.colors.border,
                      width: isActive ? 10 : 8,
                      height: isActive ? 10 : 8,
                    }
                  ]} 
                />
                {index < steps.length - 1 && (
                  <View 
                    style={[
                      styles.stepDotConnector,
                      { 
                        backgroundColor: isCompleted ? theme.colors.success : theme.colors.border,
                      }
                    ]} 
                  />
                )}
              </React.Fragment>
            );
          })}
        </View>
      </View>
    );
  };

  // Step components
  const renderClassSelectionStep = () => (
    <View style={styles.stepContainer}>
      <Text style={[styles.stepTitle, { color: theme.colors.text }]}>Select Class</Text>
      <Text style={[styles.stepDescription, { color: theme.colors.textSecondary }]}>Choose the class you want to schedule</Text>
      
      <View style={styles.classList}>
        {classes.map((classItem) => (
          <TouchableOpacity
            key={classItem.id}
            style={[styles.classListItem, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            onPress={() => handleClassSelected(classItem)}
          >
            <Text style={[styles.className, { color: theme.colors.text }]}>{classItem.name}</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderTimeSelectionStep = () => {
    return (
      <View style={styles.stepContainer}>
        <Text style={[styles.stepTitle, { color: theme.colors.text }]}>Select Time</Text>
        <Text style={[styles.stepDescription, { color: theme.colors.textSecondary }]}>Choose when the class will be held</Text>
        
        {/* Time selection mode tabs */}
        <View style={[styles.timeModeTabs, { backgroundColor: theme.colors.surface }]}>
          <TouchableOpacity
            style={[styles.timeModeTab, timeSelectionMode === 'preset' && { backgroundColor: theme.colors.primary }]}
            onPress={() => setTimeSelectionMode('preset')}
          >
            <Text style={[styles.timeModeTabText, { color: timeSelectionMode === 'preset' ? theme.colors.background : theme.colors.text }]}>
              Preset Times
            </Text>
        </TouchableOpacity>
          <TouchableOpacity
            style={[styles.timeModeTab, timeSelectionMode === 'custom' && { backgroundColor: theme.colors.primary }]}
            onPress={() => setTimeSelectionMode('custom')}
          >
            <Text style={[styles.timeModeTabText, { color: timeSelectionMode === 'custom' ? theme.colors.background : theme.colors.text }]}>
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
                    { 
                      backgroundColor: isSelected ? theme.colors.primary : theme.colors.surface,
                      borderColor: isSelected ? theme.colors.primary : theme.colors.border
                    }
                  ]}
                  onPress={() => handleTimeSelected(time.value)}
            >
              <Text style={[
                    styles.presetTimeText,
                    { color: isSelected ? theme.colors.background : theme.colors.text }
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
              style={[styles.customTimeButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              onPress={() => setShowTimePicker(true)}
            >
              <Text style={[styles.customTimeText, { color: theme.colors.text }]}>
                {`${selectedHour.toString().padStart(2, '0')}:${selectedMinute.toString().padStart(2, '0')}`}
                  </Text>
              <Text style={[styles.customTimeLabel, { color: theme.colors.textSecondary }]}>Tap to set custom time</Text>
            </TouchableOpacity>
                </View>
              )}
        </View>
    );
  };

  const renderLocationSelectionStep = () => {
    return (
      <View style={styles.stepContainer}>
        <Text style={[styles.stepTitle, { color: theme.colors.text }]}>Select Location</Text>
        <Text style={[styles.stepDescription, { color: theme.colors.textSecondary }]}>Choose where the class will be held</Text>
        
        <View style={styles.locationGrid}>
          {['gym', 'park'].map((location) => {
            const isSelected = selectedLocation === location;
            
            return (
              <TouchableOpacity
                key={location}
                style={[
                  styles.locationCard,
                  { 
                    backgroundColor: isSelected ? theme.colors.primary : theme.colors.surface,
                    borderColor: isSelected ? theme.colors.primary : theme.colors.border
                  }
                ]}
                onPress={() => handleLocationSelected(location)}
              >
                <Text style={[
                  styles.locationName,
                  { color: isSelected ? theme.colors.background : theme.colors.text }
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
        <Text style={[styles.stepTitle, { color: theme.colors.text }]}>Select Trainer</Text>
        <Text style={[styles.stepDescription, { color: theme.colors.textSecondary }]}>Choose who will teach the class</Text>
        
        <View style={styles.trainerGrid}>
          {trainers.map((trainer) => {
            const isSelected = selectedTrainer?.id === trainer.id;
            
            return (
                <TouchableOpacity
                key={trainer.id}
                style={[
                  styles.trainerCard,
                  { 
                    backgroundColor: isSelected ? theme.colors.primary : theme.colors.surface,
                    borderColor: isSelected ? theme.colors.primary : theme.colors.border
                  }
                ]}
                onPress={() => handleTrainerSelected(trainer)}
                >
                  <Text style={[
                  styles.trainerName,
                  { color: isSelected ? theme.colors.background : theme.colors.text }
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
      <Text style={[styles.stepTitle, { color: theme.colors.text }]}>Check for Conflicts</Text>
      <Text style={[styles.stepDescription, { color: theme.colors.textSecondary }]}>Verify that your selections don't conflict with existing schedules</Text>
      
      <View style={[styles.conflictsSummary, { backgroundColor: theme.colors.surface }]}>
        <TouchableOpacity
          style={styles.detailRow}
          onPress={() => setCurrentStep('class')}
        >
          <Text style={styles.detailLabel}>Class:</Text>
          <Text style={styles.detailValue}>{selectedClass?.name}</Text>
          <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.detailRow}
          onPress={() => setCurrentStep('time')}
        >
          <Text style={styles.detailLabel}>Time:</Text>
          <Text style={styles.detailValue}>{getCurrentTimeValue()}</Text>
          <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.detailRow}
          onPress={() => setCurrentStep('location')}
        >
          <Text style={styles.detailLabel}>Location:</Text>
          <Text style={styles.detailValue}>{selectedLocation.charAt(0).toUpperCase() + selectedLocation.slice(1)}</Text>
          <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.detailRow}
          onPress={() => setCurrentStep('trainer')}
        >
          <Text style={styles.detailLabel}>Trainer:</Text>
          <Text style={styles.detailValue}>{selectedTrainer?.first_name} {selectedTrainer?.last_name}</Text>
          <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.checkConflictsButton, { backgroundColor: theme.colors.primary }]}
        onPress={handleCheckConflicts}
        disabled={checkingConflicts}
      >
        {checkingConflicts ? (
          <ActivityIndicator color={theme.colors.background} />
        ) : (
          <>
            <Ionicons name="search" size={20} color={theme.colors.background} />
            <Text style={[styles.checkConflictsText, { color: theme.colors.background }]}>Check for Conflicts</Text>
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
                <Ionicons name="warning" size={20} color={theme.colors.error} />
                <Text style={[styles.conflictTitle, { color: theme.colors.error }]}>Conflicts Found</Text>
              </View>
              {conflictCheckResult.conflicts.map((conflict, index) => (
                <Text key={index} style={[styles.conflictText, { color: theme.colors.error }]}>
                  • {conflict}
                </Text>
              ))}
            </View>
          ) : (
            <View style={styles.conflictHeader}>
              <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
              <Text style={[styles.conflictTitle, { color: theme.colors.success }]}>No Conflicts Found</Text>
            </View>
          )}
        </View>
      )}

      {conflictCheckResult && !conflictCheckResult.hasConflicts && (
        <TouchableOpacity
          style={[styles.continueButtonConflicts, { backgroundColor: theme.colors.success }]}
          onPress={handleContinueAfterConflicts}
        >
          <Ionicons name="arrow-forward" size={20} color={theme.colors.background} />
          <Text style={[styles.continueButtonText, { color: theme.colors.background }]}>Continue to Recurrence</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderRecurrenceStep = () => {
    const daysOfWeek = [
      { label: 'Sun', value: 0 },
      { label: 'Mon', value: 1 },
      { label: 'Tue', value: 2 },
      { label: 'Wed', value: 3 },
      { label: 'Thu', value: 4 },
      { label: 'Fri', value: 5 },
      { label: 'Sat', value: 6 },
    ];

    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    };

    const addCustomDate = () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      setCustomDates([...customDates, today]);
    };

    const removeCustomDate = (index: number) => {
      setCustomDates(customDates.filter((_, i) => i !== index));
    };

    const previewDates = generateRecurrenceDates();

    return (
      <View style={styles.stepContainer}>
        <Text style={[styles.stepTitle, { color: theme.colors.text }]}>Recurrence Options</Text>
        <Text style={[styles.stepDescription, { color: theme.colors.textSecondary }]}>
          Choose how often this class should be scheduled
        </Text>

        {/* Recurrence Type Selection */}
        <View style={styles.recurrenceTypeContainer}>
          <TouchableOpacity
            style={[
              styles.recurrenceTypeCard,
              {
                backgroundColor: recurrenceType === 'single' ? theme.colors.primary : theme.colors.surface,
                borderColor: recurrenceType === 'single' ? theme.colors.primary : theme.colors.border
              }
            ]}
            onPress={() => setRecurrenceType('single')}
          >
            <Ionicons 
              name="calendar-outline" 
              size={24} 
              color={recurrenceType === 'single' ? theme.colors.background : theme.colors.text} 
            />
            <Text style={[
              styles.recurrenceTypeLabel,
              { color: recurrenceType === 'single' ? theme.colors.background : theme.colors.text }
            ]}>
              Single Day
            </Text>
            <Text style={[
              styles.recurrenceTypeDescription,
              { color: recurrenceType === 'single' ? theme.colors.textSecondary : theme.colors.textSecondary }
            ]}>
              Just for this day
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.recurrenceTypeCard,
              {
                backgroundColor: recurrenceType === 'weekly' ? theme.colors.primary : theme.colors.surface,
                borderColor: recurrenceType === 'weekly' ? theme.colors.primary : theme.colors.border
              }
            ]}
            onPress={() => setRecurrenceType('weekly')}
          >
            <Ionicons 
              name="repeat-outline" 
              size={24} 
              color={recurrenceType === 'weekly' ? theme.colors.background : theme.colors.text} 
            />
            <Text style={[
              styles.recurrenceTypeLabel,
              { color: recurrenceType === 'weekly' ? theme.colors.background : theme.colors.text }
            ]}>
              Weekly (3 weeks)
            </Text>
            <Text style={[
              styles.recurrenceTypeDescription,
              { color: recurrenceType === 'weekly' ? theme.colors.textSecondary : theme.colors.textSecondary }
            ]}>
              Repeat weekly for 3 weeks
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.recurrenceTypeCard,
              {
                backgroundColor: recurrenceType === 'custom' ? theme.colors.primary : theme.colors.surface,
                borderColor: recurrenceType === 'custom' ? theme.colors.primary : theme.colors.border
              }
            ]}
            onPress={() => setRecurrenceType('custom')}
          >
            <Ionicons 
              name="calendar" 
              size={24} 
              color={recurrenceType === 'custom' ? theme.colors.background : theme.colors.text} 
            />
            <Text style={[
              styles.recurrenceTypeLabel,
              { color: recurrenceType === 'custom' ? theme.colors.background : theme.colors.text }
            ]}>
              Custom Dates
            </Text>
            <Text style={[
              styles.recurrenceTypeDescription,
              { color: recurrenceType === 'custom' ? theme.colors.textSecondary : theme.colors.textSecondary }
            ]}>
              Select specific dates
            </Text>
          </TouchableOpacity>
        </View>

        {/* Weekly Day Selection */}
        {recurrenceType === 'weekly' && (
          <View style={styles.weeklyDaysContainer}>
            <Text style={[styles.sectionSubtitle, { color: theme.colors.text }]}>
              Select days of the week
            </Text>
            <View style={styles.daysOfWeekGrid}>
              {daysOfWeek.map((day) => {
                const isSelected = selectedDaysOfWeek.includes(day.value);
                return (
                  <TouchableOpacity
                    key={day.value}
                    style={[
                      styles.dayOfWeekButton,
                      {
                        backgroundColor: isSelected ? theme.colors.primary : theme.colors.surface,
                        borderColor: isSelected ? theme.colors.primary : theme.colors.border
                      }
                    ]}
                    onPress={() => {
                      if (isSelected) {
                        setSelectedDaysOfWeek(selectedDaysOfWeek.filter(d => d !== day.value));
                      } else {
                        setSelectedDaysOfWeek([...selectedDaysOfWeek, day.value]);
                      }
                    }}
                  >
                    <Text style={[
                      styles.dayOfWeekText,
                      { color: isSelected ? theme.colors.background : theme.colors.text }
                    ]}>
                      {day.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Custom Dates Selection */}
        {recurrenceType === 'custom' && (
          <View style={styles.customDatesContainer}>
            <View style={styles.customDatesHeader}>
              <Text style={[styles.sectionSubtitle, { color: theme.colors.text }]}>
                Selected Dates
              </Text>
              <TouchableOpacity
                style={[styles.addDateButton, { backgroundColor: theme.colors.primary }]}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="add" size={20} color={theme.colors.background} />
                <Text style={[styles.addDateButtonText, { color: theme.colors.background }]}>Add Date</Text>
              </TouchableOpacity>
            </View>
            {customDates.length === 0 ? (
              <Text style={[styles.emptyDatesText, { color: theme.colors.textSecondary }]}>
                No dates selected. Tap "Add Date" to select dates.
              </Text>
            ) : (
              <View style={styles.customDatesList}>
                {customDates.map((date, index) => (
                  <View
                    key={index}
                    style={[styles.customDateItem, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                  >
                    <Text style={[styles.customDateText, { color: theme.colors.text }]}>
                      {formatDate(date)}
                    </Text>
                    <TouchableOpacity onPress={() => removeCustomDate(index)}>
                      <Ionicons name="close-circle" size={20} color={theme.colors.error} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Preview */}
        {previewDates.length > 0 && (
          <View style={[styles.previewContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={[styles.previewTitle, { color: theme.colors.text }]}>
              Preview: {previewDates.length} class{previewDates.length > 1 ? 'es' : ''} will be scheduled
            </Text>
            <ScrollView style={styles.previewDatesList} nestedScrollEnabled>
              {previewDates.slice(0, 10).map((date, index) => (
                <Text key={index} style={[styles.previewDateText, { color: theme.colors.textSecondary }]}>
                  • {new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </Text>
              ))}
              {previewDates.length > 10 && (
                <Text style={[styles.previewDateText, { color: theme.colors.textSecondary }]}>
                  ... and {previewDates.length - 10} more
                </Text>
              )}
            </ScrollView>
          </View>
        )}

        {/* Date Picker Modal for Custom Dates */}
        <Modal
          visible={showDatePicker}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowDatePicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.datePickerModal, { backgroundColor: theme.colors.surface }]}>
              <View style={[styles.datePickerHeader, { borderBottomColor: theme.colors.border }]}>
                <Text style={[styles.datePickerTitle, { color: theme.colors.text }]}>Select Date</Text>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Ionicons name="close" size={24} color={theme.colors.text} />
                </TouchableOpacity>
              </View>
              <View style={styles.datePickerContent}>
                <Text style={[styles.datePickerHint, { color: theme.colors.textSecondary }]}>
                  Date picker would go here. For now, adding today's date.
                </Text>
                <TouchableOpacity
                  style={[styles.datePickerConfirmButton, { backgroundColor: theme.colors.primary }]}
                  onPress={() => {
                    addCustomDate();
                    setShowDatePicker(false);
                  }}
                >
                  <Text style={[styles.datePickerConfirmText, { color: theme.colors.background }]}>
                    Add Today's Date
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  };

  const renderDetailsStep = () => (
    <View style={styles.stepContainer}>
      <Text style={[styles.stepTitle, { color: theme.colors.text }]}>Final Details</Text>
      <Text style={[styles.stepDescription, { color: theme.colors.textSecondary }]}>Review and complete the class details</Text>
      
      <View style={[styles.detailsSummary, { backgroundColor: theme.colors.surface }]}>
                      <TouchableOpacity
          style={[styles.detailRow, { backgroundColor: theme.colors.background }]}
          onPress={() => setCurrentStep('class')}
        >
          <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>Class:</Text>
          <Text style={[styles.detailValue, { color: theme.colors.text }]}>{selectedClass?.name}</Text>
          <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.detailRow, { backgroundColor: theme.colors.background }]}
          onPress={() => setCurrentStep('time')}
        >
          <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>Time:</Text>
          <Text style={[styles.detailValue, { color: theme.colors.text }]}>{getCurrentTimeValue()}</Text>
          <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.detailRow, { backgroundColor: theme.colors.background }]}
          onPress={() => setCurrentStep('location')}
        >
          <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>Location:</Text>
          <Text style={[styles.detailValue, { color: theme.colors.text }]}>{selectedLocation.charAt(0).toUpperCase() + selectedLocation.slice(1)}</Text>
          <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.detailRow, { backgroundColor: theme.colors.background }]}
          onPress={() => setCurrentStep('trainer')}
        >
          <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>Trainer:</Text>
          <Text style={[styles.detailValue, { color: theme.colors.text }]}>{selectedTrainer?.first_name} {selectedTrainer?.last_name}</Text>
          <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
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
        {label} {required && <Text style={{ color: theme.colors.error }}>*</Text>}
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
                backgroundColor: selectedValue === option.value ? theme.colors.primary : theme.colors.surface,
                borderColor: selectedValue === option.value ? theme.colors.primary : theme.colors.border
              }
            ]}
            onPress={() => onSelect(option.value)}
                >
                  <Text style={[
              styles.selectorText,
              { color: selectedValue === option.value ? theme.colors.background : theme.colors.text }
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
        Time <Text style={{ color: theme.colors.error }}>*</Text>
                  </Text>
      
      {/* Time Selection Mode Tabs */}
      <View style={[styles.timeModeTabs, { backgroundColor: theme.colors.surface }]}>
                      <TouchableOpacity
          style={[styles.timeModeTab, timeSelectionMode === 'preset' && { backgroundColor: theme.colors.primary }]}
          onPress={() => setTimeSelectionMode('preset')}
                      >
          <Text style={[styles.timeModeTabText, { color: timeSelectionMode === 'preset' ? theme.colors.background : theme.colors.text }]}>
            Preset Times
                          </Text>
                      </TouchableOpacity>
        <TouchableOpacity
          style={[styles.timeModeTab, timeSelectionMode === 'custom' && { backgroundColor: theme.colors.primary }]}
          onPress={() => setTimeSelectionMode('custom')}
        >
          <Text style={[styles.timeModeTabText, { color: timeSelectionMode === 'custom' ? theme.colors.background : theme.colors.text }]}>
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
                    backgroundColor: isSelected ? theme.colors.primary : theme.colors.surface,
                    borderColor: isScheduled ? theme.colors.error : (isSelected ? theme.colors.primary : theme.colors.border),
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
                    color: isSelected ? theme.colors.background : isScheduled ? theme.colors.error : theme.colors.text 
                  }
                ]}>
                  {time.label}
                          </Text>
                {isScheduled && (
                  <Ionicons name="close-circle" size={16} color={theme.colors.error} />
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
                      { backgroundColor: selectedHour === i ? theme.colors.primary : 'transparent' }
                    ]}
                    onPress={() => setSelectedHour(i)}
                >
                  <Text style={[
                      styles.timeOptionText,
                      { color: selectedHour === i ? theme.colors.background : theme.colors.text }
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
                      { backgroundColor: selectedMinute === i ? theme.colors.primary : 'transparent' }
                    ]}
                    onPress={() => setSelectedMinute(i)}
                  >
                    <Text style={[
                      styles.timeOptionText,
                      { color: selectedMinute === i ? theme.colors.background : theme.colors.text }
                    ]}>
                      {i.toString().padStart(2, '0')}
                        </Text>
              </TouchableOpacity>
                    ))}
              </ScrollView>
            </View>
              </View>

          <TouchableOpacity
            style={[styles.timePickerDone, { backgroundColor: theme.colors.primary }]}
            onPress={() => setShowTimePicker(false)}
          >
            <Text style={[styles.timePickerDoneText, { color: theme.colors.background }]}>Done</Text>
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
        {currentStep === 'recurrence' && renderRecurrenceStep()}
        {currentStep === 'details' && renderDetailsStep()}

        {/* Navigation Buttons */}
        <View style={styles.navigationButtons}>
          {currentStep !== 'class' && currentStep !== 'conflicts' && (
            <TouchableOpacity
              style={[styles.navButton, { backgroundColor: theme.colors.surface }]}
              onPress={() => {
                const steps = ['class', 'time', 'location', 'trainer', 'conflicts', 'recurrence', 'details'];
                const currentIndex = steps.indexOf(currentStep);
                if (currentIndex > 0) {
                  setCurrentStep(steps[currentIndex - 1] as any);
                }
              }}
            >
              <Text style={[styles.navButtonText, { color: theme.colors.text }]}>Back</Text>
            </TouchableOpacity>
          )}
          
          {currentStep === 'recurrence' && (
            <TouchableOpacity
              style={[styles.navButton, { backgroundColor: theme.colors.primary }]}
              onPress={() => setCurrentStep('details')}
            >
              <Text style={[styles.navButtonText, { color: theme.colors.background }]}>Continue</Text>
            </TouchableOpacity>
          )}
          
          {currentStep === 'details' && (
            <TouchableOpacity
              style={[styles.navButton, { backgroundColor: theme.colors.primary }]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={theme.colors.background} />
              ) : (
                <>
                  <Ionicons name="checkmark" size={20} color={theme.colors.background} />
                  <Text style={[styles.saveButtonText, { color: theme.colors.background }]}>Schedule Class</Text>
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
  
  // Step-by-step styles - Compact version
  stepIndicatorCompact: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  progressBarContainer: {
    marginBottom: 12,
  },
  progressBarBackground: {
    height: 4,
    borderRadius: 2,
    marginBottom: 6,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    textAlign: 'right',
  },
  currentStepContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  currentStepLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  stepDotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  stepDot: {
    borderRadius: 5,
    marginHorizontal: 2,
  },
  stepDotConnector: {
    height: 2,
    flex: 1,
    maxWidth: 20,
    marginHorizontal: 2,
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
  
  // Recurrence step styles
  recurrenceTypeContainer: {
    gap: 12,
    marginBottom: 24,
  },
  recurrenceTypeCard: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  recurrenceTypeLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  recurrenceTypeDescription: {
    fontSize: 14,
    marginTop: 4,
  },
  weeklyDaysContainer: {
    marginTop: 24,
  },
  sectionSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  daysOfWeekGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayOfWeekButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayOfWeekText: {
    fontSize: 14,
    fontWeight: '600',
  },
  customDatesContainer: {
    marginTop: 24,
  },
  customDatesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addDateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  addDateButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyDatesText: {
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 20,
  },
  customDatesList: {
    gap: 8,
  },
  customDateItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  customDateText: {
    fontSize: 14,
  },
  previewContainer: {
    marginTop: 24,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  previewDatesList: {
    maxHeight: 150,
  },
  previewDateText: {
    fontSize: 12,
    marginBottom: 4,
  },
  datePickerModal: {
    maxHeight: '50%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  datePickerContent: {
    padding: 20,
  },
  datePickerHint: {
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  datePickerConfirmButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  datePickerConfirmText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ScheduleClassScreen;