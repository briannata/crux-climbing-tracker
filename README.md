# 🧗 Crux

A bouldering tracker for climbers who care about the send.

Log every climb, range‑grade the ones you're not sure about, snap photos and videos of your beta, and watch your pyramid grow.

---

## Features

- **Log climbs** — V‑grade, route name, location, attempts, sessions, notes, date
- **Grade ranges** — tap multiple adjacent grades when you're not sure (`V4‑6`)
- **Sent vs. attempted** — track projects honestly; only sends count toward your pyramid
- **Photos & videos** — pick from your camera roll, looping playback in the detail view
- **Catalogue** — search by name, location, or grade; filter by chip
- **Stats**
  - Grade pyramid with summary (avg + hardest)
  - Monthly trend (highest send + average) rendered with SVG
- **Dark theme**, climbing‑inspired warm accent
- **Offline first** — everything stored locally on device via AsyncStorage

## Stack

- [Expo](https://expo.dev) (SDK 54) + [Expo Router](https://docs.expo.dev/router/introduction)
- React Native + TypeScript
- `expo-image-picker`, `expo-video`, `expo-video-thumbnails`
- `react-native-svg` for the trend chart
- `@react-native-async-storage/async-storage` for persistence

## Project structure

```
app/
├── (tabs)/          # Feed, Catalogue, Stats
├── climb/[id].tsx   # Climb detail
├── log.tsx          # Log/edit modal
└── _layout.tsx
components/          # GradeTag, ClimbCard, MediaPicker, MediaView
constants/climbing.ts  # Grades, palette, theme, types
hooks/use-climbs.tsx   # Climbs context + AsyncStorage
```

## Run it

```bash
npm install
npx expo start
```

Scan the QR with [Expo Go](https://expo.dev/go) on your phone.

## Publishing updates

```bash
npx eas-cli update --branch main --message "what changed"
```

The published app is available to anyone signed into the project's Expo account.

## Roadmap

- [ ] Outdoor / sport grade systems (5.x, font scale)
- [ ] Persist media in `FileSystem.documentDirectory` so iOS doesn't evict cached files
- [ ] Optional iCloud / cloud backup
- [ ] PWA build for sharing without an app store

---

Named after the **crux** — the hardest move of a climb, where the route is won or lost.
