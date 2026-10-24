/**
 * Pen Battle: Bench Challenge
 * User Interface & HUD Controller
 */

class UIManager {
  constructor(game) {
    this.game = game;

    // Cache DOM Elements
    this.p1ScoreEl = document.getElementById('p1-score');
    this.p2ScoreEl = document.getElementById('p2-score');
    this.p1CardEl = document.getElementById('p1-card');
    this.p2CardEl = document.getElementById('p2-card');
    this.targetScoreBadgeEl = document.getElementById('target-score-badge');
    this.notificationBanner = document.getElementById('notification-banner');

    // Modals
    this.startModal = document.getElementById('start-modal');
    this.pauseModal = document.getElementById('pause-modal');
    this.rulesModal = document.getElementById('rules-modal');
    this.gameOverModal = document.getElementById('game-over-modal');

    // Game Over elements
    this.winnerTextEl = document.getElementById('winner-text');
    this.winnerScoreEl = document.getElementById('winner-score-summary');

    // Audio button
    this.soundToggleBtn = document.getElementById('sound-toggle-btn');
    this.soundIcon = document.getElementById('sound-icon');

    this.notificationTimeout = null;

    this.bindEvents();
    this.updateSoundButton();
  }

  bindEvents() {
    // Start game button
    const startBtn = document.getElementById('start-game-btn');
    if (startBtn) {
      startBtn.addEventListener('click', () => {
        this.hideModal(this.startModal);
        this.game.startMatch();
      });
    }

    // Target score selection pills in start modal
    const scorePills = document.querySelectorAll('.target-score-pill');
    scorePills.forEach(pill => {
      pill.addEventListener('click', (e) => {
        scorePills.forEach(p => p.classList.remove('active'));
        e.currentTarget.classList.add('active');
        const target = parseInt(e.currentTarget.dataset.score, 10) || 5;
        this.game.setWinningScore(target);
        this.updateTargetScore(target);
      });
    });

    // Pause / Resume buttons
    const pauseBtn = document.getElementById('pause-btn');
    if (pauseBtn) {
      pauseBtn.addEventListener('click', () => {
        this.game.pauseGame();
        this.showModal(this.pauseModal);
      });
    }

    const resumeBtn = document.getElementById('resume-btn');
    if (resumeBtn) {
      resumeBtn.addEventListener('click', () => {
        this.hideModal(this.pauseModal);
        this.game.resumeGame();
      });
    }

    // Rules modal
    const rulesBtn = document.getElementById('rules-btn');
    if (rulesBtn) {
      rulesBtn.addEventListener('click', () => {
        this.game.pauseGame();
        this.showModal(this.rulesModal);
      });
    }

    const closeRulesBtn = document.getElementById('close-rules-btn');
    if (closeRulesBtn) {
      closeRulesBtn.addEventListener('click', () => {
        this.hideModal(this.rulesModal);
        this.game.resumeGame();
      });
    }

    // Restart button
    const restartBtn = document.getElementById('restart-btn');
    if (restartBtn) {
      restartBtn.addEventListener('click', () => {
        if (confirm('Restart the current match from 0 - 0?')) {
          this.game.resetMatch();
        }
      });
    }

    const pauseRestartBtn = document.getElementById('pause-restart-btn');
    if (pauseRestartBtn) {
      pauseRestartBtn.addEventListener('click', () => {
        this.hideModal(this.pauseModal);
        this.game.resetMatch();
      });
    }

    // Game over play again button
    const playAgainBtn = document.getElementById('play-again-btn');
    if (playAgainBtn) {
      playAgainBtn.addEventListener('click', () => {
        this.hideModal(this.gameOverModal);
        this.showModal(this.startModal);
      });
    }

    // Sound toggle button
    if (this.soundToggleBtn) {
      this.soundToggleBtn.addEventListener('click', () => {
        const isMuted = this.game.audio.toggleMute();
        this.updateSoundButton();
        this.showNotification(isMuted ? 'SOUND MUTED' : 'SOUND ENABLED', 'info', 1200);
      });
    }
  }

  updateSoundButton() {
    if (!this.soundIcon) return;
    const isMuted = this.game.audio.isMuted();
    if (isMuted) {
      this.soundIcon.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="1" y1="1" x2="23" y2="23"></line>
          <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path>
          <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path>
          <line x1="12" y1="19" x2="12" y2="23"></line>
          <line x1="8" y1="23" x2="16" y2="23"></line>
        </svg>
      `;
      this.soundToggleBtn.title = 'Sound: Off';
    } else {
      this.soundIcon.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
        </svg>
      `;
      this.soundToggleBtn.title = 'Sound: On';
    }
  }

  showModal(el) {
    if (el) el.classList.add('active');
  }

  hideModal(el) {
    if (el) el.classList.remove('active');
  }

  updateScore(p1Score, p2Score) {
    if (this.p1ScoreEl) this.p1ScoreEl.textContent = p1Score;
    if (this.p2ScoreEl) this.p2ScoreEl.textContent = p2Score;
  }

  updateActivePlayer(playerNumber) {
    if (this.p1CardEl && this.p2CardEl) {
      if (playerNumber === 1) {
        this.p1CardEl.classList.add('active');
        this.p2CardEl.classList.remove('active');
      } else {
        this.p2CardEl.classList.add('active');
        this.p1CardEl.classList.remove('active');
      }
    }
  }

  updateTargetScore(score) {
    if (this.targetScoreBadgeEl) {
      this.targetScoreBadgeEl.textContent = `TARGET: ${score}`;
    }
  }

  /**
   * Displays temporary floating banner notification
   * @param {string} text - message
   * @param {string} type - 'p1', 'p2', 'foul', 'info'
   * @param {number} duration - ms to stay visible
   */
  showNotification(text, type = 'info', duration = 2400) {
    if (!this.notificationBanner) return;

    clearTimeout(this.notificationTimeout);
    this.notificationBanner.textContent = text;
    this.notificationBanner.className = 'show ' + type;

    this.notificationTimeout = setTimeout(() => {
      this.notificationBanner.className = '';
    }, duration);
  }

  showGameOver(winner, p1Score, p2Score) {
    if (this.winnerTextEl) {
      this.winnerTextEl.textContent = `PLAYER ${winner} WINS THE MATCH!`;
      this.winnerTextEl.style.color = winner === 1 ? '#60a5fa' : '#f87171';
    }
    if (this.winnerScoreEl) {
      this.winnerScoreEl.textContent = `FINAL SCORE: ${p1Score} - ${p2Score}`;
    }
    this.showModal(this.gameOverModal);
  }
}

// Attach globally
window.UIManager = UIManager;
