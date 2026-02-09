// Macro calculation utilities
// Reusable functions for calculating and adjusting macros

export type ActivityType = 'cardio' | 'weight' | 'mix' | 'rest';
export type Gender = 'male' | 'female' | 'other';
export type FitnessGoal = 'weight_loss' | 'maintain' | 'muscle_gain';

export interface BaseMacros {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
  fiber_g: number;
}

/**
 * Calculate base macros using Mifflin-St Jeor equation
 * This is the baseline that gets stored in macro_goals
 */
export const calculateBaseMacros = (
  weight: number,
  height: number,
  age: number,
  gender: Gender,
  goal: FitnessGoal
): BaseMacros => {
  // Calculate BMR using Mifflin-St Jeor equation
  let bmr: number;
  if (gender === 'male') {
    bmr = 10 * weight + 6.25 * height - 5 * age + 5;
  } else if (gender === 'female') {
    bmr = 10 * weight + 6.25 * height - 5 * age - 161;
  } else {
    // For 'other', use average of male and female
    bmr = 10 * weight + 6.25 * height - 5 * age - 78;
  }

  // Apply activity factor (1.4 for moderate activity - can be adjusted)
  const activityFactor = 1.4;
  let maintenanceCalories = bmr * activityFactor;

  // Adjust calories based on goal
  let targetCalories: number;
  if (goal === 'weight_loss') {
    targetCalories = maintenanceCalories - 500; // 500 calorie deficit
  } else if (goal === 'muscle_gain') {
    targetCalories = maintenanceCalories + 300; // 300 calorie surplus
  } else {
    targetCalories = maintenanceCalories; // Maintain
  }

  // Calculate macros based on goal
  let proteinPercent: number;
  let carbsPercent: number;
  let fatPercent: number;

  if (goal === 'weight_loss') {
    proteinPercent = 0.40; // 40% protein
    carbsPercent = 0.30;   // 30% carbs
    fatPercent = 0.30;      // 30% fat
  } else if (goal === 'muscle_gain') {
    proteinPercent = 0.35; // 35% protein
    carbsPercent = 0.35;   // 35% carbs
    fatPercent = 0.30;     // 30% fat
  } else {
    proteinPercent = 0.30; // 30% protein
    carbsPercent = 0.40;    // 40% carbs
    fatPercent = 0.30;      // 30% fat
  }

  // Calculate grams (protein and carbs = 4 cal/g, fat = 9 cal/g)
  const proteinG = Math.round((targetCalories * proteinPercent) / 4);
  const carbsG = Math.round((targetCalories * carbsPercent) / 4);
  const fatsG = Math.round((targetCalories * fatPercent) / 9);
  
  // Calculate fiber (recommended: 25-30g per day for adults, or ~14g per 1000 calories)
  const fiberG = Math.round((targetCalories / 1000) * 14);

  return {
    calories: Math.round(targetCalories),
    protein_g: proteinG,
    carbs_g: carbsG,
    fats_g: fatsG,
    fiber_g: fiberG,
  };
};

/**
 * Adjust base macros based on daily activity type
 * Returns adjusted macros for the selected activity
 */
export const adjustMacrosForActivity = (
  baseMacros: BaseMacros,
  activityType: ActivityType
): BaseMacros => {
  let caloriesMultiplier = 1;
  let proteinMultiplier = 1;
  let carbsMultiplier = 1;
  let fatsMultiplier = 1;

  switch (activityType) {
    case 'cardio':
      // Cardio: Increase carbs for energy, moderate protein increase
      caloriesMultiplier = 1.05;  // +5% calories
      proteinMultiplier = 1.10;   // +10% protein
      carbsMultiplier = 1.20;     // +20% carbs
      fatsMultiplier = 1.0;       // Maintain fats
      break;

    case 'weight':
      // Weight training: Increase protein significantly, moderate carbs
      caloriesMultiplier = 1.05;  // +5% calories
      proteinMultiplier = 1.25;   // +25% protein
      carbsMultiplier = 1.10;     // +10% carbs
      fatsMultiplier = 1.0;       // Maintain fats
      break;

    case 'mix':
      // Mixed workout: Balanced increase across all macros
      caloriesMultiplier = 1.10;  // +10% calories
      proteinMultiplier = 1.15;   // +15% protein
      carbsMultiplier = 1.15;     // +15% carbs
      fatsMultiplier = 1.05;      // +5% fats
      break;

    case 'rest':
      // Rest day: Reduce calories and carbs, maintain protein
      caloriesMultiplier = 0.90;  // -10% calories
      proteinMultiplier = 1.0;    // Maintain protein
      carbsMultiplier = 0.85;     // -15% carbs
      fatsMultiplier = 0.95;      // -5% fats
      break;
  }

  return {
    calories: Math.round(baseMacros.calories * caloriesMultiplier),
    protein_g: Math.round(baseMacros.protein_g * proteinMultiplier),
    carbs_g: Math.round(baseMacros.carbs_g * carbsMultiplier),
    fats_g: Math.round(baseMacros.fats_g * fatsMultiplier),
    fiber_g: baseMacros.fiber_g, // Fiber stays the same
  };
};


