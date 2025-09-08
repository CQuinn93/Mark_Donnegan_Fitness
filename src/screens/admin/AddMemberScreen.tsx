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
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { userService, testSupabaseConnection } from '../../services/api';

interface Props {
  navigation: any;
  route: any;
}

const AddMemberScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  
  // Form fields - only basic required fields
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');

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
      // First, test Supabase connection
      console.log('Testing Supabase connection before creating member...');
      const connectionTest = await testSupabaseConnection();
      if (!connectionTest.success) {
        Alert.alert('Connection Error', `Failed to connect to Supabase: ${connectionTest.error}`);
        return;
      }
      console.log('Supabase connection test passed');

      const userData = {
        email,
        first_name: firstName,
        role: 'member' as const,
      };

      const result = await userService.createUser(userData);
      
      if (result.error) {
        Alert.alert('Error', result.error);
        return;
      }

      // Show success message
      let message = `Member created successfully!`;
      
      if (result.access_code) {
        message += `\n\n7-Digit Access Code: ${result.access_code}\n\nA welcome email has been sent to the member with this code. They must use this code to log in and create their password.`;
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
      console.error('Error creating member:', error);
      Alert.alert('Error', 'Failed to create member');
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
          Add New Member
        </Text>
        <View style={styles.placeholder} />
      </View>

      {/* Form */}
      <View style={[styles.contentContainer, { backgroundColor: theme.colors.background }]}>
        <ScrollView style={styles.scrollView}>
        <View style={[styles.form, { backgroundColor: theme.colors.surface }]}>
          {/* Required Fields */}
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Required Information *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.colors.background, color: theme.colors.text, borderColor: theme.colors.border }]}
            placeholder="Email Address"
            placeholderTextColor={theme.colors.textSecondary}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            style={[styles.input, { backgroundColor: theme.colors.background, color: theme.colors.text, borderColor: theme.colors.border }]}
            placeholder="First Name"
            placeholderTextColor={theme.colors.textSecondary}
            value={firstName}
            onChangeText={setFirstName}
          />

          {/* Information Text */}
          <View style={[styles.infoBox, { backgroundColor: theme.colors.background }]}>
            <Ionicons name="information-circle" size={20} color={theme.colors.info} />
            <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
              Member will receive a 7-digit access code and must use it to log in and create their password.
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
                  Create Member
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

export default AddMemberScreen;
