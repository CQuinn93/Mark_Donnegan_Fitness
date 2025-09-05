import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { classService, trainerService, scheduleService } from '../services/api';

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
  
  // Loading states
  loading: boolean;
  error: string | null;
  
  // Actions
  loadAllData: () => Promise<void>;
  addScheduledClass: (newClass: ScheduledClass) => void;
  removeScheduledClass: (classId: string) => void;
  updateScheduledClass: (classId: string, updatedClass: Partial<ScheduledClass>) => void;
  refreshScheduledClasses: () => Promise<void>;
}

const AdminDataContext = createContext<AdminDataContextType | undefined>(undefined);

interface AdminDataProviderProps {
  children: ReactNode;
}

export const AdminDataProvider: React.FC<AdminDataProviderProps> = ({ children }) => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [scheduledClasses, setScheduledClasses] = useState<ScheduledClass[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAllData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Loading all admin data...');
      
      // Load all data in parallel for better performance
      const [classesResult, trainersResult, schedulesResult] = await Promise.all([
        classService.getAllClasses(),
        trainerService.getAllTrainers(),
        scheduleService.getScheduledClasses('2020-01-01', '2030-12-31') // Wide range to get all
      ]);

      // Handle classes
      if (classesResult.error) {
        console.error('Error loading classes:', classesResult.error);
        setClasses([]);
      } else {
        setClasses(classesResult.classes || []);
        console.log('Loaded classes:', classesResult.classes?.length || 0);
      }

      // Handle trainers
      if (trainersResult.error) {
        console.error('Error loading trainers:', trainersResult.error);
        setTrainers([]);
      } else {
        setTrainers(trainersResult.trainers || []);
        console.log('Loaded trainers:', trainersResult.trainers?.length || 0);
      }

      // Handle scheduled classes
      if (schedulesResult.error) {
        console.error('Error loading scheduled classes:', schedulesResult.error);
        setScheduledClasses([]);
      } else {
        setScheduledClasses(schedulesResult.schedules || []);
        console.log('Loaded scheduled classes:', schedulesResult.schedules?.length || 0);
      }

      console.log('All admin data loaded successfully');
    } catch (err) {
      console.error('Error loading admin data:', err);
      setError('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const addScheduledClass = (newClass: ScheduledClass) => {
    setScheduledClasses(prev => [...prev, newClass]);
    console.log('Added new scheduled class to cache:', newClass.id);
  };

  const removeScheduledClass = (classId: string) => {
    setScheduledClasses(prev => prev.filter(cls => cls.id !== classId));
    console.log('Removed scheduled class from cache:', classId);
  };

  const updateScheduledClass = (classId: string, updatedClass: Partial<ScheduledClass>) => {
    setScheduledClasses(prev => 
      prev.map(cls => 
        cls.id === classId ? { ...cls, ...updatedClass } : cls
      )
    );
    console.log('Updated scheduled class in cache:', classId);
  };

  const refreshScheduledClasses = async () => {
    try {
      console.log('Refreshing scheduled classes...');
      const result = await scheduleService.getScheduledClasses('2020-01-01', '2030-12-31');
      
      if (result.error) {
        console.error('Error refreshing scheduled classes:', result.error);
      } else {
        setScheduledClasses(result.schedules || []);
        console.log('Refreshed scheduled classes:', result.schedules?.length || 0);
      }
    } catch (err) {
      console.error('Error refreshing scheduled classes:', err);
    }
  };

  const value: AdminDataContextType = {
    classes,
    trainers,
    scheduledClasses,
    loading,
    error,
    loadAllData,
    addScheduledClass,
    removeScheduledClass,
    updateScheduledClass,
    refreshScheduledClasses,
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
