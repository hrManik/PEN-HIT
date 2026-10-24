/**
 * Pen Battle: Bench Challenge
 * Main Application Bootstrapper
 */

document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('gameCanvas');
  if (!canvas) {
    console.error('Canvas element #gameCanvas not found!');
    return;
  }

  // Initialize game instance
  const game = new PenBattleGame(canvas);
  game.init();

  // Expose on window for easy console debugging or extensions
  window.penGame = game;

  // Open the Start Menu modal initially
  const startModal = document.getElementById('start-modal');
  if (startModal) {
    startModal.classList.add('active');
  }

  console.log('Pen Battle: Bench Challenge initialized successfully!');
});
