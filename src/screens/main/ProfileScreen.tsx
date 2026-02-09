import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  TextInput,
  Switch,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { authService, userService, trainerService, macroService } from '../../services/api';
import { User } from '../../types';

interface Props {
  onSignOut: () => void;
  user?: User;
}

const ProfileScreen: React.FC<Props> = ({ onSignOut, user: propUser }) => {
  const { theme } = useTheme();
  const [user, setUser] = useState<User | null>(propUser || null);
  const [loading, setLoading] = useState(!propUser);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [notificationsModalVisible, setNotificationsModalVisible] = useState(false);
  const [helpModalVisible, setHelpModalVisible] = useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [trainers, setTrainers] = useState<any[]>([]);
  
  // Edit profile state
  const [phone, setPhone] = useState('');
  const [goal, setGoal] = useState<'weight_loss' | 'maintain' | 'muscle_gain' | ''>('');
  const [saving, setSaving] = useState(false);
  
  // Settings state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Notification preferences (stored in user profile or local state)
  const [notifications, setNotifications] = useState({
    classes: true,
    checkins: true,
    stepGoal: true,
  });

  useEffect(() => {
    if (!propUser) {
      loadUser();
    }
    loadTrainers();
  }, []);

  useEffect(() => {
    if (user) {
      setPhone(user.phone || '');
      // Load notification preferences (if stored in profile)
      // For now, using default values
    }
  }, [user]);

  const loadUser = async () => {
    try {
      const userResult = await authService.getCurrentUser();
      if (userResult.user) {
        setUser(userResult.user);
      }
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTrainers = async () => {
    try {
      const result = await trainerService.getAllTrainers();
      if (result.trainers) {
        setTrainers(result.trainers);
      }
    } catch (error) {
      console.error('Error loading trainers:', error);
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await authService.signOut();
            } catch (error) {
              console.log('Sign out error in ProfileScreen:', error);
            }
            onSignOut();
          },
        },
      ]
    );
  };

  const handleEditProfile = () => {
    if (!user) return;
    setPhone(user.phone || '');
    // Determine current goal from macro goals if available
    setGoal(''); // Will be set from macro goals if available
    setEditModalVisible(true);
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      const updateData: any = {
        phone: phone || undefined,
      };

      // If goal is selected, include it in the update
      if (goal && goal !== '') {
        updateData.fitness_goals = [goal];
      }

      const result = await userService.updateProfile(user.id, updateData);
      if (result.error) {
        Alert.alert('Error', result.error);
        setSaving(false);
        return;
      }

      // If goal was updated, recalculate macros
      if (goal && goal !== '') {
        try {
          await userService.recalculateBaseMacros(user.id);
        } catch (macroError) {
          console.error('Error recalculating macros:', macroError);
          // Don't block the flow if macro recalculation fails
        }
      }

      // Refresh user data to get the latest profile
      try {
        const updatedUserResult = await authService.getCurrentUser();
        if (updatedUserResult.user) {
          setUser(updatedUserResult.user);
        } else if (result.user) {
          // Fallback to result.user if getCurrentUser fails
          setUser(result.user);
        } else {
          // If both fail, show error
          Alert.alert('Warning', 'Profile updated but unable to refresh user data. Please restart the app.');
          setSaving(false);
          return;
        }
      } catch (error) {
        console.error('Error refreshing user after update:', error);
        // Still use result.user as fallback
        if (result.user) {
          setUser(result.user);
        } else {
          Alert.alert('Warning', 'Profile updated but unable to refresh user data. Please restart the app.');
          setSaving(false);
          return;
        }
      }
      
      setEditModalVisible(false);
      
      // Show single combined message
      if (goal && goal !== '') {
        Alert.alert(
          'Success',
          'Profile updated successfully. Your fitness goal has been updated and macro goals have been recalculated.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Success', 'Profile updated successfully');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotifications = async () => {
    // Save notification preferences
    // For now, just store in local state or AsyncStorage
    // In production, this would be saved to the database
    setNotificationsModalVisible(false);
    Alert.alert('Success', 'Notification preferences saved');
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all password fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    setChangingPassword(true);
    try {
      // First verify current password by attempting to sign in
      // This will also refresh the session token
      const signInResult = await authService.signIn({
        email: user.email,
        password: currentPassword,
      });

      if (signInResult.error) {
        Alert.alert('Error', 'Current password is incorrect');
        setChangingPassword(false);
        return;
      }

      // Small delay to ensure token is stored after signIn
      await new Promise(resolve => setTimeout(resolve, 100));

      // If sign in successful, change password
      // The changePassword function will use the newly stored token from signIn
      const changeResult = await authService.changePassword(newPassword);
      
      if (changeResult.error) {
        // Check if it's a session error - if so, the signIn might have failed silently
        if (changeResult.error.includes('Session expired') || 
            changeResult.error.includes('Not authenticated') ||
            changeResult.error.includes('Invalid session')) {
          Alert.alert(
            'Session Error', 
            'Your session expired during password change. Please try again.',
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert('Error', changeResult.error);
        }
      } else {
        Alert.alert('Success', 'Password changed successfully!', [
          {
            text: 'OK',
            onPress: () => {
              setSettingsModalVisible(false);
              setCurrentPassword('');
              setNewPassword('');
              setConfirmPassword('');
            },
          },
        ]);
      }
    } catch (error: any) {
      console.error('Error changing password:', error);
      Alert.alert('Error', 'Failed to change password. Please try again.');
    } finally {
      setChangingPassword(false);
    }
  };

  const getGoalDisplayName = (goalValue: string): string => {
    switch (goalValue) {
      case 'weight_loss':
        return 'Weight Loss';
      case 'maintain':
        return 'Maintain';
      case 'muscle_gain':
        return 'Muscle Gain';
      default:
        return 'Not Set';
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.errorText, { color: theme.colors.error }]}>
          Unable to load user profile
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Profile Header */}
        <View style={[styles.profileSection, { backgroundColor: theme.colors.surface }]}>
          <View style={[styles.avatarContainer, { backgroundColor: theme.colors.primary }]}>
            <Ionicons name="person" size={60} color={theme.colors.background} />
          </View>
          <Text style={[styles.name, { color: theme.colors.text }]}>
            {user.first_name} {user.last_name}
          </Text>
          <Text style={[styles.email, { color: theme.colors.textSecondary }]}>
            {user.email}
          </Text>
        </View>

        {/* Menu Section */}
        <View style={[styles.menuSection, { backgroundColor: theme.colors.surface }]}>
          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: theme.colors.border }]}
            onPress={handleEditProfile}
          >
            <Ionicons name="person-outline" size={24} color={theme.colors.text} />
            <Text style={[styles.menuText, { color: theme.colors.text }]}>Edit Profile</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: theme.colors.border }]}
            onPress={() => setNotificationsModalVisible(true)}
          >
            <Ionicons name="notifications-outline" size={24} color={theme.colors.text} />
            <Text style={[styles.menuText, { color: theme.colors.text }]}>Notifications</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: theme.colors.border }]}
            onPress={() => setSettingsModalVisible(true)}
          >
            <Ionicons name="settings-outline" size={24} color={theme.colors.text} />
            <Text style={[styles.menuText, { color: theme.colors.text }]}>Settings</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => setHelpModalVisible(true)}
          >
            <Ionicons name="help-circle-outline" size={24} color={theme.colors.text} />
            <Text style={[styles.menuText, { color: theme.colors.text }]}>Help & Support</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity
          style={[styles.signOutButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.error }]}
          onPress={handleSignOut}
        >
          <Ionicons name="log-out-outline" size={24} color={theme.colors.error} />
          <Text style={[styles.signOutText, { color: theme.colors.error }]}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: theme.colors.text }]}>First Name</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.colors.background, color: theme.colors.text, borderColor: theme.colors.border }]}
                  value={user.first_name}
                  editable={false}
                  placeholder="First Name"
                  placeholderTextColor={theme.colors.textSecondary}
                />
                <Text style={[styles.helpText, { color: theme.colors.textSecondary }]}>
                  First name cannot be changed
                </Text>
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: theme.colors.text }]}>Email</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.colors.background, color: theme.colors.text, borderColor: theme.colors.border }]}
                  value={user.email}
                  editable={false}
                  placeholder="Email"
                  placeholderTextColor={theme.colors.textSecondary}
                />
                <Text style={[styles.helpText, { color: theme.colors.textSecondary }]}>
                  Email cannot be changed
                </Text>
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: theme.colors.text }]}>Phone Number</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.colors.background, color: theme.colors.text, borderColor: theme.colors.border }]}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="Phone Number"
                  placeholderTextColor={theme.colors.textSecondary}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: theme.colors.text }]}>Fitness Goal</Text>
                <View style={styles.goalContainer}>
                  <TouchableOpacity
                    style={[
                      styles.goalOption,
                      { backgroundColor: goal === 'weight_loss' ? theme.colors.primary : theme.colors.background, borderColor: theme.colors.border }
                    ]}
                    onPress={() => setGoal('weight_loss')}
                  >
                    <Text style={[
                      styles.goalOptionText,
                      { color: goal === 'weight_loss' ? theme.colors.background : theme.colors.text }
                    ]}>
                      Weight Loss
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.goalOption,
                      { backgroundColor: goal === 'maintain' ? theme.colors.primary : theme.colors.background, borderColor: theme.colors.border }
                    ]}
                    onPress={() => setGoal('maintain')}
                  >
                    <Text style={[
                      styles.goalOptionText,
                      { color: goal === 'maintain' ? theme.colors.background : theme.colors.text }
                    ]}>
                      Maintain
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.goalOption,
                      { backgroundColor: goal === 'muscle_gain' ? theme.colors.primary : theme.colors.background, borderColor: theme.colors.border }
                    ]}
                    onPress={() => setGoal('muscle_gain')}
                  >
                    <Text style={[
                      styles.goalOptionText,
                      { color: goal === 'muscle_gain' ? theme.colors.background : theme.colors.text }
                    ]}>
                      Muscle Gain
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>

            <View style={[styles.modalFooter, { borderTopColor: theme.colors.border }]}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { borderColor: theme.colors.border }]}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={[styles.modalButtonText, { color: theme.colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton, { backgroundColor: theme.colors.primary }]}
                onPress={handleSaveProfile}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color={theme.colors.background} />
                ) : (
                  <Text style={[styles.modalButtonText, { color: theme.colors.background }]}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Notifications Modal */}
      <Modal
        visible={notificationsModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setNotificationsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Notifications</Text>
              <TouchableOpacity onPress={() => setNotificationsModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={[styles.notificationItem, { borderBottomColor: theme.colors.border }]}>
                <View style={styles.notificationInfo}>
                  <Text style={[styles.notificationLabel, { color: theme.colors.text }]}>Classes</Text>
                  <Text style={[styles.notificationDescription, { color: theme.colors.textSecondary }]}>
                    Get notified about class reminders and updates
                  </Text>
                </View>
                <Switch
                  value={notifications.classes}
                  onValueChange={(value) => setNotifications({ ...notifications, classes: value })}
                  trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                  thumbColor={theme.colors.background}
                />
              </View>

              <View style={[styles.notificationItem, { borderBottomColor: theme.colors.border }]}>
                <View style={styles.notificationInfo}>
                  <Text style={[styles.notificationLabel, { color: theme.colors.text }]}>Check-ins</Text>
                  <Text style={[styles.notificationDescription, { color: theme.colors.textSecondary }]}>
                    Get notified when it's time to check in for classes
                  </Text>
                </View>
                <Switch
                  value={notifications.checkins}
                  onValueChange={(value) => setNotifications({ ...notifications, checkins: value })}
                  trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                  thumbColor={theme.colors.background}
                />
              </View>

              <View style={styles.notificationItem}>
                <View style={styles.notificationInfo}>
                  <Text style={[styles.notificationLabel, { color: theme.colors.text }]}>Step Goal Reached</Text>
                  <Text style={[styles.notificationDescription, { color: theme.colors.textSecondary }]}>
                    Get notified when you reach your daily step goal
                  </Text>
                </View>
                <Switch
                  value={notifications.stepGoal}
                  onValueChange={(value) => setNotifications({ ...notifications, stepGoal: value })}
                  trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                  thumbColor={theme.colors.background}
                />
              </View>
            </ScrollView>

            <View style={[styles.modalFooter, { borderTopColor: theme.colors.border }]}>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton, { backgroundColor: theme.colors.primary }]}
                onPress={handleSaveNotifications}
              >
                <Text style={[styles.modalButtonText, { color: theme.colors.background }]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Settings Modal */}
      <Modal
        visible={settingsModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setSettingsModalVisible(false);
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Settings</Text>
              <TouchableOpacity onPress={() => {
                setSettingsModalVisible(false);
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
              }}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.settingsSection}>
                <Text style={[styles.settingsSectionTitle, { color: theme.colors.text }]}>Change Password</Text>
                
                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: theme.colors.text }]}>Current Password</Text>
                  <View style={[styles.passwordContainer, { borderColor: theme.colors.border }]}>
                    <TextInput
                      style={[styles.passwordInput, { color: theme.colors.text }]}
                      value={currentPassword}
                      onChangeText={setCurrentPassword}
                      placeholder="Enter current password"
                      placeholderTextColor={theme.colors.textSecondary}
                      secureTextEntry={!showCurrentPassword}
                    />
                    <TouchableOpacity
                      onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                      style={styles.eyeButton}
                    >
                      <Ionicons
                        name={showCurrentPassword ? "eye-off" : "eye"}
                        size={20}
                        color={theme.colors.textSecondary}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: theme.colors.text }]}>New Password</Text>
                  <View style={[styles.passwordContainer, { borderColor: theme.colors.border }]}>
                    <TextInput
                      style={[styles.passwordInput, { color: theme.colors.text }]}
                      value={newPassword}
                      onChangeText={setNewPassword}
                      placeholder="Enter new password"
                      placeholderTextColor={theme.colors.textSecondary}
                      secureTextEntry={!showNewPassword}
                    />
                    <TouchableOpacity
                      onPress={() => setShowNewPassword(!showNewPassword)}
                      style={styles.eyeButton}
                    >
                      <Ionicons
                        name={showNewPassword ? "eye-off" : "eye"}
                        size={20}
                        color={theme.colors.textSecondary}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: theme.colors.text }]}>Confirm New Password</Text>
                  <View style={[styles.passwordContainer, { borderColor: theme.colors.border }]}>
                    <TextInput
                      style={[styles.passwordInput, { color: theme.colors.text }]}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      placeholder="Confirm new password"
                      placeholderTextColor={theme.colors.textSecondary}
                      secureTextEntry={!showConfirmPassword}
                    />
                    <TouchableOpacity
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                      style={styles.eyeButton}
                    >
                      <Ionicons
                        name={showConfirmPassword ? "eye-off" : "eye"}
                        size={20}
                        color={theme.colors.textSecondary}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity
                  style={[
                    styles.changePasswordButton,
                    { backgroundColor: theme.colors.primary },
                    changingPassword && styles.changePasswordButtonDisabled,
                  ]}
                  onPress={handleChangePassword}
                  disabled={changingPassword}
                >
                  {changingPassword ? (
                    <ActivityIndicator color={theme.colors.background} />
                  ) : (
                    <>
                      <Ionicons name="lock-closed" size={20} color={theme.colors.background} />
                      <Text style={[styles.changePasswordButtonText, { color: theme.colors.background }]}>
                        Change Password
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                <View style={[styles.infoBox, { backgroundColor: theme.colors.background }]}>
                  <Ionicons name="information-circle-outline" size={20} color={theme.colors.textSecondary} />
                  <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
                    If you forgot your password, use the "Forgot Password" option on the login screen.
                  </Text>
                </View>
              </View>
            </ScrollView>

            <View style={[styles.modalFooter, { borderTopColor: theme.colors.border }]}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1 }]}
                onPress={() => {
                  setSettingsModalVisible(false);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                }}
              >
                <Text style={[styles.modalButtonText, { color: theme.colors.text }]}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Help & Support Modal */}
      <Modal
        visible={helpModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setHelpModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Help & Support</Text>
              <TouchableOpacity onPress={() => setHelpModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.helpSection}>
                <Text style={[styles.helpSectionTitle, { color: theme.colors.text }]}>Contact Support</Text>
                <TouchableOpacity
                  style={[styles.contactItem, { borderColor: theme.colors.border }]}
                  onPress={() => {
                    // Open email client
                    Alert.alert('Email', 'mdfitness93@gmail.com');
                  }}
                >
                  <Ionicons name="mail-outline" size={24} color={theme.colors.primary} />
                  <View style={styles.contactInfo}>
                    <Text style={[styles.contactLabel, { color: theme.colors.text }]}>MDFitness Support</Text>
                    <Text style={[styles.contactValue, { color: theme.colors.textSecondary }]}>mdfitness93@gmail.com</Text>
                  </View>
                </TouchableOpacity>
              </View>

              {trainers.length > 0 && (
                <View style={styles.helpSection}>
                  <Text style={[styles.helpSectionTitle, { color: theme.colors.text }]}>Trainers</Text>
                  {trainers.map((trainer) => (
                    <TouchableOpacity
                      key={trainer.id}
                      style={[styles.contactItem, { borderColor: theme.colors.border }]}
                      onPress={() => {
                        Alert.alert('Email', trainer.email || 'No email available');
                      }}
                    >
                      <Ionicons name="person-outline" size={24} color={theme.colors.primary} />
                      <View style={styles.contactInfo}>
                        <Text style={[styles.contactLabel, { color: theme.colors.text }]}>
                          {trainer.first_name} {trainer.last_name}
                        </Text>
                        <Text style={[styles.contactValue, { color: theme.colors.textSecondary }]}>
                          {trainer.email || 'No email available'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </ScrollView>

            <View style={[styles.modalFooter, { borderTopColor: theme.colors.border }]}>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton, { backgroundColor: theme.colors.primary }]}
                onPress={() => setHelpModalVisible(false)}
              >
                <Text style={[styles.modalButtonText, { color: theme.colors.background }]}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  scrollContent: {
    padding: 16,
    paddingBottom: 100, // Space for floating navbar
  },
  profileSection: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 12,
    marginBottom: 16,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
  },
  menuSection: {
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    marginLeft: 12,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalBody: {
    padding: 16,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    borderWidth: 1,
  },
  saveButton: {
    // backgroundColor set inline
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  // Form styles
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  helpText: {
    fontSize: 12,
    marginTop: 4,
  },
  goalContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  goalOption: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  goalOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  // Notification styles
  notificationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  notificationInfo: {
    flex: 1,
    marginRight: 16,
  },
  notificationLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  notificationDescription: {
    fontSize: 14,
  },
  // Help & Support styles
  settingsSection: {
    marginBottom: 24,
  },
  settingsSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginTop: 8,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  eyeButton: {
    padding: 4,
  },
  changePasswordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 8,
    marginTop: 16,
    gap: 8,
  },
  changePasswordButtonDisabled: {
    opacity: 0.6,
  },
  changePasswordButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoBox: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    gap: 8,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  helpSection: {
    marginBottom: 24,
  },
  helpSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  contactInfo: {
    flex: 1,
    marginLeft: 12,
  },
  contactLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  contactValue: {
    fontSize: 14,
  },
});

export default ProfileScreen;
