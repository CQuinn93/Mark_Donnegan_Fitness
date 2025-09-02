import React, { useState, useEffect } from 'react';
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
import { authService, userService } from '../../services/api';
import { User } from '../../types';

interface Props {
  navigation: any;
  route: { params: { user: User; onComplete?: () => void } };
}

const FirstTimeSetupScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { user } = route.params;
  const [isLoading, setIsLoading] = useState(false);
  const [hasTempPassword, setHasTempPassword] = useState(false);
  
  // Form fields
  const [lastName, setLastName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other' | ''>('');

  useEffect(() => {
    checkTempPassword();
  }, []);

  const checkTempPassword = async () => {
    const result = await authService.checkTempPassword();
    if (result.hasTempPassword) {
      setHasTempPassword(true);
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!lastName || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters long');
      return;
    }

    setIsLoading(true);

    try {
      // Change password if user has temp password
      if (hasTempPassword) {
        const passwordResult = await authService.changePassword(newPassword);
        if (passwordResult.error) {
          Alert.alert('Error', passwordResult.error);
          return;
        }
      }

      // Update profile
      const profileData = {
        first_name: user.first_name, // Required field
        last_name: lastName,
        phone: phone || undefined,
        date_of_birth: dateOfBirth || undefined,
        gender: gender || undefined,
      };

      const profileResult = await userService.updateProfile(user.id, profileData);
      if (profileResult.error) {
        Alert.alert('Error', profileResult.error);
        return;
      }

      Alert.alert(
        'Success', 
        'Profile setup completed successfully! You can now use your new password to log in.',
        [
          { 
            text: 'OK', 
            onPress: () => {
              // Call the onComplete callback to trigger a re-render
              if (route.params.onComplete) {
                route.params.onComplete();
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error completing setup:', error);
      Alert.alert('Error', 'Failed to complete setup. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Complete Your Profile
        </Text>
      </View>

      {/* Welcome Message */}
      <View style={[styles.welcomeBox, { backgroundColor: theme.colors.primary }]}>
        <Text style={styles.welcomeText}>
          Welcome to MD Fitness, {user.first_name}!
        </Text>
        <Text style={styles.welcomeSubtext}>
          Let's complete your profile setup
        </Text>
      </View>

      {/* Form */}
      <View style={[styles.form, { backgroundColor: theme.colors.surface }]}>
        {/* Required Fields */}
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Required Information *</Text>
        
        <TextInput
          style={[styles.input, { backgroundColor: theme.colors.background, color: theme.colors.text }]}
          placeholder="Last Name"
          placeholderTextColor={theme.colors.textSecondary}
          value={lastName}
          onChangeText={setLastName}
        />

        {hasTempPassword && (
          <>
            <TextInput
              style={[styles.input, { backgroundColor: theme.colors.background, color: theme.colors.text }]}
              placeholder="New Password"
              placeholderTextColor={theme.colors.textSecondary}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
            />
            <TextInput
              style={[styles.input, { backgroundColor: theme.colors.background, color: theme.colors.text }]}
              placeholder="Confirm New Password"
              placeholderTextColor={theme.colors.textSecondary}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />
          </>
        )}

        {/* Optional Personal Information */}
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Personal Information (Optional)</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.colors.background, color: theme.colors.text }]}
          placeholder="Phone Number"
          placeholderTextColor={theme.colors.textSecondary}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />
        <TextInput
          style={[styles.input, { backgroundColor: theme.colors.background, color: theme.colors.text }]}
          placeholder="Date of Birth (YYYY-MM-DD)"
          placeholderTextColor={theme.colors.textSecondary}
          value={dateOfBirth}
          onChangeText={setDateOfBirth}
        />
        <TextInput
          style={[styles.input, { backgroundColor: theme.colors.background, color: theme.colors.text }]}
          placeholder="Gender (male/female/other)"
          placeholderTextColor={theme.colors.textSecondary}
          value={gender}
          onChangeText={(text) => setGender(text as 'male' | 'female' | 'other' | '')}
        />

        {/* Information Text */}
        <View style={styles.infoBox}>
          <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
            {hasTempPassword 
              ? 'Please set a new password and complete your profile information. You can skip optional fields and complete them later.'
              : 'Please complete your profile information. You can skip optional fields and complete them later.'
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
              <Ionicons name="checkmark-circle" size={20} color="white" />
              <Text style={styles.submitButtonText}>
                Complete Setup
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
    padding: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  welcomeBox: {
    margin: 16,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 8,
  },
  welcomeSubtext: {
    fontSize: 16,
    color: 'white',
    textAlign: 'center',
    opacity: 0.9,
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

export default FirstTimeSetupScreen;
