const { test, expect } = require('@playwright/test');

test('Drone Soccer Game - Aspect Ratio and Scoring Rules', async ({ page }) => {
  // Navigate to the game page
  await page.goto('http://localhost:8000');
  
  // Wait for the canvas to be visible
  const canvas = await page.waitForSelector('canvas#game-canvas');
  
  // Test 1: Check if the canvas maintains the correct aspect ratio (2:1)
  const boundingBox = await canvas.boundingBox();
  console.log(`Canvas dimensions: ${boundingBox.width}x${boundingBox.height}`);
  
  // Allow for small rounding differences (within 5 pixels)
  const aspectRatio = boundingBox.width / boundingBox.height;
  expect(Math.abs(aspectRatio - 2.0)).toBeLessThan(0.1);
  
  // Test 2: Start the game
  await page.click('#start-button');
  await page.waitForTimeout(1000);
  
  // Take a screenshot of the initial game state
  await page.screenshot({ path: 'tests/initial-game.png' });
  
  // Test 3: Check the console for scoring messages
  page.on('console', msg => {
    console.log(`BROWSER CONSOLE: ${msg.text()}`);
  });
  
  // Test 4: Simulate player movement to test scoring
  // Press arrow keys to move the player's drone
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(2000);
  await page.keyboard.up('ArrowRight');
  
  await page.keyboard.down('ArrowUp');
  await page.waitForTimeout(1000);
  await page.keyboard.up('ArrowUp');
  
  // Take a screenshot after movement
  await page.screenshot({ path: 'tests/after-movement.png' });
  
  // Wait for potential scoring events
  await page.waitForTimeout(5000);
  
  // Test 5: Check the score display
  const team1Score = await page.textContent('#team1-score');
  const team2Score = await page.textContent('#team2-score');
  console.log(`Final scores - Team 1: ${team1Score}, Team 2: ${team2Score}`);
  
  // Take a final screenshot
  await page.screenshot({ path: 'tests/final-state.png' });
}); 