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
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { userService } from '../../services/api';
import { supabaseApi } from '../../config/supabase';
import { User } from '../../types';

interface TrainerWithStats extends User {
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

  useEffect(() => {
    loadTrainers();
  }, []);

  useEffect(() => {
    filterTrainers();
  }, [trainers, searchQuery]);

  const loadTrainers = async () => {
    try {
      setLoading(true);
      
      // Get all users
      const usersResponse = await userService.getAllUsers();
      if (!usersResponse.users) return;

      // Filter to only show trainers
      const trainerUsers = usersResponse.users.filter(user => user.role === 'trainer');
      
      // Get class statistics for each trainer
      const trainersWithStats = await Promise.all(
        trainerUsers.map(async (trainer) => {
          try {
            // Get total scheduled classes count
            const totalClassesResponse = await supabaseApi.get('/class_schedules', {
              params: {
                select: 'id',
                trainer_id: `eq.${trainer.id}`,
                status: 'in.(active,ongoing,completed)'
              }
            });

            // Get upcoming classes with full details (active + ongoing)
            const upcomingClassesResponse = await supabaseApi.get('/class_schedules', {
              params: {
                select: `
                  id,
                  scheduled_date,
                  scheduled_time,
                  status,
                  classes!inner(
                    name,
                    duration
                  )
                `,
                trainer_id: `eq.${trainer.id}`,
                status: 'in.(active,ongoing)',
                scheduled_date: `gte.${new Date().toISOString().split('T')[0]}`,
                order: 'scheduled_date.asc,scheduled_time.asc'
              }
            });

            return {
              ...trainer,
              scheduledClassesCount: totalClassesResponse.data?.length || 0,
              upcomingClassesCount: upcomingClassesResponse.data?.length || 0,
              upcomingClasses: upcomingClassesResponse.data || [],
            };
          } catch (error) {
            console.error(`Error loading stats for trainer ${trainer.id}:`, error);
            return {
              ...trainer,
              scheduledClassesCount: 0,
              upcomingClassesCount: 0,
              upcomingClasses: [],
            };
          }
        })
      );

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
    <View key={trainer.id} style={[styles.trainerCard, { backgroundColor: '#333333' }]}>
      <View style={styles.trainerHeader}>
        <View style={styles.trainerInfo}>
          <Text style={[styles.trainerName, { color: 'white' }]}>
            {trainer.first_name} {trainer.last_name}
          </Text>
          <Text style={[styles.trainerEmail, { color: '#B0B0B0' }]}>
            {trainer.email}
          </Text>
          {trainer.trainer_code && (
            <Text style={[styles.trainerCode, { color: '#666666' }]}>
              Code: {trainer.trainer_code}
            </Text>
          )}
        </View>
        <View style={styles.trainerActions}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#666666' }]}
            onPress={() => handleEditTrainer(trainer)}
          >
            <Ionicons name="pencil" size={16} color="white" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.actionButton, 
              { backgroundColor: trainer.scheduledClassesCount > 0 ? '#B0B0B0' : '#F44336' }
            ]}
            onPress={() => handleDeleteTrainer(trainer)}
            disabled={trainer.scheduledClassesCount > 0}
          >
            <Ionicons name="trash" size={16} color="white" />
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.trainerDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="call" size={16} color="#B0B0B0" />
          <Text style={[styles.detailText, { color: '#B0B0B0' }]}>
            {trainer.phone || 'No phone number'}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="calendar" size={16} color="#B0B0B0" />
          <Text style={[styles.detailText, { color: '#B0B0B0' }]}>
            Joined: {formatDate(trainer.created_at)}
          </Text>
        </View>
      </View>

      {/* Class Statistics */}
      <View style={styles.statsContainer}>
        <TouchableOpacity 
          style={styles.statItem}
          onPress={() => toggleExpanded(trainer.id)}
        >
          <Text style={[styles.statNumber, { color: '#666666' }]}>
            {trainer.upcomingClassesCount}
          </Text>
          <Text style={[styles.statLabel, { color: '#B0B0B0' }]}>
            Upcoming Classes
          </Text>
          <Ionicons 
            name={expandedTrainer === trainer.id ? "chevron-up" : "chevron-down"} 
            size={16} 
            color="#B0B0B0" 
            style={styles.chevronIcon}
          />
        </TouchableOpacity>
      </View>

      {/* Expanded Classes List */}
      {expandedTrainer === trainer.id && (
        <View style={styles.classesList}>
          {trainer.upcomingClasses.length === 0 ? (
            <Text style={[styles.noClassesText, { color: '#B0B0B0' }]}>
              No upcoming classes scheduled
            </Text>
          ) : (
            trainer.upcomingClasses.map((classSchedule) => (
              <View key={classSchedule.id} style={[styles.classItem, { backgroundColor: '#000000' }]}>
                <View style={styles.classInfo}>
                  <Text style={[styles.className, { color: 'white' }]}>
                    {classSchedule.classes.name}
                  </Text>
                  <Text style={[styles.classDateTime, { color: '#B0B0B0' }]}>
                    {formatDate(classSchedule.scheduled_date)} at {formatTime(classSchedule.scheduled_time)}
                  </Text>
                  <Text style={[styles.classDuration, { color: '#B0B0B0' }]}>
                    {classSchedule.classes.duration} minutes
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(classSchedule.status) }]}>
                  <Text style={styles.statusText}>{classSchedule.status.toUpperCase()}</Text>
                </View>
              </View>
            ))
          )}
        </View>
      )}
    </View>
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
    <SafeAreaView style={[styles.container, { backgroundColor: '#000000' }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: '#000000' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: 'white' }]}>
          Manage Trainers ({trainers.length})
        </Text>
        <View style={styles.placeholder} />
      </View>

      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: '#333333' }]}>
        <Ionicons name="search" size={20} color="#B0B0B0" />
        <TextInput
          style={[styles.searchInput, { color: 'white' }]}
          placeholder="Search trainers..."
          placeholderTextColor="#B0B0B0"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredTrainers.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="fitness-outline" size={64} color="#B0B0B0" />
            <Text style={[styles.emptyText, { color: '#B0B0B0' }]}>
              {searchQuery ? 'No trainers found matching your search' : 'No trainers found'}
            </Text>
          </View>
        ) : (
          filteredTrainers.map(renderTrainerCard)
        )}
      </ScrollView>

      {renderEditModal()}
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
    borderBottomColor: '#E0E0E0',
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
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    borderTopColor: '#E0E0E0',
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
    borderTopColor: '#E0E0E0',
  },
  classItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
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
});

export default TrainerManagementScreen;
