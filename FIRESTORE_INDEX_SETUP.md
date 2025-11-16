# Firestore Index Setup

## Problem
The payout requests queries require a composite index in Firestore because they filter by `hostId` and order by `createdAt`.

## Solution

### Option 1: Deploy using Firebase CLI (Recommended)

1. Make sure you have Firebase CLI installed:
   ```bash
   npm install -g firebase-tools
   ```

2. Login to Firebase (if not already):
   ```bash
   firebase login
   ```

3. Deploy the indexes:
   ```bash
   firebase deploy --only firestore:indexes
   ```

   This will create the required composite index for the `payoutRequests` collection.

### Option 2: Create Index via Firebase Console

1. When you see the error message, it will include a link like:
   ```
   https://console.firebase.google.com/project/YOUR_PROJECT/firestore/indexes?create_composite=...
   ```

2. Click on that link to automatically create the index in the Firebase Console.

3. Wait for the index to build (this can take a few minutes).

### Option 3: Manual Creation in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to Firestore Database → Indexes
4. Click "Create Index"
5. Set:
   - Collection ID: `payoutRequests`
   - Fields to index:
     - Field: `hostId`, Order: `Ascending`
     - Field: `createdAt`, Order: `Descending`
6. Click "Create"

## Temporary Workaround

The code now includes a fallback mechanism that will work without the index (though less efficiently). It will:
- Query without `orderBy` if the index is missing
- Sort the results in memory

However, for production use, you should deploy the index for better performance.

## Index Configuration

The index configuration is stored in `firestore.indexes.json`:
- Collection: `payoutRequests`
- Fields: `hostId` (Ascending), `createdAt` (Descending)

