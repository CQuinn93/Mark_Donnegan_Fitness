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
import { userService, macroService } from '../../services/api';
import { User } from '../../types';

interface Props {
  navigation: any;
  route: any;
}

const MemberManagementScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { users: cachedUsers, refreshUsers } = useAdminData();
  const [members, setMembers] = useState<User[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingMember, setEditingMember] = useState<User | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editForm, setEditForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    role: 'member' as 'member' | 'trainer' | 'admin',
    height_cm: '',
    weight_kg: '',
    fitness_goals: '' as '' | 'weight_loss' | 'maintain' | 'muscle_gain',
  });

  useEffect(() => {
    loadMembers();
  }, []);

  // Reload members when cached users change
  useEffect(() => {
    if (cachedUsers && cachedUsers.length > 0) {
      const memberUsers = cachedUsers.filter(user => user.role === 'member');
      setMembers(memberUsers);
    }
  }, [cachedUsers]);

  useEffect(() => {
    filterMembers();
  }, [members, searchQuery]);

  const loadMembers = async () => {
    try {
      setLoading(true);
      // Use cached users from context instead of API call
      if (cachedUsers && cachedUsers.length > 0) {
        // Filter to only show members (role = 'member')
        const memberUsers = cachedUsers.filter(user => user.role === 'member');
        setMembers(memberUsers);
      } else {
        // Fallback: refresh cache if empty
        await refreshUsers();
        // After refresh, the component will re-render with updated cachedUsers
        // So we'll get the data on next render
      }
    } catch (error) {
      console.error('Error loading members:', error);
      Alert.alert('Error', 'Failed to load members');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMembers();
    setRefreshing(false);
  };

  const filterMembers = () => {
    if (!searchQuery.trim()) {
      setFilteredMembers(members);
      return;
    }

    const filtered = members.filter(member =>
      member.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredMembers(filtered);
  };

  const handleEditMember = (member: User) => {
    setEditingMember(member);
    const goal = member.fitness_goals && Array.isArray(member.fitness_goals) && member.fitness_goals.length > 0
      ? member.fitness_goals[0] as 'weight_loss' | 'maintain' | 'muscle_gain'
      : '';
    setEditForm({
      first_name: member.first_name,
      last_name: member.last_name,
      email: member.email,
      phone: member.phone || '',
      role: member.role as 'member' | 'trainer' | 'admin',
      height_cm: member.height_cm != null ? String(member.height_cm) : '',
      weight_kg: member.weight_kg != null ? String(member.weight_kg) : '',
      fitness_goals: goal,
    });
    setEditModalVisible(true);
  };

  const handleDeleteMember = (member: User) => {
    Alert.alert(
      'Delete Member',
      `Are you sure you want to delete ${member.first_name} ${member.last_name}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMember(member.id),
        },
      ]
    );
  };

  const deleteMember = async (memberId: string) => {
    try {
      await userService.deleteUser(memberId);
      Alert.alert('Success', 'Member deleted successfully');
      await loadMembers();
    } catch (error) {
      console.error('Error deleting member:', error);
      Alert.alert('Error', 'Failed to delete member');
    }
  };

  const handleSaveEdit = async () => {
    if (!editingMember) return;

    const updateData: Record<string, any> = {
      first_name: editForm.first_name,
      last_name: editForm.last_name,
      email: editForm.email,
      phone: editForm.phone || undefined,
      role: editForm.role,
    };
    const heightNum = editForm.height_cm ? parseInt(editForm.height_cm, 10) : undefined;
    const weightNum = editForm.weight_kg ? parseFloat(editForm.weight_kg) : undefined;
    if (heightNum && !isNaN(heightNum)) updateData.height_cm = heightNum;
    if (weightNum && !isNaN(weightNum)) updateData.weight_kg = weightNum;
    if (editForm.fitness_goals) updateData.fitness_goals = [editForm.fitness_goals];

    try {
      await userService.updateUser(editingMember.id, updateData);
      if (editForm.fitness_goals || heightNum || weightNum) {
        try {
          if (weightNum && !isNaN(weightNum)) {
            const today = new Date().toISOString().split('T')[0];
            await macroService.addWeightEntry(editingMember.id, today, weightNum);
          }
          await macroService.recalculateBaseMacros(editingMember.id);
        } catch (macroErr) {
          console.error('Macro recalc (non-blocking):', macroErr);
        }
      }
      Alert.alert('Success', 'Member updated successfully');
      setEditModalVisible(false);
      setEditingMember(null);
      await loadMembers();
    } catch (error) {
      console.error('Error updating member:', error);
      Alert.alert('Error', 'Failed to update member');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const renderMemberCard = (member: User) => (
    <View key={member.id} style={[styles.memberCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <View style={styles.memberHeader}>
        <View style={styles.memberInfo}>
          <Text style={[styles.memberName, { color: theme.colors.text }]}>
            {member.first_name} {member.last_name}
          </Text>
          <Text style={[styles.memberEmail, { color: theme.colors.textSecondary }]}>
            {member.email}
          </Text>
        </View>
        <View style={styles.memberActions}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.colors.textSecondary }]}
            onPress={() => handleEditMember(member)}
          >
            <Ionicons name="pencil" size={16} color={theme.colors.background} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#F44336' }]}
            onPress={() => handleDeleteMember(member)}
          >
            <Ionicons name="trash" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.memberDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="call" size={16} color={theme.colors.textSecondary} />
          <Text style={[styles.detailText, { color: theme.colors.textSecondary }]}>
            {member.phone || 'No phone number'}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="resize" size={16} color={theme.colors.textSecondary} />
          <Text style={[styles.detailText, { color: theme.colors.textSecondary }]}>
            Height: {member.height_cm != null ? `${member.height_cm} cm` : 'Not set'}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="barbell" size={16} color={theme.colors.textSecondary} />
          <Text style={[styles.detailText, { color: theme.colors.textSecondary }]}>
            Weight: {member.weight_kg != null ? `${member.weight_kg} kg` : 'Not set'}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="flag" size={16} color={theme.colors.textSecondary} />
          <Text style={[styles.detailText, { color: theme.colors.textSecondary }]}>
            Goal: {member.fitness_goals?.[0] ? member.fitness_goals[0].replace('_', ' ') : 'Not set'}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="calendar" size={16} color={theme.colors.textSecondary} />
          <Text style={[styles.detailText, { color: theme.colors.textSecondary }]}>
            Joined: {formatDate(member.created_at)}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="person" size={16} color={theme.colors.textSecondary} />
          <Text style={[styles.detailText, { color: theme.colors.textSecondary }]}>
            Role: {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
          </Text>
        </View>
      </View>
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
          <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Edit Member</Text>
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
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Height (cm)</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: theme.colors.surface, color: theme.colors.text }]}
              value={editForm.height_cm}
              onChangeText={(text) => setEditForm({ ...editForm, height_cm: text })}
              placeholder="e.g. 175"
              placeholderTextColor={theme.colors.textSecondary}
              keyboardType="number-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Weight (kg)</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: theme.colors.surface, color: theme.colors.text }]}
              value={editForm.weight_kg}
              onChangeText={(text) => setEditForm({ ...editForm, weight_kg: text })}
              placeholder="e.g. 70"
              placeholderTextColor={theme.colors.textSecondary}
              keyboardType="decimal-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Fitness Goal</Text>
            <View style={styles.roleSelector}>
              {(['weight_loss', 'maintain', 'muscle_gain'] as const).map((goal) => (
                <TouchableOpacity
                  key={goal}
                  style={[
                    styles.roleOption,
                    { backgroundColor: editForm.fitness_goals === goal ? theme.colors.primary : theme.colors.surface },
                    { borderColor: theme.colors.border }
                  ]}
                  onPress={() => setEditForm({ ...editForm, fitness_goals: goal })}
                >
                  <Text style={[
                    styles.roleOptionText,
                    { color: editForm.fitness_goals === goal ? 'white' : theme.colors.text }
                  ]}>
                    {goal.replace('_', ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
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
          Manage Members ({members.length})
        </Text>
        <View style={styles.placeholder} />
      </View>

      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <Ionicons name="search" size={20} color={theme.colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: theme.colors.text }]}
          placeholder="Search members..."
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
        {filteredMembers.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color={theme.colors.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              {searchQuery ? 'No members found matching your search' : 'No members found'}
            </Text>
          </View>
        ) : (
          filteredMembers.map(renderMemberCard)
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
  memberCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  memberHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  memberEmail: {
    fontSize: 14,
  },
  memberActions: {
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
  memberDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 14,
    marginLeft: 8,
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

export default MemberManagementScreen;
