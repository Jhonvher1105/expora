# Detailed Plan: Separate Profile Pages for Host and Guest

## Current State Analysis

### Existing Components
1. **Profile.jsx** (`src/components/UserFolder/Profile.jsx`)
   - Currently serves all users (hosts and guests)
   - Contains Points Display Section (lines 311-395) with:
     - Points Balance display
     - Rewards button (links to /Rewards)
     - History button (links to /PointsHistory)
   - Contains profile form with personal details, contacts, and address

2. **HostSettings.jsx** (`src/components/hostFolder/HostSettings.jsx`)
   - Separate settings page for hosts
   - Shows profile, bookings, and earnings tabs
   - Uses HostHeader component

3. **Settings.jsx** (`src/components/UserFolder/Settings.jsx`)
   - Settings page for guests/users
   - Shows profile, bookings, and wallet tabs

### Host Identification Methods Found
1. **By User Role/Account Type:**
   ```javascript
   userData.role === "host" || userData.accType === "host"
   ```

2. **By Properties Ownership:**
   ```javascript
   query(collection(db, "properties"), where("ownerId", "==", user.uid))
   ```

### Current Routing
- `/Profile` - Single profile route for all users
- `/HostSettings` - Host settings (different from profile)
- `/Settings` - Guest settings (different from profile)

---

## Proposed Solution

### Option 1: Conditional Rendering (Recommended)
**Approach:** Keep single `/Profile` route, but conditionally render Points section based on host status.

**Pros:**
- Minimal code duplication
- Single route to maintain
- Easy to implement
- Consistent URL structure

**Cons:**
- One component handles both roles (slightly less clean separation)

---

### Option 2: Separate Components with Smart Routing
**Approach:** Create `HostProfile.jsx` and `GuestProfile.jsx`, then use routing logic to serve the correct component.

**Pros:**
- Clean separation of concerns
- Independent components for easier maintenance
- More scalable if hosts/guests need very different features

**Cons:**
- More files to maintain
- Need routing logic/wrapper component
- Slight code duplication

---

### Option 3: Separate Routes (Like Settings)
**Approach:** Create `/HostProfile` and `/GuestProfile` routes, similar to `/HostSettings` and `/Settings`.

**Pros:**
- Consistent with existing Settings pattern
- Explicit routes for each user type
- Clear separation

**Cons:**
- Need to update navigation/links throughout app
- Two routes to maintain

---

## **RECOMMENDED IMPLEMENTATION: Option 2 - Separate Components with Smart Routing**

This approach provides clean separation while maintaining a single `/Profile` route that automatically serves the correct component.

---

## Implementation Plan

### Step 1: Create GuestProfile Component
**File:** `src/components/UserFolder/GuestProfile.jsx`

**Features:**
- Copy existing Profile.jsx structure
- **Remove** Points Display Section (lines 311-395)
- Keep all profile form fields
- Use UserFolder Header (same as current)
- No changes to profile editing functionality

**What to Remove:**
- Points Balance display
- Rewards button/link
- History button/link
- `usePoints` hook import (if not needed elsewhere)
- Sparkles icon import (if only used for points)

---

### Step 2: Create HostProfile Component
**File:** `src/components/hostFolder/HostProfile.jsx`

**Features:**
- Copy existing Profile.jsx structure
- **Keep** Points Display Section
- Keep all profile form fields
- Use HostHeader component (Hheader.jsx) instead of UserHeader
- All functionality same as current Profile.jsx

---

### Step 3: Create Profile Router Component
**File:** `src/components/ProfileRouter.jsx` (or similar name)

**Functionality:**
- Check if user is host (using existing identification logic)
- Render `HostProfile` if host
- Render `GuestProfile` if guest
- Handle loading state
- Handle unauthenticated state

**Host Check Logic:**
```javascript
// Method 1: Check user role/accType
const userDoc = await getDoc(doc(db, "users", user.uid));
const userData = userDoc.data();
const isHost = userData?.role === "host" || userData?.accType === "host";

// Method 2: Check if user has properties (alternative/backup)
const propertiesQuery = query(
    collection(db, "properties"),
    where("ownerId", "==", user.uid)
);
const propertiesSnap = await getDocs(propertiesQuery);
const hasProperties = !propertiesSnap.empty;
```

---

### Step 4: Update App.jsx Routing
**Changes:**
- Keep `/Profile` route pointing to ProfileRouter component
- Or keep pointing to Profile.jsx but update Profile.jsx to be the router

**Recommended:** Update Profile.jsx to be the router component that conditionally renders HostProfile or GuestProfile.

---

### Step 5: Update Navigation Links
**Check and update if needed:**
- Header.jsx - Profile link
- Footer.jsx - Profile link (if exists)
- Any other navigation components
- All should still point to `/Profile`

---

## Detailed Component Structure

### GuestProfile.jsx Structure
```
GuestProfile Component
├── Header (UserFolder/Header)
├── Profile Card
│   ├── Profile Header
│   │   ├── Profile Image
│   │   └── Edit Profile Button
│   └── Form Section (NO Points Display Section)
│       ├── Personal Details
│       ├── Contacts
│       └── Address
└── Footer
```

### HostProfile.jsx Structure
```
HostProfile Component
├── Header (HostFolder/Hheader)
├── Profile Card
│   ├── Profile Header
│   │   ├── Profile Image
│   │   └── Edit Profile Button
│   ├── Points Display Section (KEPT)
│   │   ├── Points Balance
│   │   ├── Rewards Button
│   │   └── History Button
│   └── Form Section
│       ├── Personal Details
│       ├── Contacts
│       └── Address
└── Footer
```

---

## Files to Create/Modify

### New Files:
1. `src/components/UserFolder/GuestProfile.jsx` - Guest profile without points
2. `src/components/hostFolder/HostProfile.jsx` - Host profile with points

### Modified Files:
1. `src/components/UserFolder/Profile.jsx` - Convert to router component OR rename/repurpose
2. `src/App.jsx` - Update route if needed (likely no change if Profile.jsx becomes router)

---

## Recommendations & Best Practices

### 1. Code Reusability
- Consider extracting shared profile form logic into a custom hook or shared component
- Profile image upload logic can be shared
- Form fields rendering can be abstracted

### 2. User Experience
- Maintain consistent styling between HostProfile and GuestProfile
- Ensure smooth transition if user role changes
- Consider adding a loading state while checking host status

### 3. Testing Considerations
- Test with users who have `role: "host"` or `accType: "host"`
- Test with users who have properties but no role set
- Test with users who have neither
- Test profile editing functionality in both components

### 4. Future Enhancements
- If hosts need different profile fields in the future, separation makes this easier
- Consider adding profile completion progress indicator
- Consider different profile sections for hosts (business info, etc.)

---

## Alternative Quick Fix (If You Prefer Minimal Changes)

If you want a quicker implementation without separate files:

**Single File Approach:**
- Modify existing `Profile.jsx`
- Add host status check
- Conditionally render Points Display Section only if `isHost === true`
- Use conditional header rendering (UserHeader vs HostHeader) based on host status

**Pros:** Faster implementation, single file
**Cons:** Less clean separation, harder to customize separately later

---

## Questions for Clarification

1. **Header Preference:** Should HostProfile use HostHeader (`Hheader.jsx`) or UserHeader (`Header.jsx`)?
   - **Recommendation:** Use HostHeader for hosts to match HostSettings pattern

2. **Points Context:** Should guests still have access to PointsContext even if not displayed?
   - **Recommendation:** No, remove usePoints hook from GuestProfile entirely

3. **Routing Preference:** Do you prefer:
   - A) Single `/Profile` route with smart routing (Option 2 - Recommended)
   - B) Separate `/Profile` and `/HostProfile` routes (Option 3)
   - C) Conditional rendering in single component (Option 1)

4. **Backward Compatibility:** Do you have any existing links/bookmarks to `/Profile` that we need to maintain?
   - **Recommendation:** Keep `/Profile` route working for both, ensures compatibility

---

## Implementation Checklist

- [ ] Create GuestProfile.jsx (without Points section)
- [ ] Create HostProfile.jsx (with Points section)
- [ ] Create/Update ProfileRouter logic
- [ ] Update App.jsx routing (if needed)
- [ ] Test host profile access
- [ ] Test guest profile access
- [ ] Test profile editing functionality
- [ ] Verify Points section hidden for guests
- [ ] Verify Points section visible for hosts
- [ ] Check navigation links throughout app
- [ ] Test with different user role configurations

---

## Estimated Impact

**Files Affected:** 2-3 new files, 1-2 modified files
**Breaking Changes:** None (if we keep `/Profile` route)
**User Impact:** Positive - guests won't see irrelevant points section
**Development Time:** ~1-2 hours

---

Would you like me to proceed with **Option 2 (Separate Components with Smart Routing)** or do you prefer a different approach? Let me know if you need any clarifications or have preferences on the questions above!

