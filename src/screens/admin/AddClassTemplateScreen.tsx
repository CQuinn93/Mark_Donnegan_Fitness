import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { classService, testSupabaseConnection } from '../../services/api';

interface Props {
  navigation: any;
  route: any;
}

const AddClassTemplateScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  
  // Form fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState('');
  const [maxMembers, setMaxMembers] = useState('');

  const handleSubmit = async () => {
    // Validation
    if (!name || !description || !duration || !maxMembers) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const durationNum = parseInt(duration);
    const maxMembersNum = parseInt(maxMembers);

    if (isNaN(durationNum) || durationNum <= 0) {
      Alert.alert('Error', 'Duration must be a positive number');
      return;
    }

    if (isNaN(maxMembersNum) || maxMembersNum <= 0) {
      Alert.alert('Error', 'Max members must be a positive number');
      return;
    }

    if (maxMembersNum > 50) {
      Alert.alert('Error', 'Max members cannot exceed 50');
      return;
    }

    setIsLoading(true);

    try {
      // First, test Supabase connection
      console.log('Testing Supabase connection before creating class template...');
      const connectionTest = await testSupabaseConnection();
      if (!connectionTest.success) {
        Alert.alert('Connection Error', `Failed to connect to Supabase: ${connectionTest.error}`);
        return;
      }
      console.log('Supabase connection test passed');

      const classData = {
        name: name.trim(),
        description: description.trim(),
        duration: durationNum,
        max_members: maxMembersNum,
      };

      const result = await classService.createClassTemplate(classData);
      
      if (result.error) {
        Alert.alert('Error', result.error);
        return;
      }

      // Show success message
      Alert.alert(
        'Success', 
        'Class template created successfully!',
        [
          { 
            text: 'OK', 
            onPress: () => navigation.goBack() 
          }
        ]
      );
    } catch (error) {
      console.error('Error creating class template:', error);
      Alert.alert('Error', 'Failed to create class template');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel',
      'Are you sure you want to cancel? All entered data will be lost.',
      [
        { text: 'Continue Editing', style: 'cancel' },
        { text: 'Cancel', style: 'destructive', onPress: () => navigation.goBack() }
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#000000' }]}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      {/* Header */}
      <View style={[styles.header, { backgroundColor: '#000000' }]}>
        <TouchableOpacity onPress={handleCancel}>
          <Ionicons name="chevron-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: 'white' }]}>
          Add Class Template
        </Text>
        <View style={styles.placeholder} />
      </View>

      {/* Form */}
      <View style={[styles.contentContainer, { backgroundColor: theme.colors.background }]}>
        <ScrollView style={styles.scrollView}>
        <View style={[styles.form, { backgroundColor: theme.colors.surface }]}>
          {/* Required Fields */}
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Class Information *</Text>
          
          <TextInput
            style={[styles.input, { backgroundColor: theme.colors.background, color: theme.colors.text, borderColor: theme.colors.border }]}
            placeholder="Class Name"
            placeholderTextColor={theme.colors.textSecondary}
            value={name}
            onChangeText={setName}
            maxLength={255}
          />
          
          <TextInput
            style={[styles.textArea, { backgroundColor: theme.colors.background, color: theme.colors.text, borderColor: theme.colors.border }]}
            placeholder="Class Description"
            placeholderTextColor={theme.colors.textSecondary}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
          
          <View style={styles.rowContainer}>
            <View style={styles.halfWidth}>
              <TextInput
                style={[styles.input, { backgroundColor: theme.colors.background, color: theme.colors.text, borderColor: theme.colors.border }]}
                placeholder="Duration (minutes)"
                placeholderTextColor={theme.colors.textSecondary}
                value={duration}
                onChangeText={setDuration}
                keyboardType="numeric"
                maxLength={3}
              />
            </View>
            
            <View style={styles.halfWidth}>
              <TextInput
                style={[styles.input, { backgroundColor: theme.colors.background, color: theme.colors.text, borderColor: theme.colors.border }]}
                placeholder="Max Members"
                placeholderTextColor={theme.colors.textSecondary}
                value={maxMembers}
                onChangeText={setMaxMembers}
                keyboardType="numeric"
                maxLength={2}
              />
            </View>
          </View>

          {/* Information Text */}
          <View style={[styles.infoBox, { backgroundColor: theme.colors.background }]}>
            <Ionicons name="information-circle" size={20} color={theme.colors.info} />
            <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
              Class templates are used to create scheduled classes. Once created, you can schedule this class with specific trainers and dates.
            </Text>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: theme.colors.primary }]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <>
                <Ionicons name="add-circle" size={20} color="white" />
                <Text style={styles.submitButtonText}>
                  Create Class Template
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 24,
  },
  scrollView: {
    flex: 1,
  },
  form: {
    margin: 16,
    padding: 16,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
    minHeight: 100,
  },
  rowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfWidth: {
    width: '48%',
  },
  infoBox: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 8,
    marginTop: 20,
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
    marginLeft: 8,
    flex: 1,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    marginTop: 20,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default AddClassTemplateScreen;
