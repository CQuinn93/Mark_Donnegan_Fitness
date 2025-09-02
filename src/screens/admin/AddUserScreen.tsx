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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { userService } from '../../services/api';

interface Props {
  navigation: any;
  route: any;
}

const AddUserScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { defaultRole = 'member' } = route.params || {};
  const [isLoading, setIsLoading] = useState(false);
  
  // Form fields - only basic required fields
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [role, setRole] = useState<'member' | 'trainer'>(defaultRole);

  const handleSubmit = async () => {
    // Validation
    if (!email || !firstName) {
      Alert.alert('Error', 'Please fill in all required fields (Email and First Name)');
      return;
    }

    if (!email.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setIsLoading(true);

    try {
      const userData = {
        email,
        first_name: firstName,
        role,
      };

      const result = await userService.createUser(userData);
      
      if (result.error) {
        Alert.alert('Error', result.error);
        return;
      }

      // Show success message with appropriate details
      let message = `User created successfully!`;
      
      if (role === 'member' && result.temp_password) {
        message += `\n\nTemporary Password: ${result.temp_password}\n\nUser will receive a welcome email with this password. They must change it on first login.`;
      } else if (role === 'trainer' && result.trainer_code) {
        message += `\n\nTrainer Code: ${result.trainer_code}\n\nTrainer will receive a welcome email with this code. They can use this code to access the trainer panel.`;
      }

      Alert.alert(
        'Success', 
        message,
        [
          { 
            text: 'OK', 
            onPress: () => navigation.goBack() 
          }
        ]
      );
    } catch (error) {
      console.error('Error creating user:', error);
      Alert.alert('Error', 'Failed to create user');
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
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
        <TouchableOpacity onPress={handleCancel}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Add New {role === 'trainer' ? 'Trainer' : 'Member'}
        </Text>
        <View style={styles.placeholder} />
      </View>

      {/* Form */}
      <View style={[styles.form, { backgroundColor: theme.colors.surface }]}>
        {/* Role Selection */}
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Role *</Text>
        <View style={styles.roleSelector}>
          <TouchableOpacity
            style={[
              styles.roleOption,
              role === 'member' && { backgroundColor: theme.colors.primary }
            ]}
            onPress={() => setRole('member')}
          >
            <Text style={[
              styles.roleText,
              { color: role === 'member' ? 'white' : theme.colors.text }
            ]}>
              Member
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.roleOption,
              role === 'trainer' && { backgroundColor: theme.colors.primary }
            ]}
            onPress={() => setRole('trainer')}
          >
            <Text style={[
              styles.roleText,
              { color: role === 'trainer' ? 'white' : theme.colors.text }
            ]}>
              Trainer
            </Text>
          </TouchableOpacity>
        </View>

        {/* Required Fields */}
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Required Information *</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.colors.background, color: theme.colors.text }]}
          placeholder="Email Address"
          placeholderTextColor={theme.colors.textSecondary}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          style={[styles.input, { backgroundColor: theme.colors.background, color: theme.colors.text }]}
          placeholder="First Name"
          placeholderTextColor={theme.colors.textSecondary}
          value={firstName}
          onChangeText={setFirstName}
        />

        {/* Information Text */}
        <View style={styles.infoBox}>
          <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
            {role === 'member' 
              ? 'Member will receive a temporary password and must change it on first login.'
              : 'Trainer will receive a unique code to access the trainer panel.'
            }
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
              <Ionicons name="person-add" size={20} color="white" />
              <Text style={styles.submitButtonText}>
                Create {role === 'trainer' ? 'Trainer' : 'Member'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
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
  roleSelector: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  roleOption: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  roleText: {
    fontSize: 16,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  infoBox: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
    marginTop: 20,
    marginBottom: 20,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
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

export default AddUserScreen;
