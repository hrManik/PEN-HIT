/**
 * Pen Battle: Bench Challenge
 * Controls Manager: Mouse & Touch Slingshot Aiming System
 */

class ControlsManager {
  constructor(canvas, game) {
    this.canvas = canvas;
    this.game = game;

    // Dragging state
    this.isDragging = false;
    this.activePen = null;
    this.dragStart = { x: 0, y: 0 };
    this.dragCurrent = { x: 0, y: 0 };

    // Aiming tuning constants
    this.maxDragDistance = 140; // Max pixels of drag
    this.minDragDistance = 8;   // Deadzone to prevent accidental micro-clicks
    this.maxImpulseForce = 850; // Max velocity impulse applied to pen
    this.minImpulseForce = 120; // Min velocity impulse applied to pen
    this.touchPadding = 24;     // Extra radius for comfortable finger tapping

    // Bind event handlers
    this.onMouseDown = this.handlePointerDown.bind(this);
    this.onMouseMove = this.handlePointerMove.bind(this);
    this.onMouseUp = this.handlePointerUp.bind(this);

    this.attachEvents();
  }

  attachEvents() {
    this.canvas.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mouseup', this.onMouseUp);

    this.canvas.addEventListener('touchstart', this.onMouseDown, { passive: false });
    window.addEventListener('touchmove', this.onMouseMove, { passive: false });
    window.addEventListener('touchend', this.onMouseUp, { passive: false });
    window.addEventListener('touchcancel', this.onMouseUp, { passive: false });
  }

  detachEvents() {
    this.canvas.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mouseup', this.onMouseUp);

    this.canvas.removeEventListener('touchstart', this.onMouseDown);
    window.removeEventListener('touchmove', this.onMouseMove);
    window.removeEventListener('touchend', this.onMouseUp);
    window.removeEventListener('touchcancel', this.onMouseUp);
  }

  /**
   * Translates client coordinates to internal canvas resolution coordinates
   */
  getCanvasCoordinates(e) {
    const rect = this.canvas.getBoundingClientRect();
    let clientX, clientY;

    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if (e.changedTouches && e.changedTouches.length > 0) {
      clientX = e.changedTouches[0].clientX;
      clientY = e.changedTouches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }

  /**
   * Tests if point is near the specified pen's capsule
   */
  isPointNearPen(point, pen) {
    if (!pen || pen.isFalling || pen.hasFallen) return false;

    const endpoints = pen.getSegmentEndpoints();
    // Distance from point to segment
    const px = point.x;
    const py = point.y;
    const x1 = endpoints.p1.x;
    const y1 = endpoints.p1.y;
    const x2 = endpoints.p2.x;
    const y2 = endpoints.p2.y;

    const dx = x2 - x1;
    const dy = y2 - y1;
    const l2 = dx * dx + dy * dy;

    let t = 0;
    if (l2 > 0.0001) {
      t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / l2));
    }

    const projX = x1 + t * dx;
    const projY = y1 + t * dy;
    const dist = Math.hypot(px - projX, py - projY);

    return dist <= (pen.radius + this.touchPadding);
  }

  handlePointerDown(e) {
    // If paused, game over, or waiting for shot resolution, reject
    if (!this.game.canPlayerShoot()) return;

    const coords = this.getCanvasCoordinates(e);
    const activePen = this.game.getActivePlayerPen();

    if (!activePen) return;

    // Verify touch/click hit the ACTIVE player's pen only
    if (this.isPointNearPen(coords, activePen)) {
      if (e.cancelable) e.preventDefault();
      this.isDragging = true;
      this.activePen = activePen;
      this.dragStart = { x: activePen.x, y: activePen.y };
      this.dragCurrent = { x: coords.x, y: coords.y };
    }
  }

  handlePointerMove(e) {
    if (!this.isDragging || !this.activePen) return;
    if (e.cancelable) e.preventDefault();

    const coords = this.getCanvasCoordinates(e);
    this.dragCurrent = coords;
  }

  handlePointerUp(e) {
    if (!this.isDragging || !this.activePen) return;
    if (e.cancelable) e.preventDefault();

    // Compute slingshot vector: pulling backward propels the pen forward
    const pullX = this.dragStart.x - this.dragCurrent.x;
    const pullY = this.dragStart.y - this.dragCurrent.y;
    const pullDist = Math.hypot(pullX, pullY);

    if (pullDist >= this.minDragDistance) {
      const clampedDist = Math.min(pullDist, this.maxDragDistance);
      const powerRatio = clampedDist / this.maxDragDistance;

      // Forward direction is in direction of pull vector (pull back -> shoots forward)
      const dirX = pullX / pullDist;
      const dirY = pullY / pullDist;

      // Non-linear power curve for more tactile feel
      const curvedPower = Math.pow(powerRatio, 1.25);
      const totalImpulse = this.minImpulseForce + curvedPower * (this.maxImpulseForce - this.minImpulseForce);

      const impulseX = dirX * totalImpulse;
      const impulseY = dirY * totalImpulse;

      // Fire the shot in the game
      this.game.executeShot(this.activePen, impulseX, impulseY, powerRatio);
    }

    // Reset drag state
    this.isDragging = false;
    this.activePen = null;
  }

  /**
   * Retrieves active aiming data for canvas rendering
   */
  getAimData() {
    if (!this.isDragging || !this.activePen) return null;

    const pullX = this.dragStart.x - this.dragCurrent.x;
    const pullY = this.dragStart.y - this.dragCurrent.y;
    const pullDist = Math.hypot(pullX, pullY);

    if (pullDist < 3) return null;

    const clampedDist = Math.min(pullDist, this.maxDragDistance);
    const powerRatio = clampedDist / this.maxDragDistance;
    const dirX = pullX / (pullDist || 1);
    const dirY = pullY / (pullDist || 1);

    return {
      pen: this.activePen,
      origin: { x: this.activePen.x, y: this.activePen.y },
      dragPoint: this.dragCurrent,
      dir: { x: dirX, y: dirY },
      distance: clampedDist,
      maxDistance: this.maxDragDistance,
      powerRatio: powerRatio
    };
  }
}

// Attach globally
window.ControlsManager = ControlsManager;
