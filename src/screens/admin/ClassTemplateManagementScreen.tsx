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
import { supabaseApi } from '../../config/supabase';

interface ClassTemplate {
  id: string;
  name: string;
  description: string | null;
  duration: number;
  max_members: number;
  created_at: string;
  updated_at: string;
}

interface ClassTemplateWithStats extends ClassTemplate {
  scheduledClassesCount: number;
  upcomingClassesCount: number;
}

interface Props {
  navigation: any;
  route: any;
}

const ClassTemplateManagementScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { classes: cachedClasses, scheduledClasses: cachedSchedules } = useAdminData();
  const [classTemplates, setClassTemplates] = useState<ClassTemplateWithStats[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<ClassTemplateWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingTemplate, setEditingTemplate] = useState<ClassTemplateWithStats | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    duration: '',
    max_members: '',
  });

  useEffect(() => {
    loadClassTemplates();
  }, []);

  useEffect(() => {
    filterTemplates();
  }, [classTemplates, searchQuery]);

  const loadClassTemplates = async () => {
    try {
      setLoading(true);
      
      // Get all class templates
      const templatesResponse = await supabaseApi.get('/classes', {
        params: {
          select: 'id,name,description,duration,max_members,created_at,updated_at',
          order: 'name.asc'
        }
      });

      if (!templatesResponse.data) return;

      // Get class statistics for each template
      const templatesWithStats = await Promise.all(
        templatesResponse.data.map(async (template: ClassTemplate) => {
          try {
            // Get total scheduled classes count
            const totalClassesResponse = await supabaseApi.get('/class_schedules', {
              params: {
                select: 'id',
                class_id: `eq.${template.id}`,
                status: 'in.(active,ongoing,completed)'
              }
            });

            // Get upcoming classes count (active + ongoing)
            const upcomingClassesResponse = await supabaseApi.get('/class_schedules', {
              params: {
                select: 'id',
                class_id: `eq.${template.id}`,
                status: 'in.(active,ongoing)',
                scheduled_date: `gte.${new Date().toISOString().split('T')[0]}`
              }
            });

            return {
              ...template,
              scheduledClassesCount: totalClassesResponse.data?.length || 0,
              upcomingClassesCount: upcomingClassesResponse.data?.length || 0,
            };
          } catch (error) {
            console.error(`Error loading stats for template ${template.id}:`, error);
            return {
              ...template,
              scheduledClassesCount: 0,
              upcomingClassesCount: 0,
            };
          }
        })
      );

      setClassTemplates(templatesWithStats);
    } catch (error) {
      console.error('Error loading class templates:', error);
      Alert.alert('Error', 'Failed to load class templates');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadClassTemplates();
    setRefreshing(false);
  };

  const filterTemplates = () => {
    if (!searchQuery.trim()) {
      setFilteredTemplates(classTemplates);
      return;
    }

    const filtered = classTemplates.filter(template =>
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (template.description && template.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    setFilteredTemplates(filtered);
  };

  const handleEditTemplate = (template: ClassTemplateWithStats) => {
    setEditingTemplate(template);
    setEditForm({
      name: template.name,
      description: template.description || '',
      duration: template.duration.toString(),
      max_members: template.max_members.toString(),
    });
    setEditModalVisible(true);
  };

  const handleDeleteTemplate = (template: ClassTemplateWithStats) => {
    if (template.scheduledClassesCount > 0) {
      Alert.alert(
        'Cannot Delete Template',
        `This class template has ${template.scheduledClassesCount} scheduled classes. Please delete or reassign these classes before deleting the template.`,
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Delete Class Template',
      `Are you sure you want to delete "${template.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteTemplate(template.id),
        },
      ]
    );
  };

  const deleteTemplate = async (templateId: string) => {
    try {
      await supabaseApi.delete(`/classes?id=eq.${templateId}`);
      Alert.alert('Success', 'Class template deleted successfully');
      await loadClassTemplates();
    } catch (error) {
      console.error('Error deleting class template:', error);
      Alert.alert('Error', 'Failed to delete class template');
    }
  };

  const handleSaveEdit = async () => {
    if (!editingTemplate) return;

    // Validate form
    if (!editForm.name.trim()) {
      Alert.alert('Error', 'Class name is required');
      return;
    }

    const duration = parseInt(editForm.duration);
    const maxMembers = parseInt(editForm.max_members);

    if (isNaN(duration) || duration <= 0) {
      Alert.alert('Error', 'Duration must be a positive number');
      return;
    }

    if (isNaN(maxMembers) || maxMembers <= 0) {
      Alert.alert('Error', 'Max members must be a positive number');
      return;
    }

    try {
      await supabaseApi.patch(`/classes?id=eq.${editingTemplate.id}`, {
        name: editForm.name.trim(),
        description: editForm.description.trim() || null,
        duration: duration,
        max_members: maxMembers,
        updated_at: new Date().toISOString()
      });

      Alert.alert('Success', 'Class template updated successfully');
      setEditModalVisible(false);
      setEditingTemplate(null);
      await loadClassTemplates();
    } catch (error) {
      console.error('Error updating class template:', error);
      Alert.alert('Error', 'Failed to update class template');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const renderTemplateCard = (template: ClassTemplateWithStats) => (
    <View key={template.id} style={[styles.templateCard, { backgroundColor: '#333333' }]}>
      <View style={styles.templateHeader}>
        <View style={styles.templateInfo}>
          <Text style={[styles.templateName, { color: 'white' }]}>
            {template.name}
          </Text>
          {template.description && (
            <Text style={[styles.templateDescription, { color: '#B0B0B0' }]}>
              {template.description}
            </Text>
          )}
        </View>
        <View style={styles.templateActions}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#666666' }]}
            onPress={() => handleEditTemplate(template)}
          >
            <Ionicons name="pencil" size={16} color="white" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.actionButton, 
              { backgroundColor: template.scheduledClassesCount > 0 ? '#B0B0B0' : '#F44336' }
            ]}
            onPress={() => handleDeleteTemplate(template)}
            disabled={template.scheduledClassesCount > 0}
          >
            <Ionicons name="trash" size={16} color="white" />
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.templateDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="time" size={16} color="#B0B0B0" />
          <Text style={[styles.detailText, { color: '#B0B0B0' }]}>
            Duration: {template.duration} minutes
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="people" size={16} color="#B0B0B0" />
          <Text style={[styles.detailText, { color: '#B0B0B0' }]}>
            Max Members: {template.max_members}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="calendar" size={16} color="#B0B0B0" />
          <Text style={[styles.detailText, { color: '#B0B0B0' }]}>
            Created: {formatDate(template.created_at)}
          </Text>
        </View>
      </View>

      {/* Class Statistics */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: '#666666' }]}>
            {template.upcomingClassesCount}
          </Text>
          <Text style={[styles.statLabel, { color: '#B0B0B0' }]}>
            Upcoming Classes
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
          <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Edit Class Template</Text>
          <TouchableOpacity onPress={handleSaveEdit}>
            <Text style={[styles.modalButton, { color: theme.colors.primary }]}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Class Name *</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: theme.colors.surface, color: theme.colors.text }]}
              value={editForm.name}
              onChangeText={(text) => setEditForm({ ...editForm, name: text })}
              placeholder="Class name"
              placeholderTextColor={theme.colors.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Description</Text>
            <TextInput
              style={[styles.textInput, styles.textArea, { backgroundColor: theme.colors.surface, color: theme.colors.text }]}
              value={editForm.description}
              onChangeText={(text) => setEditForm({ ...editForm, description: text })}
              placeholder="Class description"
              placeholderTextColor={theme.colors.textSecondary}
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Duration (minutes) *</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: theme.colors.surface, color: theme.colors.text }]}
              value={editForm.duration}
              onChangeText={(text) => setEditForm({ ...editForm, duration: text })}
              placeholder="Duration in minutes"
              placeholderTextColor={theme.colors.textSecondary}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Max Members *</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: theme.colors.surface, color: theme.colors.text }]}
              value={editForm.max_members}
              onChangeText={(text) => setEditForm({ ...editForm, max_members: text })}
              placeholder="Maximum number of members"
              placeholderTextColor={theme.colors.textSecondary}
              keyboardType="numeric"
            />
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
          Manage Class Templates ({classTemplates.length})
        </Text>
        <View style={styles.placeholder} />
      </View>

      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: '#333333' }]}>
        <Ionicons name="search" size={20} color="#B0B0B0" />
        <TextInput
          style={[styles.searchInput, { color: 'white' }]}
          placeholder="Search class templates..."
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
        {filteredTemplates.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="library-outline" size={64} color="#B0B0B0" />
            <Text style={[styles.emptyText, { color: '#B0B0B0' }]}>
              {searchQuery ? 'No class templates found matching your search' : 'No class templates found'}
            </Text>
          </View>
        ) : (
          filteredTemplates.map(renderTemplateCard)
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
  templateCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  templateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  templateInfo: {
    flex: 1,
  },
  templateName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  templateDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  templateActions: {
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
  templateDetails: {
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
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
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
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
});

export default ClassTemplateManagementScreen;
