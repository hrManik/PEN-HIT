# Pen Battle: Bench Challenge — VS Code Runnable Project Packaging

A complete, self-contained, and playable 2D physics school bench pen-fighting game ready to open and run immediately in Visual Studio Code and local web browsers with zero installation requirements.

### User Review & Critical Decisions

> [!IMPORTANT]
> The game is designed to run 100% offline without Node.js, npm packages, or server dependencies. Opening the folder in VS Code with the Live Server extension or simply double-clicking `index.html` launches the full game instantly.

- **Confirmed Decision 1**: Keep the clean modular architecture (`index.html`, `css/style.css`, and separate scripts for `audio.js`, `physics.js`, `controls.js`, `ui.js`, `game.js`, `main.js`).
- **Confirmed Decision 2**: Provide dedicated `.vscode/launch.json` and `.vscode/settings.json` configurations inside `pen-battle-game/` so pressing `F5` in VS Code or clicking "Go Live" runs the game automatically.
- **Confirmed Decision 3**: Provide a consolidated single-file distribution (`standalone.html`) alongside the modular folder for convenience.

---

### 1. Overview & Core Concept

- **What It Does**: Simulates the beloved childhood classroom desk pen fight. Two players take turns using intuitive slingshot controls (mouse drag or finger touch) to aim and flick realistic capsule-shaped ballpoint pens across a wooden school bench, transferring momentum and rotational spin upon impact to knock the opponent's pen over the edge.
- **Target Audience**: Anyone seeking a nostalgic, tactile, high-replayability 2-player pass-and-play browser game.
- **Key Value**: Works natively in standard web browsers with zero build tools, zero dependencies, real-time procedural audio synthesis, and accurate 2D rigid-body collision physics.

---

### 2. User Experience & Visual Design

- **Visual Identity & Theme**:
  - *Desk Surface*: Warm walnut wood grain canvas with subtle carpenter groove planks, center divider, etched ruler scale, and schoolroom graffiti.
  - *Ballpoint Pens*: Royal Blue (Player 1) and Crimson Red (Player 2) capsule bodies with metallic cone tips, tungsten balls, ink reservoirs, and pocket clips.
  - *Edge Drop-Off*: Deep drop-shadow beneath the bench indicating physical height; pens toppling over edges undergo 3D perspective tumble and shadow decoupling.
- **Controls & HUD**:
  - Unobtrusive top scoreboard displaying active player turn indicator, current scores, and target winning score.
  - Dynamic slingshot aiming: backward pull vector with color-shifting power arc (green $\to$ amber $\to$ red) and forward laser trajectory guide.
  - Floating alert notifications for Knockouts, Bonus Turns, Fouls, and Match Point.
- **Audio Feedback**:
  - Synthesized via browser Web Audio API: snappy pen flick, realistic resonant plastic clack modulated by collision speed, edge fall tumble, floor thuds, and victory fanfare.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Zero External Dependencies vs. Heavy Physics Engines**
  - *Chosen Approach*: Lightweight, custom 2D capsule rigid body physics engine with continuous segment distance, impulse normal and friction resolution, torque spin, and table friction.
  - *Why*: Eliminates large 3rd-party bundles (Matter.js / Planck.js), ensures instantaneous loading without bundlers, and provides exact custom edge fall mechanics.
- **Decision 2: VS Code Integration Setup**
  - *Chosen Approach*: Include `.vscode/launch.json` and `.vscode/extensions.json` pre-configured for Chrome debugging and Live Server.
  - *Why*: Allows beginners and developers to open the folder in VS Code and press `F5` or right-click to run immediately.

---

### 4. Technical Architecture & Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                   VS Code Workspace Folder                  │
│                     (pen-battle-game/)                      │
└──────────────────────────────┬──────────────────────────────┘
                               │
       ┌───────────────────────┴───────────────────────┐
       ▼                                               ▼
┌──────────────────────────┐               ┌──────────────────────────┐
│   HTML5 & CSS3 Shell     │               │   VS Code Configurations │
│  - index.html            │               │  - .vscode/launch.json   │
│  - css/style.css         │               │  - .vscode/settings.json │
│  - standalone.html       │               │  - README.md             │
└──────────────┬───────────┘               └──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│                    Vanilla JS Subsystems                    │
│                                                             │
│   ┌────────────────┐      ┌─────────────────────────────┐   │
│   │   js/audio.js  │◄────┤          js/game.js         │   │
│   │ (Web Audio API)│      │    - Game State Machine     │   │
│   └────────────────┘      │    - Turn / Scoring Rules   │   │
│                           │    - Canvas Rendering       │   │
│   ┌────────────────┐      └──────────────▲──────────────┘   │
│   │  js/physics.js │                     │                  │
│   │ - Capsule Math │◄────────────────────┤                  │
│   │ - Torque & Spin│                     │                  │
│   │ - Edge Detect  │      ┌──────────────┴──────────────┐   │
│   └────────────────┘      │         js/controls.js      │   │
│                           │    - Slingshot Mouse/Touch  │   │
│   ┌────────────────┐      │    - Trajectory & Power     │   │
│   │    js/ui.js    │◄─────┴─────────────────────────────┘   │
│   │ - Scoreboard   │                     ▲                  │
│   │ - Turn Badges  │                     │                  │
│   │ - Modals & HUD │              js/main.js (Boot)         │
│   └────────────────┘                                        │
└─────────────────────────────────────────────────────────────┘
```

---

### 5. Step-by-Step Implementation Steps

1. **Verify Existing Project Folder**: Ensure all files inside `pen-battle-game/` are up to date and error-free.
2. **Add VS Code Configurations**:
   - Create `pen-battle-game/.vscode/launch.json` for 1-click browser debugging (`F5`).
   - Create `pen-battle-game/.vscode/settings.json` and `pen-battle-game/.vscode/extensions.json` recommending Live Server.
3. **Generate Consolidated Standalone Version**:
   - Create `pen-battle-game/standalone.html` containing the entire game in a single file for users who prefer opening a single file.
4. **Create Downloadable Archive**:
   - Package `pen-battle-game.zip` so the user can download the entire folder in one click.
5. **Update Documentation**:
   - Update `pen-battle-game/README.md` with step-by-step VS Code setup instructions.
