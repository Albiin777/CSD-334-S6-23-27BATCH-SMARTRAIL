# SmartRail Notification System - Complete Overview

## 📋 Quick Summary
The SmartRail notification system uses **Firebase Firestore** as the data store with a mixed approach:
- **Backend API**: Express.js endpoints for authenticated users (Node Express)
- **Frontend Direct Access**: Admin dashboard writes directly to Firestore (client-side)
- **Real-time Fetching**: Client-side queries to Firestore for instant updates

---

## 🗂️ File Locations & Architecture

### Backend Files
| File | Purpose |
|------|---------|
| [backend/src/controllers/notification.controller.js](backend/src/controllers/notification.controller.js) | Core notification logic (fetch, mark as read, broadcast) |
| [backend/src/routes/notification.routes.js](backend/src/routes/notification.routes.js) | API endpoints for notifications |
| [backend/scripts/create_notifications.js](backend/scripts/create_notifications.js) | (Legacy) Supabase schema migration script |
| [backend/scripts/check_notifications_schema.js](backend/scripts/check_notifications_schema.js) | (Legacy) Supabase schema validation |

### Frontend Files
| File | Purpose |
|------|---------|
| [frontend/src/api/notification.api.js](frontend/src/api/notification.api.js) | API client for authenticated notification requests |
| [frontend/src/components/NotificationCenter.jsx](frontend/src/components/NotificationCenter.jsx) | Dropdown notification widget (header) |
| [frontend/src/pages/AllNotifications.jsx](frontend/src/pages/AllNotifications.jsx) | Full notifications page with tabs and detail view |
| [frontend/src/pages/admin/AdminNotifications.jsx](frontend/src/pages/admin/AdminNotifications.jsx) | **Admin dashboard** for creating/editing broadcasts |
| [frontend/src/tte/pages/Notifications.jsx](frontend/src/tte/pages/Notifications.jsx) | TTE (Train Ticket Examiner) notifications view |
| [frontend/src/tte/components/Header.jsx](frontend/src/tte/components/Header.jsx) | TTE header with notification bell |

---

## 🏗️ Current Architecture

### Data Flow

```
Admin Creates Notification
        ↓
AdminNotifications.jsx writes directly to Firestore
        ↓
Firestore collection: "notifications"
        ↓
Three fetch sources:
  1. Backend API (/api/notifications) - for authenticated users
  2. Direct Firestore queries - Admin dashboard & TTE pages
  3. Real-time listeners - Client-side updates
```

### Database Schema (Firestore)

**Collection**: `notifications`

```javascript
{
  id: string (auto-generated),
  title: string,
  message: string,
  type: "info" | "alert" | "warning" | "success" | "reminder" | "news",
  target: "all" | "passengers" | "ttes",  // Audience targeting
  link: string | null,                     // Optional action link
  userId: null | string,                   // null = broadcast, string = personal
  is_read: boolean,                        // For personal notifications
  for_you: boolean,                        // Personal notification flag
  readBy: string[],                        // Array of user IDs who read (broadcasts)
  created_at: ISO string timestamp,
  updated_at: ISO string timestamp (optional),
  target_audience: (optional) - alternate field
}
```

---

## 🔌 Backend API Endpoints

### Base URL
```
http://localhost:5001/api/notifications
```

### Endpoints

#### 1. **GET** `/` - Get user notifications
```
Headers: Authorization: Bearer {token}
Returns: Array of notifications (user-specific + broadcasts)
```

#### 2. **PUT** `/:id/read` - Mark single notification as read
```
Parameters: id (notification ID)
Headers: Authorization: Bearer {token}
```

#### 3. **PUT** `/read-all` - Mark all notifications as read
```
Headers: Authorization: Bearer {token}
```

#### 4. **POST** `/broadcast` - Create admin broadcast (NOT PROTECTED)
```
Body: {
  type: string,
  title: string,
  message: string,
  link: string (optional)
}
⚠️ WARNING: No admin middleware - any authenticated user can broadcast!
```

---

## 📱 Frontend Implementation Details

### 1. NotificationCenter.jsx (Dropdown Widget)
**Location**: [frontend/src/components/NotificationCenter.jsx](frontend/src/components/NotificationCenter.jsx)

**Fetches from**: Backend API (`/api/notifications`)

**Features**:
- Dropdown notification panel in navbar
- Real-time unread count badge
- Tab filtering: "all" vs "for_you"
- Mark as read functionality
- Auth state dependent (only shows when logged in)

**Update trigger**: When dropdown opens or auth state changes

### 2. AllNotifications.jsx (Full Page)
**Location**: [frontend/src/pages/AllNotifications.jsx](frontend/src/pages/AllNotifications.jsx)

**Fetches from**: Backend API

**Features**:
- Tab-based filtering (all/for_you)
- Detail modal view
- Unread count tracking
- Detailed timestamp display
- Responsive design

### 3. AdminNotifications.jsx (Admin Dashboard)
**Location**: [frontend/src/pages/admin/AdminNotifications.jsx](frontend/src/pages/admin/AdminNotifications.jsx)

**Fetches from**: **Direct Firestore** (no backend!)

**Features**:
- Create new broadcasts
- Edit existing notifications
- Delete notifications
- Type selection: info/warning/alert/success
- Target audience: all/passengers/ttes
- Optional action links
- Success toast notifications

**Writes directly to Firebase**: `addDoc()`, `updateDoc()`, `deleteDoc()`

### 4. TTE Notifications.jsx (Train Staff)
**Location**: [frontend/src/tte/pages/Notifications.jsx](frontend/src/tte/pages/Notifications.jsx)

**Fetches from**: **Direct Firestore** (client-side query)

**Features**:
- Filters for: broadcasts where `userId === null` AND `(target === 'all' || target === 'ttes')`
- Type-based filtering (all/info/warning/alert)
- Click to open links (internal routes or external URLs)
- Styled notification cards
- 50 notifications limit

### 5. TTE Header.jsx Notification Bell
**Location**: [frontend/src/tte/components/Header.jsx](frontend/src/tte/components/Header.jsx)

**Displays**: Last 10 notifications from Firestore (direct query)

**Filters**: Same as TTE Notifications page

---

## 📊 Hardcoded Notification Examples

Currently, **NO hardcoded notification data** exists in the codebase. All notifications are:
1. Created via AdminNotifications.jsx (admin dashboard)
2. Stored in Firestore
3. Fetched at runtime

### Sample Notification Object (from code)
```javascript
{
  title: "Service Disruption on Route CLT-SRR",
  message: "Signal failure between Shoranur and Trivandrum. Expected delay: 30 minutes.",
  type: "alert",
  target: "all",
  link: "/results",  // optional
  userId: null,
  is_read: false,
  for_you: false,
  created_at: "2026-03-23T10:30:00Z",
  readBy: []
}
```

---

## 🔄 How Notifications Are Fetched & Displayed

### For Regular Passengers

1. **NotificationCenter (Dropdown)**
   ```
   Opens dropdown → Calls notificationApi.getNotifications() 
   → Backend queries: (userId === currentUser.id) OR (userId === null)
   → Returns sorted array
   → Displayed in dropdown
   ```

2. **AllNotifications Page**
   ```
   Page loads → Calls notificationApi.getNotifications()
   → Filters client-side: only `for_you: true` for "MyNotifications" tab
   → Shows detail modal on click
   ```

### For TTEs (Train Staff)

1. **Notifications Page**
   ```
   Page loads → Direct Firestore query:
   collection("notifications")
     .orderBy("created_at", "desc")
     .limit(50)
   → Client-side filter: userId === null AND (target === 'all' || target === 'ttes')
   → Display filtered list
   ```

2. **Header Bell**
   ```
   Header mounts → Same Firestore query (limit 10)
   → Shows count of unread system notifications
   ```

### For Admins

1. **AdminNotifications Dashboard**
   ```
   Page loads → Direct Firestore query (no backend!)
   collection("notifications")
     .orderBy("created_at", "desc")
     .limit(50)
   → Display all notifications in left panel
   → Allow edit/delete/create
   ```

---

## 🚀 Where Real Admin Notifications Should Come From

### Current Issues ⚠️
1. **No authentication on broadcast endpoint** - Any logged-in user can create notifications
2. **Client-side writes** - Admin dashboard bypasses backend API
3. **No authorization checks** - No admin role verification
4. **Mixed sources** - Some use backend API, some use direct Firestore

### Recommended Future Implementation

**For real admin notifications, fetch from:**

1. **Option A: Backend API** (RECOMMENDED)
   ```
   GET /api/notifications/admin/all
   GET /api/notifications/broadcast-log
   POST /api/notifications/broadcast (with admin verification)
   ```

2. **Option B: Custom Notification Service**
   - Real-time processing service
   - Queue-based notification delivery
   - Event-driven (train delays, bookings, etc.)

3. **Option C: External notification provider**
   - SendGrid, Firebase Cloud Messaging, etc.
   - Send push notifications to mobile apps

---

## 📝 Backend Controller Functions

### getUserNotifications()
```javascript
// Gets personal + broadcast notifications
// Handles different read tracking:
// - Personal: is_read field
// - Broadcast: readBy array membership
```

### markAsRead()
```javascript
// Direct write to notification document
// Updates is_read (personal) or readBy array (broadcast)
```

### markAllAsRead()
```javascript
// Batch updates all user notifications
// Splits into two groups: personal + broadcast
```

### createAdminBroadcast()
```javascript
// Creates new broadcast notification
// Sets userId: null, for_you: false
// Returns 201 with notification object
```

---

## 🔐 Security Concerns

| Issue | Severity | Impact |
|-------|----------|--------|
| No admin middleware on broadcast endpoint | 🔴 High | Any user can broadcast |
| Client-side Firestore writes | 🟡 Medium | No audit trail for admin actions |
| No role-based access control | 🔴 High | TTEs could modify notifications |
| Firebase security rules unclear | 🟡 Medium | Could expose sensitive data |

---

## 🎯 Key Data Points

- **Location of notifications**: Firestore collection `"notifications"`
- **Real-time updates**: No real-time listeners implemented (polling-based)
- **Unread tracking**: Via `is_read` (personal) or `readBy` array (broadcast)
- **Notification types**: info, alert, warning, success, reminder, news
- **Target audiences**: all, passengers, ttes
- **Limits**: 50 notifications displayed at once
- **Update frequency**: Manual fetch triggers (dropdown open, page load)

---

## 📋 API Call Reference

### Frontend notification.api.js
```javascript
notificationApi.getNotifications()      // GET /api/notifications
notificationApi.markAsRead(id)          // PUT /api/notifications/{id}/read
notificationApi.markAllAsRead()         // PUT /api/notifications/read-all
// Note: create/edit/delete use direct Firestore in admin dashboard
```

### Backend Routes
```javascript
router.get('/', getUserNotifications)              // Requires auth
router.put('/read-all', markAllAsRead)             // Requires auth
router.put('/:id/read', markAsRead)                // Requires auth
router.post('/broadcast', createAdminBroadcast)    // Requires auth ONLY
```

---

## 🔗 Related Files
- [backend/src/config/firebaseAdmin.js](backend/src/config/firebaseAdmin.js) - Firebase init
- [frontend/src/utils/firebaseClient.js](frontend/src/utils/firebaseClient.js) - Firestore client
- [frontend/src/api/config.js](frontend/src/api/config.js) - API base URL config
