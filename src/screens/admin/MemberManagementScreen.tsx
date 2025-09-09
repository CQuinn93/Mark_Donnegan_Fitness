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
import { User } from '../../types';

interface Props {
  navigation: any;
  route: any;
}

const MemberManagementScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme } = useTheme();
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
  });

  useEffect(() => {
    loadMembers();
  }, []);

  useEffect(() => {
    filterMembers();
  }, [members, searchQuery]);

  const loadMembers = async () => {
    try {
      setLoading(true);
      const response = await userService.getAllUsers();
      if (response.users) {
        // Filter to only show members (role = 'member')
        const memberUsers = response.users.filter(user => user.role === 'member');
        setMembers(memberUsers);
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
    setEditForm({
      first_name: member.first_name,
      last_name: member.last_name,
      email: member.email,
      phone: member.phone || '',
      role: member.role as 'member' | 'trainer' | 'admin',
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

    try {
      await userService.updateUser(editingMember.id, editForm);
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
    <View key={member.id} style={[styles.memberCard, { backgroundColor: '#333333' }]}>
      <View style={styles.memberHeader}>
        <View style={styles.memberInfo}>
          <Text style={[styles.memberName, { color: 'white' }]}>
            {member.first_name} {member.last_name}
          </Text>
          <Text style={[styles.memberEmail, { color: '#B0B0B0' }]}>
            {member.email}
          </Text>
        </View>
        <View style={styles.memberActions}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#666666' }]}
            onPress={() => handleEditMember(member)}
          >
            <Ionicons name="pencil" size={16} color="white" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#F44336' }]}
            onPress={() => handleDeleteMember(member)}
          >
            <Ionicons name="trash" size={16} color="white" />
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.memberDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="call" size={16} color="#B0B0B0" />
          <Text style={[styles.detailText, { color: '#B0B0B0' }]}>
            {member.phone || 'No phone number'}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="calendar" size={16} color="#B0B0B0" />
          <Text style={[styles.detailText, { color: '#B0B0B0' }]}>
            Joined: {formatDate(member.created_at)}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="person" size={16} color="#B0B0B0" />
          <Text style={[styles.detailText, { color: '#B0B0B0' }]}>
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
          Manage Members ({members.length})
        </Text>
        <View style={styles.placeholder} />
      </View>

      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: '#333333' }]}>
        <Ionicons name="search" size={20} color="#B0B0B0" />
        <TextInput
          style={[styles.searchInput, { color: 'white' }]}
          placeholder="Search members..."
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
        {filteredMembers.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color="#B0B0B0" />
            <Text style={[styles.emptyText, { color: '#B0B0B0' }]}>
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
  memberCard: {
    padding: 16,
    borderRadius: 12,
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
