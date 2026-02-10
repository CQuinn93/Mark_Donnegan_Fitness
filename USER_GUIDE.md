# MD Fitness Mobile – User Guide & Test Instructions

This guide helps reviewers and testers explore all app features. It includes test account credentials and step-by-step instructions for Admin, Trainer, and Member roles.

---

## Test Accounts

| Role | Login Method | Credentials |
|------|--------------|-------------|
| **Admin** | Hold logo 7 seconds → Enter code | Code: **123456** |
| **Trainer** | Tap logo 4 times → Enter code | Code: **1357911** |
| **Member** | Standard login | Email: **user@test.ie** / Password: *(set in Supabase Auth)* |

> **Setup notes:**
> - **Admin:** Run `add-test-admin.sql` in Supabase SQL Editor to add the test admin.
> - **Trainer:** Create a trainer via Admin → Add Trainer, then in Supabase run:  
>   `UPDATE profiles SET access_code = '1357911' WHERE email = 'your-trainer@email.com' AND role = 'trainer';`  
>   Or create manually in `profiles` with `role='trainer'` and `access_code='1357911'` (requires a matching auth user).
> - **Member:** Create in Supabase Auth (Authentication → Users → Add user) with email `user@test.ie` and a password (e.g. `Test123!`). Create a matching `profiles` row with `role='member'`, `first_name`, and `email`. Or use Admin → Add Member and then set the password for that user in Supabase Auth.

---

## How to Access Each Login Mode

1. **Member login (default):** Email and password fields are shown.
2. **Admin login:** Press and hold the MD Fitness logo for 7 seconds until "ADMIN" appears. Enter the admin code.
3. **Trainer login:** Tap the logo 4 times within 2 seconds until "TRAINER" appears. Enter the trainer code.
4. **Back to member login:** Use "Return to User Login" at the bottom.

---

# Part 1: Admin Guide

Admins manage members, trainers, class templates, and schedules.

## 1.1 Log In as Admin

1. Open the app and go to the login screen.
2. Hold the MD Fitness logo for 7 seconds.
3. When "ADMIN" appears, enter **123456**.
4. Tap **Access Admin Dashboard**.

## 1.2 Admin Dashboard

- **Today’s Classes:** List of today’s scheduled classes.
- **Class cards:** Tap a class to view attendees and remove members if needed.
- **Action buttons:**
  - **Schedule Class** – Create new class schedules.
  - **View Schedule** – Full calendar and schedule management.
  - **Add Member** – Create new members.
  - **Add Trainer** – Create new trainers.
  - **Manage Members** – View and edit members.
  - **Manage Trainers** – View and edit trainers, manage days off.
  - **Manage Class Templates** – Add and edit class types.

## 1.3 Schedule a Class

1. Tap **Schedule Class**.
2. Choose a date (or use **Select Date**).
3. Follow the steps:
   - **Class type:** e.g. HIIT, Yoga, Spin.
   - **Time:** Preset (6:00 AM, 7:00 AM, etc.) or custom.
   - **Location:** e.g. gym, studio.
   - **Trainer:** Select from the list.
   - **Recurrence:** Single or weekly.
   - **Details:** Max capacity and other options.
4. Tap **Create** to save.

## 1.4 View and Edit Schedule

1. Tap **View Schedule**.
2. Use the calendar to switch dates.
3. Tap a class to open the **Edit** option.
4. You can change:
   - Trainer  
   - Max spaces  
   - Date & time  
   - Difficulty & location  
   - Status (active, cancelled, etc.)

## 1.5 Add a Member

1. Tap **Add Member**.
2. Enter **Email** and **First Name**.
3. Tap **Create Member**.
4. A 7-digit access code is shown. Members use this to log in and set their password for the first time.

## 1.6 Add a Trainer

1. Tap **Add Trainer**.
2. Enter **First Name** and **Email**.
3. Tap **Create Trainer**.
4. A 6-digit access code is generated. Trainers use this code to log in.

## 1.7 Manage Members

1. Tap **Manage Members**.
2. Use search to find members.
3. Tap a member card to edit:
   - Height  
   - Weight  
   - Fitness goal  
   - Contact info  
4. Macro goals can be recalculated when fitness data is updated.

## 1.8 Manage Trainers

1. Tap **Manage Trainers**.
2. Trainer cards show:
   - Name and email  
   - Scheduled classes  
   - Upcoming classes  
3. **Calendar icon:** Manage days off (e.g. annual leave).
4. **Pencil icon:** Edit trainer details (including trainer code).
5. **Trash icon:** Delete trainer (only if they have no scheduled classes).
6. Tap a trainer to expand and see upcoming classes; tap **Reassign** to change the assigned trainer.

## 1.9 Manage Class Templates

1. Tap **Manage Class Templates**.
2. Add new class types (e.g. HIIT, Yoga).
3. Edit or delete existing templates.
4. Each template can have name, duration, description, and difficulty.

---

# Part 2: Trainer Guide

Trainers view their schedule, manage attendees, and set days off.

## 2.1 Log In as Trainer

1. On the login screen, tap the logo 4 times within 2 seconds.
2. When "TRAINER" appears, enter **1357911**.
3. Tap **Access Trainer Dashboard**.

## 2.2 Trainer Dashboard

- **Calendar:**  
  - Yellow = days off or annual leave  
  - Orange = days with scheduled classes  
  - White = no classes
- **Date selection:** Change the date to see different days.
- **Class list:** Classes for the selected date.
- **Pull to refresh:** Refresh data.

## 2.3 View Class Details

1. Tap a class in the list.
2. View:
   - Class name and time  
   - Max bookings and current attendees  
   - List of booked members  

## 2.4 Manage Attendees

1. From the class details, view the attendee list.
2. **Check-in:** Mark members as attended.
3. **Max bookings:** Use the edit option to change max capacity.
4. Class status (e.g. active, ongoing, completed) can be updated from the class view.

## 2.5 Days Off (Managed by Admin)

Days off and annual leave are set by admins. An admin goes to **Manage Trainers**, taps the calendar icon on a trainer card, and adds dates. Those days appear in yellow on the trainer's calendar.

## 2.6 Class Management Screen

1. Tap a class to open Class Management.
2. Actions available:
   - Start class (status → ongoing)  
   - Complete class (status → completed)  
   - View attendees  
   - Check in members  

---

# Part 3: Member Guide

Members book classes, track macros, and manage their profile.

## 3.1 Log In as Member

1. Enter **user@test.ie** and the password set in Supabase.
2. Tap **Sign In**.
3. If the account has no last name, the **First-Time Setup** form appears.

## 3.2 First-Time Setup (if shown)

1. Complete:
   - **Last Name** (required)
   - **Height (cm)** and **Weight (kg)**
   - **Fitness goal:** Weight loss, Maintain, or Muscle gain
   - **Date of birth**
   - **Gender**
   - Phone (optional)
2. Tap **Complete Setup**.
3. You are taken through the welcome flow and into the main app.

## 3.3 Member Dashboard – Three Tabs

### Macros Tab

- **Daily goals:** Calories, protein, carbs, fats, fiber.
- **Activity type:** Choose Cardio, Weight, Mix, or Rest to adjust targets.
- **Save activity:** Tap to save the selected activity for the day.
- **No macro goals?** Tap **Set up macro goals** and complete the form (height, weight, DOB, gender, fitness goal).

### Classes Tab

- **Upcoming:** Browse and book upcoming classes.
- **My Bookings:** View booked classes.
- **Book a class:** Tap **BOOK** when spaces are available.
- **Waitlist:** If full, tap **WAITLIST** to join.
- **Cancel booking:** Tap the booking to cancel.
- **Leave waitlist:** Use the option on the waitlist entry.
- **Check-in:** Available when the class is in progress.

### Profile Tab

- **Edit Profile:** Change phone and fitness goal.
- **Settings:** Change password.
- **Notifications:** Toggle class reminders and check-in notifications.
- **Help & Support:** Access help.
- **Sign Out:** Log out of the app.

## 3.4 Macro Tracker

1. Open the **Macros** tab.
2. If you see **Set up macro goals**, complete the form.
3. Select today’s activity (Cardio, Weight, Mix, Rest).
4. Tap **Save Activity**.
5. Track progress for calories, protein, carbs, fats, and fiber.

## 3.5 Booking Classes

1. Open the **Classes** tab.
2. Switch between **Upcoming** and **My Bookings**.
3. In **Upcoming**, find a class with available spots.
4. Tap **BOOK** to book or **WAITLIST** if the class is full.
5. In **My Bookings**, tap a booking to cancel if needed.

---

# Quick Test Checklist for Reviewers

Use this to verify main flows:

**Admin (code 123456)**  
- [ ] Log in with admin code  
- [ ] View today’s classes  
- [ ] Add a member  
- [ ] Add a trainer  
- [ ] Schedule a class  
- [ ] Edit a class from the schedule view  
- [ ] Manage members (edit height, weight, goal)  
- [ ] Manage trainers (days off, reassign class)  

**Trainer (code 1357911)**  
- [ ] Log in with trainer code  
- [ ] View calendar and scheduled classes  
- [ ] Open a class and view attendees  
- [ ] Check in a member (if class is running)  
- [ ] Update class status (ongoing / completed)  

**Member (user@test.ie)**  
- [ ] Log in with email and password  
- [ ] Complete first-time setup (if shown)  
- [ ] Set up macro goals (if prompted)  
- [ ] Change activity type and save  
- [ ] Book a class  
- [ ] View My Bookings  
- [ ] Edit profile and change password  

---

## Troubleshooting

| Issue | Action |
|-------|--------|
| Admin code not accepted | Ensure `add-test-admin.sql` has been run in Supabase. |
| Trainer code not accepted | Check `profiles` has a trainer with `access_code='1357911'` and `role='trainer'`. |
| Member login fails | Confirm the user exists in Supabase Auth and has a matching `profiles` row. |
| No classes to book | Create classes as Admin (Schedule Class) and assign a trainer. |
| Macro setup required | Complete the setup form in the Macros tab (height, weight, DOB, gender, goal). |
| Can’t see trainer login | Tap the logo exactly 4 times within 2 seconds. |
| Can’t see admin login | Hold the logo for the full 7 seconds. |
