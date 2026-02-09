import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { User } from '../../types';

interface Props {
  navigation: any;
  route: { params: { user: User; onComplete: () => void } };
}

const WelcomeScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme, actualThemeMode } = useTheme();
  const { user, onComplete } = route.params;
  const [currentPage, setCurrentPage] = useState(0);

  const features = [
    {
      icon: 'calendar',
      title: 'Book Classes',
      description: 'View and book fitness classes that fit your schedule. Cancel anytime.',
    },
    {
      icon: 'nutrition',
      title: 'Track Macros',
      description: 'Monitor your daily nutrition goals and adjust based on your activity level.',
    },
    {
      icon: 'barbell',
      title: 'Activity-Based Goals',
      description: 'Your macro goals automatically adjust based on whether you\'re doing cardio, weight training, or resting.',
    },
    {
      icon: 'person',
      title: 'Profile & Settings',
      description: 'Update your information and change your password anytime in Settings.',
    },
  ];

  const handleGetStarted = () => {
    if (onComplete) {
      onComplete();
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.content}>
          {/* Logo */}
          <Image
            source={actualThemeMode === 'light'
              ? require('../../../assets/MDFitness_Logo.png')
              : require('../../../assets/MDFitness_Logo_Dark.png')
            }
            style={styles.logo}
            resizeMode="contain"
          />

          {/* Welcome Message */}
          {currentPage === 0 && (
            <View style={styles.welcomeSection}>
              <Text style={[styles.welcomeTitle, { color: theme.colors.text }]}>
                Welcome, {user.first_name}!
              </Text>
              <Text style={[styles.welcomeSubtitle, { color: theme.colors.textSecondary }]}>
                Let's explore what you can do with Mark Donnegan Fitness
              </Text>
            </View>
          )}

          {/* Feature Card */}
          <View style={[styles.featureCard, { backgroundColor: theme.colors.surface }]}>
            <View style={[styles.iconContainer, { backgroundColor: theme.colors.primary }]}>
              <Ionicons name={features[currentPage].icon as any} size={48} color={theme.colors.background} />
            </View>
            <Text style={[styles.featureTitle, { color: theme.colors.text }]}>
              {features[currentPage].title}
            </Text>
            <Text style={[styles.featureDescription, { color: theme.colors.textSecondary }]}>
              {features[currentPage].description}
            </Text>
          </View>

          {/* Password Reset Info (only on last page) */}
          {currentPage === features.length - 1 && (
            <View style={[styles.infoBox, { backgroundColor: theme.colors.surface }]}>
              <Ionicons name="information-circle" size={24} color={theme.colors.info} />
              <Text style={[styles.infoText, { color: theme.colors.text }]}>
                You can change your password anytime in Settings from your Profile screen.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Pagination Dots */}
      <View style={styles.pagination}>
        {features.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              {
                backgroundColor: currentPage === index ? theme.colors.primary : theme.colors.border,
              },
            ]}
          />
        ))}
      </View>

      {/* Navigation Buttons */}
      <View style={styles.navigation}>
        {currentPage > 0 && (
          <TouchableOpacity
            style={[styles.navButton, { backgroundColor: theme.colors.surface }]}
            onPress={() => {
              setCurrentPage(currentPage - 1);
            }}
          >
            <Ionicons name="chevron-back" size={20} color={theme.colors.text} />
            <Text style={[styles.navButtonText, { color: theme.colors.text }]}>Previous</Text>
          </TouchableOpacity>
        )}

        {currentPage < features.length - 1 ? (
          <TouchableOpacity
            style={[styles.navButton, styles.navButtonPrimary, { backgroundColor: theme.colors.primary }]}
            onPress={() => {
              setCurrentPage(currentPage + 1);
            }}
          >
            <Text style={[styles.navButtonText, { color: theme.colors.background }]}>Next</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.background} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.navButton, styles.navButtonPrimary, { backgroundColor: theme.colors.primary }]}
            onPress={handleGetStarted}
          >
            <Text style={[styles.navButtonText, { color: theme.colors.background }]}>Get Started</Text>
            <Ionicons name="checkmark-circle" size={20} color={theme.colors.background} />
          </TouchableOpacity>
        )}
      </View>
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
    flexGrow: 1,
  },
  page: {
    width: '100%',
    flex: 1,
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 200,
    height: 100,
    marginBottom: 32,
  },
  welcomeSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  featureCard: {
    width: '100%',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  featureTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  featureDescription: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  infoBox: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    alignItems: 'flex-start',
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    gap: 12,
  },
  navButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    gap: 8,
  },
  navButtonPrimary: {
    flex: 2,
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default WelcomeScreen;

