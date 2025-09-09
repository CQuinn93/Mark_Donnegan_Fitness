import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabaseApi } from '../../config/supabase';
import { useTheme } from '../../theme/ThemeContext';

interface ClassSchedule {
  id: string;
  scheduled_date: string;
  scheduled_time: string;
  status: 'active' | 'ongoing' | 'completed' | 'cancelled';
  classes: {
    name: string;
    duration: number;
  };
  class_bookings: Array<{
    id: string;
    member_id: string;
    status: string;
    profiles: {
      first_name: string;
      last_name: string;
    };
  }>;
  class_attendance: Array<{
    id: string;
    member_id: string;
    attended: boolean;
    checked_in_at: string | null;
  }>;
}

interface Props {
  navigation: any;
  route: any;
  onSignOut?: () => void;
}

const ClassManagementScreen: React.FC<Props> = ({ navigation, route, onSignOut }) => {
  const { theme } = useTheme();
  const [classes, setClasses] = useState<ClassSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchClasses();
  }, [selectedDate, route.params?.trainerId]);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      
      // Get trainer ID from route params
      const trainerId = route.params?.trainerId;
      
      if (!trainerId) {
        Alert.alert('Error', 'Trainer ID not found');
        setLoading(false);
        return;
      }
      
      const response = await supabaseApi.get('/class_schedules', {
        params: {
          select: `
            id,
            scheduled_date,
            scheduled_time,
            status,
            classes!inner(
              name,
              duration
            ),
            class_bookings(
              id,
              member_id,
              status,
              profiles!inner(
                first_name,
                last_name
              )
            ),
            class_attendance(
              id,
              member_id,
              attended,
              checked_in_at
            )
          `,
          trainer_id: `eq.${trainerId}`,
          scheduled_date: `eq.${selectedDate}`,
          order: 'scheduled_time.asc'
        }
      });

      setClasses(response.data);
    } catch (error) {
      console.error('Error fetching classes:', error);
      Alert.alert('Error', 'Failed to fetch classes');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchClasses();
    setRefreshing(false);
  };

  const updateClassStatus = async (classId: string, newStatus: 'ongoing' | 'completed') => {
    try {
      await supabaseApi.patch(`/class_schedules?id=eq.${classId}`, {
        status: newStatus,
        updated_at: new Date().toISOString()
      });

      // Update local state
      setClasses(prevClasses =>
        prevClasses.map(cls =>
          cls.id === classId ? { ...cls, status: newStatus } : cls
        )
      );

      Alert.alert('Success', `Class status updated to ${newStatus}`);
    } catch (error) {
      console.error('Error updating class status:', error);
      Alert.alert('Error', 'Failed to update class status');
    }
  };

  const toggleAttendance = async (classScheduleId: string, memberId: string, attended: boolean) => {
    try {
      if (attended) {
        // Mark as attended
        await supabaseApi.post('/class_attendance', {
          class_schedule_id: classScheduleId,
          member_id: memberId,
          attended: true,
          checked_in_at: new Date().toISOString(),
          checked_in_by: route.params?.trainerId
        });
      } else {
        // Remove attendance record
        await supabaseApi.delete('/class_attendance', {
          params: {
            class_schedule_id: `eq.${classScheduleId}`,
            member_id: `eq.${memberId}`
          }
        });
      }

      // Refresh the data
      await fetchClasses();
    } catch (error) {
      console.error('Error updating attendance:', error);
      Alert.alert('Error', 'Failed to update attendance');
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

  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const isMemberAttended = (classSchedule: ClassSchedule, memberId: string) => {
    return classSchedule.class_attendance.some(
      attendance => attendance.member_id === memberId && attendance.attended
    );
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

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.loadingText, { color: theme.colors.text }]}>Loading classes...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            Class Management
          </Text>
          <Text style={[styles.dateText, { color: theme.colors.textSecondary }]}>
            {new Date(selectedDate).toLocaleDateString()}
          </Text>
        </View>
        {onSignOut && (
          <TouchableOpacity onPress={handleSignOut} style={styles.signOutButton}>
            <Ionicons name="log-out-outline" size={24} color={theme.colors.error} />
          </TouchableOpacity>
        )}
      </View>

      {classes.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            No classes scheduled for this date
          </Text>
        </View>
      ) : (
        classes.map((classSchedule) => (
          <View key={classSchedule.id} style={[styles.classCard, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.classHeader}>
              <View>
                <Text style={[styles.className, { color: theme.colors.text }]}>
                  {classSchedule.classes.name}
                </Text>
                <Text style={[styles.classTime, { color: theme.colors.textSecondary }]}>
                  {formatTime(classSchedule.scheduled_time)} ({classSchedule.classes.duration} min)
                </Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(classSchedule.status) }]}>
                <Text style={styles.statusText}>{classSchedule.status.toUpperCase()}</Text>
              </View>
            </View>

            {/* Members List */}
            <View style={styles.membersSection}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Members ({classSchedule.class_bookings.length})
              </Text>
              
              {classSchedule.class_bookings.map((booking) => {
                const attended = isMemberAttended(classSchedule, booking.member_id);
                return (
                  <View key={booking.id} style={styles.memberRow}>
                    <Text style={[styles.memberName, { color: theme.colors.text }]}>
                      {booking.profiles.first_name} {booking.profiles.last_name}
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.attendanceButton,
                        { backgroundColor: attended ? '#4CAF50' : '#E0E0E0' }
                      ]}
                      onPress={() => toggleAttendance(classSchedule.id, booking.member_id, !attended)}
                      disabled={classSchedule.status === 'completed'}
                    >
                      <Text style={[
                        styles.attendanceButtonText,
                        { color: attended ? 'white' : '#666' }
                      ]}>
                        {attended ? '✓' : '○'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              {classSchedule.status === 'active' && (
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: '#FF9800' }]}
                  onPress={() => updateClassStatus(classSchedule.id, 'ongoing')}
                >
                  <Text style={styles.actionButtonText}>Start Class</Text>
                </TouchableOpacity>
              )}
              
              {classSchedule.status === 'ongoing' && (
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: '#2196F3' }]}
                  onPress={() => updateClassStatus(classSchedule.id, 'completed')}
                >
                  <Text style={styles.actionButtonText}>Complete Class</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  dateText: {
    fontSize: 16,
  },
  signOutButton: {
    padding: 8,
    marginTop: 4,
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 50,
  },
  emptyText: {
    fontSize: 16,
  },
  classCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  classHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  className: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  classTime: {
    fontSize: 14,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  membersSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  memberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  memberName: {
    fontSize: 14,
    flex: 1,
  },
  attendanceButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  attendanceButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  actionButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 8,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ClassManagementScreen;
