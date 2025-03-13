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

// 添加全局变量用于记录最后得分的队伍
let lastScoringTeam = 0; // 0表示没有队伍得分，1表示队伍1得分，2表示队伍2得分

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

// 添加全局变量用于动画
let scoreAnimations = [];
let confettiParticles = [];

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
    
    // 创建虚拟摇杆UI
    createVirtualJoystick();
    
    // 检测设备类型并显示适当的控制方式
    detectDeviceAndSetControls();
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
    // 重置最后得分队伍
    lastScoringTeam = 0;
    
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
        position: new Vector2D(FIELD_WIDTH * 0.15, FIELD_HEIGHT / 2),
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
                FIELD_HEIGHT * (0.2 + 0.2 * i)
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
        position: new Vector2D(FIELD_WIDTH * 0.85, FIELD_HEIGHT / 2),
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
                FIELD_HEIGHT * (0.2 + 0.2 * i)
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
        
        // 更新动画
        updateAnimations(deltaTime);
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
    
    // 检查是否有摇杆输入
    if (playerDrone.joystickInput) {
        // 使用摇杆输入值（更精确的控制）
        direction.x = playerDrone.joystickInput.x;
        direction.y = playerDrone.joystickInput.y;
    } else {
        // 使用键盘输入
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
    }
    
    // 如果方向向量不为零，则归一化
    if (direction.x !== 0 || direction.y !== 0) {
        // 只有当使用键盘且同时按下两个方向键时才需要归一化
        if (!playerDrone.joystickInput && direction.x !== 0 && direction.y !== 0) {
            direction = direction.normalize();
        }
    }
    
    // Calculate target velocity based on input direction
    const maxSpeed = 200;
    const targetVelocity = direction.multiply(maxSpeed);
    
    // Apply inertia with time constant of 1 second
    // The formula is: new_velocity = current_velocity + (target_velocity - current_velocity) * (deltaTime / timeConstant)
    const timeConstant = 1.0; // 1 second time constant
    //const inertiaFactor = Math.min(deltaTime / timeConstant, 1.0); // Clamp to maximum of 1.0
    const inertiaFactor = 1/50; 
    // Calculate velocity change with inertia
    const velocityChange = targetVelocity.subtract(playerDrone.velocity).multiply(inertiaFactor);
    
    // Apply velocity change
    playerDrone.velocity = playerDrone.velocity.add(velocityChange);
    
    // Apply drag when no input (still with inertia)
/*     if (direction.x === 0 && direction.y === 0) {
        // Apply stronger drag when no input, but still respect inertia
        const dragFactor = Math.min(deltaTime / (timeConstant * 0.5), 1.0); // Faster deceleration
        dragFactor=0.001;
        playerDrone.velocity = playerDrone.velocity.multiply(1.0 - dragFactor);
    } */
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
        messageElement.style.top = '120px';
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
            //targetX = FIELD_WIDTH * 0.25; // 1/4 of the field width
            targetX = FIELD_WIDTH * 0.49; // 0.49 of the field width
        } else {
            // Team 2 (right side)
            //targetX = FIELD_WIDTH * 0.75; // 3/4 of the field width
            targetX = FIELD_WIDTH * 0.51; // 0.51 of the field width
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
                //targetX = FIELD_WIDTH * 0.25; // 1/4 of the field width
                targetX = FIELD_WIDTH  * 0.49; // 0.49 of the field width
            } else {
                // Team 2 (right side)
                //targetX = FIELD_WIDTH * 0.75; // 3/4 of the field width
                targetX = FIELD_WIDTH  * 0.51; // 0.51 of the field width
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
    const maxSpeed = 200; 
    
    // Calculate direction to target
    const direction = drone.aiState.targetPosition.subtract(drone.position).normalize();
    
    // Calculate target velocity based on direction
    const targetVelocity = direction.multiply(maxSpeed);
    
    // Apply inertia with time constant of 1 second
    // The formula is: new_velocity = current_velocity + (target_velocity - current_velocity) * (deltaTime / timeConstant)
    const timeConstant = 1.5; // 1 second time constant
    //const inertiaFactor = Math.min(deltaTime / timeConstant, 1.0); // Clamp to maximum of 1.0
    const inertiaFactor = 1/50; 
    // Calculate velocity change with inertia
    const velocityChange = targetVelocity.subtract(drone.velocity).multiply(inertiaFactor);
    
    // Apply velocity change
    drone.velocity = drone.velocity.add(velocityChange);
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
                    // 设置最后得分的队伍为队伍1
                    lastScoringTeam = 1;
                    console.log(`Team 1 score increased to ${team1Score}`);
                } else {
                    team2Score++;
                    // 设置标志为false，需要重新回到己方半场
                    ready_flag2 = false;
                    // 设置最后得分的队伍为队伍2
                    lastScoringTeam = 2;
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
    
    // 绘制动画效果
    drawAnimations();
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
 * Update the score display with animation
 */
function updateScoreDisplay() {
    document.getElementById('team1-score').textContent = team1Score;
    document.getElementById('team2-score').textContent = team2Score;
    
    // 创建得分动画
    createScoreAnimation();
}

// 创建得分动画效果
function createScoreAnimation() {
    // 使用全局变量确定哪个队伍得分，而不是通过比较分数
    const scoringTeam = lastScoringTeam;
    const teamColor = scoringTeam === 1 ? TEAM1_COLOR : TEAM2_COLOR;
    
    // 创建"GOAL!"文字动画
    const goalTextAnimation = {
        text: "GOAL!",
        x: FIELD_WIDTH / 2,
        y: FIELD_HEIGHT / 2,
        size: 20,
        maxSize: 100,
        alpha: 0,
        growSpeed: 3,
        fadeSpeed: 0.02,
        color: teamColor,
        growing: true,
        update: function(deltaTime) {
            if (this.growing) {
                this.size += this.growSpeed;
                this.alpha += this.fadeSpeed * 2;
                if (this.size >= this.maxSize) {
                    this.growing = false;
                }
            } else {
                this.alpha -= this.fadeSpeed;
            }
            return this.alpha > 0;
        },
        draw: function(ctx) {
            ctx.globalAlpha = this.alpha;
            ctx.fillStyle = this.color;
            ctx.font = `bold ${this.size}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.text, this.x, this.y);
            ctx.globalAlpha = 1.0;
        }
    };
    
    // 添加到动画列表
    scoreAnimations.push(goalTextAnimation);
    
    // 创建得分数字动画
    const scoreValue = scoringTeam === 1 ? team1Score : team2Score;
    const scoreTextAnimation = {
        text: `+1`,
        x: scoringTeam === 1 ? 100 : FIELD_WIDTH - 100,
        y: 80,
        size: 30,
        alpha: 1,
        velocity: -2,
        fadeSpeed: 0.02,
        color: teamColor,
        update: function(deltaTime) {
            this.y += this.velocity;
            this.alpha -= this.fadeSpeed;
            return this.alpha > 0;
        },
        draw: function(ctx) {
            ctx.globalAlpha = this.alpha;
            ctx.fillStyle = this.color;
            ctx.font = `bold ${this.size}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.text, this.x, this.y);
            ctx.globalAlpha = 1.0;
        }
    };
    
    // 添加到动画列表
    scoreAnimations.push(scoreTextAnimation);
    
    // 创建彩色粒子效果
    createConfetti(scoringTeam);
    
    // 创建闪光效果
    createFlashEffect(scoringTeam);
    
    // 播放得分音效（如果需要）
    playScoreSound();
}

// 创建彩色粒子效果
function createConfetti(team) {
    const centerX = team === 1 ? FIELD_WIDTH * 0.75 : FIELD_WIDTH * 0.25;
    const teamColor = team === 1 ? TEAM1_COLOR : TEAM2_COLOR;
    
    // 创建100个粒子
    for (let i = 0; i < 100; i++) {
        const particle = {
            x: centerX,
            y: FIELD_HEIGHT / 2,
            size: 5 + Math.random() * 10,
            speedX: (Math.random() - 0.5) * 10,
            speedY: (Math.random() - 0.5) * 10 - 5, // 向上的初始速度
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.2,
            color: Math.random() < 0.7 ? teamColor : 
                   `hsl(${Math.random() * 360}, 100%, 50%)`,
            alpha: 1,
            gravity: 0.1,
            fadeSpeed: 0.01 + Math.random() * 0.02,
            update: function(deltaTime) {
                this.x += this.speedX;
                this.y += this.speedY;
                this.speedY += this.gravity;
                this.rotation += this.rotationSpeed;
                this.alpha -= this.fadeSpeed;
                return this.alpha > 0;
            },
            draw: function(ctx) {
                ctx.save();
                ctx.globalAlpha = this.alpha;
                ctx.translate(this.x, this.y);
                ctx.rotate(this.rotation);
                ctx.fillStyle = this.color;
                ctx.fillRect(-this.size/2, -this.size/2, this.size, this.size);
                ctx.restore();
            }
        };
        confettiParticles.push(particle);
    }
}

// 创建闪光效果
function createFlashEffect(team) {
    const flashAnimation = {
        alpha: 0.7,
        fadeSpeed: 0.05,
        color: team === 1 ? TEAM1_COLOR : TEAM2_COLOR,
        update: function(deltaTime) {
            this.alpha -= this.fadeSpeed;
            return this.alpha > 0;
        },
        draw: function(ctx) {
            ctx.globalAlpha = this.alpha;
            ctx.fillStyle = this.color;
            ctx.fillRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT);
            ctx.globalAlpha = 1.0;
        }
    };
    
    // 添加到动画列表
    scoreAnimations.push(flashAnimation);
}

// 播放得分音效
function playScoreSound() {
    // 如果你想添加音效，可以在这里实现
    // 例如：
    // const scoreSound = new Audio('score.mp3');
    // scoreSound.play();
}

// 更新动画
function updateAnimations(deltaTime) {
    // 更新得分动画
    scoreAnimations = scoreAnimations.filter(animation => animation.update(deltaTime));
    
    // 更新粒子效果
    confettiParticles = confettiParticles.filter(particle => particle.update(deltaTime));
}

// 绘制动画
function drawAnimations() {
    // 绘制所有动画
    scoreAnimations.forEach(animation => animation.draw(ctx));
    
    // 绘制所有粒子
    confettiParticles.forEach(particle => particle.draw(ctx));
}

// 创建虚拟摇杆UI
function createVirtualJoystick() {
    const gameContainer = document.querySelector('.game-container');
    
    // 创建摇杆容器
    const joystickContainer = document.createElement('div');
    joystickContainer.id = 'joystick-container';
    joystickContainer.style.position = 'absolute';
    joystickContainer.style.bottom = '50px';
    joystickContainer.style.left = '50%';
    joystickContainer.style.transform = 'translateX(-50%)';
    joystickContainer.style.width = '120px';
    joystickContainer.style.height = '120px';
    joystickContainer.style.borderRadius = '50%';
    joystickContainer.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
    joystickContainer.style.border = '2px solid rgba(255, 255, 255, 0.4)';
    joystickContainer.style.display = 'none'; // 默认隐藏，只在移动设备上显示
    
    // 创建摇杆手柄
    const joystickHandle = document.createElement('div');
    joystickHandle.id = 'joystick-handle';
    joystickHandle.style.position = 'absolute';
    joystickHandle.style.top = '50%';
    joystickHandle.style.left = '50%';
    joystickHandle.style.transform = 'translate(-50%, -50%)';
    joystickHandle.style.width = '50px';
    joystickHandle.style.height = '50px';
    joystickHandle.style.borderRadius = '50%';
    joystickHandle.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
    joystickHandle.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)';
    
    // 添加到DOM
    joystickContainer.appendChild(joystickHandle);
    gameContainer.appendChild(joystickContainer);
}

// 检测设备类型并设置适当的控制方式
function detectDeviceAndSetControls() {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const joystickContainer = document.getElementById('joystick-container');
    
    if (isMobile) {
        // 显示虚拟摇杆
        joystickContainer.style.display = 'block';
        
        // 设置触摸事件监听器
        setupTouchControls();
        
        // 添加移动设备优化
        optimizeForMobile();
        
        // 显示触摸控制说明
        showTouchControlInstructions();
    }
}

// 设置触摸控制
function setupTouchControls() {
    const joystickContainer = document.getElementById('joystick-container');
    const joystickHandle = document.getElementById('joystick-handle');
    
    let isDragging = false;
    let centerX, centerY;
    let maxDistance = 35; // 摇杆最大移动距离
    
    // 触摸开始
    joystickContainer.addEventListener('touchstart', function(e) {
        e.preventDefault();
        isDragging = true;
        
        // 获取摇杆中心坐标
        const rect = joystickContainer.getBoundingClientRect();
        centerX = rect.width / 2;
        centerY = rect.height / 2;
        
        // 处理触摸位置
        handleTouch(e);
    });
    
    // 触摸移动
    joystickContainer.addEventListener('touchmove', function(e) {
        e.preventDefault();
        if (isDragging) {
            handleTouch(e);
        }
    });
    
    // 触摸结束
    joystickContainer.addEventListener('touchend', function(e) {
        e.preventDefault();
        isDragging = false;
        
        // 重置摇杆位置
        joystickHandle.style.top = '50%';
        joystickHandle.style.left = '50%';
        
        // 停止移动
        resetJoystickInput();
    });
    
    // 触摸取消
    joystickContainer.addEventListener('touchcancel', function(e) {
        e.preventDefault();
        isDragging = false;
        
        // 重置摇杆位置
        joystickHandle.style.top = '50%';
        joystickHandle.style.left = '50%';
        
        // 停止移动
        resetJoystickInput();
    });
    
    // 处理触摸位置并移动摇杆
    function handleTouch(e) {
        const touch = e.touches[0];
        const rect = joystickContainer.getBoundingClientRect();
        
        // 计算触摸点相对于摇杆中心的位置
        const touchX = touch.clientX - rect.left;
        const touchY = touch.clientY - rect.top;
        
        // 计算触摸点到中心的距离和角度
        const deltaX = touchX - centerX;
        const deltaY = touchY - centerY;
        const distance = Math.min(Math.sqrt(deltaX * deltaX + deltaY * deltaY), maxDistance);
        const angle = Math.atan2(deltaY, deltaX);
        
        // 计算摇杆手柄的新位置
        const handleX = centerX + distance * Math.cos(angle);
        const handleY = centerY + distance * Math.sin(angle);
        
        // 更新摇杆手柄位置
        joystickHandle.style.left = handleX + 'px';
        joystickHandle.style.top = handleY + 'px';
        
        // 将摇杆输入转换为方向输入
        updateJoystickInput(deltaX / maxDistance, deltaY / maxDistance);
    }
}

// 更新摇杆输入
function updateJoystickInput(x, y) {
    // 将摇杆位置转换为方向输入
    // x和y的范围是-1到1
    
    // 重置键盘输入
    keys.up = false;
    keys.down = false;
    keys.left = false;
    keys.right = false;
    
    // 设置方向
    if (y < -0.3) keys.up = true;
    if (y > 0.3) keys.down = true;
    if (x < -0.3) keys.left = true;
    if (x > 0.3) keys.right = true;
    
    // 存储原始摇杆值，用于更精确的控制
    playerDrone.joystickInput = {
        x: x,
        y: y
    };
}

// 重置摇杆输入
function resetJoystickInput() {
    keys.up = false;
    keys.down = false;
    keys.left = false;
    keys.right = false;
    
    if (playerDrone) {
        playerDrone.joystickInput = {
            x: 0,
            y: 0
        };
    }
}

// 优化移动设备显示
function optimizeForMobile() {
    // 添加viewport meta标签确保正确缩放
    let viewport = document.querySelector("meta[name=viewport]");
    if (!viewport) {
        viewport = document.createElement('meta');
        viewport.name = 'viewport';
        document.head.appendChild(viewport);
    }
    viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
    
    // 防止页面滚动和缩放
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.height = '100%';
    
    // 调整游戏容器大小
    const gameContainer = document.querySelector('.game-container');
    gameContainer.style.width = '100%';
    gameContainer.style.height = '100%';
    
    // 调整画布大小以适应屏幕
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
}

// 调整画布大小
function resizeCanvas() {
    const gameContainer = document.querySelector('.game-container');
    const containerWidth = gameContainer.clientWidth;
    const containerHeight = gameContainer.clientHeight;
    
    // 保持游戏场地的宽高比
    const aspectRatio = FIELD_WIDTH / FIELD_HEIGHT;
    let canvasWidth, canvasHeight;
    
    if (containerWidth / containerHeight > aspectRatio) {
        // 容器更宽，以高度为基准
        canvasHeight = containerHeight;
        canvasWidth = canvasHeight * aspectRatio;
    } else {
        // 容器更高，以宽度为基准
        canvasWidth = containerWidth;
        canvasHeight = canvasWidth / aspectRatio;
    }
    
    // 更新画布大小
    canvas.style.width = canvasWidth + 'px';
    canvas.style.height = canvasHeight + 'px';
    
    // 居中画布
    canvas.style.position = 'absolute';
    canvas.style.left = '50%';
    canvas.style.top = '50%';
    canvas.style.transform = 'translate(-50%, -50%)';
}

// 显示触摸控制说明
function showTouchControlInstructions() {
    const instructionsElement = document.createElement('div');
    instructionsElement.id = 'touch-instructions';
    instructionsElement.style.position = 'absolute';
    instructionsElement.style.top = '10px';
    instructionsElement.style.left = '50%';
    instructionsElement.style.transform = 'translateX(-50%)';
    instructionsElement.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    instructionsElement.style.color = 'white';
    instructionsElement.style.padding = '10px';
    instructionsElement.style.borderRadius = '5px';
    instructionsElement.style.fontSize = '14px';
    instructionsElement.style.textAlign = 'center';
    instructionsElement.style.zIndex = '1000';
    instructionsElement.textContent = '使用屏幕底部的虚拟摇杆控制无人机';
    
    document.querySelector('.game-container').appendChild(instructionsElement);
    
    // 3秒后隐藏说明
    setTimeout(() => {
        instructionsElement.style.opacity = '0';
        instructionsElement.style.transition = 'opacity 1s';
        
        // 完全移除元素
        setTimeout(() => {
            instructionsElement.remove();
        }, 1000);
    }, 3000);
}

// Initialize the game when the page loads
window.addEventListener('load', init);