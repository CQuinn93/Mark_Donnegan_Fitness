import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import theme from '../../theme';

const DashboardScreen: React.FC = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    upcomingClasses: 2,
    totalWorkouts: 15,
    caloriesToday: 1200,
    weightProgress: -2.5,
  });

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    // Simulate data refresh
    setTimeout(() => {
      setRefreshing(false);
    }, 2000);
  }, []);

  const StatCard = ({ title, value, subtitle, icon, color }: any) => (
    <View style={styles.statCard}>
      <LinearGradient
        colors={[color, color + '80']}
        style={styles.statCardGradient}
      >
        <View style={styles.statCardContent}>
          <View style={styles.statCardHeader}>
            <Ionicons name={icon} size={24} color="white" />
            <Text style={styles.statCardTitle}>{title}</Text>
          </View>
          <Text style={styles.statCardValue}>{value}</Text>
          {subtitle && <Text style={styles.statCardSubtitle}>{subtitle}</Text>}
        </View>
      </LinearGradient>
    </View>
  );

  const QuickActionCard = ({ title, subtitle, icon, onPress }: any) => (
    <TouchableOpacity style={styles.quickActionCard} onPress={onPress}>
      <View style={styles.quickActionContent}>
        <Ionicons name={icon} size={32} color={theme.colors.primary} />
        <Text style={styles.quickActionTitle}>{title}</Text>
        <Text style={styles.quickActionSubtitle}>{subtitle}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Welcome Section */}
      <View style={styles.welcomeSection}>
        <LinearGradient
          colors={[theme.colors.primary, theme.colors.secondary]}
          style={styles.welcomeGradient}
        >
          <View style={styles.welcomeContent}>
            <Text style={styles.welcomeText}>Welcome back!</Text>
            <Text style={styles.welcomeSubtext}>Ready for your next workout?</Text>
          </View>
          <Image 
            source={require('../../../assets/MDFitness_Logo.png')} 
            style={styles.logoImage}
            resizeMode="contain"
          />
        </LinearGradient>
      </View>

      {/* Stats Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Today's Overview</Text>
        <View style={styles.statsGrid}>
          <StatCard
            title="Upcoming Classes"
            value={stats.upcomingClasses}
            subtitle="This week"
            icon="calendar-outline"
            color="#FF6B35"
          />
          <StatCard
            title="Total Workouts"
            value={stats.totalWorkouts}
            subtitle="This month"
            icon="barbell-outline"
            color="#4ECDC4"
          />
          <StatCard
            title="Calories"
            value={stats.caloriesToday}
            subtitle="Today"
            icon="flame-outline"
            color="#FFE66D"
          />
          <StatCard
            title="Weight Progress"
            value={`${stats.weightProgress > 0 ? '+' : ''}${stats.weightProgress}kg`}
            subtitle="This month"
            icon="trending-up-outline"
            color={stats.weightProgress > 0 ? "#FF6B6B" : "#51CF66"}
          />
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActionsGrid}>
          <QuickActionCard
            title="Book Class"
            subtitle="Find and book your next class"
            icon="calendar-outline"
            onPress={() => console.log('Book Class')}
          />
          <QuickActionCard
            title="Log Meal"
            subtitle="Track your nutrition"
            icon="restaurant-outline"
            onPress={() => console.log('Log Meal')}
          />
          <QuickActionCard
            title="Add Progress"
            subtitle="Record your measurements"
            icon="add-circle-outline"
            onPress={() => console.log('Add Progress')}
          />
          <QuickActionCard
            title="View Goals"
            subtitle="Check your progress"
            icon="flag-outline"
            onPress={() => console.log('View Goals')}
          />
        </View>
      </View>

      {/* Recent Activity */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <View style={styles.activityList}>
          <View style={styles.activityItem}>
            <View style={styles.activityIcon}>
              <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>Completed Yoga Class</Text>
              <Text style={styles.activitySubtitle}>2 hours ago</Text>
            </View>
          </View>
          <View style={styles.activityItem}>
            <View style={styles.activityIcon}>
              <Ionicons name="restaurant" size={20} color={theme.colors.info} />
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>Logged Lunch</Text>
              <Text style={styles.activitySubtitle}>4 hours ago</Text>
            </View>
          </View>
          <View style={styles.activityItem}>
            <View style={styles.activityIcon}>
              <Ionicons name="trending-up" size={20} color={theme.colors.warning} />
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>Updated Weight</Text>
              <Text style={styles.activitySubtitle}>Yesterday</Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  welcomeSection: {
    marginBottom: theme.spacing.lg,
  },
  welcomeGradient: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    marginHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
  },
  welcomeContent: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: theme.spacing.xs,
  },
  welcomeSubtext: {
    fontSize: 16,
    color: 'white',
    opacity: 0.9,
  },
  logoImage: {
    width: 80,
    height: 80,
  },
  section: {
    marginBottom: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    marginBottom: theme.spacing.md,
  },
  statCardGradient: {
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
  },
  statCardContent: {
    alignItems: 'center',
  },
  statCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  statCardTitle: {
    fontSize: 12,
    color: 'white',
    marginLeft: theme.spacing.xs,
    fontWeight: '500',
  },
  statCardValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: theme.spacing.xs,
  },
  statCardSubtitle: {
    fontSize: 10,
    color: 'white',
    opacity: 0.8,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionCard: {
    width: '48%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  quickActionContent: {
    alignItems: 'center',
  },
  quickActionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
  },
  quickActionSubtitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
    textAlign: 'center',
  },
  activityList: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  activityIcon: {
    marginRight: theme.spacing.md,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
  },
  activitySubtitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
});

export default DashboardScreen;

