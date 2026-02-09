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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { authService, userService } from '../../services/api';
import { supabaseApi } from '../../config/supabase';
import { User } from '../../types';
import { calculateBaseMacros } from '../../utils/macroCalculations';

interface Props {
  navigation: any;
  route: { params: { user: User; onComplete?: (updatedUser?: User) => void } };
}

const FirstTimeSetupScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme, actualThemeMode } = useTheme();
  const { user } = route.params;
  const [isLoading, setIsLoading] = useState(false);
  
  // Form fields
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [gender, setGender] = useState<'male' | 'female' | 'other' | ''>('');
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [goal, setGoal] = useState<'weight_loss' | 'maintain' | 'muscle_gain' | ''>('');


  const handleSubmit = async () => {
    // Validation
    if (!lastName) {
      Alert.alert('Error', 'Please fill in your last name');
      return;
    }

    if (!heightCm || !weightKg) {
      Alert.alert('Error', 'Please enter your height and weight');
      return;
    }

    const height = parseFloat(heightCm);
    const weight = parseFloat(weightKg);

    if (isNaN(height) || height < 100 || height > 250) {
      Alert.alert('Error', 'Please enter a valid height (100-250 cm)');
      return;
    }

    if (isNaN(weight) || weight < 30 || weight > 300) {
      Alert.alert('Error', 'Please enter a valid weight (30-300 kg)');
      return;
    }

    if (!gender) {
      Alert.alert('Error', 'Please select your gender');
      return;
    }

    if (!goal) {
      Alert.alert('Error', 'Please select your fitness goal');
      return;
    }

    if (!dateOfBirth) {
      Alert.alert('Error', 'Please enter your date of birth');
      return;
    }

    // Calculate age
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    setIsLoading(true);

    try {

      // Format date of birth as YYYY-MM-DD if provided
      const formattedDateOfBirth = dateOfBirth 
        ? dateOfBirth.toISOString().split('T')[0] 
        : undefined;

      // Calculate macros using shared utility function
      const macros = calculateBaseMacros(weight, height, age, gender as 'male' | 'female' | 'other', goal as 'weight_loss' | 'maintain' | 'muscle_gain');

      // Update profile with height and weight
      const profileData = {
        first_name: user.first_name, // Required field
        last_name: lastName,
        phone: phone || undefined,
        date_of_birth: formattedDateOfBirth,
        gender: gender || undefined,
        height_cm: Math.round(height),
        weight_kg: weight,
      };

      const profileResult = await userService.updateProfile(user.id, profileData);
      if (profileResult.error) {
        Alert.alert('Error', profileResult.error);
        return;
      }

      // Create macro goals (non-blocking - table might not exist yet)
      try {
        await supabaseApi.post('/macro_goals', {
          user_id: user.id,
          calories: macros.calories,
          protein_g: macros.protein_g,
          carbs_g: macros.carbs_g,
          fats_g: macros.fats_g,
          fiber_g: macros.fiber_g,
          is_active: true,
          start_date: new Date().toISOString().split('T')[0],
        });
        console.log('Macro goals created successfully:', macros);
      } catch (macroError: any) {
        // Only log as error if it's not a 404 (table doesn't exist)
        if (macroError.response?.status !== 404) {
          console.error('Error creating macro goals:', macroError.response?.data || macroError.message);
        } else {
          console.log('Macro goals table not found - user can set up macros later');
        }
        // Don't block the flow if macro goals fail - they can be set up later
      }

      // Create initial weight entry (non-blocking - table might not exist yet)
      try {
        await supabaseApi.post('/weight_entries', {
          user_id: user.id,
          weight_kg: weight,
          entry_date: new Date().toISOString().split('T')[0],
        });
        console.log('Initial weight entry created successfully');
      } catch (weightError: any) {
        // Only log as error if it's not a 404 (table doesn't exist)
        if (weightError.response?.status !== 404) {
          console.error('Error creating weight entry:', weightError.response?.data || weightError.message);
        } else {
          console.log('Weight entries table not found - user can add weight later');
        }
        // Don't block the flow if weight entry fails
      }

      // Build updated user so we can go straight to onboarding without re-fetching
      const updatedUser: User = {
        ...user,
        last_name: lastName,
        phone: phone || undefined,
        date_of_birth: formattedDateOfBirth,
        gender: gender as 'male' | 'female' | 'other',
        height_cm: Math.round(height),
        weight_kg: weight,
        fitness_goals: goal ? [goal] : user.fitness_goals,
        updated_at: new Date().toISOString(),
      };

      const successMessage = 'Profile setup completed successfully! You can change your password anytime in Settings from your Profile screen.';

      Alert.alert(
        'Success', 
        successMessage,
        [
          { 
            text: 'OK', 
            onPress: () => {
              if (route.params.onComplete) {
                route.params.onComplete(updatedUser);
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

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setDateOfBirth(selectedDate);
    }
  };

  const formatDate = (date: Date | null): string => {
    if (!date) return '';
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit' 
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={true}
        >
        {/* Logo and Welcome Message */}
        <View style={[styles.welcomeBox, { backgroundColor: theme.colors.surface }]}>
          <Image 
            source={actualThemeMode === 'light'
              ? require('../../../assets/MDFitness_Logo.png')
              : require('../../../assets/MDFitness_Logo_Dark.png')
            } 
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={[styles.welcomeText, { color: theme.colors.text }]}>
            Welcome to Mark Donnegan Fitness, {user.first_name}!
          </Text>
          <Text style={[styles.welcomeSubtext, { color: theme.colors.textSecondary }]}>
            Let's complete your profile setup
          </Text>
        </View>

      {/* Form */}
      <View style={[styles.form, { backgroundColor: theme.colors.background, borderTopWidth: 1, borderTopColor: theme.colors.border }]}>
        {/* Required Fields */}
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Required Information *</Text>
        
        <TextInput
          style={[styles.input, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.border }]}
          placeholder="Last Name"
          placeholderTextColor={theme.colors.textSecondary}
          value={lastName}
          onChangeText={setLastName}
        />


        {/* Required Health Information */}
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Health Information *</Text>
        <View style={styles.rowInputs}>
          <TextInput
            style={[styles.input, styles.halfInput, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.border }]}
            placeholder="Height (cm)"
            placeholderTextColor={theme.colors.textSecondary}
            value={heightCm}
            onChangeText={setHeightCm}
            keyboardType="numeric"
          />
          <TextInput
            style={[styles.input, styles.halfInput, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.border }]}
            placeholder="Weight (kg)"
            placeholderTextColor={theme.colors.textSecondary}
            value={weightKg}
            onChangeText={setWeightKg}
            keyboardType="numeric"
          />
        </View>

        {/* Fitness Goal Selection */}
        <Text style={[styles.genderLabel, { color: theme.colors.text }]}>Fitness Goal *</Text>
        <View style={styles.goalContainer}>
          <TouchableOpacity
            style={[
              styles.goalOption,
              { backgroundColor: goal === 'weight_loss' ? theme.colors.primary : theme.colors.surface }
            ]}
            onPress={() => setGoal('weight_loss')}
          >
            <Ionicons 
              name="trending-down" 
              size={24} 
              color={goal === 'weight_loss' ? theme.colors.background : theme.colors.textSecondary} 
            />
            <Text style={[
              styles.goalOptionText,
              { color: goal === 'weight_loss' ? theme.colors.background : theme.colors.text }
            ]}>
              Weight Loss
            </Text>
            {goal === 'weight_loss' && (
              <Ionicons name="checkmark-circle" size={20} color={theme.colors.background} />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.goalOption,
              { backgroundColor: goal === 'maintain' ? theme.colors.primary : theme.colors.surface }
            ]}
            onPress={() => setGoal('maintain')}
          >
            <Ionicons 
              name="remove" 
              size={24} 
              color={goal === 'maintain' ? theme.colors.background : theme.colors.textSecondary} 
            />
            <Text style={[
              styles.goalOptionText,
              { color: goal === 'maintain' ? theme.colors.background : theme.colors.text }
            ]}>
              Maintain
            </Text>
            {goal === 'maintain' && (
              <Ionicons name="checkmark-circle" size={20} color={theme.colors.background} />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.goalOption,
              { backgroundColor: goal === 'muscle_gain' ? theme.colors.primary : theme.colors.surface }
            ]}
            onPress={() => setGoal('muscle_gain')}
          >
            <Ionicons 
              name="trending-up" 
              size={24} 
              color={goal === 'muscle_gain' ? theme.colors.background : theme.colors.textSecondary} 
            />
            <Text style={[
              styles.goalOptionText,
              { color: goal === 'muscle_gain' ? theme.colors.background : theme.colors.text }
            ]}>
              Muscle Gain
            </Text>
            {goal === 'muscle_gain' && (
              <Ionicons name="checkmark-circle" size={20} color={theme.colors.background} />
            )}
          </TouchableOpacity>
        </View>

        {/* Optional Personal Information */}
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Personal Information (Optional)</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.border }]}
          placeholder="Phone Number"
          placeholderTextColor={theme.colors.textSecondary}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />
        
        {/* Date of Birth Picker */}
        <Text style={[styles.genderLabel, { color: theme.colors.text }]}>Date of Birth *</Text>
        <TouchableOpacity
          style={[styles.input, styles.datePickerButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={[styles.datePickerText, { color: dateOfBirth ? theme.colors.text : theme.colors.textSecondary }]}>
            {dateOfBirth ? formatDate(dateOfBirth) : 'Select Date of Birth'}
          </Text>
          <Ionicons name="calendar-outline" size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={dateOfBirth || new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDateChange}
            maximumDate={new Date()}
            style={styles.datePicker}
          />
        )}
        {Platform.OS === 'ios' && showDatePicker && (
          <TouchableOpacity
            style={styles.datePickerDoneButton}
            onPress={() => setShowDatePicker(false)}
          >
            <Text style={styles.datePickerDoneText}>Done</Text>
          </TouchableOpacity>
        )}

        {/* Gender Selection */}
        <Text style={[styles.genderLabel, { color: theme.colors.text }]}>Gender</Text>
        <View style={styles.genderContainer}>
          <TouchableOpacity
            style={[
              styles.genderOption,
              { backgroundColor: gender === 'male' ? theme.colors.primary : theme.colors.surface }
            ]}
            onPress={() => setGender('male')}
          >
            <Text style={[
              styles.genderOptionText,
              { color: gender === 'male' ? theme.colors.background : theme.colors.text }
            ]}>
              Male
            </Text>
            {gender === 'male' && (
              <Ionicons name="checkmark-circle" size={20} color={theme.colors.background} />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.genderOption,
              { backgroundColor: gender === 'female' ? theme.colors.primary : theme.colors.surface }
            ]}
            onPress={() => setGender('female')}
          >
            <Text style={[
              styles.genderOptionText,
              { color: gender === 'female' ? theme.colors.background : theme.colors.text }
            ]}>
              Female
            </Text>
            {gender === 'female' && (
              <Ionicons name="checkmark-circle" size={20} color={theme.colors.background} />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.genderOption,
              { backgroundColor: gender === 'other' ? theme.colors.primary : theme.colors.surface }
            ]}
            onPress={() => setGender('other')}
          >
            <Text style={[
              styles.genderOptionText,
              { color: gender === 'other' ? theme.colors.background : theme.colors.text }
            ]}>
              Other
            </Text>
            {gender === 'other' && (
              <Ionicons name="checkmark-circle" size={20} color={theme.colors.background} />
            )}
          </TouchableOpacity>
        </View>

        {/* Information Text */}
        <View style={[styles.infoBox, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
            Please complete your profile information. You can skip optional fields and complete them later.
          </Text>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, { backgroundColor: theme.colors.primary }]}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={theme.colors.background} size="small" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color={theme.colors.background} />
              <Text style={[styles.submitButtonText, { color: theme.colors.background }]}>
                Complete Setup
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
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
    textAlign: 'center',
    marginBottom: 6,
  },
  welcomeSubtext: {
    fontSize: 14,
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
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  datePickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DEE2E6',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  datePickerText: {
    fontSize: 16,
  },
  datePicker: {
    marginBottom: 12,
  },
  datePickerDoneButton: {
    backgroundColor: '#6C757D',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  datePickerDoneText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  genderLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 4,
  },
  genderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
  },
  genderOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DEE2E6',
    gap: 6,
  },
  genderOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  halfInput: {
    flex: 1,
  },
  goalContainer: {
    marginBottom: 12,
    gap: 8,
  },
  goalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DEE2E6',
    gap: 12,
  },
  goalOptionText: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
});

export default FirstTimeSetupScreen;
