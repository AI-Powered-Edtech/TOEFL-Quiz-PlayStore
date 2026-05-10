# Release Artifacts

## Keystore (one-time)
```bash
./generate-keystore.sh ~/.android-keys/toefl-quiz-upload.jks
cp keystore.properties.example ../keystore.properties
# edit ../keystore.properties with real paths/passwords
```

## Build AAB
```bash
cd ../../          # back to frontend/
npm run build      # vite build → dist/
npx cap sync android
cd android
./gradlew bundleRelease
# Output: app/build/outputs/bundle/release/app-release.aab
```

## Verify signed AAB
```bash
jarsigner -verify -verbose -certs app/build/outputs/bundle/release/app-release.aab
```

## .gitignore reminder
Make sure these are in .gitignore (already added by this script if missing):
- frontend/android/keystore.properties
- frontend/android/app/google-services.json
- *.jks, *.keystore
