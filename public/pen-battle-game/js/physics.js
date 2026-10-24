/**
 * Pen Battle: Bench Challenge
 * 2D Rigid Body Physics Engine for Capsule-shaped Pens
 * Handles linear & angular momentum, torque, friction, collisions, and table edges.
 */

class Pen {
  constructor(id, playerNumber, x, y, angle, colorConfig) {
    this.id = id;
    this.playerNumber = playerNumber; // 1 or 2
    this.x = x;
    this.y = y;
    this.angle = angle; // in radians
    
    // Linear & angular motion
    this.vx = 0;
    this.vy = 0;
    this.angularVelocity = 0; // in radians / sec
    
    // Geometry & mass properties (capsule shape)
    this.length = 86;
    this.width = 18;
    this.radius = 9;
    this.mass = 1.0;
    // Moment of inertia for thin rod/capsule: I = (1/12) * m * (L^2 + W^2)
    this.inertia = (1 / 12) * this.mass * (this.length * this.length + this.width * this.width);
    
    // Aesthetic details
    this.colorConfig = colorConfig;
    
    // State flags
    this.isFalling = false;
    this.fallProgress = 0; // 0.0 to 1.0
    this.fallDirection = { x: 0, y: 0 };
    this.hasFallen = false;
    this.isStationary = true;
    
    // Tracking collisions in the current turn
    this.hasHitOpponent = false;
  }

  /**
   * Returns the two endpoints of the capsule's core centerline segment
   */
  getSegmentEndpoints() {
    const halfLen = (this.length - this.width) / 2;
    const cos = Math.cos(this.angle);
    const sin = Math.sin(this.angle);
    return {
      p1: { x: this.x - cos * halfLen, y: this.y - sin * halfLen },
      p2: { x: this.x + cos * halfLen, y: this.y + sin * halfLen }
    };
  }

  /**
   * Applies an impulse force at a specific point on the pen body
   * @param {number} fx - force x
   * @param {number} fy - force y
   * @param {number} px - world point x
   * @param {number} py - world point y
   */
  applyImpulse(fx, fy, px = this.x, py = this.y) {
    this.vx += fx / this.mass;
    this.vy += fy / this.mass;
    
    // Torque = r x F
    const rx = px - this.x;
    const ry = py - this.y;
    const torque = rx * fy - ry * fx;
    this.angularVelocity += torque / this.inertia;
    
    this.isStationary = false;
  }

  /**
   * Returns speed magnitude
   */
  getSpeed() {
    return Math.hypot(this.vx, this.vy);
  }
}

class PhysicsEngine {
  constructor() {
    // Environmental physics constants
    this.linearFriction = 0.982;       // Desk sliding friction per tick
    this.angularFriction = 0.965;      // Spinning air/contact friction per tick
    this.restitution = 0.84;           // Bounciness of pen collisions
    this.contactFriction = 0.22;       // Friction between pens during collision
    this.stopThresholdLinear = 1.6;    // Minimum speed before stopping
    this.stopThresholdAngular = 0.035; // Minimum angular speed before stopping
  }

  /**
   * Computes the closest points between two line segments
   */
  closestPointsBetweenSegments(a1, a2, b1, b2) {
    const d1x = a2.x - a1.x;
    const d1y = a2.y - a1.y;
    const d2x = b2.x - b1.x;
    const d2y = b2.y - b1.y;
    const rx = a1.x - b1.x;
    const ry = a1.y - b1.y;

    const a = d1x * d1x + d1y * d1y;
    const e = d2x * d2x + d2y * d2y;
    const f = d2x * rx + d2y * ry;

    let s = 0.0;
    let t = 0.0;

    if (a <= 0.0001 && e <= 0.0001) {
      return {
        pA: { x: a1.x, y: a1.y },
        pB: { x: b1.x, y: b1.y },
        distSq: (a1.x - b1.x) ** 2 + (a1.y - b1.y) ** 2
      };
    }

    if (a <= 0.0001) {
      s = 0.0;
      t = Math.max(0.0, Math.min(1.0, f / e));
    } else {
      const c = d1x * rx + d1y * ry;
      if (e <= 0.0001) {
        t = 0.0;
        s = Math.max(0.0, Math.min(1.0, -c / a));
      } else {
        const b = d1x * d2x + d1y * d2y;
        const denom = a * e - b * b;

        if (denom !== 0.0) {
          s = Math.max(0.0, Math.min(1.0, (b * f - c * e) / denom));
        } else {
          s = 0.0;
        }

        t = (b * s + f) / e;

        if (t < 0.0) {
          t = 0.0;
          s = Math.max(0.0, Math.min(1.0, -c / a));
        } else if (t > 1.0) {
          t = 1.0;
          s = Math.max(0.0, Math.min(1.0, (b - c) / a));
        }
      }
    }

    const pA = { x: a1.x + d1x * s, y: a1.y + d1y * s };
    const pB = { x: b1.x + d2x * t, y: b1.y + d2y * t };
    const distSq = (pA.x - pB.x) ** 2 + (pA.y - pB.y) ** 2;

    return { pA, pB, distSq };
  }

  /**
   * Resolves collision between two capsule pens
   */
  checkAndResolveCollision(penA, penB, onCollision) {
    if (penA.isFalling || penB.isFalling) return false;

    const segA = penA.getSegmentEndpoints();
    const segB = penB.getSegmentEndpoints();

    const { pA, pB, distSq } = this.closestPointsBetweenSegments(segA.p1, segA.p2, segB.p1, segB.p2);
    const minDist = penA.radius + penB.radius;

    if (distSq < minDist * minDist) {
      let dist = Math.sqrt(distSq);
      let nx, ny;

      if (dist < 0.0001) {
        // Degenerate case: exactly coincident, separate along penA normal
        nx = -Math.sin(penA.angle);
        ny = Math.cos(penA.angle);
        dist = 0.0001;
      } else {
        nx = (pA.x - pB.x) / dist;
        ny = (pA.y - pB.y) / dist;
      }

      // Contact point
      const cx = (pA.x + pB.x) * 0.5;
      const cy = (pA.y + pB.y) * 0.5;

      // Contact vectors from centers of mass
      const rAx = cx - penA.x;
      const rAy = cy - penA.y;
      const rBx = cx - penB.x;
      const rBy = cy - penB.y;

      // Velocities at contact point
      const vApX = penA.vx - penA.angularVelocity * rAy;
      const vApY = penA.vy + penA.angularVelocity * rAx;

      const vBpX = penB.vx - penB.angularVelocity * rBy;
      const vBpY = penB.vy + penB.angularVelocity * rBx;

      // Relative velocity
      const relVx = vApX - vBpX;
      const relVy = vApY - vBpY;

      // Relative velocity along normal
      const velAlongNormal = relVx * nx + relVy * ny;

      // If already moving apart, do not apply repulsive impulse
      if (velAlongNormal < 0) {
        // 2D cross products: r x n
        const cA = rAx * ny - rAy * nx;
        const cB = rBx * ny - rBy * nx;

        const invMassSum = (1 / penA.mass) + (1 / penB.mass) + 
                          (cA * cA / penA.inertia) + (cB * cB / penB.inertia);

        // Normal impulse magnitude
        const jN = (-(1 + this.restitution) * velAlongNormal) / invMassSum;

        // Apply normal impulse
        const impX = jN * nx;
        const impY = jN * ny;

        penA.vx += impX / penA.mass;
        penA.vy += impY / penA.mass;
        penA.angularVelocity += (rAx * impY - rAy * impX) / penA.inertia;

        penB.vx -= impX / penB.mass;
        penB.vy -= impY / penB.mass;
        penB.angularVelocity -= (rBx * impY - rBy * impX) / penB.inertia;

        // Tangential friction impulse (spin grip)
        const tx = -ny;
        const ty = nx;
        const velAlongTangent = relVx * tx + relVy * ty;
        const cAt = rAx * ty - rAy * tx;
        const cBt = rBx * ty - rBy * tx;
        const invMassSumT = (1 / penA.mass) + (1 / penB.mass) + 
                           (cAt * cAt / penA.inertia) + (cBt * cBt / penB.inertia);

        let jT = -velAlongTangent / invMassSumT;
        // Friction cone: Coulomb law |jT| <= mu * jN
        const maxJT = this.contactFriction * jN;
        jT = Math.max(-maxJT, Math.min(maxJT, jT));

        const fricX = jT * tx;
        const fricY = jT * ty;

        penA.vx += fricX / penA.mass;
        penA.vy += fricY / penA.mass;
        penA.angularVelocity += (rAx * fricY - rAy * fricX) / penA.inertia;

        penB.vx -= fricX / penB.mass;
        penB.vy -= fricY / penB.mass;
        penB.angularVelocity -= (rBx * fricY - rBy * fricX) / penB.inertia;

        // Mark collision flags
        penA.hasHitOpponent = true;
        penB.hasHitOpponent = true;
        penA.isStationary = false;
        penB.isStationary = false;

        if (typeof onCollision === 'function') {
          onCollision(Math.abs(velAlongNormal), cx, cy);
        }
      }

      // Positional correction to resolve penetration
      const penetration = minDist - dist;
      const percent = 0.55;
      const slop = 0.05;
      const correctionMag = Math.max(penetration - slop, 0.0) / ((1 / penA.mass) + (1 / penB.mass)) * percent;
      
      penA.x += (correctionMag / penA.mass) * nx;
      penA.y += (correctionMag / penA.mass) * ny;
      penB.x -= (correctionMag / penB.mass) * nx;
      penB.y -= (correctionMag / penB.mass) * ny;

      return true;
    }

    return false;
  }

  /**
   * Updates motion, applies table friction, and checks edge fall conditions
   * @param {Pen} pen - pen object
   * @param {object} bench - { x, y, width, height }
   * @param {number} dt - delta time in seconds
   * @param {function} onPenFall - callback when pen begins to fall
   */
  updatePen(pen, bench, dt, onPenFall) {
    if (pen.hasFallen) return;

    // Handle falling animation if currently tumbling off the bench
    if (pen.isFalling) {
      pen.fallProgress += dt * 2.2; // ~0.45 second fall duration
      pen.x += pen.fallDirection.x * 120 * dt;
      pen.y += pen.fallDirection.y * 120 * dt;
      pen.angle += pen.angularVelocity * dt * 0.7;

      if (pen.fallProgress >= 1.0) {
        pen.hasFallen = true;
        pen.isFalling = false;
        pen.isStationary = true;
      }
      return;
    }

    // Standard motion integration
    pen.x += pen.vx * dt;
    pen.y += pen.vy * dt;
    pen.angle += pen.angularVelocity * dt;

    // Apply smooth surface friction
    const frictionFactor = Math.pow(this.linearFriction, dt * 60);
    const angularFrictionFactor = Math.pow(this.angularFriction, dt * 60);

    pen.vx *= frictionFactor;
    pen.vy *= frictionFactor;
    pen.angularVelocity *= angularFrictionFactor;

    // Check if motion has come to a stop
    const currentSpeed = pen.getSpeed();
    const currentAngular = Math.abs(pen.angularVelocity);

    if (currentSpeed < this.stopThresholdLinear && currentAngular < this.stopThresholdAngular) {
      pen.vx = 0;
      pen.vy = 0;
      pen.angularVelocity = 0;
      pen.isStationary = true;
    } else {
      pen.isStationary = false;
    }

    // Check bench edge fall condition:
    // A pen falls when its center of mass or more than 50% of its body goes beyond the bench boundary
    this.checkBenchBoundary(pen, bench, onPenFall);
  }

  /**
   * Evaluates if the pen has slipped past the bench edge
   */
  checkBenchBoundary(pen, bench, onPenFall) {
    if (pen.isFalling || pen.hasFallen) return;

    const bLeft = bench.x;
    const bRight = bench.x + bench.width;
    const bTop = bench.y;
    const bBottom = bench.y + bench.height;

    const endpoints = pen.getSegmentEndpoints();
    const centerOffLeft = pen.x < bLeft;
    const centerOffRight = pen.x > bRight;
    const centerOffTop = pen.y < bTop;
    const centerOffBottom = pen.y > bBottom;

    // If center of mass is outside the bench, it topples off immediately
    let fell = false;
    let dirX = 0;
    let dirY = 0;

    if (centerOffLeft) {
      fell = true;
      dirX = -1;
    } else if (centerOffRight) {
      fell = true;
      dirX = 1;
    }

    if (centerOffTop) {
      fell = true;
      dirY = -1;
    } else if (centerOffBottom) {
      fell = true;
      dirY = 1;
    }

    // If center is barely inside, but BOTH endpoints are tilted over the same side
    if (!fell) {
      const p1OffLeft = endpoints.p1.x < bLeft;
      const p2OffLeft = endpoints.p2.x < bLeft;
      if (p1OffLeft && p2OffLeft) {
        fell = true;
        dirX = -1;
      }
      const p1OffRight = endpoints.p1.x > bRight;
      const p2OffRight = endpoints.p2.x > bRight;
      if (p1OffRight && p2OffRight) {
        fell = true;
        dirX = 1;
      }
      const p1OffTop = endpoints.p1.y < bTop;
      const p2OffTop = endpoints.p2.y < bTop;
      if (p1OffTop && p2OffTop) {
        fell = true;
        dirY = -1;
      }
      const p1OffBottom = endpoints.p1.y > bBottom;
      const p2OffBottom = endpoints.p2.y > bBottom;
      if (p1OffBottom && p2OffBottom) {
        fell = true;
        dirY = 1;
      }
    }

    if (fell) {
      pen.isFalling = true;
      pen.fallProgress = 0;
      // Default fall direction along velocity vector or edge normal
      const speed = pen.getSpeed();
      if (speed > 10) {
        pen.fallDirection = { x: pen.vx / speed, y: pen.vy / speed };
      } else {
        const len = Math.hypot(dirX, dirY) || 1;
        pen.fallDirection = { x: dirX / len, y: dirY / len };
      }
      // Give it extra angular tumble as it drops off the edge
      pen.angularVelocity += (Math.random() - 0.5) * 6;

      if (typeof onPenFall === 'function') {
        onPenFall(pen);
      }
    }
  }
}

// Attach globally
window.Pen = Pen;
window.PhysicsEngine = PhysicsEngine;
