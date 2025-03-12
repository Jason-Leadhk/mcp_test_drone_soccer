/**
 * Drone Soccer Simulation Game
 * Based on FAI Drone Soccer rules
 */

// Game constants based on drone soccer rules
const DRONE_RADIUS = 10; // 0.2m radius scaled to pixels (20px at 50px per meter)

// Field dimensions (20m x 10m scaled to pixels)
const FIELD_WIDTH = 1000; // 20m = 1000px (50px per meter)
const FIELD_HEIGHT = 500; // 10m = 500px (50px per meter)

// Goal dimensions
const GOAL_POST_SIZE = 10; // 0.2m = 10px
const GOAL_POST_GAP = 40; // 0.8m = 40px
const GOAL_OFFSET = 100; // 2m = 100px
const GOAL_WALL_THICKNESS = 5;
const CENTER_LINE_THICKNESS = 2;
const GAME_DURATION = 180; // 3 minutes in seconds

// Team colors
const TEAM1_COLOR = '#FF4136'; // Red
const TEAM2_COLOR = '#0074D9'; // Blue
const STRIKER_HIGHLIGHT = '#FFDC00'; // Yellow highlight for strikers

// Game state
let gameRunning = false;
let gameTime = GAME_DURATION;
let team1Score = 0;
let team2Score = 0;
let lastTimestamp = 0;
// 添加两个全局标志变量，用于检查球队是否已经回到过己方半场
let ready_flag1 = true;
let ready_flag2 = true;

// Canvas and context
let canvas;
let ctx;

// Physics engine
let physics;

// Game objects
let drones = [];
let goals = [];
let playerDrone;

// Input state
const keys = {
    up: false,
    down: false,
    left: false,
    right: false
};

// Initialize the game
function init() {
    console.log("Initializing game");
    canvas = document.getElementById('game-canvas');
    console.log("Canvas element:", canvas);
    ctx = canvas.getContext('2d');
    
    // Set canvas dimensions
    canvas.width = FIELD_WIDTH;
    canvas.height = FIELD_HEIGHT;
    console.log("Canvas dimensions set to:", FIELD_WIDTH, "x", FIELD_HEIGHT);
    
    // Initialize physics engine
    physics = new PhysicsEngine();
    console.log("Physics engine initialized");
    
    // Create goals
    goals = [
        // Left goal (Team 1)
        {
            team: 1,
            posts: [
                // Top post
                {
                    position: new Vector2D(GOAL_OFFSET, FIELD_HEIGHT / 2 - GOAL_POST_GAP / 2 - GOAL_POST_SIZE),
                    width: GOAL_POST_SIZE,
                    height: GOAL_POST_SIZE
                },
                // Bottom post
                {
                    position: new Vector2D(GOAL_OFFSET, FIELD_HEIGHT / 2 + GOAL_POST_GAP / 2),
                    width: GOAL_POST_SIZE,
                    height: GOAL_POST_SIZE
                }
            ]
        },
        // Right goal (Team 2)
        {
            team: 2,
            posts: [
                // Top post
                {
                    position: new Vector2D(FIELD_WIDTH - GOAL_OFFSET - GOAL_POST_SIZE, FIELD_HEIGHT / 2 - GOAL_POST_GAP / 2 - GOAL_POST_SIZE),
                    width: GOAL_POST_SIZE,
                    height: GOAL_POST_SIZE
                },
                // Bottom post
                {
                    position: new Vector2D(FIELD_WIDTH - GOAL_OFFSET - GOAL_POST_SIZE, FIELD_HEIGHT / 2 + GOAL_POST_GAP / 2),
                    width: GOAL_POST_SIZE,
                    height: GOAL_POST_SIZE
                }
            ]
        }
    ];
    console.log("Goals created");
    
    // Set up event listeners
    setupEventListeners();
    console.log("Event listeners set up");
    
    // Reset the game
    resetGame();
    console.log("Game reset");
    
    // Start the game loop
    requestAnimationFrame(gameLoop);
    console.log("Game loop started");
}

// Set up event listeners for user input
function setupEventListeners() {
    // Keyboard events
    document.addEventListener('keydown', (e) => {
        handleKeyDown(e.key);
    });
    
    document.addEventListener('keyup', (e) => {
        handleKeyUp(e.key);
    });
    
    // Button events
    document.getElementById('start-button').addEventListener('click', startGame);
    document.getElementById('reset-button').addEventListener('click', resetGame);
}

// Handle key down events
function handleKeyDown(key) {
    switch (key.toLowerCase()) {
        case 'w':
        case 'arrowup':
            keys.up = true;
            break;
        case 's':
        case 'arrowdown':
            keys.down = true;
            break;
        case 'a':
        case 'arrowleft':
            keys.left = true;
            break;
        case 'd':
        case 'arrowright':
            keys.right = true;
            break;
    }
}

// Handle key up events
function handleKeyUp(key) {
    switch (key.toLowerCase()) {
        case 'w':
        case 'arrowup':
            keys.up = false;
            break;
        case 's':
        case 'arrowdown':
            keys.down = false;
            break;
        case 'a':
        case 'arrowleft':
            keys.left = false;
            break;
        case 'd':
        case 'arrowright':
            keys.right = false;
            break;
    }
}

// Start the game
function startGame() {
    if (!gameRunning) {
        gameRunning = true;
        lastTimestamp = performance.now();
    }
}

// Reset the game
function resetGame() {
    gameRunning = false;
    gameTime = GAME_DURATION;
    team1Score = 0;
    team2Score = 0;
    // 重置准备状态标志
    ready_flag1 = true;
    ready_flag2 = true;
    
    // Update scoreboard
    document.getElementById('team1-score').textContent = team1Score;
    document.getElementById('team2-score').textContent = team2Score;
    document.getElementById('game-timer').textContent = formatTime(gameTime);
    
    // Create drones
    createDrones();
}

// Create drones for both teams
function createDrones() {
    drones = [];
    
    // Team 1 (left side)
    drones.push({
        team: 1,
        isStriker: true,
        position: new Vector2D(FIELD_WIDTH * 0.25, FIELD_HEIGHT / 2),
        velocity: new Vector2D(0, 0),
        radius: DRONE_RADIUS,
        mass: 1,
        color: TEAM1_COLOR,
        isPlayer: true,
        aiState: {
            targetPosition: new Vector2D(FIELD_WIDTH * 0.75, FIELD_HEIGHT / 2),
            decisionTimer: 1 + Math.random()
        },
        scoringState: {
            enteredFromFront: false,
            exitedThroughBack: false,
            crossedGoalLine: false,
            scored: false,
            returnedToOwnHalf: true
        },
        shouldReturnHome: false
    });
    
    // Team 1 defenders
    for (let i = 0; i < 4; i++) {
        drones.push({
            team: 1,
            isStriker: false,
            position: new Vector2D(
                FIELD_WIDTH * 0.15,
                FIELD_HEIGHT * (0.3 + 0.15 * i)
            ),
            velocity: new Vector2D(0, 0),
            radius: DRONE_RADIUS,
            mass: 1,
            color: TEAM1_COLOR,
            isPlayer: false,
            aiState: {
                targetPosition: new Vector2D(FIELD_WIDTH * 0.5, FIELD_HEIGHT / 2),
                decisionTimer: 1 + Math.random()
            },
            scoringState: {
                enteredFromFront: false,
                exitedThroughBack: false,
                crossedGoalLine: false,
                scored: false,
                returnedToOwnHalf: true
            },
            shouldReturnHome: false
        });
    }
    
    // Team 2 (right side)
    drones.push({
        team: 2,
        isStriker: true,
        position: new Vector2D(FIELD_WIDTH * 0.75, FIELD_HEIGHT / 2),
        velocity: new Vector2D(0, 0),
        radius: DRONE_RADIUS,
        mass: 1,
        color: TEAM2_COLOR,
        isPlayer: false,
        aiState: {
            targetPosition: new Vector2D(FIELD_WIDTH * 0.25, FIELD_HEIGHT / 2),
            decisionTimer: 1 + Math.random()
        },
        scoringState: {
            enteredFromFront: false,
            exitedThroughBack: false,
            crossedGoalLine: false,
            scored: false,
            returnedToOwnHalf: true
        },
        shouldReturnHome: false
    });
    
    // Team 2 defenders
    for (let i = 0; i < 4; i++) {
        drones.push({
            team: 2,
            isStriker: false,
            position: new Vector2D(
                FIELD_WIDTH * 0.85,
                FIELD_HEIGHT * (0.3 + 0.15 * i)
            ),
            velocity: new Vector2D(0, 0),
            radius: DRONE_RADIUS,
            mass: 1,
            color: TEAM2_COLOR,
            isPlayer: false,
            aiState: {
                targetPosition: new Vector2D(FIELD_WIDTH * 0.5, FIELD_HEIGHT / 2),
                decisionTimer: 1 + Math.random()
            },
            scoringState: {
                enteredFromFront: false,
                exitedThroughBack: false,
                crossedGoalLine: false,
                scored: false,
                returnedToOwnHalf: true
            },
            shouldReturnHome: false
        });
    }
    
    // Set player drone
    playerDrone = drones.find(drone => drone.isPlayer);
    
    console.log("Drones initialized");
}

// Main game loop
function gameLoop(timestamp) {
    try {
        // Calculate delta time
        const deltaTime = lastTimestamp === 0 ? 0 : (timestamp - lastTimestamp) / 1000; // Convert to seconds
        lastTimestamp = timestamp;
        
        // Update game state
        if (gameRunning) {
            update(deltaTime);
        }
        
        // Render the game
        render();
        
        // Continue the game loop
        requestAnimationFrame(gameLoop);
    } catch (e) {
        console.error("Error in gameLoop:", e);
        // Try to recover by continuing the game loop
        requestAnimationFrame(gameLoop);
    }
}

// Update game state
function update(deltaTime) {
    try {
        // Update game timer
        gameTime -= deltaTime;
        if (gameTime <= 0) {
            gameTime = 0;
            gameRunning = false;
        }
        document.getElementById('game-timer').textContent = formatTime(gameTime);
        
        // Update player drone based on input
        try {
            updatePlayerInput(deltaTime);
        } catch (e) {
            console.error("Error in updatePlayerInput:", e);
        }
        
        // Update AI drones
        try {
            updateAI(deltaTime);
        } catch (e) {
            console.error("Error in updateAI:", e);
        }
        
        // Update physics for all drones
        try {
            updatePhysics(deltaTime);
        } catch (e) {
            console.error("Error in updatePhysics:", e);
        }
        
        // Check for goals
        try {
            checkGoals();
        } catch (e) {
            console.error("Error in checkGoals:", e);
        }
        
        // Check if strikers have returned to their own half
        try {
            checkStrikersReturnedToOwnHalf();
        } catch (e) {
            console.error("Error in checkStrikersReturnedToOwnHalf:", e);
        }
    } catch (e) {
        console.error("Error in update:", e);
    }
}

// Update player input
function updatePlayerInput(deltaTime) {
    if (!playerDrone) return;
    
    // Check if player drone should return home after team scored
    if (playerDrone.shouldReturnHome) {
        // Display a message to the player
        showMessage(`Return to your half of the field!`, 2000);
        
        // Check if drone has reached its own half
        const inOwnHalf = (playerDrone.team === 1 && playerDrone.position.x < FIELD_WIDTH / 2) || 
                         (playerDrone.team === 2 && playerDrone.position.x > FIELD_WIDTH / 2);
        
        if (inOwnHalf) {
            // Drone has returned home, clear the flag
            playerDrone.shouldReturnHome = false;
            console.log(`Player drone has returned to its own half`);
            showMessage(`You're back in your half!`, 1000);
        }
    }
    
    const acceleration = 200;
    let direction = new Vector2D(0, 0);
    
    // Handle keyboard input
    if (keys.up || keys.w || keys.W) {
        direction.y = -1;
    }
    if (keys.down || keys.s || keys.S) {
        direction.y = 1;
    }
    if (keys.left || keys.a || keys.A) {
        direction.x = -1;
    }
    if (keys.right || keys.d || keys.D) {
        direction.x = 1;
    }
    
    // Normalize direction if moving diagonally
    if (direction.x !== 0 && direction.y !== 0) {
        direction = direction.normalize();
    }
    
    // Apply acceleration
    const accelerationVector = direction.multiply(acceleration * deltaTime);
    playerDrone.velocity = playerDrone.velocity.add(accelerationVector);
    
    // Apply drag when no input
    if (direction.x === 0 && direction.y === 0) {
        playerDrone.velocity = playerDrone.velocity.multiply(0.95);
    }
    
    // Limit speed
    const maxSpeed = 150;
    const speed = playerDrone.velocity.magnitude();
    if (speed > maxSpeed) {
        playerDrone.velocity = playerDrone.velocity.normalize().multiply(maxSpeed);
    }
}

// Show a message to the player
let messageTimeout = null;
function showMessage(text, duration = 2000) {
    // Create message element if it doesn't exist
    let messageElement = document.getElementById('game-message');
    if (!messageElement) {
        messageElement = document.createElement('div');
        messageElement.id = 'game-message';
        messageElement.style.position = 'absolute';
        messageElement.style.top = '100px';
        messageElement.style.left = '50%';
        messageElement.style.transform = 'translateX(-50%)';
        messageElement.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        messageElement.style.color = 'white';
        messageElement.style.padding = '10px 20px';
        messageElement.style.borderRadius = '5px';
        messageElement.style.fontWeight = 'bold';
        messageElement.style.zIndex = '1000';
        document.querySelector('.game-container').appendChild(messageElement);
    }
    
    // Set message text
    messageElement.textContent = text;
    messageElement.style.display = 'block';
    
    // Clear previous timeout
    if (messageTimeout) {
        clearTimeout(messageTimeout);
    }
    
    // Hide message after duration
    messageTimeout = setTimeout(() => {
        messageElement.style.display = 'none';
    }, duration);
}

// Update AI drones
function updateAI(deltaTime) {
    drones.forEach(drone => {
        if (drone !== playerDrone && drone.aiState) {
            // Ensure decisionTimer exists
            if (drone.aiState.decisionTimer === undefined) {
                drone.aiState.decisionTimer = 1 + Math.random();
            }
            
            // Update AI decision timer
            drone.aiState.decisionTimer -= deltaTime;
            
            // If timer expired, make new decision
            if (drone.aiState.decisionTimer <= 0) {
                makeAIDecision(drone);
                drone.aiState.decisionTimer = 1 + Math.random(); // 1-2 seconds
            }
            
            // Move towards target if exists
            if (drone.aiState.targetPosition) {
                moveTowardsTarget(drone, deltaTime);
            }
        }
    });
}

// Make AI decision for a drone
function makeAIDecision(drone) {
    // Check if drone should return home after team scored
    if (drone.shouldReturnHome) {
        // Target a position in their own half
        let targetX;
        if (drone.team === 1) {
            // Team 1 (left side)
            targetX = FIELD_WIDTH * 0.25; // 1/4 of the field width
        } else {
            // Team 2 (right side)
            targetX = FIELD_WIDTH * 0.75; // 3/4 of the field width
        }
        
        // Set target position in own half
        drone.aiState.targetPosition = new Vector2D(
            targetX,
            FIELD_HEIGHT / 2 + (Math.random() - 0.5) * 100 // Random Y position near center
        );
        
        // Check if drone has reached its own half
        const inOwnHalf = (drone.team === 1 && drone.position.x < FIELD_WIDTH / 2) || 
                         (drone.team === 2 && drone.position.x > FIELD_WIDTH / 2);
        
        if (inOwnHalf) {
            // Drone has returned home, clear the flag
            drone.shouldReturnHome = false;
            console.log(`Team ${drone.team} drone has returned to its own half`);
        }
        
        return; // Skip normal AI behavior
    }
    
    // Different behavior based on role
    if (drone.isStriker) {
        // Check if the striker needs to return to their own half after scoring
        if (drone.scoringState && !drone.scoringState.returnedToOwnHalf) {
            // Target a position in their own half
            let targetX;
            if (drone.team === 1) {
                // Team 1 (left side)
                targetX = FIELD_WIDTH * 0.25; // 1/4 of the field width
            } else {
                // Team 2 (right side)
                targetX = FIELD_WIDTH * 0.75; // 3/4 of the field width
            }
            
            // Set target position in own half
            drone.aiState.targetPosition = new Vector2D(
                targetX,
                FIELD_HEIGHT / 2 + (Math.random() - 0.5) * 100 // Random Y position near center
            );
            
            console.log(`Team ${drone.team} AI striker is returning to their own half`);
        } else {
            // Normal attacking behavior - striker aims for the opponent's goal
            const targetGoal = drone.team === 1 ? goals[1] : goals[0];
            
            // Calculate goal center point (between the two posts)
            const topPost = targetGoal.posts[0];
            const bottomPost = targetGoal.posts[1];
            
            let goalX, goalY;
            
            if (targetGoal.team === 1) {
                // Left goal - 使用右侧边缘
                goalX = topPost.position.x + topPost.width;
                goalY = topPost.position.y + topPost.height + (bottomPost.position.y - (topPost.position.y + topPost.height)) / 2;
            } else {
                // Right goal - 使用左侧边缘
                goalX = topPost.position.x;
                goalY = topPost.position.y + topPost.height + (bottomPost.position.y - (topPost.position.y + topPost.height)) / 2;
            }
            
            drone.aiState.targetPosition = new Vector2D(goalX, goalY);
        }
    } else {
        // Defenders try to block opponent strikers or support their striker
        const opponentStriker = drones.find(d => d.team !== drone.team && d.isStriker);
        const teamStriker = drones.find(d => d.team === drone.team && d.isStriker);
        
        if (Math.random() < 0.7 && opponentStriker) {
            // 70% chance to defend against opponent striker
            drone.aiState.targetPosition = opponentStriker.position;
        } else if (teamStriker) {
            // 30% chance to support team striker
            const offset = new Vector2D(
                (Math.random() - 0.5) * 100,
                (Math.random() - 0.5) * 100
            );
            drone.aiState.targetPosition = teamStriker.position.add(offset);
        }
    }
}

// Move AI drone towards target
function moveTowardsTarget(drone, deltaTime) {
    const acceleration = 180; // Slightly less than player
    const maxSpeed = 130; // Slightly less than player
    
    // Calculate direction to target
    const direction = drone.aiState.targetPosition.subtract(drone.position).normalize();
    
    // Apply acceleration
    const accelerationVector = direction.multiply(acceleration * deltaTime);
    drone.velocity = drone.velocity.add(accelerationVector);
    
    // Limit speed
    const speed = drone.velocity.magnitude();
    if (speed > maxSpeed) {
        drone.velocity = drone.velocity.normalize().multiply(maxSpeed);
    }
}

// Update physics for all drones
function updatePhysics(deltaTime) {
    // Update positions
    drones.forEach(drone => {
        physics.update(drone, deltaTime);
    });
    
    // Check for collisions between drones
    for (let i = 0; i < drones.length; i++) {
        for (let j = i + 1; j < drones.length; j++) {
            if (physics.checkCollision(drones[i], drones[j])) {
                physics.resolveCollision(drones[i], drones[j]);
            }
        }
    }
    
    // Check for boundary collisions
    const bounds = { x: 0, y: 0, width: FIELD_WIDTH, height: FIELD_HEIGHT };
    drones.forEach(drone => {
        physics.checkBoundaryCollision(drone, bounds);
    });
    
    // Check for goal post collisions
    drones.forEach(drone => {
        goals.forEach(goal => {
            const collision = physics.checkGoalPostCollision(drone, goal);
            if (collision) {
                physics.handleGoalPostCollision(drone, goal, collision);
            }
        });
    });
}

/**
 * Check if any team has scored a goal
 */
function checkGoals() {
    // Check all drones for scoring
    drones.forEach(drone => {
        // Only check strikers for scoring
        if (!drone.isStriker) {
            return;
        }
        
        // Check against opposing goal
        const opposingGoal = drone.team === 1 ? goals[1] : goals[0];
        
        // Debug drone position and velocity
        console.log(`Team ${drone.team} striker position: (${drone.position.x.toFixed(2)}, ${drone.position.y.toFixed(2)}), velocity: (${drone.velocity.x.toFixed(2)}, ${drone.velocity.y.toFixed(2)})`);
        
        // Check if all team drones are in their own half
        const allDronesInOwnHalf = checkAllTeamDronesInOwnHalf(drone.team);
        
        // 更新准备状态标志
        if (allDronesInOwnHalf) {
            if (drone.team === 1) {
                ready_flag1 = true;
            } else {
                ready_flag2 = true;
            }
        }
        
        // Check for scoring in opposing goal
        const scoringResult = physics.checkGoal(drone, opposingGoal);
        if (scoringResult) {
            // 使用准备状态标志替代直接检查
            const teamReady = drone.team === 1 ? ready_flag1 : ready_flag2;
            
            // Check if team is ready (all drones have returned to their own half)
            if (teamReady) {
                console.log(`Team ${drone.team} scored a valid goal! Team is ready.`);
                
                // Update score
                if (drone.team === 1) {
                    team1Score++;
                    // 设置标志为false，需要重新回到己方半场
                    ready_flag1 = false;
                    console.log(`Team 1 score increased to ${team1Score}`);
                } else {
                    team2Score++;
                    // 设置标志为false，需要重新回到己方半场
                    ready_flag2 = false;
                    console.log(`Team 2 score increased to ${team2Score}`);
                }
                
                // Update score display
                updateScoreDisplay();
                
                // Reset scoring state, but not positions and speeds
                resetScoringState();
                
                // Set all team drones to return to their own half
                setTeamDronesToReturnHome(drone.team);
            } else {
                console.log(`Team ${drone.team} goal not counted! Team is not ready.`);
                // Reset just this drone's scoring state
                resetDroneScoringState(drone);
            }
        }
    });
}

/**
 * Check if all drones from a team are in their own half
 * @param {number} team - The team number (1 or 2)
 * @returns {boolean} - True if all drones from the team are in their own half
 */
function checkAllTeamDronesInOwnHalf(team) {
    const teamDrones = drones.filter(d => d.team === team);
    
    // Check if all drones from the team are in their own half
    return teamDrones.every(drone => {
        if (team === 1) {
            // Team 1 (left side)
            return drone.position.x < FIELD_WIDTH / 2;
        } else {
            // Team 2 (right side)
            return drone.position.x > FIELD_WIDTH / 2;
        }
    });
}

/**
 * Set all drones from a team to return to their own half
 * @param {number} team - The team number (1 or 2)
 */
function setTeamDronesToReturnHome(team) {
    const teamDrones = drones.filter(d => d.team === team);
    
    teamDrones.forEach(drone => {
        drone.shouldReturnHome = true;
        console.log(`Setting Team ${team} drone to return home`);
    });
}

/**
 * Reset scoring state for a single drone
 * @param {Object} drone - The drone to reset
 */
function resetDroneScoringState(drone) {
    if (drone.scoringState) {
        drone.scoringState.enteredFromFront = false;
        drone.scoringState.exitedThroughBack = false;
        drone.scoringState.crossedGoalLine = false;
        drone.scoringState.scored = false;
    }
}

/**
 * Reset scoring state for all drones
 */
function resetScoringState() {
    drones.forEach(drone => {
        resetDroneScoringState(drone);
    });
}

/**
 * Check if strikers have returned to their own half
 * This should be called in the update function
 */
function checkStrikersReturnedToOwnHalf() {
    drones.forEach(drone => {
        if (drone.isStriker && drone.scoringState && !drone.scoringState.returnedToOwnHalf) {
            // Check if the striker is in their own half
            const inOwnHalf = (drone.team === 1 && drone.position.x < FIELD_WIDTH / 2) || 
                             (drone.team === 2 && drone.position.x > FIELD_WIDTH / 2);
            
            if (inOwnHalf) {
                drone.scoringState.returnedToOwnHalf = true;
                console.log(`Team ${drone.team} striker has returned to their own half and can score again!`);
            }
        }
    });
}

/**
 * Reset drone positions after a game reset
 */
function resetDronePositions() {
    // Team 1 positions (left side)
    const team1StartX = FIELD_WIDTH * 0.25;
    // Team 2 positions (right side)
    const team2StartX = FIELD_WIDTH * 0.75;
    
    // Reset all drones to their starting positions
    for (let i = 0; i < drones.length; i++) {
        const drone = drones[i];
        
        // Reset velocity
        drone.velocity = new Vector2D(0, 0);
        
        // Reset scoring state
        if (drone.scoringState) {
            drone.scoringState.crossedGoalLine = false;
            drone.scoringState.scored = false;
        }
        
        if (drone.team === 1) {
            // Team 1 drones (left side)
            drone.position = new Vector2D(
                team1StartX,
                FIELD_HEIGHT * (0.3 + (i % 5) * 0.1)
            );
        } else {
            // Team 2 drones (right side)
            drone.position = new Vector2D(
                team2StartX,
                FIELD_HEIGHT * (0.3 + (i % 5) * 0.1)
            );
        }
    }
}

// Render the game
function render() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw field
    drawField();
    
    // Draw goals
    drawGoals();
    
    // Draw drones
    drawDrones();
    
    // Draw team status indicators
    drawTeamStatusIndicators();
}

// Draw the field
function drawField() {
    // Draw field background
    ctx.fillStyle = '#4CAF50';
    ctx.fillRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT);
    
    // Draw center line
    ctx.strokeStyle = 'white';
    ctx.lineWidth = CENTER_LINE_THICKNESS;
    ctx.beginPath();
    ctx.moveTo(FIELD_WIDTH / 2, 0);
    ctx.lineTo(FIELD_WIDTH / 2, FIELD_HEIGHT);
    ctx.stroke();
    
    // Draw center circle
    ctx.beginPath();
    ctx.arc(FIELD_WIDTH / 2, FIELD_HEIGHT / 2, 50, 0, Math.PI * 2);
    ctx.stroke();
}

// Draw the goals
function drawGoals() {
    goals.forEach(goal => {
        const color = goal.team === 1 ? TEAM1_COLOR : TEAM2_COLOR;
        
        // Draw goal posts
        goal.posts.forEach(post => {
            // Draw post
            ctx.fillStyle = 'black';
            ctx.fillRect(
                post.position.x,
                post.position.y,
                post.width,
                post.height
            );
            
            // Draw post border
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 2;
            ctx.strokeRect(
                post.position.x,
                post.position.y,
                post.width,
                post.height
            );
        });
        
        // Draw connection line between posts
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        
        if (goal.team === 1) {
            // Left goal
            const topPost = goal.posts[0];
            const bottomPost = goal.posts[1];
            ctx.moveTo(topPost.position.x + topPost.width / 2, topPost.position.y + topPost.height);
            ctx.lineTo(bottomPost.position.x + bottomPost.width / 2, bottomPost.position.y);
        } else {
            // Right goal
            const topPost = goal.posts[0];
            const bottomPost = goal.posts[1];
            ctx.moveTo(topPost.position.x + topPost.width / 2, topPost.position.y + topPost.height);
            ctx.lineTo(bottomPost.position.x + bottomPost.width / 2, bottomPost.position.y);
        }
        
        ctx.stroke();
    });
}

// Draw the drones
function drawDrones() {
    drones.forEach(drone => {
        // Draw drone body
        ctx.fillStyle = drone.color;
        ctx.beginPath();
        ctx.arc(drone.position.x, drone.position.y, drone.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw striker highlight if applicable
        if (drone.isStriker) {
            ctx.strokeStyle = STRIKER_HIGHLIGHT;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(drone.position.x, drone.position.y, drone.radius + 2, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        // Draw direction indicator
        const direction = drone.velocity.normalize().multiply(drone.radius * 1.2);
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(drone.position.x, drone.position.y);
        ctx.lineTo(
            drone.position.x + direction.x,
            drone.position.y + direction.y
        );
        ctx.stroke();
        
        // Highlight player's drone
        if (drone === playerDrone) {
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(drone.position.x, drone.position.y, drone.radius + 5, 0, Math.PI * 2);
            ctx.stroke();
        }
    });
}

// Draw team status indicators
function drawTeamStatusIndicators() {
    // 使用准备状态标志替代直接检查
    const team1AllInOwnHalf = ready_flag1;
    const team2AllInOwnHalf = ready_flag2;
    
    // Team 1 indicator (left side)
    ctx.fillStyle = team1AllInOwnHalf ? 'rgba(0, 255, 0, 0.5)' : 'rgba(255, 0, 0, 0.5)';
    ctx.beginPath();
    ctx.arc(50, 30, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Team 2 indicator (right side)
    ctx.fillStyle = team2AllInOwnHalf ? 'rgba(0, 255, 0, 0.5)' : 'rgba(255, 0, 0, 0.5)';
    ctx.beginPath();
    ctx.arc(FIELD_WIDTH - 50, 30, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Add text labels
    ctx.fillStyle = '#000';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Team 1', 50, 55);
    ctx.fillText('Team 2', FIELD_WIDTH - 50, 55);
    
    // Add status text
    ctx.font = '10px Arial';
    ctx.fillText(ready_flag1 ? 'Ready' : 'Not Ready', 50, 70);
    ctx.fillText(ready_flag2 ? 'Ready' : 'Not Ready', FIELD_WIDTH - 50, 70);
}

// Format time as MM:SS
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Update the score display
 */
function updateScoreDisplay() {
    document.getElementById('team1-score').textContent = team1Score;
    document.getElementById('team2-score').textContent = team2Score;
}

// Initialize the game when the page loads
window.addEventListener('load', init);