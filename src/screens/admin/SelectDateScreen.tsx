import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../theme/ThemeContext';
import { useAdminData } from '../../context/AdminDataContext';

interface Props {
  navigation: any;
  route: any;
}

interface ScheduledClass {
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

const SelectDateScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { scheduledClasses, loading } = useAdminData();
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Ensure it's set to start of day
    return today;
  });
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [availableDates, setAvailableDates] = useState<Date[]>([]);

  useEffect(() => {
    generateAvailableDates();
  }, []);

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
    
    setAvailableDates(dates);
  };

  const getScheduledClassesCount = (date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    const matchingClasses = scheduledClasses.filter(cls => cls.scheduled_date === dateString);
    return matchingClasses.length;
  };

  const handleContinue = () => {
    navigation.navigate('ScheduleClass', { 
      selectedDate: selectedDate.toISOString().split('T')[0] 
    });
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

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isPastDate = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Select Date
        </Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        {/* Date Selection */}
        <View style={[styles.dateSection, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Choose Date for Class
          </Text>
          
          <TouchableOpacity
            style={[styles.dateButton, { backgroundColor: theme.colors.background }]}
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
            <Ionicons name="chevron-down" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>

          {isPastDate(selectedDate) && (
            <View style={styles.warningContainer}>
              <Ionicons name="warning" size={16} color="#FF6B6B" />
              <Text style={styles.warningText}>
                You are selecting a past date
              </Text>
            </View>
          )}
        </View>

        {/* Scheduled Classes Info */}
        <View style={[styles.classesInfo, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.classesHeader}>
            <Ionicons name="calendar-outline" size={24} color={theme.colors.text} />
            <Text style={[styles.classesTitle, { color: theme.colors.text }]}>
              Scheduled Classes
            </Text>
          </View>
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={theme.colors.text} />
              <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
                Loading...
              </Text>
            </View>
          ) : (
            <View style={styles.classesCountContainer}>
              <Text style={[styles.classesCount, { color: theme.colors.text }]}>
                {getScheduledClassesCount(selectedDate)}
              </Text>
              <Text style={[styles.classesLabel, { color: theme.colors.textSecondary }]}>
                {getScheduledClassesCount(selectedDate) === 1 ? 'class' : 'classes'} scheduled for {isToday(selectedDate) ? 'today' : 'this date'}
              </Text>
            </View>
          )}

          {getScheduledClassesCount(selectedDate) > 0 && (
            <TouchableOpacity
              style={[styles.viewScheduleButton, { backgroundColor: '#666666' }]}
              onPress={() => navigation.navigate('ScheduleView')}
            >
              <Ionicons name="eye" size={16} color="white" />
              <Text style={styles.viewScheduleText}>View Schedule</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Continue Button */}
        <TouchableOpacity
          style={[styles.continueButton, { backgroundColor: '#000000' }]}
          onPress={handleContinue}
        >
          <Ionicons name="arrow-forward" size={20} color="white" />
          <Text style={styles.continueText}>Continue to Schedule Class</Text>
        </TouchableOpacity>
      </View>

      {/* Date Dropdown Modal */}
      <Modal
        visible={showDateDropdown}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDateDropdown(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.dateDropdownModal, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.dropdownHeader}>
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
                const classesCount = getScheduledClassesCount(date);
                const isToday = date.toDateString() === new Date().toDateString();
                
                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.dateOption,
                      { 
                        backgroundColor: isSelected ? '#000000' : 'transparent',
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
                          { color: isSelected ? 'white' : theme.colors.text }
                        ]}>
                          {formatDate(date)}
                        </Text>
                        <Text style={[
                          styles.dateOptionSubtext,
                          { color: isSelected ? '#CCCCCC' : theme.colors.textSecondary }
                        ]}>
                          {formatDateShort(date)}
                          {isToday && ' • Today'}
                        </Text>
                      </View>
                      <View style={styles.dateOptionCount}>
                        <Text style={[
                          styles.dateCountText,
                          { color: isSelected ? 'white' : theme.colors.text }
                        ]}>
                          {classesCount}
                        </Text>
                        <Text style={[
                          styles.dateCountLabel,
                          { color: isSelected ? '#CCCCCC' : theme.colors.textSecondary }
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
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  dateSection: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
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
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 12,
    backgroundColor: '#FFF5F5',
    borderRadius: 8,
  },
  warningText: {
    color: '#FF6B6B',
    fontSize: 14,
    marginLeft: 8,
  },
  classesInfo: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 30,
  },
  classesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  classesTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 12,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    fontSize: 14,
    marginLeft: 8,
  },
  classesCountContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  classesCount: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  classesLabel: {
    fontSize: 16,
    marginTop: 8,
    textAlign: 'center',
  },
  viewScheduleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 16,
  },
  viewScheduleText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  continueText: {
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
  dateCountText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  dateCountLabel: {
    fontSize: 12,
    marginTop: 2,
  },
});

export default SelectDateScreen;
