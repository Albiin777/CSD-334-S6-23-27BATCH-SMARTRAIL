# SmartRail - Complete Project Documentation
## Visual Train Seat Booking System

**Live Demo:** [https://smartrail-26.vercel.app/](https://smartrail-26.vercel.app/)

**Project Team:**
- Albin Thomas
- Fidha Safar
- Joshua George Abraham
- Raisha Hashly

**Project Guide:** Usha Gopalakrishnan

---

# PART 1: PROJECT ANALYSIS & IMPLEMENTATION

---

## 1. PROJECT OVERVIEW

**SmartRail** is a full-stack **Visual Train Seat Booking System** that modernizes railway booking with:
- Interactive visual seat selection
- AI chatbot assistance
- Role-based access (Passenger, TTE, Admin)
- Real-time booking management

---

## 2. PROBLEM STATEMENT

Traditional railway booking systems mainly provide basic ticket booking and train schedules but lack intelligent assistance and visualization features.

**Key Problems:**
- Passengers cannot view seat layouts before booking
- No intelligent seat recommendations
- Railway staff lack integrated tools for passenger verification
- No centralized complaint and incident management

---

## 3. TARGET AUDIENCE

| User Type | Description |
|-----------|-------------|
| **Passengers** | Users who need an easier way to search and book train tickets |
| **Ticket Examiners (TTE)** | Railway staff for passenger verification and ticket issuing |
| **Administrators** | Railway officials managing trains, bookings, and complaints |

---

## 4. TECHNOLOGY STACK

### 4.1 Frontend Technologies
| Technology | Purpose |
|------------|---------|
| **React 19** | UI Framework |
| **Vite** | Build tool & dev server |
| **Tailwind CSS** | Styling |
| **React Router DOM** | Navigation |
| **Lucide React** | Icons |
| **Firebase Client SDK** | Authentication |
| **Framer Motion** | Animations (TTE module) |

### 4.2 Backend Technologies
| Technology | Purpose |
|------------|---------|
| **Node.js + Express.js** | REST API Server |
| **Firebase Admin SDK** | Server-side auth & Firestore |
| **Resend** | Email service (OTP + booking confirmations) |
| **JWT** | Token generation |

### 4.3 Database
| Service | Usage |
|---------|-------|
| **Firebase Firestore** | Primary database (users, bookings, OTPs, notifications) |
| **Firebase Storage** | Image uploads for complaints |

### 4.4 Authentication
- **Firebase Authentication** - Email/Password + Custom Email OTP
- JWT tokens for API authorization
- Role-based access control (Admin, TTE, User)

---

## 5. SYSTEM ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                             │
│  React App (Vite) → deployed on Vercel                      │
│  ├── Passenger Portal (/)                                   │
│  ├── Admin Portal (/admin/*)                               │
│  └── TTE Portal (/tte/*)                                   │
└──────────────────────┬──────────────────────────────────────┘
                       │ REST API calls
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                        BACKEND                              │
│  Express.js API → deployed on Railway/Render               │
│  ├── /api/auth/* - Authentication                          │
│  ├── /api/trains/* - Train search, schedules, layouts      │
│  ├── /api/bookings/* - Create/cancel/status                │
│  ├── /api/complaints/* - Support tickets                   │
│  ├── /api/notifications/* - User notifications             │
│  └── /api/reviews/* - Train reviews                        │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                       DATABASE                              │
│  Firebase Firestore Collections:                            │
│  ├── profiles - User profiles with roles                   │
│  ├── pnr_bookings - Ticket bookings with passengers        │
│  ├── email_otps - OTP verification records                 │
│  ├── notifications - User notification feed                │
│  ├── complaints - Support tickets                          │
│  ├── reviews - Train reviews                               │
│  ├── tte_assignments - TTE duty records                    │
│  └── incidents - TTE incident reports                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. KEY FEATURES

### 6.1 Passenger Features

| Feature | Description |
|---------|-------------|
| **Train Search** | Search by route (source→destination) or by train number |
| **Visual Seat Selection** | Interactive coach layout showing berth types (LB, MB, UB, SL, SU) |
| **Smart Seat Recommendation** | Algorithm suggests best seats using center-first load balancing |
| **Booking Flow** | Passenger details → Payment → Confirmation |
| **PNR Status Check** | Real-time booking status with visual 10-digit input |
| **Notifications** | Booking alerts, reminders, promotional messages |
| **Complaint System** | Submit issues with image attachments |
| **Train Reviews** | Rate and review train services |

### 6.2 Admin Features

| Feature | Description |
|---------|-------------|
| **Dashboard** | Live stats, running trains overview |
| **Train Management** | Add, edit, delete trains |
| **Station Management** | Manage station database |
| **TTE Management** | Assign/revoke TTE roles |
| **Duty Assignments** | Assign TTEs to trains |
| **Fare Editor** | Configure ticket pricing |
| **Complaint Handling** | Process customer complaints |
| **Notification Broadcasting** | Send announcements to users |
| **Reports & Analytics** | System statistics |

### 6.3 TTE (Ticket Examiner) Features

| Feature | Description |
|---------|-------------|
| **Dashboard** | Real-time coach stats, occupancy meter |
| **Passenger Verification** | Verify tickets against ID proof |
| **Seat Management** | Visual seat heatmap by coach |
| **Issue Ticket** | On-board ticket issuance |
| **Waitlist/RAC Management** | Handle waitlist confirmations |
| **Fines & Penalties** | Record ticket violations |
| **Incident Reporting** | Log on-board incidents |
| **Shift Handover** | Transfer duties between TTEs |
| **Analytics** | Performance metrics |

---

## 7. SYSTEM MODULES

| Module | Description |
|--------|-------------|
| **Authentication Module** | Handles user login and registration with OTP |
| **Train Search Module** | Retrieves train schedules and availability |
| **Seat Visualization Module** | Displays visual seat layout |
| **Booking Module** | Manages ticket booking and confirmation |
| **Complaint Management Module** | Handles passenger complaints |
| **Admin Module** | Controls system management |
| **TTE Module** | On-board operations management |

---

## 8. METHODOLOGY

1. User logs into the system using Email OTP or Google OAuth
2. Passenger searches trains using source and destination
3. System retrieves train schedules and seat availability
4. Passenger views visual seat layout and selects seats
5. System runs load-balancing algorithm to recommend best seats
6. Passenger enters details and completes payment
7. Booking is confirmed and ticket is generated with unique PNR
8. Email confirmation is sent to user
9. Admin monitors bookings and complaints
10. TTE verifies passengers on-board

---

## 9. DATABASE SCHEMA

### 9.1 Firestore Collections

**`profiles`** (User Data)
```json
{
  "id": "firebase_uid",
  "email": "user@email.com",
  "phone": "+91...",
  "full_name": "John Doe",
  "dob": "1990-01-01",
  "gender": "male",
  "role": "user | admin | tte",
  "created_at": "timestamp"
}
```

**`pnr_bookings`** (Ticket Bookings)
```json
{
  "pnr": "2129876543",
  "trainNumber": "12625",
  "journeyDate": "2026-04-15",
  "classCode": "SL",
  "source": "NDLS",
  "destination": "TVC",
  "fromIndex": 0,
  "toIndex": 45,
  "user_id": "firebase_uid",
  "passengers": [
    {
      "name": "John",
      "age": 30,
      "gender": "M",
      "status": "CNF",
      "seatNumber": "S1-24"
    }
  ],
  "created_at": "timestamp"
}
```

**`notifications`**
```json
{
  "userId": "firebase_uid",
  "type": "alert | info | reminder | news",
  "title": "Ticket Confirmed!",
  "message": "Your booking...",
  "isRead": false
}
```

**`complaints`**
```json
{
  "id": "uuid",
  "user_id": "firebase_uid",
  "subject": "Booking Issue",
  "description": "...",
  "status": "open | in_progress | resolved | closed",
  "images": ["url1", "url2"],
  "created_at": "timestamp"
}
```

---

## 10. SMART ALGORITHMS

### 10.1 Coach Load Balancing Algorithm

**Objective:** Distribute passengers evenly, starting from center coaches

**Formula:**
```
coachScore = (distanceFromCenter × 0.4) + (occupancy × 0.6)
```

- Lower score = better recommendation
- Center coaches fill first
- Prevents overcrowding in specific coaches

**Implementation:**
```javascript
function computeCoachAllocations(coaches, confirmedPassengers, passengerCount) {
    const totalCoaches = coaches.length;
    const center = (totalCoaches - 1) / 2;
    
    return coaches.map((coach, index) => {
        const distanceFromCenter = Math.abs(index - center);
        const normalizedDist = distanceFromCenter / center;
        const occupancy = bookedSeats / totalSeats;
        
        const score = (normalizedDist * 0.4) + (occupancy * 0.6);
        
        return { ...coach, score, status };
    }).sort((a, b) => a.score - b.score);
}
```

### 10.2 PNR Generation

**Format:** 10 digits
```
[Zone Code (3)] + [Random Unique ID (7)]
```

Zone codes map to stations:
- TVC = 211
- ERS = 212
- NDLS = 299

### 10.3 Segment Overlap Detection

Checks if two journey segments share any portion of the route:
```javascript
function doSegmentsOverlap(reqFrom, reqTo, existingFrom, existingTo) {
    return (existingFrom < reqTo && existingTo > reqFrom);
}
```

This prevents double-booking the same seat for overlapping journeys while allowing the same seat to be booked for non-overlapping trips.

---

## 11. API ENDPOINTS REFERENCE

### 11.1 Train APIs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/trains/search?q=` | Search trains by name/number |
| GET | `/api/trains/between-stations` | Find trains on route |
| GET | `/api/trains/:number` | Get train details |
| GET | `/api/trains/:number/schedule` | Get full schedule |
| GET | `/api/trains/:number/seat-layout` | Get visual layout |
| GET | `/api/trains/:number/coach-allocation` | Get load balancing scores |

### 11.2 Booking APIs
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/bookings` | Create booking |
| GET | `/api/bookings/status/:pnr` | Get PNR status |
| DELETE | `/api/bookings/:pnr` | Cancel booking |
| GET | `/api/bookings/history` | Get user's bookings |
| GET | `/api/bookings/booked-seats` | Get booked seats for train+date |

### 11.3 Authentication APIs
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/custom-email-otp/send` | Send OTP email |
| POST | `/api/auth/custom-email-otp/verify` | Verify OTP |
| POST | `/api/auth/sync-profile` | Save user profile |
| POST | `/api/auth/check-identifier` | Check if email/phone exists |

### 11.4 Station APIs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/stations/search?q=` | Search stations |
| GET | `/api/stations/:code` | Get station details |

---

## 12. AUTHENTICATION FLOW

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  User Input  │────▶│  Send OTP    │────▶│  Verify OTP  │
│ (Email/Phone)│     │  (Backend)   │     │  (Backend)   │
└──────────────┘     └──────────────┘     └──────────────┘
                            │                     │
                     ┌──────▼──────┐       ┌──────▼──────┐
                     │ Resend API  │       │Firebase Auth│
                     │ (Email OTP) │       │Custom Token │
                     └─────────────┘       └─────────────┘
```

**Role-Based Access:**
```javascript
// roles.config.js
AUTHORIZED_ADMINS = ['admin@email.com', ...]
AUTHORIZED_TTES = [{ email: 'tte@email.com', phone: '+91...' }, ...]
```

---

## 13. DATA FILES

Located in `backend/data/`:

| File | Content |
|------|---------|
| `full_trains_database.json` | 100+ trains with schedules |
| `SmartRailSeatLayoutFull.json` | Coach layouts per train |
| `coachTypes.json` | Berth configurations (1A, 2A, 3A, SL, CC) |
| `coachTemplates.json` | Coach generation templates |

**Coach Types:**
| Code | Name | Berths per Coach |
|------|------|------------------|
| **1A** | First AC | 24 |
| **2A** | AC 2-Tier | 46 |
| **3A** | AC 3-Tier | 64 |
| **SL** | Sleeper | 72 |
| **CC** | Chair Car | 78 |
| **2S** | 2nd Sitting | 108 |

---

## 14. PROJECT SETUP

### 14.1 Prerequisites
- Node.js v18+
- Firebase Project (with Firestore enabled)
- Resend API key (for emails)

### 14.2 Backend Setup
```bash
cd backend
npm install

# Create .env file:
# FIREBASE_PROJECT_ID=your_project_id
# RESEND_API_KEY=re_xxxxxx
# JWT_SECRET=random_secret
# PORT=5001

# Add firebase-service-account.json to backend/

npm run dev
```

### 14.3 Frontend Setup
```bash
cd frontend
npm install

# Create .env file:
# VITE_API_URL=http://localhost:5001/api
# VITE_FIREBASE_API_KEY=xxx
# VITE_FIREBASE_PROJECT_ID=xxx

npm run dev
```

---

## 15. HARDWARE REQUIREMENTS

| Component | Requirement |
|-----------|-------------|
| Processor | Intel i3 or higher |
| RAM | Minimum 4 GB |
| Network | Stable internet connection |

---

# PART 2: COMPONENT-BY-COMPONENT WORKING DETAILS

---

## 1. FRONTEND COMPONENTS

---

### 1.1 Header Component
**File:** `components/common/Header.jsx`

**Purpose:** Global navigation bar visible on all pages

**Working:**
- Displays logo and navigation links
- Shows user authentication state (Login button or profile icon)
- Implements role-based menu items:
  - Regular users: Home, My Bookings, Notifications
  - Admins: Shows "Admin Portal" link
  - TTEs: Shows "TTE Portal" link
- Handles responsive mobile menu toggle
- `onLoginClick` prop triggers the Auth modal

---

### 1.2 Hero Component
**File:** `components/Hero.jsx`

**Purpose:** Landing page hero section with animated background

**Working:**
- Displays promotional content and call-to-action
- Animated train illustration or video background
- "Book Now" button scrolls to BookingCard
- Responsive layout adapts to screen sizes

---

### 1.3 BookingCard Component
**File:** `components/Bookingcaard.jsx`

**Purpose:** Main train search interface

**Visual Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  Search Mode Toggle: [Route] [Train Number]                 │
├─────────────────────────────────────────────────────────────┤
│  FROM:  [Autocomplete Input] ←→ TO: [Autocomplete Input]   │
│  DATE:  [Date Picker]                                       │
│  CLASS: [Dropdown: SL, 3A, 2A, 1A, CC]                     │
│  PASSENGERS: [1-6 selector]                                 │
│  [SEARCH TRAINS] button                                     │
└─────────────────────────────────────────────────────────────┘
```

**Key Functions:**
1. **Station Autocomplete** - Debounced API call to `/api/stations/search`
2. **Train Search** - Calls `/api/trains/search` for train number mode
3. **Swap Stations** - Exchanges FROM and TO values
4. **Date Validation** - Restricts to next 60 days only
5. **Navigation** - On search, redirects to `/results` with query params

---

### 1.4 Results Page
**File:** `pages/Results.jsx`

**Purpose:** Display train search results

**Working Flow:**
```
User searches → API call to /api/trains/between-stations
                     ↓
              Filter by running day (if date provided)
                     ↓
              Sort by departure time
                     ↓
              Display train cards with:
              - Train name/number
              - Departure/Arrival times
              - Running days dots (Mon-Sun)
              - Available classes
              - [Book Now] button per class
```

**Each Result Card Shows:**
- Train number & name
- Source → Destination with times
- Duration
- Running days visualization
- Class buttons (SL, 3A, 2A, etc.) that navigate to seat layout

---

### 1.5 SeatLayout Page
**File:** `pages/SeatLayout.jsx`

**Purpose:** Visual seat selection interface

**Visual Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  Train: 12625 Kerala Express    Class: Sleeper (SL)         │
│  Date: 15-Apr-2026              Passengers: 2               │
├─────────────────────────────────────────────────────────────┤
│  Coach Tabs: [S1] [S2] [S3] [S4] (with availability badges) │
├─────────────────────────────────────────────────────────────┤
│  VISUAL COACH LAYOUT:                                       │
│  ┌─────────────────────────────────────┐                   │
│  │ Bay 1:  [1-LB] [2-MB] [3-UB]  │  [7-SL]                │
│  │         [4-LB] [5-MB] [6-UB]  │  [8-SU]                │
│  ├─────────────────────────────────────┤                   │
│  │ Bay 2:  [9-LB] [10-MB] [11-UB] │ [15-SL]               │
│  │        [12-LB] [13-MB] [14-UB] │ [16-SU]               │
│  └─────────────────────────────────────┘                   │
│  Legend: ■ Booked  ☆ Recommended  □ Available             │
├─────────────────────────────────────────────────────────────┤
│  Selected: S1-24, S1-25           Total: ₹1,240            │
│  [PROCEED TO PASSENGER DETAILS]                             │
└─────────────────────────────────────────────────────────────┘
```

**Key Logic:**

1. **Fetch Layout:**
   ```javascript
   api.getSeatLayout(trainNumber) → coaches with seats array
   api.getBookedSeats(trainNumber, date, source, dest) → already booked seat IDs
   ```

2. **Mark Booked Seats:**
   ```javascript
   seats.map(seat => ({
     ...seat,
     isBooked: bookedSeatIds.includes(`${coachId}-${seat.seatNumber}`)
   }))
   ```

3. **Seat Recommendation (★ Best):**
   - Fetches coach allocation scores from `/api/trains/:number/coach-allocation`
   - Lower score = better coach
   - Recommends first available seats in best-scored coach

4. **Row Grouping:**
   - Groups seats into bays based on `rowStructure` from coach type
   - Handles berth types: LB (Lower), MB (Middle), UB (Upper), SL (Side Lower), SU (Side Upper)

5. **Selection Logic:**
   - Click seat → add to `selectedSeats[]`
   - Max seats = passenger count
   - Disabled if already booked

---

### 1.6 PassengerDetails Page
**File:** `pages/PassengerDetails.jsx`

**Purpose:** Collect passenger information before payment

**Visual Layout:**
```
For each passenger (1 to N):
┌─────────────────────────────────────────┐
│  Passenger 1 - Seat: S1-24              │
│  Name: [________________]               │
│  Age:  [__]  Gender: [M/F/Other ▼]     │
│  Berth Preference: [Lower/Middle/Upper] │
└─────────────────────────────────────────┘

Journey Summary:
- Train: 12625 Kerala Express
- From: New Delhi → To: Trivandrum
- Date: 15-Apr-2026
- Class: Sleeper
- Total Fare: ₹1,240

[PROCEED TO PAYMENT]
```

**Validation:**
- Name required (min 3 chars)
- Age required (1-120)
- Gender required
- Stores in React state, passed to payment page

---

### 1.7 PaymentGateway Page
**File:** `pages/PaymentGateway.jsx`

**Purpose:** Simulated payment processing

**Working:**
```
1. Display order summary
2. Show payment options (UPI, Card, Net Banking - simulated)
3. On "Pay Now":
   - Call api.createBooking() with full payload
   - Payload includes: trainNumber, journeyDate, classCode, 
     source, destination, passengers[]
4. Backend:
   - Generates unique PNR
   - Allocates seats (CNF/RAC/WL)
   - Saves to Firestore
   - Sends confirmation email
5. Frontend:
   - Shows success animation
   - Displays PNR number
   - "Check PNR Status" button
```

---

### 1.8 PNRStatus Component
**File:** `components/Pnrstatus.jsx`

**Purpose:** Check booking status by PNR

**Visual Layout:**
```
┌───────────────────────────────────────────────────┐
│  Enter your 10-digit PNR:                         │
│  [ 2 ][ 1 ][ 2 ][ 9 ][ 8 ][ 7 ][ 6 ][ 5 ][ 4 ][ 3 ]│
│                                                   │
│  [CHECK STATUS]                                   │
└───────────────────────────────────────────────────┘
```

**Flow:**
1. User enters PNR (validated to 10 digits)
2. Calls `api.getBookingStatus(pnr)`
3. Displays result in `PNRResult` component:
   - Train details
   - Journey date/time
   - Passenger list with seat status (CNF/RAC/WL)
   - Chart prepared status

---

### 1.9 Auth Component
**File:** `components/Auth.jsx`

**Purpose:** Login/Signup modal

**Visual Flow:**
```
Mode: [Login] [Signup]

Step 1 - Credentials:
┌────────────────────────────────────┐
│  Email or Phone: [____________]    │
│  [Continue with OTP] or            │
│  Password: [____________]          │
│  [Login]                           │
│  ─────────────────────────────────│
│  [Continue with Google]            │
└────────────────────────────────────┘

Step 2 - OTP Verification:
┌────────────────────────────────────┐
│  Enter OTP sent to email@...      │
│  [ _ ][ _ ][ _ ][ _ ][ _ ][ _ ]   │
│  [Verify]  Resend in 30s          │
└────────────────────────────────────┘

Step 3 - Profile (Signup only):
┌────────────────────────────────────┐
│  Full Name: [____________]         │
│  DOB: [__/__/____]                │
│  Gender: [Select ▼]               │
│  [Complete Signup]                 │
└────────────────────────────────────┘
```

**Authentication Flow:**
1. **Email OTP Flow:**
   - POST `/api/auth/custom-email-otp/send` → sends 6-digit OTP via Resend
   - POST `/api/auth/custom-email-otp/verify` → validates, returns Firebase custom token
   - `signInWithCustomToken(auth, token)` → establishes Firebase session

2. **Google OAuth:**
   - `signInWithPopup(auth, GoogleAuthProvider)`
   - Auto-creates profile if new user

3. **Profile Sync:**
   - POST `/api/auth/sync-profile` → saves user data to Firestore `profiles` collection

---

### 1.10 NotificationCenter Component
**File:** `components/NotificationCenter.jsx`

**Purpose:** Bell icon dropdown showing recent notifications

**Working:**
- Fetches from Firestore `notifications` collection filtered by `userId`
- Shows unread badge count
- Types: `alert` (red), `info` (blue), `reminder` (yellow), `news` (purple)
- Click marks as read
- "View All" navigates to `/notifications` page

---

### 1.11 Reviews Component
**File:** `components/Reviews.jsx`

**Purpose:** Display and submit train reviews

**Working:**
- Lists recent reviews from Firestore `reviews` collection
- Star rating visualization (1-5)
- If logged in: shows "Write a Review" form
- Submits: trainNumber, rating, comment, userId

---

### 1.12 Support Component
**File:** `pages/Support.jsx`

**Purpose:** Complaint submission system

**Visual Layout:**
```
┌─────────────────────────────────────────┐
│  Category: [Booking Issue ▼]            │
│  Subject: [________________]            │
│  Description: [                         │
│               ___________________       │
│              ]                          │
│  Attach Evidence: [Choose Files]        │
│  [Submit Complaint]                     │
└─────────────────────────────────────────┘
```

**Flow:**
1. User fills form
2. Images uploaded to Firebase Storage (`support-evidence` bucket)
3. Complaint saved to Firestore `complaints` collection
4. Status: `open` → `in_progress` → `resolved`

---

## 2. ADMIN PORTAL COMPONENTS (`/admin/*`)

---

### 2.1 AdminDashboard
**File:** `pages/AdminDashboard.jsx`

**Purpose:** System overview for administrators

**Displays:**
- **Stat Cards:** Running trains, Delayed, Departed, Open complaints
- **Live Train Status:** Paginated list of currently running trains
- **Recent Complaints:** Latest 8 complaints with status badges
- **TTE List:** Active ticket examiners
- **Duty Assignments:** Current TTE assignments

**Data Sources:**
- Trains: `api.searchTrains("all")` with simulated status
- Complaints: Firestore `complaints` collection
- TTEs: Firestore `profiles` where `role == 'tte'`
- Assignments: Firestore `tte_assignments`

---

### 2.2 TrainManagement
**File:** `pages/admin/TrainManagement.jsx`

**Purpose:** CRUD operations on trains

**Features:**
- List all trains with search/filter
- Edit train details (name, schedule, running days)
- Add new trains
- View coach configuration

---

### 2.3 TteManagement
**File:** `pages/admin/TteManagement.jsx`

**Purpose:** Manage TTE accounts

**Features:**
- List registered TTEs
- Assign/revoke TTE role
- View TTE performance metrics

---

### 2.4 DutyAssignments
**File:** `pages/admin/DutyAssignments.jsx`

**Purpose:** Assign TTEs to trains

**Visual Layout:**
```
┌─────────────────────────────────────────────────┐
│  Create Assignment:                             │
│  TTE: [Select TTE ▼]                           │
│  Train: [Select Train ▼]                       │
│  Date: [__/__/____]                            │
│  Shift: [Day/Night ▼]                          │
│  Coaches: [B1, B2, B3]                         │
│  [Assign]                                       │
└─────────────────────────────────────────────────┘
```

---

### 2.5 AdminComplaints
**File:** `pages/admin/AdminComplaints.jsx`

**Purpose:** Process customer complaints

**Features:**
- View all complaints with filters (status, date, category)
- Update status: Open → In Progress → Resolved → Closed
- Add admin notes/response
- View attached evidence images

---

### 2.6 AdminNotifications
**File:** `pages/admin/AdminNotifications.jsx`

**Purpose:** Broadcast notifications to users

**Working:**
- Create notification with title, message, type
- Target: All users, specific user, or user segment
- Notifications appear in users' notification feed

---

### 2.7 FareEditor
**File:** `pages/admin/FareEditor.jsx`

**Purpose:** Configure ticket pricing

**Features:**
- Base fare per kilometer by class
- Reservation charges
- Dynamic pricing rules
- Seasonal adjustments

---

## 3. TTE PORTAL COMPONENTS (`/tte/*`)

---

### 3.1 TTE Dashboard
**File:** `tte/pages/Dashboard.jsx`

**Purpose:** On-board operations overview

**Visual Layout:**
```
┌──────────────────────────────────────────────────────────┐
│ Stats: Total Berths | Booked | Vacant | RAC | Waitlist  │
├──────────────────────────────────────────────────────────┤
│ Train & TTE Details:                                     │
│ TTE Name: John Doe    Train: 12625 Kerala Express       │
│ Route: NDLS → TVC     Shift: Day                        │
├──────────────────────────────────────────────────────────┤
│ Active Coach: [S1 ▼]  Occupancy: 78%                    │
│ ████████████████░░░░                                    │
├──────────────────────────────────────────────────────────┤
│ Seat Heatmap: Coach S1                                  │
│ [■][■][□]  [■]   Bay 1                                 │
│ [■][□][■]  [□]                                         │
│ [■][■][■]  [■]   Bay 2                                 │
│ Legend: ■ Booked  □ Vacant  ◆ RAC                      │
└──────────────────────────────────────────────────────────┘
```

**Data Flow:**
- `useSmartRail()` hook provides all TTE context
- Seat data from `tte_passengers` Firestore collection
- Real-time updates via Firestore listeners

---

### 3.2 PassengerVerify
**File:** `tte/pages/PassengerVerify.jsx`

**Purpose:** Verify passenger tickets

**Working:**
```
1. TTE scans PNR or enters manually
2. System fetches passenger list for that PNR
3. TTE verifies ID proof matches passenger name
4. Marks as "Verified" ✓
5. If mismatch → Flag options: Wrong Berth, No Ticket, ID Mismatch
```

---

### 3.3 IssueTicket
**File:** `tte/pages/IssueTicket.jsx`

**Purpose:** Issue tickets to passengers boarding without reservation

**Visual Layout:**
```
┌─────────────────────────────────────────────┐
│  Passenger Name: [________________]         │
│  From: [Current Station]  To: [________]   │
│  Class: [General/Sleeper ▼]                │
│  Age: [__]  Gender: [M/F ▼]                │
│  ID Proof Type: [Aadhar/PAN ▼]             │
│  ID Number: [________________]              │
│                                             │
│  Fare: ₹450 + ₹50 (reservation charge)     │
│  [Issue Ticket]                             │
└─────────────────────────────────────────────┘
```

---

### 3.4 FinesPenalty
**File:** `tte/pages/FinesPenalty.jsx`

**Purpose:** Record fines for ticket violations

**Fine Types:**
- Ticketless travel
- Unauthorized class upgrade
- Chain pulling
- Smoking in non-smoking area

**Working:**
- Select passenger/seat
- Choose violation type
- Calculate fine amount
- Generate fine receipt
- Update `fines` collection in Firestore

---

### 3.5 IncidentReport
**File:** `tte/pages/IncidentReport.jsx`

**Purpose:** Log on-board incidents

**Incident Types:**
- Medical emergency
- Security issue
- Equipment malfunction
- Passenger dispute

**Working:**
- Fill incident details form
- Mark severity: Low/Medium/High/Critical
- Notify control room (simulated)
- Saved to `incidents` Firestore collection

---

### 3.6 WaitlistRAC
**File:** `tte/pages/WaitlistRAC.jsx`

**Purpose:** Manage waitlist and RAC passengers

**Features:**
- View current WL/RAC passengers for the train
- Confirm RAC when berth becomes available
- Update waitlist when cancellation happens
- Manual berth allocation

---

### 3.7 Handover
**File:** `tte/pages/Handover.jsx`

**Purpose:** Shift handover between TTEs

**Working:**
```
Outgoing TTE fills:
- Pending verifications count
- Vacant berths available
- Incidents reported
- Fines collected (₹)
- Notes for incoming TTE

Incoming TTE acknowledges:
- Reviews outgoing report
- Accepts handover
- Timestamp recorded
```

---

## 4. BACKEND SERVICES

---

### 4.1 Train Service
**File:** `services/train.service.js`

**Purpose:** Load and serve train data

**Data Loading:**
```javascript
dataStore = {
  trains: [],        // from full_trains_database.json
  seatLayouts: [],   // from SmartRailSeatLayoutFull.json
  coachTypesMap: {}, // from coachTypes.json
  stationsMap: Map   // extracted from train schedules
}
```

---

### 4.2 Booking Service
**File:** `services/booking.service.js`

**Purpose:** Handle ticket reservations

**Core Function - `bookTicket()` Flow:**
```
Input: trainNumber, source, dest, date, class, passengers[]
                         ↓
1. Validate source/destination order in schedule
                         ↓
2. Fetch existing bookings for train+date+class
                         ↓
3. Check segment overlap with existing bookings
                         ↓
4. Allocate seats:
   - Try CNF (confirmed seat)
   - If full → Try RAC (shared berth)
   - If RAC full → Assign WL (waitlist)
                         ↓
5. Generate unique PNR
                         ↓
6. Save to Firestore `pnr_bookings`
                         ↓
7. Create notification for user
                         ↓
8. Return booking confirmation
```

---

### 4.3 Email Service
**File:** `services/email.service.js`

**Purpose:** Send transactional emails via Resend

**Functions:**
1. `sendOTPEmail(email, otpCode)` - 6-digit verification code
2. `sendBookingConfirmationEmail(email, bookingDetails)` - HTML ticket with PNR

---

### 4.4 Coach Load Balance Service
**File:** `services/coachLoadBalance.service.js`

**Purpose:** Optimize seat recommendations

**Algorithm:**
```javascript
// For each coach:
distanceFromCenter = |coachIndex - centerIndex|
occupancy = bookedSeats / totalSeats
score = (distanceFromCenter * 0.4) + (occupancy * 0.6)

// Lower score = recommend first
// Result: Center coaches with lower occupancy fill first
```

---

### 4.5 Seat Layout Service
**File:** `services/seatLayout.service.js`

**Purpose:** Generate seat arrays from coach configurations

**Working:**
```javascript
generateSeats(coach) {
  // Get coach type (3A, SL, 2A, etc.)
  const coachType = coachTypesMap.get(coach.coachTypeId);
  
  // Apply berth pattern from rowStructure
  // [['LB','MB','UB','AISLE','SL'],
  //  ['LB','MB','UB','AISLE','SU']]
  
  return seats.map(i => ({
    seatNumber: i,
    berthType: pattern[i % patternLength],
    isBooked: false
  }));
}
```

---

## 5. DATA FLOW SUMMARY

```
USER ACTION           FRONTEND                    BACKEND                       DATABASE
────────────────────────────────────────────────────────────────────────────────────────────────
Search trains    →   BookingCard.jsx        →   /api/trains/between-stations  →  dataStore (JSON)
                     (Autocomplete)

Select seats     →   SeatLayout.jsx         →   /api/trains/:id/seat-layout   →  seatLayouts.json
                     (Visual grid)              /api/bookings/booked-seats    →  Firestore

Book ticket      →   PaymentGateway.jsx     →   /api/bookings (POST)          →  Firestore: pnr_bookings
                     (Payment)                                                    Firestore: notifications

Check PNR        →   Pnrstatus.jsx          →   /api/bookings/status/:pnr     →  Firestore: pnr_bookings

Login            →   Auth.jsx               →   /api/auth/custom-email-otp/*  →  Firestore: email_otps
                     (OTP input)                                                  Firestore: profiles

Submit complaint →   Support.jsx            →   Firebase Storage (images)      →  Firestore: complaints
                     (Form + uploads)

TTE verify       →   PassengerVerify.jsx    →   Firestore direct access       →  Firestore: tte_passengers
                     (Mark verified)
```

---

## 16. CONCLUSION

SmartRail provides a modern railway booking system that improves passenger convenience through:

1. **Visual Seat Selection** - See exactly what you're booking
2. **Intelligent Recommendations** - AI-powered seat suggestions
3. **Role-Based Portals** - Dedicated workflows for Admin & TTE
4. **Real-Time Updates** - Instant notifications and PNR tracking
5. **Comprehensive Management** - End-to-end railway operations

The platform enhances both passenger experience and railway operations by integrating intelligent tools and management features, making train travel booking simpler, smarter, and more transparent.

---

**© 2026 SmartRail - Visual Train Seat Booking System**

*Developed as Mini Project - B.Tech Computer Science*
