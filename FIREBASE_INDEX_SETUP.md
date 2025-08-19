# Firebase Index Setup

The application requires several composite indexes to be created in Firebase Firestore. Follow these steps to create them:

## Required Indexes

### 1. Bank Accounts Index
**Collection**: `bankAccounts`
**Fields**:
- `userId` (Ascending)
- `createdAt` (Descending)

**Command**: 
```
gcloud firestore indexes create --collection-group=bankAccounts --field-config=field-path=userId,order=ascending --field-config=field-path=createdAt,order=descending
```

### 2. Payments Index
**Collection**: `payments`
**Fields**:
- `userId` (Ascending)
- `createdAt` (Descending)

**Command**:
```
gcloud firestore indexes create --collection-group=payments --field-config=field-path=userId,order=ascending --field-config=field-path=createdAt,order=descending
```

### 3. Withdrawal Requests Index
**Collection**: `withdrawalRequests`
**Fields**:
- `userId` (Ascending)
- `requestedAt` (Descending)

**Command**:
```
gcloud firestore indexes create --collection-group=withdrawalRequests --field-config=field-path=userId,order=ascending --field-config=field-path=requestedAt,order=descending
```

### 4. Payment Requests Index
**Collection**: `paymentRequests`
**Fields**:
- `status` (Ascending)
- `submittedAt` (Descending)

**Command**:
```
gcloud firestore indexes create --collection-group=paymentRequests --field-config=field-path=status,order=ascending --field-config=field-path=submittedAt,order=descending
```

### 5. Income Records Index
**Collection**: `incomeRecords`
**Fields**:
- `userId` (Ascending)
- `createdAt` (Descending)

**Command**:
```
gcloud firestore indexes create --collection-group=incomeRecords --field-config=field-path=userId,order=ascending --field-config=field-path=createdAt,order=descending
```

## Alternative: Create via Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: `vedmurti-ebb72`
3. Go to Firestore Database
4. Click on "Indexes" tab
5. Click "Create Index"
6. Add the indexes listed above

## Index Creation Links

You can also click these direct links to create the indexes:

- [Bank Accounts Index](https://console.firebase.google.com/v1/r/project/vedmurti-ebb72/firestore/indexes?create_composite=ClNwcm9qZWN0cy92ZWRtdXJ0aS1lYmI3Mi9kYXRhYmFzZXMvKGRlZmF1bHQpL2NvbGxlY3Rpb25Hcm91cHMvYmFua0FjY291bnRzL2luZGV4ZXMvXxABGgoKBnVzZXJJZBABGg0KCWNyZWF0ZWRBdBACGgwKCF9fbmFtZV9fEAI)
- [Payments Index](https://console.firebase.google.com/v1/r/project/vedmurti-ebb72/firestore/indexes?create_composite=Ck9wcm9qZWN0cy92ZWRtdXJ0aS1lYmI3Mi9kYXRhYmFzZXMvKGRlZmF1bHQpL2NvbGxlY3Rpb25Hcm91cHMvcGF5bWVudHMvaW5kZXhlcy9fEAEaCgoGdXNlcklkEAEaDQoJY3JlYXRlZEF0EAIaDAoIX19uYW1lX18QAg)
- [Withdrawal Requests Index](https://console.firebase.google.com/v1/r/project/vedmurti-ebb72/firestore/indexes?create_composite=Cllwcm9qZWN0cy92ZWRtdXJ0aS1lYmI3Mi9kYXRhYmFzZXMvKGRlZmF1bHQpL2NvbGxlY3Rpb25Hcm91cHMvd2l0aGRyYXdhbFJlcXVlc3RzL2luZGV4ZXMvXxABGgoKBnVzZXJJZBABGg8KC3JlcXVlc3RlZEF0EAIaDAoIX19uYW1lX18QAg)
- [Payment Requests Index](https://console.firebase.google.com/v1/r/project/vedmurti-ebb72/firestore/indexes?create_composite=ClNwcm9qZWN0cy92ZWRtdXJ0aS1lYmI3Mi9kYXRhYmFzZXMvKGRlZmF1bHQpL2NvbGxlY3Rpb25Hcm91cHMvcGF5bWVudFJlcXVlc3RzL2luZGV4ZXMvXxABGg0KCXN0YXR1cxABGg8KC3N1Ym1pdHRlZEF0EAIaDAoIX19uYW1lX18QAg)
- [Income Records Index](https://console.firebase.google.com/v1/r/project/vedmurti-ebb72/firestore/indexes?create_composite=ClNwcm9qZWN0cy92ZWRtdXJ0aS1lYmI3Mi9kYXRhYmFzZXMvKGRlZmF1bHQpL2NvbGxlY3Rpb25Hcm91cHMvaW5jb21lUmVjb3Jkcy9pbmRleGVzL18QARoKCgZ1c2VySWQQARoNCgljcmVhdGVkQXQQAhoMCghfX25hbWVfXxAC)

## Notes

- Index creation may take a few minutes
- The application will work without these indexes but with degraded performance
- Error handling is in place to fallback to simpler queries when indexes are not available

## Troubleshooting

### If you still see errors after creating indexes:
1. **Wait 5-10 minutes** for indexes to fully build
2. **Clear browser cache** and refresh the page
3. **Check index status** in Firebase Console under Firestore > Indexes
4. **Restart your development server** if needed

### For Internal Assertion Failures:
1. **Clear browser cache completely** (Ctrl+Shift+Delete)
2. **Hard refresh** the page (Ctrl+F5 or Cmd+Shift+R)
3. **Restart the development server** (`npm run dev`)
4. **Check Firebase project settings** to ensure correct configuration
5. **Clear browser storage** for localhost:5173 