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
const GAME_DURATION = 60; // 3 minutes in seconds

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

// 添加游戏结束UI相关变量
let gameOverUI = null;
let gameOverAnimations = [];
let isGameOver = false;
let gameOverTimer = null; // 添加游戏结束定时器变量

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
    // 清除所有动画和定时器
    clearAllAnimations();
    
    gameRunning = false;
    gameTime = GAME_DURATION;
    team1Score = 0;
    team2Score = 0;
    // 重置准备状态标志
    ready_flag1 = true;
    ready_flag2 = true;
    // 重置最后得分队伍
    lastScoringTeam = 0;
    // 重置游戏结束状态
    isGameOver = false;
    
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
            
            // Check for game over when time runs out
            if (!isGameOver) {
                checkGameOver();
            }
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
        
        // 更新游戏结束动画
        if (gameOverAnimations.length > 0) {
            gameOverAnimations = gameOverAnimations.filter(animation => animation.update(deltaTime));
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
        showMessage(`等待全部返回到己方半场!`, 2000);
        
        // Check if drone has reached its own half
        const inOwnHalf = (playerDrone.team === 1 && playerDrone.position.x < FIELD_WIDTH / 2) || 
                         (playerDrone.team === 2 && playerDrone.position.x > FIELD_WIDTH / 2);
        
        if (inOwnHalf) {
            // Drone has returned home, clear the flag
            playerDrone.shouldReturnHome = false;
            console.log(`Player drone has returned to its own half`);
            showMessage(`全部已回到己方半场!`, 1000);
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
    ctx.fillText('红队', 50, 55);
    ctx.fillText('蓝队', FIELD_WIDTH - 50, 55);
    
    // Add status text
    ctx.font = '10px Arial';
    ctx.fillText(ready_flag1 ? '已就绪' : '未就绪', 50, 70);
    ctx.fillText(ready_flag2 ? '已就绪' : '未就绪', FIELD_WIDTH - 50, 70);
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
        text: "进球!",
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
    
    // 更新游戏结束动画
    if (gameOverAnimations.length > 0) {
        // 过滤掉已经完成的动画
        gameOverAnimations = gameOverAnimations.filter(animation => {
            // 调用动画的update方法，如果返回false则表示动画已完成
            return animation.update(deltaTime);
        });
    }
}

// 绘制动画
function drawAnimations() {
    // 绘制所有动画
    scoreAnimations.forEach(animation => animation.draw(ctx));
    
    // 绘制所有粒子
    confettiParticles.forEach(particle => particle.draw(ctx));
    
    // 绘制游戏结束动画
    gameOverAnimations.forEach(animation => animation.draw(ctx));
}

/**
 * 检查游戏是否结束，并创建相应的游戏结束UI
 */
function checkGameOver() {
    if (gameTime <= 0 || isGameOver) {
        isGameOver = true;
        
        // 确定游戏结果
        let result;
        if (team1Score > team2Score) {
            // 玩家是队伍1，所以玩家获胜
            result = 'win';
        } else if (team1Score < team2Score) {
            // 玩家是队伍1，所以玩家失败
            result = 'lose';
        } else {
            // 平局
            result = 'tie';
        }
        
        // 创建游戏结束UI
        createGameOverUI(result);
        
        console.log(`Game over! Result: ${result}`);
    }
}

/**
 * 创建游戏结束UI
 * @param {string} result - 游戏结果：'win', 'lose', 或 'tie'
 */
function createGameOverUI(result) {
    // 清除之前的游戏结束定时器（如果存在）
    if (gameOverTimer) {
        clearTimeout(gameOverTimer);
        gameOverTimer = null;
    }
    
    // 创建游戏结束容器
    if (!gameOverUI) {
        gameOverUI = document.createElement('div');
        gameOverUI.id = 'game-over-ui';
        gameOverUI.style.position = 'absolute';
        gameOverUI.style.top = '50%';
        gameOverUI.style.left = '50%';
        gameOverUI.style.transform = 'translate(-50%, -50%)';
        gameOverUI.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        gameOverUI.style.color = 'white';
        gameOverUI.style.padding = '30px';
        gameOverUI.style.borderRadius = '15px';
        gameOverUI.style.textAlign = 'center';
        gameOverUI.style.zIndex = '1000';
        gameOverUI.style.boxShadow = '0 0 20px rgba(255, 255, 255, 0.5)';
        gameOverUI.style.opacity = '0';
        gameOverUI.style.transition = 'opacity 1s';
        
        // 添加到游戏容器
        document.querySelector('.game-container').appendChild(gameOverUI);
        
        // 淡入效果
        setTimeout(() => {
            gameOverUI.style.opacity = '1';
        }, 100);
    }
    
    // 设置游戏结束标题和消息
    let title, message, color;
    
    switch (result) {
        case 'win':
            title = '胜利!';
            message = `恭喜! 你的队伍以 ${team1Score} - ${team2Score} 获胜!`;
            color = '#4CAF50'; // 绿色
            break;
        case 'lose':
            title = '失败!';
            message = `很遗憾! 你的队伍以 ${team1Score} - ${team2Score} 失败!`;
            color = '#F44336'; // 红色
            break;
        case 'tie':
            title = '平局!';
            message = `比赛结束! 最终比分 ${team1Score} - ${team2Score}`;
            color = '#FFC107'; // 黄色
            break;
    }
     
    // 设置内容 - 移除按钮，只显示结果
    gameOverUI.innerHTML = `
        <h1 style="font-size: 48px; margin-bottom: 20px; color: ${color};">${title}</h1>
        <p style="font-size: 24px; margin-bottom: 30px;">${message}</p>
        <p style="font-size: 18px; color: #ccc;">游戏将在3秒后重置...</p>
    `;
    
    // 创建游戏结束动画效果
    createGameOverAnimations(result);
    
    // 设置3秒后自动重置游戏的定时器
    gameOverTimer = setTimeout(() => {
        // 清除所有动画
        clearAllAnimations();
        
        // 隐藏游戏结束UI
        if (gameOverUI) {
            gameOverUI.style.opacity = '0';
            setTimeout(() => {
                if (gameOverUI) {
                    gameOverUI.remove();
                    gameOverUI = null;
                }
                
                // 重置游戏
                resetGame();
                isGameOver = false;
            }, 500);
        }
    }, 3000);
}

/**
 * 创建游戏结束动画效果
 * @param {string} result - 游戏结果：'win', 'lose', 或 'tie'
 */
function createGameOverAnimations(result) {
    // 清除现有动画
    gameOverAnimations = [];
    
    // 根据结果创建不同的动画效果
    switch (result) {
        case 'win':
            // 胜利动画 - 金色烟花和闪光
            createVictoryAnimations();
            break;
        case 'lose':
            // 失败动画 - 暗色下落粒子
            createDefeatAnimations();
            break;
        case 'tie':
            // 平局动画 - 中性色彩的粒子
            createTieAnimations();
            break;
    }
}

/**
 * 创建胜利动画效果
 */
function createVictoryAnimations() {
    // 初始化烟花定时器数组（如果不存在）
    if (!window.fireworkTimers) {
        window.fireworkTimers = [];
    }
    
    // 创建胜利文字动画
    const victoryTextAnimation = {
        text: "胜利!",
        x: FIELD_WIDTH / 2,
        y: FIELD_HEIGHT / 3,
        size: 20,
        maxSize: 120,
        alpha: 0,
        growSpeed: 2,
        fadeSpeed: 0.01,
        color: '#FFD700', // 金色
        growing: true,
        update: function(deltaTime) {
            if (this.growing) {
                this.size += this.growSpeed;
                this.alpha += this.fadeSpeed * 2;
                if (this.size >= this.maxSize) {
                    this.growing = false;
                }
            } else {
                this.alpha -= this.fadeSpeed * 0.5; // 缓慢淡出
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
            
            // 添加文字阴影效果
            ctx.shadowColor = '#FFA500';
            ctx.shadowBlur = 20;
            ctx.fillText(this.text, this.x, this.y);
            ctx.shadowBlur = 0;
            
            ctx.globalAlpha = 1.0;
        }
    };
    
    // 添加到动画列表
    gameOverAnimations.push(victoryTextAnimation);
    
    // 创建金色烟花效果
    for (let i = 0; i < 5; i++) {
        // 存储定时器ID以便后续清除
        const timerId = setTimeout(() => {
            createFirework(
                Math.random() * FIELD_WIDTH,
                Math.random() * FIELD_HEIGHT / 2,
                '#FFD700', // 金色
                100 + Math.random() * 50
            );
        }, i * 500); // 每隔0.5秒发射一个烟花
        
        // 将定时器ID添加到数组中
        window.fireworkTimers.push(timerId);
    }
    
    // 创建闪光效果
    const flashAnimation = {
        alpha: 0.5,
        fadeSpeed: 0.02,
        color: '#FFFF00', // 黄色
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
    gameOverAnimations.push(flashAnimation);
    
    // 创建奖杯图标动画
    const trophyAnimation = {
        x: FIELD_WIDTH / 2,
        y: FIELD_HEIGHT * 0.6,
        size: 0,
        maxSize: 100,
        alpha: 0,
        growSpeed: 2,
        rotationSpeed: 0.05,
        rotation: 0,
        update: function(deltaTime) {
            if (this.size < this.maxSize) {
                this.size += this.growSpeed;
                this.alpha = Math.min(1, this.size / (this.maxSize * 0.5));
            }
            this.rotation += this.rotationSpeed;
            return gameTime <= 0 && isGameOver; // 只在游戏结束状态下显示
        },
        draw: function(ctx) {
            ctx.save();
            ctx.globalAlpha = this.alpha;
            ctx.translate(this.x, this.y);
            ctx.rotate(this.rotation);
            
            // 绘制简单的奖杯图标
            ctx.fillStyle = '#FFD700'; // 金色
            
            // 奖杯杯身
            ctx.beginPath();
            ctx.arc(0, -this.size * 0.3, this.size * 0.3, 0, Math.PI * 2);
            ctx.fill();
            
            // 奖杯底座
            ctx.fillRect(-this.size * 0.25, this.size * 0.1, this.size * 0.5, this.size * 0.2);
            
            // 奖杯柄
            ctx.fillRect(-this.size * 0.05, -this.size * 0.3, this.size * 0.1, this.size * 0.4);
            
            ctx.restore();
        }
    };
    
    // 添加到动画列表
    gameOverAnimations.push(trophyAnimation);
}

/**
 * 创建失败动画效果
 */
function createDefeatAnimations() {
    // 初始化烟花定时器数组（如果不存在）
    if (!window.fireworkTimers) {
        window.fireworkTimers = [];
    }
    
    // 创建失败文字动画
    const defeatTextAnimation = {
        text: "失败",
        x: FIELD_WIDTH / 2,
        y: FIELD_HEIGHT / 3,
        size: 20,
        maxSize: 100,
        alpha: 0,
        growSpeed: 1.5,
        fadeSpeed: 0.01,
        color: '#F44336', // 红色
        growing: true,
        update: function(deltaTime) {
            if (this.growing) {
                this.size += this.growSpeed;
                this.alpha += this.fadeSpeed * 2;
                if (this.size >= this.maxSize) {
                    this.growing = false;
                }
            } else {
                this.alpha -= this.fadeSpeed * 0.5; // 缓慢淡出
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
            
            // 添加文字阴影效果
            ctx.shadowColor = '#800000';
            ctx.shadowBlur = 15;
            ctx.fillText(this.text, this.x, this.y);
            ctx.shadowBlur = 0;
            
            ctx.globalAlpha = 1.0;
        }
    };
    
    // 添加到动画列表
    gameOverAnimations.push(defeatTextAnimation);
    
    // 创建暗色下落粒子
    for (let i = 0; i < 100; i++) {
        const particle = {
            x: Math.random() * FIELD_WIDTH,
            y: -Math.random() * 50, // 从屏幕顶部开始
            size: 3 + Math.random() * 7,
            speedX: (Math.random() - 0.5) * 2,
            speedY: 2 + Math.random() * 5,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.1,
            color: `rgba(${50 + Math.random() * 50}, ${20 + Math.random() * 30}, ${20 + Math.random() * 30}, ${0.7 + Math.random() * 0.3})`,
            alpha: 0.7 + Math.random() * 0.3,
            fadeSpeed: 0.005 + Math.random() * 0.01,
            update: function(deltaTime) {
                this.x += this.speedX;
                this.y += this.speedY;
                this.rotation += this.rotationSpeed;
                
                // 如果粒子到达屏幕底部，重置到顶部
                if (this.y > FIELD_HEIGHT + 50) {
                    this.y = -Math.random() * 50;
                    this.x = Math.random() * FIELD_WIDTH;
                    this.alpha = 0.7 + Math.random() * 0.3;
                }
                
                // 修改为3秒后结束动画
                return gameTime <= 0 && isGameOver; // 只在游戏结束状态下显示
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
        gameOverAnimations.push(particle);
    }
    
    // 创建暗色闪光效果
    const flashAnimation = {
        alpha: 0.7,
        fadeSpeed: 0.01,
        color: '#800000', // 暗红色
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
    gameOverAnimations.push(flashAnimation);
}

/**
 * 创建平局动画效果
 */
function createTieAnimations() {
    // 初始化烟花定时器数组（如果不存在）
    if (!window.fireworkTimers) {
        window.fireworkTimers = [];
    }
    
    // 创建平局文字动画
    const tieTextAnimation = {
        text: "平局",
        x: FIELD_WIDTH / 2,
        y: FIELD_HEIGHT / 3,
        size: 20,
        maxSize: 100,
        alpha: 0,
        growSpeed: 1.5,
        fadeSpeed: 0.01,
        color: '#FFC107', // 黄色
        growing: true,
        update: function(deltaTime) {
            if (this.growing) {
                this.size += this.growSpeed;
                this.alpha += this.fadeSpeed * 2;
                if (this.size >= this.maxSize) {
                    this.growing = false;
                }
            } else {
                this.alpha -= this.fadeSpeed * 0.5; // 缓慢淡出
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
            
            // 添加文字阴影效果
            ctx.shadowColor = '#B8860B';
            ctx.shadowBlur = 15;
            ctx.fillText(this.text, this.x, this.y);
            ctx.shadowBlur = 0;
            
            ctx.globalAlpha = 1.0;
        }
    };
    
    // 添加到动画列表
    gameOverAnimations.push(tieTextAnimation);
    
    // 创建中性色彩的粒子
    for (let i = 0; i < 150; i++) {
        const particle = {
            x: Math.random() * FIELD_WIDTH,
            y: Math.random() * FIELD_HEIGHT,
            size: 2 + Math.random() * 5,
            speedX: (Math.random() - 0.5) * 3,
            speedY: (Math.random() - 0.5) * 3,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.1,
            color: `rgba(${180 + Math.random() * 75}, ${180 + Math.random() * 75}, ${180 + Math.random() * 75}, ${0.6 + Math.random() * 0.4})`,
            alpha: 0.6 + Math.random() * 0.4,
            fadeSpeed: 0.01 + Math.random() * 0.02,
            update: function(deltaTime) {
                this.x += this.speedX;
                this.y += this.speedY;
                this.rotation += this.rotationSpeed;
                this.alpha -= this.fadeSpeed;
                
                // 如果粒子淡出，重新创建
                if (this.alpha <= 0) {
                    this.x = Math.random() * FIELD_WIDTH;
                    this.y = Math.random() * FIELD_HEIGHT;
                    this.alpha = 0.6 + Math.random() * 0.4;
                }
                
                // 修改为3秒后结束动画
                return gameTime <= 0 && isGameOver; // 只在游戏结束状态下显示
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
        gameOverAnimations.push(particle);
    }
    
    // 创建中性闪光效果
    const flashAnimation = {
        alpha: 0.5,
        fadeSpeed: 0.02,
        color: '#B8860B', // 暗金色
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
    gameOverAnimations.push(flashAnimation);
}

/**
 * 创建烟花效果
 * @param {number} x - 烟花的x坐标
 * @param {number} y - 烟花的y坐标
 * @param {string} color - 烟花的颜色
 * @param {number} particleCount - 粒子数量
 */
function createFirework(x, y, color, particleCount) {
    // 创建爆炸效果
    for (let i = 0; i < particleCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 5;
        const size = 2 + Math.random() * 4;
        
        const particle = {
            x: x,
            y: y,
            size: size,
            speedX: Math.cos(angle) * speed,
            speedY: Math.sin(angle) * speed,
            color: color,
            alpha: 1,
            fadeSpeed: 0.01 + Math.random() * 0.02,
            gravity: 0.05,
            update: function(deltaTime) {
                this.x += this.speedX;
                this.y += this.speedY;
                this.speedY += this.gravity;
                this.alpha -= this.fadeSpeed;
                return this.alpha > 0;
            },
            draw: function(ctx) {
                ctx.globalAlpha = this.alpha;
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1.0;
            }
        };
        
        gameOverAnimations.push(particle);
    }
    
    // 创建闪光效果
    const flash = {
        x: x,
        y: y,
        radius: 5,
        maxRadius: 50,
        alpha: 1,
        growSpeed: 2,
        fadeSpeed: 0.05,
        color: color,
        update: function(deltaTime) {
            this.radius += this.growSpeed;
            this.alpha -= this.fadeSpeed;
            return this.alpha > 0;
        },
        draw: function(ctx) {
            ctx.globalAlpha = this.alpha;
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1.0;
        }
    };
    
    gameOverAnimations.push(flash);
}

/**
 * 清除所有动画和定时器
 */
function clearAllAnimations() {
    // 清空所有动画数组
    gameOverAnimations = [];
    scoreAnimations = [];
    confettiParticles = [];
    
    // 清除游戏结束定时器
    if (gameOverTimer) {
        clearTimeout(gameOverTimer);
        gameOverTimer = null;
    }
    
    // 清除所有可能的烟花定时器
    // 使用一个全局变量来存储所有的定时器ID
    if (window.fireworkTimers && window.fireworkTimers.length > 0) {
        window.fireworkTimers.forEach(timerId => {
            clearTimeout(timerId);
        });
        window.fireworkTimers = [];
    }
    
    console.log("所有动画和定时器已清除");
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
    //joystickContainer.style.display = 'block'  ; 
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
    if (playerDrone) {
        // 限制输入值在 -1 到 1 之间
        x = Math.max(-1, Math.min(1, x));
        y = Math.max(-1, Math.min(1, y));
        
        // 设置玩家无人机的摇杆输入
        playerDrone.joystickInput = {
            x: x,
            y: y
        };
    }
}

// 重置摇杆输入
function resetJoystickInput() {
    if (playerDrone) {
        playerDrone.joystickInput = {
            x: 0,
            y: 0
        };
    }
}

// 为移动设备优化游戏
function optimizeForMobile() {
    // 调整游戏容器大小以适应移动设备屏幕
    const gameContainer = document.querySelector('.game-container');
    const canvas = document.getElementById('game-canvas');
    
    // 防止页面滚动
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.height = '100%';
    
    // 调整游戏UI元素位置
    const gameControls = document.querySelector('.game-controls');
    if (gameControls) {
        gameControls.style.bottom = '180px'; // 为摇杆留出空间
    }
    
    // 添加全屏按钮
    addFullscreenButton();
    
    // 调整游戏性能设置以适应移动设备
    // 可以在这里降低一些图形效果或动画数量以提高性能
}

// 添加全屏按钮
function addFullscreenButton() {
    const gameContainer = document.querySelector('.game-container');
    
    const fullscreenButton = document.createElement('button');
    fullscreenButton.id = 'fullscreen-button';
    fullscreenButton.innerHTML = '全屏';
    fullscreenButton.style.position = 'absolute';
    fullscreenButton.style.top = '10px';
    fullscreenButton.style.right = '10px';
    fullscreenButton.style.padding = '8px 12px';
    fullscreenButton.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    fullscreenButton.style.color = 'white';
    fullscreenButton.style.border = 'none';
    fullscreenButton.style.borderRadius = '5px';
    fullscreenButton.style.zIndex = '1000';
    
    fullscreenButton.addEventListener('click', function() {
        toggleFullscreen();
    });
    
    gameContainer.appendChild(fullscreenButton);
}

// 切换全屏模式
function toggleFullscreen() {
    const gameContainer = document.querySelector('.game-container');
    
    if (!document.fullscreenElement) {
        // 进入全屏
        if (gameContainer.requestFullscreen) {
            gameContainer.requestFullscreen();
        } else if (gameContainer.webkitRequestFullscreen) {
            gameContainer.webkitRequestFullscreen();
        } else if (gameContainer.msRequestFullscreen) {
            gameContainer.msRequestFullscreen();
        }
    } else {
        // 退出全屏
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
    }
}

// 显示触摸控制说明
function showTouchControlInstructions() {
    const gameContainer = document.querySelector('.game-container');
    
    const instructions = document.createElement('div');
    instructions.id = 'touch-instructions';
    instructions.style.position = 'absolute';
    instructions.style.top = '50%';
    instructions.style.left = '50%';
    instructions.style.transform = 'translate(-50%, -50%)';
    instructions.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    instructions.style.color = 'white';
    instructions.style.padding = '20px';
    instructions.style.borderRadius = '10px';
    instructions.style.textAlign = 'center';
    instructions.style.zIndex = '1000';
    instructions.style.maxWidth = '80%';
    
    instructions.innerHTML = `
        <h2>触摸控制说明</h2>
        <p>使用屏幕底部的虚拟摇杆控制你的无人机</p>
        <button id="got-it-button" style="padding: 8px 16px; background-color: #4CAF50; color: white; border: none; border-radius: 5px; margin-top: 10px;">知道了</button>
    `;
    
    gameContainer.appendChild(instructions);
    
    // 点击"知道了"按钮关闭说明
    document.getElementById('got-it-button').addEventListener('click', function() {
        instructions.style.display = 'none';
    });
    
    // 5秒后自动关闭说明
    setTimeout(function() {
        instructions.style.display = 'none';
    }, 5000);
}

// Initialize the game when the page loads
window.addEventListener('load', init);