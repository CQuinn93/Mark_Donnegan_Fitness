import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import Ionicons from '@expo/vector-icons/Ionicons';
import { RootStackParamList } from '../../types';
import theme from '../../theme';

type PlansScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Plans'>;

interface Props {
  navigation: PlansScreenNavigationProp;
}

interface Plan {
  id: string;
  name: string;
  price: string;
  duration: string;
  features: string[];
  popular?: boolean;
}

const plans: Plan[] = [
  {
    id: '1',
    name: 'Basic Plan',
    price: '$49',
    duration: 'per month',
    features: [
      'Access to gym facilities',
      'Basic equipment usage',
      'Locker room access',
      'Free parking'
    ]
  },
  {
    id: '2',
    name: 'Premium Plan',
    price: '$89',
    duration: 'per month',
    features: [
      'All Basic Plan features',
      'Group fitness classes',
      'Personal training session (1/month)',
      'Nutrition consultation',
      'Progress tracking app access'
    ],
    popular: true
  },
  {
    id: '3',
    name: 'Elite Plan',
    price: '$149',
    duration: 'per month',
    features: [
      'All Premium Plan features',
      'Unlimited personal training',
      'Custom workout plans',
      'Nutrition meal plans',
      'Priority booking for classes',
      '24/7 gym access'
    ]
  }
];

const PlansScreen: React.FC<Props> = ({ navigation }) => {
  const handleContactMark = () => {
    // This could open email, phone, or a contact form
    // For now, we'll just show an alert
    alert('Please contact Mark directly to discuss membership options and get verified access.');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
                 <TouchableOpacity
           style={styles.backButton}
           onPress={() => navigation.goBack()}
         >
           <Ionicons name="chevron-back" size={24} color="#333" />
         </TouchableOpacity>
        <Text style={styles.headerTitle}>Membership Plans</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.introSection}>
          <Text style={styles.introTitle}>Choose Your Fitness Journey</Text>
          <Text style={styles.introText}>
            All memberships require verification by Mark before access is granted. 
            Contact Mark directly to discuss your fitness goals and get started.
          </Text>
        </View>

        {plans.map((plan) => (
          <View key={plan.id} style={[styles.planCard, plan.popular && styles.popularPlan]}>
            {plan.popular && (
              <View style={styles.popularBadge}>
                <Text style={styles.popularText}>Most Popular</Text>
              </View>
            )}
            
            <Text style={styles.planName}>{plan.name}</Text>
            <View style={styles.priceContainer}>
              <Text style={styles.price}>{plan.price}</Text>
              <Text style={styles.duration}>{plan.duration}</Text>
            </View>

            <View style={styles.featuresList}>
              {plan.features.map((feature, index) => (
                                 <View key={index} style={styles.featureItem}>
                   <Ionicons name="checkmark" size={20} color="#4CAF50" />
                   <Text style={styles.featureText}>{feature}</Text>
                 </View>
              ))}
            </View>
          </View>
        ))}

        <View style={styles.contactSection}>
          <Text style={styles.contactTitle}>Ready to Get Started?</Text>
          <Text style={styles.contactText}>
            Contact Mark directly to discuss your fitness goals and get verified access to the gym.
          </Text>
          <TouchableOpacity style={styles.contactButton} onPress={handleContactMark}>
            <Text style={styles.contactButtonText}>Contact Mark</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  introSection: {
    marginBottom: 30,
    alignItems: 'center',
  },
  introTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  introText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  planCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  popularPlan: {
    borderColor: '#4CAF50',
    borderWidth: 2,
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    right: 20,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  planName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 20,
  },
  price: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
  },
  duration: {
    fontSize: 16,
    color: '#666',
    marginLeft: 5,
  },
  featuresList: {
    marginTop: 10,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 10,
    flex: 1,
  },
  contactSection: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 20,
    marginTop: 20,
    alignItems: 'center',
  },
  contactTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  contactText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  contactButton: {
    backgroundColor: '#666666',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
  },
  contactButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default PlansScreen;
