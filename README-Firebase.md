# Firebase Hosting Setup for PeaceBoard

This project is now configured for Firebase hosting with both frontend and backend deployment.

## Firebase Project Structure

```
├── firebase.json          # Firebase configuration
├── .firebaserc            # Firebase project settings
├── functions/             # Cloud Functions (Express.js backend)
│   ├── src/
│   │   └── index.ts       # Firebase Functions entry point
│   ├── package.json       # Functions dependencies
│   └── tsconfig.json      # TypeScript config for functions
└── dist/
    └── client/            # Built React frontend
```

## Setup Instructions

### 1. Firebase Project Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new Firebase project or select existing project
3. Enable the following services:
   - **Hosting** (for React frontend)
   - **Functions** (for Express.js backend)
   - **Firestore** (if using Firebase database features)

### 2. Update Project Configuration

Update `.firebaserc` with your actual Firebase project ID:

```json
{
  "projects": {
    "default": "your-project-id"
  }
}
```

### 3. Firebase CLI Authentication

```bash
# Login to Firebase (if not already logged in)
firebase login

# Initialize Firebase features (if needed)
firebase init
```

### 4. Local Development

```bash
# Install dependencies for Cloud Functions
cd functions && npm install && cd ..

# Build and serve locally with Firebase emulators
firebase emulators:start

# This will start:
# - Hosting emulator (typically on port 5000)
# - Functions emulator (typically on port 5001)
# - Emulator UI (typically on port 4000)
```

### 5. Deployment

#### Build and Deploy Everything
```bash
# Build React frontend
npm run build:client

# Build and deploy to Firebase
firebase deploy
```

#### Deploy Specific Services
```bash
# Deploy only hosting (frontend)
firebase deploy --only hosting

# Deploy only functions (backend)
firebase deploy --only functions
```

### 6. Environment Variables

Set environment variables in Firebase Functions:

```bash
# Set database connection
firebase functions:config:set database.url="your-database-url"

# Set OpenAI API key
firebase functions:config:set openai.api_key="your-openai-key"

# Set JWT secret
firebase functions:config:set auth.jwt_secret="your-jwt-secret"
```

## Firebase Configuration Explained

### firebase.json
- **hosting**: Serves the React app from `dist/client`
- **functions**: Configures Cloud Functions from `functions` directory
- **rewrites**: Routes API calls to Cloud Functions, SPA routing to index.html

### Functions Structure
- Entry point: `functions/src/index.ts`
- Exports Express app as Firebase Cloud Function
- Includes all authentication, game, music, and chat routes
- Handles CORS and request logging

## Deployment URLs

After deployment, your app will be available at:
- **Frontend**: `https://your-project-id.web.app`
- **API**: `https://us-central1-your-project-id.cloudfunctions.net/api`

## Local vs Production

- **Local Development**: Use the existing `npm run dev` for hot reloading
- **Firebase Emulators**: Use `firebase emulators:start` to test Firebase-specific features
- **Production**: Deploy to Firebase with `firebase deploy`

## Troubleshooting

### Common Issues

1. **Build Errors**: Ensure all TypeScript errors are resolved before deployment
2. **Environment Variables**: Make sure all required secrets are configured
3. **Database Connection**: Verify DATABASE_URL is set in Firebase Functions config
4. **CORS Issues**: Functions already include CORS middleware

### Logs and Debugging

```bash
# View function logs
firebase functions:log

# View real-time logs
firebase functions:log --follow

# Local debugging with emulators
firebase emulators:start --inspect-functions
```

## Cost Considerations

- **Firebase Hosting**: Free tier includes 10GB transfer, 1GB storage
- **Cloud Functions**: Pay-per-invocation, free tier includes 2M invocations/month
- **Firestore**: Pay-per-read/write, free tier includes 50K reads, 20K writes/day

Firebase automatically scales and handles SSL certificates, CDN, and domain management.