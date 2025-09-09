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
  Image,
  SafeAreaView,
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
  
  // Password visibility toggles
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    checkTempPassword();
  }, []);

  const checkTempPassword = async () => {
    // Always assume they have a temp password if they're on the onboarding screen
    // This prevents unnecessary API calls that could interfere with the session
    console.log('Setting hasTempPassword to true for onboarding');
    setHasTempPassword(true);
  };

  const handleSubmit = async () => {
    // Validation
    if (!lastName) {
      Alert.alert('Error', 'Please fill in your last name');
      return;
    }

    // Only validate passwords if they're provided
    if (hasTempPassword && newPassword && confirmPassword) {
      if (newPassword !== confirmPassword) {
        Alert.alert('Error', 'Passwords do not match');
        return;
      }

      if (newPassword.length < 8) {
        Alert.alert('Error', 'Password must be at least 8 characters long');
        return;
      }
    }

    setIsLoading(true);

    try {
      let passwordChanged = false;
      
      // Try to change password if user has temp password
      if (hasTempPassword && newPassword && confirmPassword) {
        const passwordResult = await authService.changePassword(newPassword);
        if (passwordResult.error) {
          console.log('Password change failed:', passwordResult.error);
          // Don't block the flow if password change fails
          Alert.alert(
            'Password Change Failed', 
            'Could not change password at this time. You can change it later in your profile settings.',
            [{ text: 'Continue', onPress: () => {} }]
          );
        } else {
          passwordChanged = true;
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

      const successMessage = passwordChanged 
        ? 'Profile setup completed successfully! You can now use your new password to log in.'
        : 'Profile setup completed successfully! You can change your password later in your profile settings.';

      Alert.alert(
        'Success', 
        successMessage,
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
    <SafeAreaView style={[styles.container, { backgroundColor: '#FFFFFF' }]}>
      <ScrollView style={styles.scrollView}>
        {/* Logo and Welcome Message */}
        <View style={[styles.welcomeBox, { backgroundColor: '#F8F9FA' }]}>
          <Image 
            source={require('../../../assets/MDFitness_Logo.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.welcomeText}>
            Welcome to Mark Donnegan Fitness, {user.first_name}!
          </Text>
          <Text style={styles.welcomeSubtext}>
            Let's complete your profile setup
          </Text>
        </View>

      {/* Form */}
      <View style={[styles.form, { backgroundColor: '#FFFFFF' }]}>
        {/* Required Fields */}
        <Text style={[styles.sectionTitle, { color: '#000000' }]}>Required Information *</Text>
        
        <TextInput
          style={[styles.input, { backgroundColor: '#F8F9FA', color: '#000000' }]}
          placeholder="Last Name"
          placeholderTextColor="#6C757D"
          value={lastName}
          onChangeText={setLastName}
        />

        {hasTempPassword && (
          <>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[styles.input, { backgroundColor: '#F8F9FA', color: '#000000' }]}
                placeholder="New Password"
                placeholderTextColor="#6C757D"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showNewPassword}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowNewPassword(!showNewPassword)}
              >
                <Ionicons 
                  name={showNewPassword ? "eye-off" : "eye"} 
                  size={20} 
                  color="#6C757D" 
                />
              </TouchableOpacity>
            </View>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[styles.input, { backgroundColor: '#F8F9FA', color: '#000000' }]}
                placeholder="Confirm New Password"
                placeholderTextColor="#6C757D"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <Ionicons 
                  name={showConfirmPassword ? "eye-off" : "eye"} 
                  size={20} 
                  color="#6C757D" 
                />
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Optional Personal Information */}
        <Text style={[styles.sectionTitle, { color: '#000000' }]}>Personal Information (Optional)</Text>
        <TextInput
          style={[styles.input, { backgroundColor: '#F8F9FA', color: '#000000' }]}
          placeholder="Phone Number"
          placeholderTextColor="#6C757D"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />
        <TextInput
          style={[styles.input, { backgroundColor: '#F8F9FA', color: '#000000' }]}
          placeholder="Date of Birth (YYYY-MM-DD)"
          placeholderTextColor="#6C757D"
          value={dateOfBirth}
          onChangeText={setDateOfBirth}
        />
        <TextInput
          style={[styles.input, { backgroundColor: '#F8F9FA', color: '#000000' }]}
          placeholder="Gender (male/female/other)"
          placeholderTextColor="#6C757D"
          value={gender}
          onChangeText={(text) => setGender(text as 'male' | 'female' | 'other' | '')}
        />

        {/* Information Text */}
        <View style={[styles.infoBox, { backgroundColor: '#F8F9FA' }]}>
          <Text style={[styles.infoText, { color: '#6C757D' }]}>
            {hasTempPassword 
              ? 'Please set a new password and complete your profile information. You can skip optional fields and complete them later.'
              : 'Please complete your profile information. You can skip optional fields and complete them later.'
            }
          </Text>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, { backgroundColor: '#6C757D' }]}
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  welcomeBox: {
    margin: 16,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  logo: {
    width: 160,
    height: 80,
    marginBottom: 12,
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 6,
  },
  welcomeSubtext: {
    fontSize: 14,
    color: '#6C757D',
    textAlign: 'center',
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
    borderColor: '#DEE2E6',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
    flex: 1,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    padding: 4,
  },
  infoBox: {
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
