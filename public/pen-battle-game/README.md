# ✎ Pen Battle: Bench Challenge

A complete, playable 2D browser game inspired by the classic childhood school game where two players flick and hit their pens across a wooden school bench to knock the opponent's pen off the edge.

Built using **HTML5**, **CSS3**, and **Vanilla JavaScript** with realistic 2D capsule rigid-body physics, momentum transfer, torque spin, drop-off edge detection, procedural Web Audio sound synthesis, and touch/mouse slingshot controls.

---

## 📁 Project Structure

```
pen-battle-game/
├── index.html          # Main game markup and modal overlays
├── css/
│   └── style.css       # Nostalgic schoolroom styling and UI layout
├── js/
│   ├── audio.js        # Web Audio API sound synthesizer (procedural, zero assets)
│   ├── physics.js      # 2D capsule rigid body physics & edge detection
│   ├── controls.js     # Touch & mouse slingshot aiming system
│   ├── ui.js           # Scoreboard, modals, HUD, and notifications
│   ├── game.js         # Core game loop, desk rendering, rules & turn resolution
│   └── main.js         # Game entry point and initialization
├── assets/
│   └── README.md       # Assets information (procedural graphics & audio)
└── README.md           # Documentation and run instructions
```

---

## 🚀 How to Run the Game

### Method 1: Direct Double-Click (Zero Setup)
Because this game is built entirely in vanilla JavaScript without build tools or external network dependencies, you can simply:
1. Locate `index.html` inside the `pen-battle-game` folder.
2. Double-click `index.html` (or right-click → **Open with** → Google Chrome, Firefox, Safari, or Edge).
3. The game will launch and run immediately offline.

### Method 2: Open in Visual Studio Code
1. Open **VS Code**.
2. Select **File** → **Open Folder...** and select the `pen-battle-game` folder.
3. If you have the popular **Live Server** extension installed:
   - Right-click `index.html` and choose **"Open with Live Server"**.
4. Alternatively, use Python's built-in lightweight local server from the terminal:
   ```bash
   python3 -m http.server 8000
   ```
   Then open `http://localhost:8000` in your browser.

---

## 🎮 Game Rules & Mechanics

1. **Two Players**: Player 1 controls the classic Royal Blue Ballpoint pen; Player 2 controls the Crimson Red Ballpoint pen.
2. **Turn-Based Aiming**: Only the active player can shoot. Click or tap your pen, drag backward like a slingshot to aim and build power, then release to flick.
3. **Knockout (+1 Point & Bonus Turn)**: If you knock your opponent's pen completely off the wooden bench, you score 1 point AND get another consecutive shot!
4. **Miss or Incomplete**: If your shot misses the opponent's pen or fails to knock it off the bench, your turn ends and passes to the opponent.
5. **Self-Fall Foul (+1 Point to Opponent)**: If your own pen falls off the bench, you lose your turn, your opponent is awarded 1 point, and both pens are reset to safe positions.
6. **Double-Fall Foul Rule**: If both pens fall off the desk on the same shot, it is ruled an over-thrust foul by the shooter: exactly 1 point is awarded to the opponent and the turn passes over. No double points are ever awarded.
7. **Winning the Match**: The first player to reach the winning score (configurable to 3, 5, 7, or 10 points; default is 5) wins the match!

---

## ⚡ Physics & Technical Features

- **Capsule-to-Capsule Continuous Collision Detection**: Pens are modeled as 2D capsules (not simple circles or dots). Closest points between centerline segments are computed to provide exact collision normals and contact points.
- **Momentum & Torque Transfer**: Off-center hits impart angular velocity ($\tau = r \times F$), causing pens to spin realistically across the wood surface upon deflection.
- **Realistic Table Friction**: Pens experience sliding friction and rotational damping, stopping naturally without micro-jitter.
- **Center-of-Gravity Edge Detection**: Pens topple and trigger a 3D-perspective tumbling animation with drop shadow separation as soon as their center of gravity extends past any of the four bench edges.
- **Procedural Web Audio API**: No external MP3/WAV files required. Flick clicks, plastic clacks, falling whistles, floor thuds, and victory fanfares are synthesized dynamically in real-time.
- **Cross-Platform Responsive**: Fully playable with mouse or touchscreen on desktops, tablets, and mobile devices.
