import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { classService, trainerService, scheduleService, userService } from '../services/api';
import { User } from '../types';

interface Class {
  id: string;
  name: string;
  description: string;
  duration: number;
  max_members: number;
}

interface Trainer {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
}

interface ScheduledClass {
  id: string;
  class_id: string;
  trainer_id: string;
  scheduled_date: string;
  scheduled_time: string;
  difficulty_level: string;
  location: string;
  current_bookings: number;
  max_bookings: number;
  status: string;
  is_recurring: boolean;
  classes?: {
    name: string;
  };
  profiles?: {
    first_name: string;
    last_name: string;
  };
}

interface AdminDataContextType {
  // Data
  classes: Class[];
  trainers: Trainer[];
  scheduledClasses: ScheduledClass[];
  users: User[];
  
  // Loading states
  loading: boolean;
  error: string | null;
  
  // Actions
  loadAllData: (forceRefresh?: boolean) => Promise<void>;
  refreshUsers: () => Promise<void>;
  refreshTrainers: () => Promise<void>;
  addUser: (newUser: User) => void;
  addTrainer: (newTrainer: Trainer) => void;
  addScheduledClass: (newClass: ScheduledClass) => void;
  removeScheduledClass: (classId: string) => void;
  updateScheduledClass: (classId: string, updatedClass: Partial<ScheduledClass>) => void;
  refreshScheduledClasses: () => Promise<void>;
  invalidateCache: () => Promise<void>; // Clear all cached data
}

const AdminDataContext = createContext<AdminDataContextType | undefined>(undefined);

interface AdminDataProviderProps {
  children: ReactNode;
}

// Cache keys
const CACHE_KEYS = {
  classes: 'admin_cache_classes',
  trainers: 'admin_cache_trainers',
  scheduledClasses: 'admin_cache_scheduled_classes',
  users: 'admin_cache_users',
  cacheTimestamps: 'admin_cache_timestamps',
};

// Cache expiration times (in milliseconds)
const CACHE_EXPIRY = {
  classes: 24 * 60 * 60 * 1000,      // 24 hours (very static)
  trainers: 24 * 60 * 60 * 1000,     // 24 hours (very static)
  users: 60 * 60 * 1000,             // 1 hour (can change when admin adds members)
  scheduledClasses: 5 * 60 * 1000,   // 5 minutes (bookings can change)
};

export const AdminDataProvider: React.FC<AdminDataProviderProps> = ({ children }) => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [scheduledClasses, setScheduledClasses] = useState<ScheduledClass[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load data from cache
  const loadFromCache = async (key: string): Promise<any> => {
    try {
      const cached = await AsyncStorage.getItem(key);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.error(`Error loading cache for ${key}:`, error);
    }
    return null;
  };

  // Save data to cache
  const saveToCache = async (key: string, data: any): Promise<void> => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(data));
      // Update timestamp
      const timestamps = await loadFromCache(CACHE_KEYS.cacheTimestamps) || {};
      timestamps[key] = Date.now();
      await AsyncStorage.setItem(CACHE_KEYS.cacheTimestamps, JSON.stringify(timestamps));
    } catch (error) {
      console.error(`Error saving cache for ${key}:`, error);
    }
  };

  // Check if cache is stale
  const isCacheStale = async (key: string, maxAge: number): Promise<boolean> => {
    try {
      const timestamps = await loadFromCache(CACHE_KEYS.cacheTimestamps) || {};
      const timestamp = timestamps[key];
      if (!timestamp) return true; // No cache exists
      return Date.now() - timestamp > maxAge;
    } catch (error) {
      return true; // If error, consider stale
    }
  };

  // Load initial data from cache on mount, then refresh if stale
  useEffect(() => {
    let isMounted = true;
    
    const loadInitialCache = async () => {
      try {
        // Load all data from cache first (instant UI)
        const [cachedClasses, cachedTrainers, cachedSchedules, cachedUsers] = await Promise.all([
          loadFromCache(CACHE_KEYS.classes),
          loadFromCache(CACHE_KEYS.trainers),
          loadFromCache(CACHE_KEYS.scheduledClasses),
          loadFromCache(CACHE_KEYS.users),
        ]);

        if (isMounted) {
          if (cachedClasses) setClasses(cachedClasses);
          if (cachedTrainers) setTrainers(cachedTrainers);
          if (cachedSchedules) setScheduledClasses(cachedSchedules);
          if (cachedUsers) setUsers(cachedUsers);
        }

        // Then refresh in background if cache is stale (non-blocking)
        // This will update cache and state if data has changed
        setTimeout(() => {
          if (isMounted) {
            loadAllData(false);
          }
        }, 500); // Small delay to let UI render cached data first
      } catch (error) {
        console.error('Error loading initial cache:', error);
        // If cache fails, load from API
        if (isMounted) {
          loadAllData(false);
        }
      }
    };

    loadInitialCache();
    
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  // Calculate reasonable date range: past 30 days to future 90 days
  const getDateRange = () => {
    const today = new Date();
    const pastDate = new Date(today);
    pastDate.setDate(today.getDate() - 30); // 30 days ago
    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + 90); // 90 days ahead
    
    return {
      startDate: pastDate.toISOString().split('T')[0],
      endDate: futureDate.toISOString().split('T')[0],
    };
  };

  const loadAllData = async (forceRefresh: boolean = false) => {
    // Check if we need to refresh each data type
    let shouldRefreshClasses = forceRefresh || await isCacheStale(CACHE_KEYS.classes, CACHE_EXPIRY.classes);
    let shouldRefreshTrainers = forceRefresh || await isCacheStale(CACHE_KEYS.trainers, CACHE_EXPIRY.trainers);
    const shouldRefreshSchedules = forceRefresh || await isCacheStale(CACHE_KEYS.scheduledClasses, CACHE_EXPIRY.scheduledClasses);
    let shouldRefreshUsers = forceRefresh || await isCacheStale(CACHE_KEYS.users, CACHE_EXPIRY.users);

    // Trainers: if cache is fresh, do a lightweight count check - only fetch if DB has more
    if (!shouldRefreshTrainers) {
      const cachedTrainers = await loadFromCache(CACHE_KEYS.trainers) || [];
      const countResult = await trainerService.getTrainerCount();
      if (!countResult.error && countResult.count > cachedTrainers.length) {
        shouldRefreshTrainers = true;
        console.log(`Trainer count check: DB has ${countResult.count}, cache has ${cachedTrainers.length} - fetching trainers`);
      }
    }

    // Users: same logic - only fetch if DB has more than cache
    if (!shouldRefreshUsers) {
      const cachedUsers = await loadFromCache(CACHE_KEYS.users) || [];
      const countResult = await userService.getUserCount();
      if (!countResult.error && countResult.count > cachedUsers.length) {
        shouldRefreshUsers = true;
        console.log(`User count check: DB has ${countResult.count}, cache has ${cachedUsers.length} - fetching users`);
      }
    }

    // Only show loading if we're actually fetching (not just using cache)
    if (shouldRefreshClasses || shouldRefreshTrainers || shouldRefreshSchedules || shouldRefreshUsers) {
      setLoading(true);
    }
    setError(null);
    
    try {
      const { startDate, endDate } = getDateRange();
      
      // Load data in parallel, but only fetch what's needed
      const promises: Promise<any>[] = [];
      
      if (shouldRefreshClasses) {
        promises.push(classService.getAllClasses().then(result => ({ type: 'classes', result })));
      }
      if (shouldRefreshTrainers) {
        promises.push(trainerService.getAllTrainers().then(result => ({ type: 'trainers', result })));
      }
      if (shouldRefreshSchedules) {
        promises.push(scheduleService.getScheduledClasses(startDate, endDate).then(result => ({ type: 'schedules', result })));
      }
      if (shouldRefreshUsers) {
        promises.push(userService.getAllUsers().then(result => ({ type: 'users', result })));
      }

      const results = await Promise.all(promises);

      // Process results and update cache
      for (const { type, result } of results) {
        if (type === 'classes') {
          if (result.error) {
            console.error('Error loading classes:', result.error);
            // Keep cached data if API fails
          } else {
            const classesData = result.classes || [];
            setClasses(classesData);
            await saveToCache(CACHE_KEYS.classes, classesData);
            console.log('Loaded and cached classes:', classesData.length);
          }
        } else if (type === 'trainers') {
          if (result.error) {
            console.error('Error loading trainers:', result.error);
          } else {
            const trainersData = result.trainers || [];
            setTrainers(trainersData);
            await saveToCache(CACHE_KEYS.trainers, trainersData);
            console.log('Loaded and cached trainers:', trainersData.length);
          }
        } else if (type === 'schedules') {
          if (result.error) {
            console.error('Error loading scheduled classes:', result.error);
          } else {
            const schedulesData = result.schedules || [];
            setScheduledClasses(schedulesData);
            await saveToCache(CACHE_KEYS.scheduledClasses, schedulesData);
            console.log('Loaded and cached scheduled classes:', schedulesData.length);
          }
        } else if (type === 'users') {
          if (result.error) {
            console.error('Error loading users:', result.error);
          } else {
            const usersData = result.users || [];
            setUsers(usersData);
            await saveToCache(CACHE_KEYS.users, usersData);
            console.log('Loaded and cached users:', usersData.length);
          }
        }
      }

      console.log('Admin data loading complete (used cache where appropriate)');
    } catch (err) {
      console.error('Error loading admin data:', err);
      setError('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const refreshUsers = async () => {
    try {
      const usersResult = await userService.getAllUsers();
      if (usersResult.error) {
        console.error('Error refreshing users:', usersResult.error);
      } else {
        const usersData = usersResult.users || [];
        setUsers(usersData);
        await saveToCache(CACHE_KEYS.users, usersData);
        console.log('Refreshed and cached users:', usersData.length);
      }
    } catch (err) {
      console.error('Error refreshing users:', err);
    }
  };

  const refreshTrainers = async () => {
    try {
      const trainersResult = await trainerService.getAllTrainers();
      if (trainersResult.error) {
        console.error('Error refreshing trainers:', trainersResult.error);
      } else {
        const trainersData = trainersResult.trainers || [];
        setTrainers(trainersData);
        await saveToCache(CACHE_KEYS.trainers, trainersData);
        console.log('Refreshed and cached trainers:', trainersData.length);
      }
    } catch (err) {
      console.error('Error refreshing trainers:', err);
    }
  };

  const addUser = (newUser: User) => {
    setUsers(prev => {
      if (prev.some(u => u.id === newUser.id)) return prev;
      const updated = [newUser, ...prev];
      saveToCache(CACHE_KEYS.users, updated);
      console.log('Added new user to cache:', newUser.id);
      return updated;
    });
  };

  const addTrainer = (newTrainer: Trainer) => {
    setTrainers(prev => {
      if (prev.some(t => t.id === newTrainer.id)) return prev;
      const updated = [...prev, newTrainer].sort((a, b) =>
        (a.first_name || '').localeCompare(b.first_name || '')
      );
      saveToCache(CACHE_KEYS.trainers, updated);
      console.log('Added new trainer to cache:', newTrainer.id);
      return updated;
    });
  };

  const addScheduledClass = async (newClass: ScheduledClass) => {
    setScheduledClasses(prev => {
      const updated = [...prev, newClass];
      // Update cache asynchronously
      saveToCache(CACHE_KEYS.scheduledClasses, updated);
      return updated;
    });
    console.log('Added new scheduled class to cache:', newClass.id);
  };

  const removeScheduledClass = async (classId: string) => {
    setScheduledClasses(prev => {
      const updated = prev.filter(cls => cls.id !== classId);
      // Update cache asynchronously
      saveToCache(CACHE_KEYS.scheduledClasses, updated);
      return updated;
    });
    console.log('Removed scheduled class from cache:', classId);
  };

  const updateScheduledClass = async (classId: string, updatedClass: Partial<ScheduledClass>) => {
    setScheduledClasses(prev => {
      const updated = prev.map(cls => 
        cls.id === classId ? { ...cls, ...updatedClass } : cls
      );
      // Update cache asynchronously
      saveToCache(CACHE_KEYS.scheduledClasses, updated);
      return updated;
    });
    console.log('Updated scheduled class in cache:', classId);
  };

  const refreshScheduledClasses = async () => {
    try {
      console.log('Refreshing scheduled classes...');
      const { startDate, endDate } = getDateRange();
      const result = await scheduleService.getScheduledClasses(startDate, endDate);
      
      if (result.error) {
        console.error('Error refreshing scheduled classes:', result.error);
      } else {
        const schedulesData = result.schedules || [];
        setScheduledClasses(schedulesData);
        await saveToCache(CACHE_KEYS.scheduledClasses, schedulesData);
        console.log('Refreshed and cached scheduled classes:', schedulesData.length);
      }
    } catch (err) {
      console.error('Error refreshing scheduled classes:', err);
    }
  };

  // Clear all cached data (useful for logout or manual refresh)
  const invalidateCache = async () => {
    try {
      await Promise.all([
        AsyncStorage.removeItem(CACHE_KEYS.classes),
        AsyncStorage.removeItem(CACHE_KEYS.trainers),
        AsyncStorage.removeItem(CACHE_KEYS.scheduledClasses),
        AsyncStorage.removeItem(CACHE_KEYS.users),
        AsyncStorage.removeItem(CACHE_KEYS.cacheTimestamps),
      ]);
      console.log('Cache invalidated');
    } catch (error) {
      console.error('Error invalidating cache:', error);
    }
  };

  const value: AdminDataContextType = {
    classes,
    trainers,
    scheduledClasses,
    users,
    loading,
    error,
    loadAllData,
    refreshUsers,
    refreshTrainers,
    addUser,
    addTrainer,
    addScheduledClass,
    removeScheduledClass,
    updateScheduledClass,
    refreshScheduledClasses,
    invalidateCache,
  };

  return (
    <AdminDataContext.Provider value={value}>
      {children}
    </AdminDataContext.Provider>
  );
};

export const useAdminData = (): AdminDataContextType => {
  const context = useContext(AdminDataContext);
  if (context === undefined) {
    throw new Error('useAdminData must be used within an AdminDataProvider');
  }
  return context;
};
