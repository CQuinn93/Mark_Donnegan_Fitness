import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../../theme/ThemeContext';
import { macroService, authService } from '../../services/api';
import { adjustMacrosForActivity, ActivityType } from '../../utils/macroCalculations';

interface Props {
  navigation?: any;
  user?: any;
}

const MacroScreen: React.FC<Props> = ({ user: propUser }) => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [user, setUser] = useState<any>(propUser || null);
  const [macroGoals, setMacroGoals] = useState<any | null>(null);
  const [todayMacros, setTodayMacros] = useState<any | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedActivity, setSelectedActivity] = useState<ActivityType>('rest');
  const [savedActivity, setSavedActivity] = useState<ActivityType | null>(null);
  const [savingActivity, setSavingActivity] = useState(false);

  // Macro setup modal state
  const [setupModalVisible, setSetupModalVisible] = useState(false);
  const [setupSaving, setSetupSaving] = useState(false);
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [gender, setGender] = useState<'male' | 'female' | 'other' | ''>('');
  const [goal, setGoal] = useState<'weight_loss' | 'maintain' | 'muscle_gain' | ''>('');

  useEffect(() => {
    loadUserAndData();
  }, []);

  useEffect(() => {
    if (userId) {
      loadMacroData();
    }
  }, [userId, selectedDate]);

  const loadUserAndData = async () => {
    try {
      let u = propUser;
      if (!u) {
        const userResult = await authService.getCurrentUser();
        u = userResult.user;
      }
      if (u) {
        setUserId(u.id);
        setUser(u);
      }
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMacroData = async () => {
    if (!userId) return;

    try {
      // Load macro goals
      const goalsResult = await macroService.getMacroGoals(userId);
      if (goalsResult.goals && goalsResult.goals.length > 0) {
        setMacroGoals(goalsResult.goals[0]);
      } else {
        setMacroGoals(null);
      }

      // Load today's macro entry
      const entryResult = await macroService.getMacroEntry(userId, selectedDate);
      setTodayMacros(entryResult.entry);
      
      // Set saved activity if exists, otherwise default to 'rest'
      if (entryResult.entry?.activity_type) {
        setSavedActivity(entryResult.entry.activity_type);
        setSelectedActivity(entryResult.entry.activity_type);
      } else {
        setSavedActivity(null);
        setSelectedActivity('rest');
      }
    } catch (error) {
      console.error('Error loading macro data:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMacroData();
    setRefreshing(false);
  };

  const openSetupModal = async () => {
    // Refetch user to get latest profile (e.g. if they updated in Profile)
    let u = user;
    if (!u) {
      const r = await authService.getCurrentUser();
      u = r.user;
      if (u) setUser(u);
    } else {
      const r = await authService.getCurrentUser();
      if (r.user) {
        u = r.user;
        setUser(u);
      }
    }
    if (u) {
      setHeightCm(u.height_cm ? String(u.height_cm) : '');
      setWeightKg(u.weight_kg ? String(u.weight_kg) : '');
      setDateOfBirth(u.date_of_birth ? new Date(u.date_of_birth) : null);
      setGender((u.gender as 'male' | 'female' | 'other') || '');
      const g = Array.isArray(u.fitness_goals) && u.fitness_goals.length > 0 ? u.fitness_goals[0] : '';
      setGoal(g || '');
    } else {
      setHeightCm('');
      setWeightKg('');
      setDateOfBirth(null);
      setGender('');
      setGoal('');
    }
    setSetupModalVisible(true);
  };

  const handleSetupMacroGoals = async () => {
    if (!userId) return;
    const h = parseFloat(heightCm);
    const w = parseFloat(weightKg);
    if (!heightCm || !weightKg || isNaN(h) || isNaN(w) || h < 100 || h > 250 || w < 30 || w > 300) {
      Alert.alert('Error', 'Please enter valid height (100-250 cm) and weight (30-300 kg)');
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
    setSetupSaving(true);
    try {
      const result = await macroService.setupMacroGoals(userId, {
        height_cm: Math.round(h),
        weight_kg: w,
        date_of_birth: dateOfBirth.toISOString().split('T')[0],
        gender: gender as 'male' | 'female' | 'other',
        fitness_goal: goal as 'weight_loss' | 'maintain' | 'muscle_gain',
      });
      if (result.error) {
        Alert.alert('Error', result.error);
      } else {
        setSetupModalVisible(false);
        Alert.alert('Success', 'Your macro goals have been set up!');
        await loadMacroData();
      }
    } catch (err) {
      console.error('Error setting up macros:', err);
      Alert.alert('Error', 'Failed to set up macro goals. Please try again.');
    } finally {
      setSetupSaving(false);
    }
  };

  const formatDateForPicker = (d: Date | null): string => {
    if (!d) return '';
    return d.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
  };

  const calculatePercentage = (current: number, target: number): number => {
    if (!target || target === 0) return 0;
    return Math.min((current / target) * 100, 100);
  };

  const getProgressColor = (percentage: number): string => {
    if (percentage >= 90) return theme.colors.success;
    if (percentage >= 70) return '#FF9800';
    return theme.colors.error;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  const handleSaveActivity = async () => {
    if (!userId) return;
    
    setSavingActivity(true);
    try {
      const result = await macroService.saveActivityType(userId, selectedDate, selectedActivity);
      if (result.error) {
        Alert.alert('Error', result.error);
      } else {
        setSavedActivity(selectedActivity);
        Alert.alert('Success', 'Activity saved successfully!');
        // Reload data to reflect saved activity
        await loadMacroData();
      }
    } catch (error) {
      console.error('Error saving activity:', error);
      Alert.alert('Error', 'Failed to save activity. Please try again.');
    } finally {
      setSavingActivity(false);
    }
  };

  // Get adjusted macros based on selected activity
  const getAdjustedMacros = () => {
    if (!macroGoals) return null;
    return adjustMacrosForActivity(macroGoals, selectedActivity);
  };

  const adjustedMacros = getAdjustedMacros();
  const hasUnsavedChanges = selectedActivity !== savedActivity;

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Macro Tracker</Text>
          <Text style={[styles.headerDate, { color: theme.colors.textSecondary }]}>
            {formatDate(selectedDate)}
          </Text>
        </View>

        {/* Activity Selector Card */}
        {macroGoals && (
          <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Today's Activity</Text>
            <Text style={[styles.activitySubtitle, { color: theme.colors.textSecondary }]}>
              Select your activity to adjust your macro goals
            </Text>
            
            <View style={styles.activitySelector}>
              {(['cardio', 'weight', 'mix', 'rest'] as ActivityType[]).map((activity) => (
                <TouchableOpacity
                  key={activity}
                  style={[
                    styles.activityButton,
                    {
                      backgroundColor: selectedActivity === activity 
                        ? theme.colors.primary 
                        : theme.colors.background,
                      borderColor: theme.colors.border,
                    },
                  ]}
                  onPress={() => setSelectedActivity(activity)}
                >
                  <Ionicons
                    name={
                      activity === 'cardio' ? 'bicycle' :
                      activity === 'weight' ? 'barbell' :
                      activity === 'mix' ? 'fitness' :
                      'bed'
                    }
                    size={24}
                    color={selectedActivity === activity ? theme.colors.background : theme.colors.text}
                  />
                  <Text
                    style={[
                      styles.activityButtonText,
                      {
                        color: selectedActivity === activity ? theme.colors.background : theme.colors.text,
                      },
                    ]}
                  >
                    {activity.charAt(0).toUpperCase() + activity.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {hasUnsavedChanges && (
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  { backgroundColor: theme.colors.primary },
                  savingActivity && styles.saveButtonDisabled,
                ]}
                onPress={handleSaveActivity}
                disabled={savingActivity}
              >
                {savingActivity ? (
                  <ActivityIndicator color={theme.colors.background} />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color={theme.colors.background} />
                    <Text style={[styles.saveButtonText, { color: theme.colors.background }]}>
                      Save Activity
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {savedActivity && !hasUnsavedChanges && (
              <View style={[styles.savedIndicator, { backgroundColor: theme.colors.success }]}>
                <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
                <Text style={styles.savedIndicatorText}>
                  Activity saved: {savedActivity.charAt(0).toUpperCase() + savedActivity.slice(1)}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Macro Goals Card */}
        {macroGoals && adjustedMacros ? (
          <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
              Daily Goals {hasUnsavedChanges && '(Preview)'}
            </Text>
            
            {/* Calories */}
            <View style={styles.macroItem}>
              <View style={styles.macroHeader}>
                <Ionicons name="flame" size={20} color={theme.colors.error} />
                <Text style={[styles.macroLabel, { color: theme.colors.text }]}>Calories</Text>
                <Text style={[styles.macroValue, { color: theme.colors.text }]}>
                  {todayMacros?.calories || 0} / {adjustedMacros.calories}
                </Text>
              </View>
              <View style={[styles.progressBarContainer, { backgroundColor: theme.colors.border }]}>
                <View
                  style={[
                    styles.progressBar,
                    {
                      width: `${calculatePercentage(todayMacros?.calories || 0, adjustedMacros.calories)}%`,
                      backgroundColor: getProgressColor(calculatePercentage(todayMacros?.calories || 0, macroGoals.calories)),
                    },
                  ]}
                />
              </View>
            </View>

            {/* Protein */}
            <View style={styles.macroItem}>
              <View style={styles.macroHeader}>
                <Ionicons name="barbell" size={20} color={theme.colors.primary} />
                <Text style={[styles.macroLabel, { color: theme.colors.text }]}>Protein</Text>
                <Text style={[styles.macroValue, { color: theme.colors.text }]}>
                  {todayMacros?.protein_g || 0}g / {adjustedMacros.protein_g}g
                </Text>
              </View>
              <View style={[styles.progressBarContainer, { backgroundColor: theme.colors.border }]}>
                <View
                  style={[
                    styles.progressBar,
                    {
                      width: `${calculatePercentage(todayMacros?.protein_g || 0, adjustedMacros.protein_g)}%`,
                      backgroundColor: getProgressColor(calculatePercentage(todayMacros?.protein_g || 0, macroGoals.protein_g)),
                    },
                  ]}
                />
              </View>
            </View>

            {/* Carbs */}
            <View style={styles.macroItem}>
              <View style={styles.macroHeader}>
                <Ionicons name="nutrition" size={20} color="#FF9800" />
                <Text style={[styles.macroLabel, { color: theme.colors.text }]}>Carbs</Text>
                <Text style={[styles.macroValue, { color: theme.colors.text }]}>
                  {todayMacros?.carbs_g || 0}g / {adjustedMacros.carbs_g}g
                </Text>
              </View>
              <View style={[styles.progressBarContainer, { backgroundColor: theme.colors.border }]}>
                <View
                  style={[
                    styles.progressBar,
                    {
                      width: `${calculatePercentage(todayMacros?.carbs_g || 0, adjustedMacros.carbs_g)}%`,
                      backgroundColor: getProgressColor(calculatePercentage(todayMacros?.carbs_g || 0, macroGoals.carbs_g)),
                    },
                  ]}
                />
              </View>
            </View>

            {/* Fats */}
            <View style={styles.macroItem}>
              <View style={styles.macroHeader}>
                <Ionicons name="water" size={20} color="#2196F3" />
                <Text style={[styles.macroLabel, { color: theme.colors.text }]}>Fats</Text>
                <Text style={[styles.macroValue, { color: theme.colors.text }]}>
                  {todayMacros?.fats_g || 0}g / {adjustedMacros.fats_g}g
                </Text>
              </View>
              <View style={[styles.progressBarContainer, { backgroundColor: theme.colors.border }]}>
                <View
                  style={[
                    styles.progressBar,
                    {
                      width: `${calculatePercentage(todayMacros?.fats_g || 0, adjustedMacros.fats_g)}%`,
                      backgroundColor: getProgressColor(calculatePercentage(todayMacros?.fats_g || 0, macroGoals.fats_g)),
                    },
                  ]}
                />
              </View>
            </View>

            {/* Fiber */}
            {macroGoals.fiber_g && (
              <View style={styles.macroItem}>
                <View style={styles.macroHeader}>
                  <Ionicons name="leaf" size={20} color={theme.colors.success} />
                  <Text style={[styles.macroLabel, { color: theme.colors.text }]}>Fiber</Text>
                  <Text style={[styles.macroValue, { color: theme.colors.text }]}>
                    {todayMacros?.fiber_g || 0}g / {adjustedMacros.fiber_g}g
                  </Text>
                </View>
                <View style={[styles.progressBarContainer, { backgroundColor: theme.colors.border }]}>
                  <View
                    style={[
                      styles.progressBar,
                      {
                        width: `${calculatePercentage(todayMacros?.fiber_g || 0, adjustedMacros.fiber_g)}%`,
                        backgroundColor: getProgressColor(calculatePercentage(todayMacros?.fiber_g || 0, macroGoals.fiber_g)),
                      },
                    ]}
                  />
                </View>
              </View>
            )}
          </View>
        ) : (
          <View style={[styles.card, styles.setupPromptCard, { backgroundColor: theme.colors.surface }]}>
            <Ionicons name="nutrition-outline" size={56} color={theme.colors.primary} />
            <Text style={[styles.setupPromptTitle, { color: theme.colors.text }]}>
              Set up your macro goals
            </Text>
            <Text style={[styles.setupPromptSubtext, { color: theme.colors.textSecondary }]}>
              Enter your height, weight, and fitness goal to get personalized daily macro targets for tracking your nutrition.
            </Text>
            <TouchableOpacity
              style={[styles.setupPromptButton, { backgroundColor: theme.colors.primary }]}
              onPress={openSetupModal}
            >
              <Ionicons name="add-circle-outline" size={22} color={theme.colors.background} />
              <Text style={[styles.setupPromptButtonText, { color: theme.colors.background }]}>
                Set up macro goals
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Summary Stats */}
        {macroGoals && adjustedMacros && todayMacros && (
          <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Today's Summary</Text>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>Remaining Calories</Text>
                <Text style={[styles.summaryValue, { color: theme.colors.text }]}>
                  {Math.max(0, adjustedMacros.calories - (todayMacros.calories || 0))}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>Progress</Text>
                <Text style={[styles.summaryValue, { color: theme.colors.text }]}>
                  {Math.round(calculatePercentage(todayMacros.calories || 0, adjustedMacros.calories))}%
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Macro Setup Modal */}
      <Modal
        visible={setupModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSetupModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalKeyboardView}
          >
            <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
              <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
                <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Set up macro goals</Text>
                <TouchableOpacity onPress={() => setSetupModalVisible(false)}>
                  <Ionicons name="close" size={24} color={theme.colors.text} />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
                <Text style={[styles.modalLabel, { color: theme.colors.text }]}>Height (cm) *</Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: theme.colors.background, color: theme.colors.text, borderColor: theme.colors.border }]}
                  value={heightCm}
                  onChangeText={setHeightCm}
                  placeholder="e.g. 170"
                  placeholderTextColor={theme.colors.textSecondary}
                  keyboardType="numeric"
                />
                <Text style={[styles.modalLabel, { color: theme.colors.text }]}>Weight (kg) *</Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: theme.colors.background, color: theme.colors.text, borderColor: theme.colors.border }]}
                  value={weightKg}
                  onChangeText={setWeightKg}
                  placeholder="e.g. 70"
                  placeholderTextColor={theme.colors.textSecondary}
                  keyboardType="numeric"
                />
                <Text style={[styles.modalLabel, { color: theme.colors.text }]}>Date of birth *</Text>
                <TouchableOpacity
                  style={[styles.modalInput, styles.datePickerBtn, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={[styles.datePickerText, { color: dateOfBirth ? theme.colors.text : theme.colors.textSecondary }]}>
                    {dateOfBirth ? formatDateForPicker(dateOfBirth) : 'Select date of birth'}
                  </Text>
                  <Ionicons name="calendar-outline" size={20} color={theme.colors.textSecondary} />
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker
                    value={dateOfBirth || new Date()}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(_, d) => { if (d) setDateOfBirth(d); setShowDatePicker(false); }}
                    maximumDate={new Date()}
                  />
                )}
                <Text style={[styles.modalLabel, { color: theme.colors.text }]}>Gender *</Text>
                <View style={styles.genderRow}>
                  {(['male', 'female', 'other'] as const).map((g) => (
                    <TouchableOpacity
                      key={g}
                      style={[
                        styles.genderBtn,
                        { backgroundColor: gender === g ? theme.colors.primary : theme.colors.background, borderColor: theme.colors.border },
                      ]}
                      onPress={() => setGender(g)}
                    >
                      <Text style={[styles.genderBtnText, { color: gender === g ? theme.colors.background : theme.colors.text }]}>
                        {g.charAt(0).toUpperCase() + g.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={[styles.modalLabel, { color: theme.colors.text }]}>Fitness goal *</Text>
                <View style={styles.goalRow}>
                  {(['weight_loss', 'maintain', 'muscle_gain'] as const).map((g) => (
                    <TouchableOpacity
                      key={g}
                      style={[
                        styles.goalBtn,
                        { backgroundColor: goal === g ? theme.colors.primary : theme.colors.background, borderColor: theme.colors.border },
                      ]}
                      onPress={() => setGoal(g)}
                    >
                      <Text style={[styles.goalBtnText, { color: goal === g ? theme.colors.background : theme.colors.text }]}>
                        {g === 'weight_loss' ? 'Weight loss' : g === 'maintain' ? 'Maintain' : 'Muscle gain'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
              <View style={[styles.modalFooter, { borderTopColor: theme.colors.border }]}>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalBtnCancel, { borderColor: theme.colors.border }]}
                  onPress={() => setSetupModalVisible(false)}
                >
                  <Text style={[styles.modalBtnText, { color: theme.colors.text }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalBtnSave, { backgroundColor: theme.colors.primary }]}
                  onPress={handleSetupMacroGoals}
                  disabled={setupSaving}
                >
                  {setupSaving ? (
                    <ActivityIndicator color={theme.colors.background} size="small" />
                  ) : (
                    <Text style={[styles.modalBtnText, { color: theme.colors.background }]}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
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
  header: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  headerDate: {
    fontSize: 14,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  setupPromptCard: {
    alignItems: 'center',
    padding: 28,
  },
  setupPromptTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  setupPromptSubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  setupPromptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 8,
    gap: 8,
    minWidth: 200,
  },
  setupPromptButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalKeyboardView: {
    maxHeight: '90%',
  },
  modalContent: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalBody: {
    maxHeight: 400,
    padding: 16,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 12,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  datePickerBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  datePickerText: {
    fontSize: 16,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  genderBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  genderBtnText: {
    fontSize: 14,
    fontWeight: '500',
  },
  goalRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  goalBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  goalBtnText: {
    fontSize: 13,
    fontWeight: '500',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
  },
  modalBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 90,
    alignItems: 'center',
  },
  modalBtnCancel: {
    borderWidth: 1,
  },
  modalBtnSave: {},
  modalBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
  macroItem: {
    marginBottom: 20,
  },
  macroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  macroLabel: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  macroValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  progressBarContainer: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  activitySubtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  activitySelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 8,
  },
  activityButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 80,
  },
  activityButtonText: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '600',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  savedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
  },
  savedIndicatorText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default MacroScreen;

