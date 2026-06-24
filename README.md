# Ambidex Game

A LAN multiplayer implementation of the Ambidex game from *Virtue's Last Reward*. Host a game on PC and have players join via Android or any device on the same network.

## Features

- **Desktop exe**: Runs as server + host UI in a frameless window
- **Android APK**: Join-only client with mobile-optimized UI
- **LAN multiplayer**: No internet required, works over local network
- **Terminal-style UI**: Source Code Pro font, teal color scheme, retro terminal aesthetic
- **Ambidex gameplay**: Ally/Betray votes, slot pairings, real-time results reveal
- **OST Music Player**: Built-in player with VLR/999 soundtrack (host only)

## Quick Start

### Windows Exe

1. Download the latest `AmbidexGame.exe` from Releases
2. Run it — the first instance starts the server and opens the host UI
3. Players on the same network open `http://<host-ip>:3000` in a browser
4. Or use the Android APK to scan/connect

### Development

```bash
# Install dependencies
npm install

# Run server locally
npm start

# Build Windows exe
npm run build

# Build Android APK (requires Android SDK + Capacitor)
npx cap sync android
cd android
./gradlew assembleDebug
```

## Controls

- **HOST GAME**: Start a server and manage players/rounds
- **JOIN TEAM**: Enter the host's LAN IP to connect as a player
- **Fullscreen toggle**: Bottom-right corner (PC only)
- **Music player**: Bottom-left corner (host only) — select and play VLR/999 tracks

## Project Structure

```
ambidex-game/
├── server.js              # Express + Socket.IO server
├── public/                # Web client files
│   ├── index.html         # Desktop/web client
│   ├── mobile.html        # Android client
│   ├── game.js            # Game logic + socket handlers
│   ├── style.css          # Desktop styles
│   ├── style-mobile.css   # Mobile styles
│   ├── music/             # OST tracks
│   └── *.wav              # Sound effects
├── android/               # Capacitor Android project
├── scripts/
│   └── prebuild.js        # Nexe icon patching
└── capacitor.config.ts    # Capacitor configuration
```

## Tech Stack

- **Server**: Node.js, Express, Socket.IO
- **Client**: Vanilla JS, CSS, Socket.IO Client
- **Desktop**: Nexe (bundles server into Windows exe)
- **Android**: Capacitor v8 (wraps web client as native APK)

## License

MIT
