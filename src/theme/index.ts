import { Theme } from '../types';

export const lightTheme: Theme = {
  colors: {
    primary: '#808080', // Grey - MD Fitness brand color
    secondary: '#333333', // Dark grey
    background: '#FFFFFF', // White background
    surface: '#F8F9FA', // Light grey surface
    text: '#000000', // Black text
    textSecondary: '#808080', // Grey secondary text
    border: '#E0E0E0', // Light grey border
    success: '#4CAF50',
    error: '#DC3545',
    warning: '#FF9800',
    info: '#2196F3',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
  },
  typography: {
    h1: {
      fontSize: 32,
      fontWeight: 'bold',
    },
    h2: {
      fontSize: 24,
      fontWeight: 'bold',
    },
    h3: {
      fontSize: 20,
      fontWeight: '600',
    },
    body: {
      fontSize: 16,
      fontWeight: 'normal',
    },
    caption: {
      fontSize: 14,
      fontWeight: 'normal',
    },
  },
};

export const darkTheme: Theme = {
  colors: {
    primary: '#808080', // Grey - MD Fitness brand color
    secondary: '#B0B0B0', // Light grey
    background: '#000000', // Pure black background
    surface: '#1A1A1A', // Dark grey surface
    text: '#FFFFFF', // White text
    textSecondary: '#808080', // Grey secondary text
    border: '#333333', // Dark grey border
    success: '#4CAF50',
    error: '#F44336',
    warning: '#FF9800',
    info: '#2196F3',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
  },
  typography: {
    h1: {
      fontSize: 32,
      fontWeight: 'bold',
    },
    h2: {
      fontSize: 24,
      fontWeight: 'bold',
    },
    h3: {
      fontSize: 20,
      fontWeight: '600',
    },
    body: {
      fontSize: 16,
      fontWeight: 'normal',
    },
    caption: {
      fontSize: 14,
      fontWeight: 'normal',
    },
  },
};

export default lightTheme;


