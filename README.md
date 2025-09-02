# MD Fitness Mobile App

A comprehensive mobile application for gym management, built with Expo React Native and Supabase.

## Features

- **User Authentication**: Sign up, sign in, and sign out functionality
- **Class Booking**: Browse and book fitness classes
- **Nutrition Tracking**: Log meals and track nutrition
- **Progress Tracking**: Monitor fitness progress and goals
- **Workout Management**: Record and track workouts
- **Profile Management**: User profiles and settings

## Tech Stack

- **Frontend**: Expo React Native with TypeScript
- **Backend**: Supabase (PostgreSQL + Auth + REST API)
- **Navigation**: React Navigation (Stack + Bottom Tabs)
- **UI Components**: Expo Vector Icons, Linear Gradient
- **State Management**: React Hooks
- **HTTP Client**: Axios

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Expo CLI (`npm install -g @expo/cli`)
- Expo Go app on your mobile device
- Supabase account

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd MD-Fitness-Mobile
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Supabase**
   - Create a new Supabase project
   - Copy your project URL and anon key
   - Update `src/config/supabase.ts` with your credentials
   - Run the database schema in Supabase SQL Editor

4. **Start the development server**
   ```bash
   npm start
   ```

5. **Run on your device**
   - Scan the QR code with Expo Go (iOS/Android)
   - Or press 'a' for Android emulator or 'i' for iOS simulator

## Supabase Setup

### 1. Database Schema
Run the complete `database-schema.sql` file in your Supabase SQL Editor. This will create:
- All necessary tables (profiles, classes, bookings, etc.)
- Row Level Security (RLS) policies
- Indexes for performance
- Sample data for testing

### 2. Authentication
The app uses Supabase Auth with email/password authentication. Features include:
- User registration with email verification
- Secure login/logout
- Automatic profile creation on signup
- Session management

### 3. API Configuration
The app is configured to use Supabase's REST API for compatibility with Expo Go.

## Testing Authentication

### Registration Flow
1. Open the app and tap "Create Account"
2. Fill in all required fields:
   - First Name
   - Last Name
   - Email (must be valid format)
   - Password (minimum 6 characters)
   - Confirm Password
3. Tap "Create Account"
4. You should see a success message and be automatically logged in
5. The app will navigate to the main dashboard

### Login Flow
1. Open the app and tap "Sign In"
2. Enter your email and password
3. Tap "Sign In"
4. You should be logged in and see the main dashboard

### Troubleshooting

#### Common Issues:
- **"An account with this email already exists"**: Try using a different email address
- **"Invalid email or password"**: Double-check your credentials
- **"User profile not found"**: This may indicate a database issue - check that the database schema has been applied

#### Debug Information:
- Check the console logs for detailed error messages
- The app includes console logging for authentication events
- Look for messages like "Login successful", "Registration successful", etc.

#### Database Setup:
Make sure you have run the database schema in your Supabase project:
1. Go to your Supabase dashboard
2. Navigate to the SQL Editor
3. Run the contents of `database-schema.sql`
4. Verify that all tables and RLS policies are created

### Expected Behavior:
- ✅ Registration creates account and automatically logs in
- ✅ Login validates credentials and navigates to dashboard
- ✅ Logout clears session and returns to auth screens
- ✅ Loading indicators show during authentication
- ✅ Clear error messages for validation failures
- ✅ Proper navigation between auth and main app

## Project Structure

```
src/
├── config/
│   └── supabase.ts          # Supabase configuration
├── screens/
│   ├── auth/
│   │   ├── LoginScreen.tsx
│   │   └── RegisterScreen.tsx
│   └── main/
│       ├── DashboardScreen.tsx
│       ├── ClassesScreen.tsx
│       ├── NutritionScreen.tsx
│       ├── ProgressScreen.tsx
│       └── ProfileScreen.tsx
├── services/
│   └── api.ts               # API service functions
├── theme/
│   └── index.ts             # App theme configuration
└── types/
    └── index.ts             # TypeScript type definitions
```

## Available Scripts

- `npm start` - Start the Expo development server
- `npm run android` - Run on Android emulator
- `npm run ios` - Run on iOS simulator
- `npm run web` - Run in web browser

## Development Guidelines

### Code Style
- Use TypeScript for type safety
- Follow React Native best practices
- Use functional components with hooks
- Implement proper error handling

### State Management
- Use React hooks for local state
- Keep authentication state in App.tsx
- Use context for global state if needed

### API Calls
- All API calls are centralized in `src/services/api.ts`
- Use proper error handling and loading states
- Implement retry logic for failed requests

## Deployment

### Expo Build
1. Configure app.json with your app details
2. Run `expo build:android` or `expo build:ios`
3. Follow the build process instructions

### App Store Deployment
1. Create app store listings
2. Submit builds for review
3. Configure production Supabase environment

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support, please contact the development team or create an issue in the repository.

## Roadmap

- [ ] Implement class booking functionality
- [ ] Add nutrition tracking features
- [ ] Implement progress tracking
- [ ] Add push notifications
- [ ] Integrate with wearable devices
- [ ] Add social features
- [ ] Implement ShapeMyPlan integration
- [ ] Add offline support
- [ ] Implement data export/import
- [ ] Add advanced analytics

