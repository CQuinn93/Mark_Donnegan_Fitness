import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types';
import { useTheme } from '../../theme/ThemeContext';
import { authService } from '../../services/api';

// Test function to check Supabase connection
const testSupabaseConnection = async () => {
  try {
    console.log('Testing Supabase connection...');
    const response = await fetch('https://iyywyoasvxxcndnxyiun.supabase.co/rest/v1/profiles?select=count', {
      headers: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5eXd5b2Fzdnh4Y25kbnh5aXVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NDQwOTYsImV4cCI6MjA3MTUyMDA5Nn0.G6Bmbqo5O5MnMlPajHPsRedThm7RvloDS2SHcoNKYWs',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5eXd5b2Fzdnh4Y25kbnh5aXVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NDQwOTYsImV4cCI6MjA3MTUyMDA5Nn0.G6Bmbqo5O5MnMlPajHPsRedThm7RvloDS2SHcoNKYWs'
      }
    });
    console.log('Supabase connection test response:', response.status, response.ok);
    
    // Also test if profiles table exists
    if (response.ok) {
      const data = await response.json();
      console.log('Profiles table count:', data);
    }
    
    return response.ok;
  } catch (error) {
    console.error('Supabase connection test failed:', error);
    return false;
  }
};

type LoginScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Login'>;

interface Props {
  navigation: LoginScreenNavigationProp;
  onLoginSuccess: (user: any) => void;
}

const LoginScreen: React.FC<Props> = ({ navigation, onLoginSuccess }) => {
  const { theme, actualThemeMode } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [adminCode, setAdminCode] = useState('');
  const [trainerCode, setTrainerCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [isTrainerMode, setIsTrainerMode] = useState(false);
  const [holdTimer, setHoldTimer] = useState<NodeJS.Timeout | null>(null);
  const [tapCount, setTapCount] = useState(0);
  const [tapTimer, setTapTimer] = useState<NodeJS.Timeout | null>(null);

  const handleLogin = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    setStatusMessage(''); // Clear previous messages

    try {
      let result;
      
      if (isAdminMode) {
        if (!adminCode) {
          Alert.alert('Error', 'Please enter admin code');
          setIsLoading(false);
          return;
        }
        result = await authService.verifyAdminCode(adminCode);
        if (result.admin) {
          // Create a user object from admin data
          const user = {
            id: result.admin.id,
            email: result.admin.email,
            first_name: result.admin.name.split(' ')[0] || result.admin.name,
            last_name: result.admin.name.split(' ').slice(1).join(' ') || '',
            role: 'admin',
          };
          onLoginSuccess(user);
        } else {
          setStatusMessage(result.error || 'Admin access denied');
        }
      } else if (isTrainerMode) {
        if (!trainerCode) {
          Alert.alert('Error', 'Please enter trainer code');
          setIsLoading(false);
          return;
        }
        result = await authService.verifyTrainerCode(trainerCode);
        if (result.trainer) {
          // Create a user object from trainer data
          const user = {
            id: result.trainer.id,
            email: result.trainer.email,
            first_name: result.trainer.first_name || '',
            last_name: result.trainer.last_name || '',
            role: 'trainer',
          };
          setStatusMessage('Trainer login successful! Redirecting...');
          onLoginSuccess(user);
        } else {
          setStatusMessage(result.error || 'Trainer access denied');
        }
      } else {
        // Regular user login
        if (!email || !password) {
          Alert.alert('Error', 'Please fill in all fields');
          setIsLoading(false);
          return;
        }

        if (!email.includes('@')) {
          Alert.alert('Error', 'Please enter a valid email address');
          setIsLoading(false);
          return;
        }

        setStatusMessage('Signing in...');
        console.log('Starting login process for:', email);
        
        // Test Supabase connection first
        const connectionOk = await testSupabaseConnection();
        console.log('Supabase connection test result:', connectionOk);
        
        result = await authService.signIn({ email, password });
        
        console.log('Sign in response:', { user: result.user ? 'User found' : 'No user', error: result.error });
        
        if (result.user) {
          setStatusMessage('Login successful! Redirecting...');
          onLoginSuccess(result.user);
        } else {
          const errorMessage = result.error || 'Login failed';
          setStatusMessage(errorMessage);
          // Show alert for better visibility of login errors
          Alert.alert('Login Failed', errorMessage);
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      setStatusMessage('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogoPressIn = () => {
    const timer = setTimeout(() => {
      setIsAdminMode(true);
      setIsTrainerMode(false);
      Alert.alert('Admin Mode', 'Admin login mode activated. Hold the logo for 7 seconds again to return to user mode.');
    }, 7000);
    setHoldTimer(timer);
  };

  const handleLogoPressOut = () => {
    if (holdTimer) {
      clearTimeout(holdTimer);
      setHoldTimer(null);
    }
  };

  const handleLogoPress = () => {
    // Increment tap count
    const newTapCount = tapCount + 1;
    setTapCount(newTapCount);

    // Clear existing timer
    if (tapTimer) {
      clearTimeout(tapTimer);
    }

    // Set new timer
    const timer = setTimeout(() => {
      if (newTapCount === 4) {
        setIsTrainerMode(true);
        setIsAdminMode(false);
        Alert.alert('Trainer Mode', 'Trainer login mode activated. Tap the logo 4 times again to return to user mode.');
      }
      setTapCount(0);
    }, 2000); // 2 second window for 4 taps

    setTapTimer(timer);
  };

  const handleReturnToUserMode = () => {
    setIsAdminMode(false);
    setIsTrainerMode(false);
    setEmail('');
    setPassword('');
    setAdminCode('');
    setTrainerCode('');
    setStatusMessage('');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <TouchableOpacity
            style={styles.logoContainer}
            onPressIn={handleLogoPressIn}
            onPressOut={handleLogoPressOut}
            onPress={handleLogoPress}
          >
            <Image 
              source={actualThemeMode === 'light' 
                ? require('../../../assets/MDFitness_Logo.png')
                : require('../../../assets/MDFitness_Logo_Dark.png')
              } 
              style={styles.logoImage}
              resizeMode="cover"
            />
            {isAdminMode && (
              <Text style={[styles.adminText, { color: theme.colors.primary }]}>
                ADMIN
              </Text>
            )}
            {isTrainerMode && (
              <Text style={[styles.adminText, { color: theme.colors.primary }]}>
                TRAINER
              </Text>
            )}
          </TouchableOpacity>

                    <View style={[styles.formContainer, { backgroundColor: theme.colors.surface }]}>
            {isAdminMode ? (
              // Admin code input
              <View style={[styles.inputContainer, { 
                borderColor: theme.colors.border, 
                backgroundColor: theme.colors.background 
              }]}>
                <TextInput
                  style={[styles.input, { color: theme.colors.text }]}
                  placeholder="Enter Admin Code"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={adminCode}
                  onChangeText={setAdminCode}
                  keyboardType="numeric"
                  maxLength={6}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            ) : isTrainerMode ? (
              // Trainer code input
              <View style={[styles.inputContainer, { 
                borderColor: theme.colors.border, 
                backgroundColor: theme.colors.background 
              }]}>
                <TextInput
                  style={[styles.input, { color: theme.colors.text }]}
                  placeholder="Enter Trainer Code"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={trainerCode}
                  onChangeText={setTrainerCode}
                  keyboardType="numeric"
                  maxLength={6}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            ) : (
              // Regular user login inputs
              <>
                <View style={[styles.inputContainer, { 
                  borderColor: theme.colors.border, 
                  backgroundColor: theme.colors.background 
                }]}>
                   <TextInput
                     style={[styles.input, { color: theme.colors.text }]}
                     placeholder="Email"
                     placeholderTextColor={theme.colors.textSecondary}
                     value={email}
                     onChangeText={setEmail}
                     keyboardType="email-address"
                     autoCapitalize="none"
                     autoCorrect={false}
                   />
                 </View>

                <View style={[styles.inputContainer, { 
                  borderColor: theme.colors.border, 
                  backgroundColor: theme.colors.background 
                }]}>
                   <TextInput
                     style={[styles.input, { color: theme.colors.text }]}
                     placeholder="Password"
                     placeholderTextColor={theme.colors.textSecondary}
                     value={password}
                     onChangeText={setPassword}
                     secureTextEntry={!showPassword}
                     autoCapitalize="none"
                   />
                   <TouchableOpacity
                     onPress={() => setShowPassword(!showPassword)}
                     style={styles.eyeIcon}
                   >
                     <Ionicons
                       name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                       size={20}
                       color={theme.colors.textSecondary}
                     />
                   </TouchableOpacity>
                 </View>
              </>
            )}

            <TouchableOpacity 
              style={styles.forgotPassword}
              onPress={() => navigation.navigate('ForgotPassword')}
            >
              <Text style={[styles.forgotPasswordText, { color: theme.colors.textSecondary }]}>
                Forgot Password?
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.loginButtonText}>
                  {isAdminMode ? 'Access Admin Dashboard' : isTrainerMode ? 'Access Trainer Dashboard' : 'Sign In'}
                </Text>
              )}
            </TouchableOpacity>

            {!isAdminMode && !isTrainerMode ? (
              <>
                <View style={styles.dividerContainer}>
                  <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
                  <Text style={[styles.dividerText, { color: theme.colors.textSecondary }]}>OR</Text>
                  <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
                </View>

                <View style={styles.newUserSection}>
                  <Text style={[styles.newUserText, { color: theme.colors.textSecondary }]}>
                    New here and looking to sign up?
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.registerButton, { borderColor: theme.colors.textSecondary }]}
                  onPress={() => navigation.navigate('Plans')}
                >
                  <Text style={[styles.registerButtonText, { color: theme.colors.textSecondary }]}>
                    View Plans
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={[styles.registerButton, { borderColor: theme.colors.textSecondary }]}
                onPress={handleReturnToUserMode}
              >
                <Text style={[styles.registerButtonText, { color: theme.colors.textSecondary }]}>
                  Return to User Login
                </Text>
              </TouchableOpacity>
            )}

            {statusMessage ? (
              <View style={styles.statusContainer}>
                <Text style={styles.statusText}>{statusMessage}</Text>
              </View>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 64,
  },
  logoImage: {
    width: 200,
    height: 200,
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    color: 'white',
    opacity: 0.8,
    marginTop: 8,
  },
  formContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
     input: {
     flex: 1,
     paddingVertical: 16,
     paddingHorizontal: 16,
     fontSize: 16,
     fontFamily: 'System',
   },
  eyeIcon: {
    padding: 8,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    color: '#666666',
    fontSize: 14,
    fontWeight: '500',
  },
  loginButton: {
    backgroundColor: '#808080',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  divider: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
  },
  registerButton: {
    borderWidth: 1,
    borderColor: '#666666',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  registerButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },

  newUserSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  newUserText: {
    fontSize: 16,
    textAlign: 'center',
  },
  adminText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 8,
    textAlign: 'center',
  },
  statusContainer: {
    backgroundColor: '#28A745',
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginTop: 16,
    alignItems: 'center',
  },
  statusText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default LoginScreen;

