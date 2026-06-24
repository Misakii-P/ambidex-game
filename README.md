# Ambidex Game

![Ambidex Game Logo](https://media.discordapp.net/attachments/1153393930872827945/1519425836774719658/ABgamelogo.png?ex=6a3d8315&is=6a3c3195&hm=d3d0da9278b862cea156379992a971a8ec0da030404832df85863b51521a2e3b&=&format=webp&quality=lossless&width=1216&height=684)
"So what's it going to be? Will you choose to ally? ...Or to betray?"
This web-based game tries to make a 1:1 recreation of the Ambidex game featured in *Zero Escape: Virtue's Last Reward*.

## What is the Ambidex Game?

The Ambidex Game is Kotaro Uchikoshi's vision of the Prisoner's Dilemma. You either work in a pair, or a solo, and there can only be up to three solo and pair groups. Each group of solos and pairs are put against the other in a game where they have to choose to Ally, or to Betray. If both teams ally, then each one of the members in the group get 2 points. If one chooses ally and gets betrayed, the betrayed participant(s) loses 2 points while the ones who betray get 3 points, if both betray, no points for any; and so on.

![Ambidex Game Table](https://i.ytimg.com/vi/bdcv-LF3eQg/hqdefault.jpg)

I thought it would be a highly interesting concept to take into a LAN game. Maybe you want to put your friend's trust at test, or perhaps you want to place 9 strangers together in one facility going against eachother, which seems like a nice sunday plan.

## Features

- **Desktop exe**: Runs as server + host UI in a frameless window (only allows one instance per computer, localhost exists for browser clients on port 3000)
- **Android APK**: Join-only client with a simple UI
- **LAN multiplayer**: No internet required, works over local network
- **Terminal-style UI**: Source Code Pro font, teal color scheme, retro terminal aesthetic
- **Ambidex gameplay**: Ally/Betray votes, slot pairings, real-time results reveal
- **OST Music Player**: Built-in player with VLR/999 soundtrack for the host.

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

- **HOST GAME**: Start a server and manage players, rounds and solo/pairs grouping.
- **JOIN TEAM**: Enter the host's LAN IP to connect as a player
- **Fullscreen toggle**: Bottom-right corner (PC only)
- **Music player**: Bottom-left corner in the host menu — select and play VLR/999 tracks

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

*Virtue's Last Reward and the Ambidex Game owned by Kotaro Uchikoshi for Aksys Games, Spike Chunsoft - Misakii-P 2026*
