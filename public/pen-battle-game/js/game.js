/**
 * Pen Battle: Bench Challenge
 * Core Game Engine: State Management, Rules, Rendering, and Turn Flow
 */

class PenBattleGame {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    // Sub-systems
    this.audio = new AudioManager();
    this.physics = new PhysicsEngine();
    this.ui = null; // initialized in init()
    this.controls = null; // initialized in init()

    // Game Configuration
    this.winningScore = 5;
    this.player1Score = 0;
    this.player2Score = 0;
    this.activePlayer = 1; // 1 or 2

    // Game State: 'MENU' | 'AIMING' | 'IN_MOTION' | 'RESOLVING' | 'PAUSED' | 'GAME_OVER'
    this.state = 'MENU';
    this.previousState = 'MENU';

    // Desktop wooden bench dimensions in virtual canvas units (1200 x 750)
    this.virtualWidth = 1200;
    this.virtualHeight = 750;
    this.bench = {
      x: 90,
      y: 70,
      width: 1020,
      height: 610
    };

    // Pens
    this.pen1 = null;
    this.pen2 = null;

    // Turn tracking flags for scoring rules
    this.currentShooter = 1;
    this.opponentPenFell = false;
    this.shooterPenFell = false;
    this.shotCooldown = 0;

    // Visual particles & effects
    this.particles = [];
    this.confetti = [];
    this.shockwaves = [];

    // Animation & loop
    this.lastTime = 0;
    this.woodPatternCanvas = null;
    this.createWoodTexture();

    // Setup canvas scaling
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  init() {
    this.ui = new UIManager(this);
    this.controls = new ControlsManager(this.canvas, this);
    this.setupPens();
    this.ui.updateScore(this.player1Score, this.player2Score);
    this.ui.updateActivePlayer(this.activePlayer);
    this.ui.updateTargetScore(this.winningScore);

    // Start animation loop
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  resizeCanvas() {
    const container = document.getElementById('canvas-wrapper');
    if (!container) return;

    const availableWidth = Math.max(container.clientWidth - 24, 320);
    const availableHeight = Math.max(container.clientHeight - 24, 240);

    const aspectRatio = this.virtualWidth / this.virtualHeight;
    let w = availableWidth;
    let h = w / aspectRatio;

    if (h > availableHeight) {
      h = availableHeight;
      w = h * aspectRatio;
    }

    // Set internal resolution
    this.canvas.width = this.virtualWidth;
    this.canvas.height = this.virtualHeight;

    // Set CSS display size
    this.canvas.style.width = `${Math.floor(w)}px`;
    this.canvas.style.height = `${Math.floor(h)}px`;
  }

  /**
   * Generates a procedural wood grain texture for the school bench
   */
  createWoodTexture() {
    const patCanvas = document.createElement('canvas');
    patCanvas.width = 300;
    patCanvas.height = 300;
    const pCtx = patCanvas.getContext('2d');

    // Rich base wood tone
    pCtx.fillStyle = '#6d4522';
    pCtx.fillRect(0, 0, 300, 300);

    // Subtle grain lines
    pCtx.lineWidth = 1;
    for (let y = 0; y < 300; y += 4) {
      const alpha = 0.04 + Math.sin(y * 0.15) * 0.02 + Math.random() * 0.03;
      pCtx.strokeStyle = `rgba(40, 20, 5, ${alpha})`;
      pCtx.beginPath();
      pCtx.moveTo(0, y + (Math.random() - 0.5) * 2);
      pCtx.bezierCurveTo(
        100, y + Math.sin(y) * 4,
        200, y - Math.cos(y) * 4,
        300, y + (Math.random() - 0.5) * 2
      );
      pCtx.stroke();
    }

    // Light highlights
    for (let y = 0; y < 300; y += 12) {
      pCtx.strokeStyle = 'rgba(235, 175, 115, 0.025)';
      pCtx.beginPath();
      pCtx.moveTo(0, y);
      pCtx.lineTo(300, y);
      pCtx.stroke();
    }

    this.woodPatternCanvas = patCanvas;
  }

  setupPens() {
    // Player 1: Royal Blue Ballpoint Pen
    const p1Config = {
      primaryColor: '#2563eb',
      accentColor: '#1d4ed8',
      highlightColor: '#93c5fd',
      clipColor: '#cbd5e1',
      tipColor: '#94a3b8',
      ballColor: '#1e3a8a',
      inkColor: 'rgba(37, 99, 235, 0.9)'
    };

    // Player 2: Crimson Red Ballpoint Pen
    const p2Config = {
      primaryColor: '#dc2626',
      accentColor: '#b91c1c',
      highlightColor: '#fca5a5',
      clipColor: '#e2e8f0',
      tipColor: '#94a3b8',
      ballColor: '#7f1d1d',
      inkColor: 'rgba(220, 38, 38, 0.9)'
    };

    // Spawn Player 1 on the left, Player 2 on the right
    const p1X = this.bench.x + this.bench.width * 0.25;
    const p1Y = this.bench.y + this.bench.height * 0.5;

    const p2X = this.bench.x + this.bench.width * 0.75;
    const p2Y = this.bench.y + this.bench.height * 0.5;

    this.pen1 = new Pen('p1', 1, p1X, p1Y, 0, p1Config);
    this.pen2 = new Pen('p2', 2, p2X, p2Y, Math.PI, p2Config);
  }

  setWinningScore(score) {
    this.winningScore = score;
    if (this.ui) this.ui.updateTargetScore(score);
  }

  startMatch() {
    this.player1Score = 0;
    this.player2Score = 0;
    this.activePlayer = 1;
    this.state = 'AIMING';
    this.resetPensToDefault();
    this.ui.updateScore(this.player1Score, this.player2Score);
    this.ui.updateActivePlayer(this.activePlayer);
    this.ui.showNotification('MATCH STARTED! PLAYER 1 TO SHOOT', 'p1');
  }

  resetMatch() {
    this.player1Score = 0;
    this.player2Score = 0;
    this.activePlayer = 1;
    this.state = 'AIMING';
    this.resetPensToDefault();
    this.ui.updateScore(this.player1Score, this.player2Score);
    this.ui.updateActivePlayer(this.activePlayer);
    this.ui.showNotification('MATCH RESET! PLAYER 1 TURN', 'p1');
  }

  resetPensToDefault() {
    const p1X = this.bench.x + this.bench.width * 0.25;
    const p1Y = this.bench.y + this.bench.height * 0.5;

    const p2X = this.bench.x + this.bench.width * 0.75;
    const p2Y = this.bench.y + this.bench.height * 0.5;

    this.pen1.x = p1X;
    this.pen1.y = p1Y;
    this.pen1.vx = 0;
    this.pen1.vy = 0;
    this.pen1.angle = 0;
    this.pen1.angularVelocity = 0;
    this.pen1.isFalling = false;
    this.pen1.hasFallen = false;
    this.pen1.isStationary = true;
    this.pen1.hasHitOpponent = false;

    this.pen2.x = p2X;
    this.pen2.y = p2Y;
    this.pen2.vx = 0;
    this.pen2.vy = 0;
    this.pen2.angle = Math.PI;
    this.pen2.angularVelocity = 0;
    this.pen2.isFalling = false;
    this.pen2.hasFallen = false;
    this.pen2.isStationary = true;
    this.pen2.hasHitOpponent = false;
  }

  /**
   * Resets a single fallen pen back onto safe territory on its side
   */
  respawnFallenPen(pen) {
    const isP1 = pen.playerNumber === 1;
    pen.x = this.bench.x + this.bench.width * (isP1 ? 0.25 : 0.75);
    pen.y = this.bench.y + this.bench.height * 0.5;
    pen.vx = 0;
    pen.vy = 0;
    pen.angle = isP1 ? 0 : Math.PI;
    pen.angularVelocity = 0;
    pen.isFalling = false;
    pen.hasFallen = false;
    pen.isStationary = true;
    pen.hasHitOpponent = false;
  }

  pauseGame() {
    if (this.state !== 'PAUSED' && this.state !== 'GAME_OVER') {
      this.previousState = this.state;
      this.state = 'PAUSED';
    }
  }

  resumeGame() {
    if (this.state === 'PAUSED') {
      this.state = this.previousState || 'AIMING';
    }
  }

  canPlayerShoot() {
    return this.state === 'AIMING' && this.shotCooldown <= 0;
  }

  getActivePlayerPen() {
    return this.activePlayer === 1 ? this.pen1 : this.pen2;
  }

  getOpponentPen() {
    return this.activePlayer === 1 ? this.pen2 : this.pen1;
  }

  /**
   * Called by ControlsManager when player releases aim
   */
  executeShot(pen, impulseX, impulseY, powerRatio) {
    if (!this.canPlayerShoot()) return;

    this.currentShooter = this.activePlayer;
    this.opponentPenFell = false;
    this.shooterPenFell = false;
    this.pen1.hasHitOpponent = false;
    this.pen2.hasHitOpponent = false;

    // Apply physics impulse
    pen.applyImpulse(impulseX, impulseY);

    // Audio effect
    this.audio.playFlick(powerRatio);

    // Visual shockwave at flick origin
    this.addShockwave(pen.x, pen.y, '#fbbf24', 28);

    // Transition state
    this.state = 'IN_MOTION';
    this.shotCooldown = 0.3; // Prevent rapid re-triggering
  }

  onCollision(intensity, cx, cy) {
    this.audio.playClack(intensity);
    this.addShockwave(cx, cy, '#ffffff', 20 + Math.min(intensity * 0.05, 30));
    this.spawnSparks(cx, cy, 8);
  }

  onPenFall(pen) {
    this.audio.playFall();
    this.spawnDust(pen.x, pen.y, 14);

    if (pen.playerNumber === this.currentShooter) {
      this.shooterPenFell = true;
    } else {
      this.opponentPenFell = true;
    }
  }

  /**
   * Evaluates the outcome of a completed shot according to game rules:
   * Rule 6: If opponent's pen completely falls off -> active player gets 1 point!
   * Rule 7: After scoring, active player gets another turn (bonus turn)!
   * Rule 8: If active player's shot misses or fails to knock opponent off -> turn passes to other player.
   * Rule 9: If active player's own pen falls off -> player loses turn, opponent gets 1 point! Reset pens.
   * Simultaneous fall edge case: Foul on shooter -> opponent gets 1 point, turn passes to opponent.
   */
  resolveShotOutcome() {
    this.state = 'RESOLVING';

    const shooter = this.currentShooter;
    const opponent = shooter === 1 ? 2 : 1;

    // Case 1: Both pens fell off (Over-hit foul)
    if (this.shooterPenFell && this.opponentPenFell) {
      this.audio.playFoul();
      if (opponent === 1) this.player1Score++;
      else this.player2Score++;

      this.ui.updateScore(this.player1Score, this.player2Score);
      this.ui.showNotification(
        `DOUBLE FALL FOUL! +1 POINT TO PLAYER ${opponent}. OPPONENT'S TURN`,
        'foul',
        3000
      );

      // Both pens reset
      this.respawnFallenPen(this.pen1);
      this.respawnFallenPen(this.pen2);
      this.activePlayer = opponent;
    }
    // Case 2: Shooter's own pen fell off (Self-fall foul)
    else if (this.shooterPenFell) {
      this.audio.playFoul();
      if (opponent === 1) this.player1Score++;
      else this.player2Score++;

      this.ui.updateScore(this.player1Score, this.player2Score);
      this.ui.showNotification(
        `FOUL! PLAYER ${shooter} FELL OFF! +1 POINT TO PLAYER ${opponent}`,
        'foul',
        2800
      );

      // Respawn both pens safely
      this.respawnFallenPen(this.pen1);
      this.respawnFallenPen(this.pen2);
      this.activePlayer = opponent;
    }
    // Case 3: Opponent's pen knocked off! (Success)
    else if (this.opponentPenFell) {
      this.audio.playScore();
      if (shooter === 1) this.player1Score++;
      else this.player2Score++;

      this.ui.updateScore(this.player1Score, this.player2Score);
      this.ui.showNotification(
        `KNOCKOUT! PLAYER ${shooter} SCORED! +1 POINT (BONUS TURN)`,
        shooter === 1 ? 'p1' : 'p2',
        2800
      );

      // Reset pens for fair continuation
      this.respawnFallenPen(this.pen1);
      this.respawnFallenPen(this.pen2);

      // Rule 7: Active player gets another turn!
      this.activePlayer = shooter;
    }
    // Case 4: No one fell off (Miss or survived hit)
    else {
      // Rule 8: Turn passes to the opponent
      this.activePlayer = opponent;
      this.ui.showNotification(
        `TURN PASSES TO PLAYER ${opponent}`,
        opponent === 1 ? 'p1' : 'p2',
        1800
      );
    }

    this.ui.updateActivePlayer(this.activePlayer);

    // Check if winning score has been reached
    if (this.player1Score >= this.winningScore) {
      this.endGame(1);
    } else if (this.player2Score >= this.winningScore) {
      this.endGame(2);
    } else {
      // Ready for next shot after short delay
      setTimeout(() => {
        if (this.state === 'RESOLVING') {
          this.state = 'AIMING';
        }
      }, 700);
    }
  }

  endGame(winner) {
    this.state = 'GAME_OVER';
    this.audio.playVictory();
    this.spawnConfetti();
    this.ui.showGameOver(winner, this.player1Score, this.player2Score);
  }

  /**
   * Main game update tick
   */
  update(dt) {
    if (this.state === 'PAUSED' || this.state === 'MENU') return;

    if (this.shotCooldown > 0) {
      this.shotCooldown -= dt;
    }

    // Update pens physics
    this.physics.updatePen(this.pen1, this.bench, dt, (p) => this.onPenFall(p));
    this.physics.updatePen(this.pen2, this.bench, dt, (p) => this.onPenFall(p));

    // Handle pen-to-pen collision
    this.physics.checkAndResolveCollision(this.pen1, this.pen2, (speed, cx, cy) => {
      this.onCollision(speed, cx, cy);
    });

    // Check if all motion has ceased
    if (this.state === 'IN_MOTION') {
      const p1Done = this.pen1.isStationary || this.pen1.hasFallen;
      const p2Done = this.pen2.isStationary || this.pen2.hasFallen;

      if (p1Done && p2Done && this.shotCooldown <= 0) {
        this.resolveShotOutcome();
      }
    }

    // Update visual particles
    this.updateParticles(dt);
  }

  updateParticles(dt) {
    // Shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.radius += sw.speed * dt;
      sw.alpha -= dt * 2.0;
      if (sw.alpha <= 0) {
        this.shockwaves.splice(i, 1);
      }
    }

    // Sparks & Dust
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.alpha -= dt * p.decay;
      p.size = Math.max(0, p.size - dt * 2);
      if (p.alpha <= 0 || p.size <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // Confetti
    for (let i = this.confetti.length - 1; i >= 0; i--) {
      const c = this.confetti[i];
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      c.rotation += c.rotSpeed * dt;
      c.vy += 80 * dt; // gravity
      if (c.y > this.virtualHeight + 50) {
        this.confetti.splice(i, 1);
      }
    }
  }

  addShockwave(x, y, color, maxRadius) {
    this.shockwaves.push({
      x, y,
      color,
      radius: 4,
      maxRadius,
      speed: maxRadius * 3.5,
      alpha: 0.8
    });
  }

  spawnSparks(x, y, count = 8) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 140;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3 + Math.random() * 3,
        color: Math.random() > 0.5 ? '#fde047' : '#ffffff',
        alpha: 1.0,
        decay: 3.5
      });
    }
  }

  spawnDust(x, y, count = 12) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 20 + Math.random() * 80;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 5 + Math.random() * 6,
        color: '#b48a58',
        alpha: 0.8,
        decay: 2.0
      });
    }
  }

  spawnConfetti() {
    const colors = ['#f59e0b', '#3b82f6', '#ef4444', '#10b981', '#a855f7', '#fbbf24'];
    for (let i = 0; i < 120; i++) {
      this.confetti.push({
        x: Math.random() * this.virtualWidth,
        y: -20 - Math.random() * 150,
        vx: (Math.random() - 0.5) * 120,
        vy: 100 + Math.random() * 200,
        size: 6 + Math.random() * 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 8
      });
    }
  }

  /**
   * Main Render Loop
   */
  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.virtualWidth, this.virtualHeight);

    // 1. Draw Classroom Floor Background
    this.drawFloorBackground(ctx);

    // 2. Draw Wooden Bench with Depth & Details
    this.drawBench(ctx);

    // 3. Draw Active Aiming Guidelines
    this.drawAimGuide(ctx);

    // 4. Draw Pens
    this.drawPen(ctx, this.pen1);
    this.drawPen(ctx, this.pen2);

    // 5. Draw Particles, Shockwaves & Confetti
    this.drawEffects(ctx);
  }

  drawFloorBackground(ctx) {
    // Warm classroom tile pattern
    ctx.fillStyle = '#171310';
    ctx.fillRect(0, 0, this.virtualWidth, this.virtualHeight);

    // Subtle grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
    ctx.lineWidth = 1;
    for (let x = 0; x < this.virtualWidth; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.virtualHeight);
      ctx.stroke();
    }
    for (let y = 0; y < this.virtualHeight; y += 60) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.virtualWidth, y);
      ctx.stroke();
    }
  }

  drawBench(ctx) {
    const b = this.bench;

    // 1. Cast Drop Shadow below the desk (visual depth of height)
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 35;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 24;

    // Outer desk border (chamfered wood rim)
    ctx.fillStyle = '#3a200d';
    ctx.beginPath();
    ctx.roundRect(b.x - 8, b.y - 8, b.width + 16, b.height + 16, 12);
    ctx.fill();
    ctx.restore();

    // 2. Bench Tabletop Wood Fill
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(b.x, b.y, b.width, b.height, 8);
    ctx.clip();

    // Wood base pattern
    if (this.woodPatternCanvas) {
      const pattern = ctx.createPattern(this.woodPatternCanvas, 'repeat');
      ctx.fillStyle = pattern;
      ctx.fillRect(b.x, b.y, b.width, b.height);
    } else {
      ctx.fillStyle = '#784824';
      ctx.fillRect(b.x, b.y, b.width, b.height);
    }

    // Wooden planks separator grooves
    ctx.strokeStyle = 'rgba(40, 20, 5, 0.35)';
    ctx.lineWidth = 2;
    const plankHeight = b.height / 3;
    for (let i = 1; i < 3; i++) {
      const py = b.y + i * plankHeight;
      ctx.beginPath();
      ctx.moveTo(b.x, py);
      ctx.lineTo(b.x + b.width, py);
      ctx.stroke();

      // Plank highlight
      ctx.strokeStyle = 'rgba(255, 230, 200, 0.08)';
      ctx.beginPath();
      ctx.moveTo(b.x, py + 1.5);
      ctx.lineTo(b.x + b.width, py + 1.5);
      ctx.stroke();
    }

    // Nostalgic School Desk Markings:
    // 1. Center divider dashed line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.setLineDash([8, 8]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(b.x + b.width * 0.5, b.y + 20);
    ctx.lineTo(b.x + b.width * 0.5, b.y + b.height - 20);
    ctx.stroke();
    ctx.setLineDash([]);

    // 2. Engraved ruler scale along the top edge
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1;
    const rulerX = b.x + 40;
    const rulerY = b.y + 14;
    ctx.beginPath();
    ctx.moveTo(rulerX, rulerY);
    ctx.lineTo(rulerX + 300, rulerY);
    ctx.stroke();

    for (let m = 0; m <= 300; m += 10) {
      const tickH = m % 50 === 0 ? 8 : (m % 20 === 0 ? 5 : 3);
      ctx.beginPath();
      ctx.moveTo(rulerX + m, rulerY);
      ctx.lineTo(rulerX + m, rulerY + tickH);
      ctx.stroke();
    }

    // 3. Desk graffiti etching: "PEN BATTLE ✎"
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.font = 'bold 13px monospace';
    ctx.fillText('P1 DESK AREA', b.x + 40, b.y + b.height - 25);
    ctx.fillText('P2 DESK AREA', b.x + b.width - 150, b.y + b.height - 25);

    // Warm ambient lighting vignette
    const vigGrad = ctx.createRadialGradient(
      b.x + b.width * 0.5, b.y + b.height * 0.5, 100,
      b.x + b.width * 0.5, b.y + b.height * 0.5, b.width * 0.65
    );
    vigGrad.addColorStop(0, 'rgba(255, 240, 220, 0.06)');
    vigGrad.addColorStop(0.8, 'rgba(0, 0, 0, 0.12)');
    vigGrad.addColorStop(1, 'rgba(0, 0, 0, 0.45)');
    ctx.fillStyle = vigGrad;
    ctx.fillRect(b.x, b.y, b.width, b.height);

    // Inner desk bevel highlight
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
    ctx.lineWidth = 2;
    ctx.strokeRect(b.x + 1, b.y + 1, b.width - 2, b.height - 2);

    ctx.restore();

    // Bench Edge Cliff Indicators (warning stripes on boundary)
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.15)';
    ctx.lineWidth = 3;
    ctx.strokeRect(b.x, b.y, b.width, b.height);
  }

  drawAimGuide(ctx) {
    if (!this.controls) return;
    const aim = this.controls.getAimData();
    if (!aim || this.state !== 'AIMING') return;

    ctx.save();

    const origin = aim.origin;
    const dir = aim.dir;
    const power = aim.powerRatio; // 0.0 to 1.0

    // Dynamic color gradient based on shot power
    let powerColor = '#22c55e'; // Green
    if (power > 0.75) {
      powerColor = '#ef4444'; // Red
    } else if (power > 0.45) {
      powerColor = '#f59e0b'; // Amber
    }

    // 1. Pullback line (from pen center to drag cursor)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(origin.x, origin.y);
    ctx.lineTo(aim.dragPoint.x, aim.dragPoint.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Small anchor pull dot
    ctx.fillStyle = powerColor;
    ctx.beginPath();
    ctx.arc(aim.dragPoint.x, aim.dragPoint.y, 6, 0, Math.PI * 2);
    ctx.fill();

    // 2. Trajectory Forward Guidance Arrow
    const aimDistance = 50 + power * 220;
    const targetX = origin.x + dir.x * aimDistance;
    const targetY = origin.y + dir.y * aimDistance;

    // Trajectory dashed laser line
    ctx.strokeStyle = powerColor;
    ctx.lineWidth = 3 + power * 2;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.moveTo(origin.x + dir.x * 24, origin.y + dir.y * 24);
    ctx.lineTo(targetX, targetY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Arrowhead at target
    const arrowAngle = Math.atan2(dir.y, dir.x);
    const headLen = 14 + power * 6;
    ctx.fillStyle = powerColor;
    ctx.beginPath();
    ctx.moveTo(targetX, targetY);
    ctx.lineTo(
      targetX - headLen * Math.cos(arrowAngle - Math.PI / 6),
      targetY - headLen * Math.sin(arrowAngle - Math.PI / 6)
    );
    ctx.lineTo(
      targetX - headLen * Math.cos(arrowAngle + Math.PI / 6),
      targetY - headLen * Math.sin(arrowAngle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();

    // 3. Power Meter Arc around the Pen
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(origin.x, origin.y, 36, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = powerColor;
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(origin.x, origin.y, 36, -Math.PI / 2, -Math.PI / 2 + power * Math.PI * 2);
    ctx.stroke();

    // Power text percentage
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${Math.round(power * 100)}%`, origin.x, origin.y - 48);

    ctx.restore();
  }

  /**
   * Renders a highly detailed realistic ballpoint pen
   */
  drawPen(ctx, pen) {
    if (!pen || pen.hasFallen) return;

    ctx.save();
    ctx.translate(pen.x, pen.y);

    // If falling off the bench, apply 3D tumbling scale and shadow separation
    if (pen.isFalling) {
      const p = pen.fallProgress;
      const scale = 1.0 - p * 0.35;
      ctx.scale(scale, scale);
      ctx.globalAlpha = Math.max(0, 1.0 - p * 0.8);
    }

    ctx.rotate(pen.angle);

    const halfL = pen.length / 2;
    const halfW = pen.width / 2;
    const cfg = pen.colorConfig;

    // 1. Realistic Drop Shadow
    ctx.save();
    const shadowDist = pen.isFalling ? 10 + pen.fallProgress * 30 : 6;
    const shadowBlur = pen.isFalling ? 12 + pen.fallProgress * 20 : 8;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = shadowBlur;
    ctx.shadowOffsetX = shadowDist * 0.6;
    ctx.shadowOffsetY = shadowDist;

    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.roundRect(-halfL, -halfW, pen.length, pen.width, pen.radius);
    ctx.fill();
    ctx.restore();

    // Active Player Glowing Ring Indicator
    if (this.state === 'AIMING' && pen.playerNumber === this.activePlayer) {
      ctx.save();
      ctx.strokeStyle = pen.playerNumber === 1 ? 'rgba(59, 130, 246, 0.7)' : 'rgba(239, 68, 68, 0.7)';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.roundRect(-halfL - 5, -halfW - 5, pen.length + 10, pen.width + 10, pen.radius + 5);
      ctx.stroke();
      ctx.restore();
    }

    // 2. Pen Barrel Body (Main Cylinder)
    const barrelGrad = ctx.createLinearGradient(0, -halfW, 0, halfW);
    barrelGrad.addColorStop(0, cfg.highlightColor);
    barrelGrad.addColorStop(0.2, cfg.primaryColor);
    barrelGrad.addColorStop(0.7, cfg.accentColor);
    barrelGrad.addColorStop(1, '#0f172a');

    ctx.fillStyle = barrelGrad;
    ctx.beginPath();
    ctx.roundRect(-halfL + 12, -halfW, pen.length - 28, pen.width, 3);
    ctx.fill();

    // Internal ink reservoir streak (gives ballpoint look)
    ctx.fillStyle = cfg.inkColor;
    ctx.fillRect(-halfL + 20, -1.5, pen.length - 46, 3);

    // 3. Pen Tail Cap (Back End)
    ctx.fillStyle = cfg.accentColor;
    ctx.beginPath();
    ctx.arc(-halfL + 12, 0, halfW, Math.PI * 0.5, Math.PI * 1.5);
    ctx.fill();

    // Back plug ring
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(-halfL + 10, -halfW, 2.5, pen.width);

    // 4. Front Grip Section (Grip Rings)
    const gripStartX = halfL - 26;
    const gripWidth = 14;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
    ctx.fillRect(gripStartX, -halfW, gripWidth, pen.width);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1;
    for (let gx = gripStartX + 2; gx < gripStartX + gripWidth; gx += 3) {
      ctx.beginPath();
      ctx.moveTo(gx, -halfW);
      ctx.lineTo(gx, halfW);
      ctx.stroke();
    }

    // 5. Metal Cone Tip (Cone leading to the ball)
    const tipStartX = halfL - 12;
    const tipLength = 12;
    const coneGrad = ctx.createLinearGradient(0, -halfW, 0, halfW);
    coneGrad.addColorStop(0, '#f1f5f9');
    coneGrad.addColorStop(0.4, '#94a3b8');
    coneGrad.addColorStop(1, '#475569');

    ctx.fillStyle = coneGrad;
    ctx.beginPath();
    ctx.moveTo(tipStartX, -halfW * 0.85);
    ctx.lineTo(tipStartX + tipLength - 3, -2.5);
    ctx.lineTo(tipStartX + tipLength - 3, 2.5);
    ctx.lineTo(tipStartX, halfW * 0.85);
    ctx.closePath();
    ctx.fill();

    // 6. Tiny Ballpoint Sphere at the very apex
    ctx.fillStyle = cfg.ballColor;
    ctx.beginPath();
    ctx.arc(tipStartX + tipLength - 1.5, 0, 2.2, 0, Math.PI * 2);
    ctx.fill();

    // 7. Shiny Metal Pocket Clip (on upper side)
    const clipX = -halfL + 16;
    const clipLen = 32;
    const clipGrad = ctx.createLinearGradient(0, -halfW - 5, 0, -halfW);
    clipGrad.addColorStop(0, '#f8fafc');
    clipGrad.addColorStop(0.5, cfg.clipColor);
    clipGrad.addColorStop(1, '#64748b');

    ctx.fillStyle = clipGrad;
    ctx.beginPath();
    ctx.roundRect(clipX, -halfW - 4, clipLen, 3, 1.5);
    ctx.fill();

    // Clip base mounting ring
    ctx.fillStyle = '#64748b';
    ctx.fillRect(clipX, -halfW - 2, 4, 3);

    // 8. Top Specular Gleam along the barrel
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fillRect(-halfL + 14, -halfW + 2, pen.length - 36, 1.8);

    ctx.restore();
  }

  drawEffects(ctx) {
    // Shockwaves
    this.shockwaves.forEach(sw => {
      ctx.save();
      ctx.strokeStyle = sw.color;
      ctx.globalAlpha = sw.alpha;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    });

    // Sparks & Dust
    this.particles.forEach(p => {
      ctx.save();
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // Confetti
    this.confetti.forEach(c => {
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.rotation);
      ctx.fillStyle = c.color;
      ctx.fillRect(-c.size / 2, -c.size / 2, c.size, c.size);
      ctx.restore();
    });
  }

  loop(currentTime) {
    const dt = Math.min((currentTime - this.lastTime) / 1000, 0.1);
    this.lastTime = currentTime;

    this.update(dt);
    this.render();

    requestAnimationFrame((t) => this.loop(t));
  }
}

// Attach globally
window.PenBattleGame = PenBattleGame;
