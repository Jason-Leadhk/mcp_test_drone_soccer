/**
 * Physics engine for drone soccer simulation
 */

class Vector2D {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    add(vector) {
        return new Vector2D(this.x + vector.x, this.y + vector.y);
    }

    subtract(vector) {
        return new Vector2D(this.x - vector.x, this.y - vector.y);
    }

    multiply(scalar) {
        return new Vector2D(this.x * scalar, this.y * scalar);
    }

    magnitude() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    normalize() {
        const mag = this.magnitude();
        if (mag === 0) {
            return new Vector2D(0, 0);
        }
        return new Vector2D(this.x / mag, this.y / mag);
    }

    dot(vector) {
        return this.x * vector.x + this.y * vector.y;
    }

    distance(vector) {
        return this.subtract(vector).magnitude();
    }
}

class PhysicsEngine {
    constructor() {
        this.objects = [];
        this.collisionCallbacks = [];
        this.gravity = new Vector2D(0, 0); // No gravity in this simulation
        this.friction = 0.995; // Reduced friction coefficient since we're using inertia
    }

    /**
     * Check collision between two circular objects
     * @param {Object} obj1 - First object with position and radius
     * @param {Object} obj2 - Second object with position and radius
     * @returns {boolean} - True if collision detected
     */
    checkCollision(obj1, obj2) {
        const distance = obj1.position.distance(obj2.position);
        return distance < (obj1.radius + obj2.radius);
    }

    /**
     * Resolve collision between two objects
     * @param {Object} obj1 - First object with position, velocity, radius, and mass
     * @param {Object} obj2 - Second object with position, velocity, radius, and mass
     */
    resolveCollision(obj1, obj2) {
        // Calculate collision normal
        const normal = obj1.position.subtract(obj2.position).normalize();
        
        // Calculate relative velocity
        const relativeVelocity = obj1.velocity.subtract(obj2.velocity);
        
        // Calculate relative velocity in terms of the normal direction
        const velocityAlongNormal = relativeVelocity.dot(normal);
        
        // Do not resolve if velocities are separating
        if (velocityAlongNormal > 0) {
            return;
        }
        
        // Calculate restitution (bounciness)
        const restitution = 0.9;
        
        // Calculate impulse scalar
        let j = -(1 + restitution) * velocityAlongNormal;
        j /= (1 / obj1.mass) + (1 / obj2.mass);
        
        // Apply impulse
        const impulse = normal.multiply(j);
        obj1.velocity = obj1.velocity.add(impulse.multiply(1 / obj1.mass));
        obj2.velocity = obj2.velocity.subtract(impulse.multiply(1 / obj2.mass));
        
        // Prevent objects from sticking together by moving them apart
        const overlap = (obj1.radius + obj2.radius) - obj1.position.distance(obj2.position);
        if (overlap > 0) {
            const correction = normal.multiply(overlap * 0.5);
            obj1.position = obj1.position.add(correction);
            obj2.position = obj2.position.subtract(correction);
        }
    }

    /**
     * Check if an object is colliding with a boundary and resolve the collision
     * @param {Object} obj - Object with position, velocity, and radius
     * @param {Object} bounds - Boundary with x, y, width, and height
     */
    checkBoundaryCollision(obj, bounds) {
        // Check left boundary
        if (obj.position.x - obj.radius < bounds.x) {
            obj.position.x = bounds.x + obj.radius;
            obj.velocity.x = -obj.velocity.x * 0.6; // Bounce with some energy loss
        }
        
        // Check right boundary
        if (obj.position.x + obj.radius > bounds.x + bounds.width) {
            obj.position.x = bounds.x + bounds.width - obj.radius;
            obj.velocity.x = -obj.velocity.x * 0.6;
        }
        
        // Check top boundary
        if (obj.position.y - obj.radius < bounds.y) {
            obj.position.y = bounds.y + obj.radius;
            obj.velocity.y = -obj.velocity.y * 0.6;
        }
        
        // Check bottom boundary
        if (obj.position.y + obj.radius > bounds.y + bounds.height) {
            obj.position.y = bounds.y + bounds.height - obj.radius;
            obj.velocity.y = -obj.velocity.y * 0.6;
        }
    }

    /**
     * Check if a drone has scored a goal
     * @param {Object} drone - The drone object
     * @param {Object} goal - The goal object
     * @returns {Object|false} - Scoring information or false if no score
     */
    checkGoal(drone, goal) {
        // Only strikers can score
        if (!drone.isStriker) {
            return false;
        }
        
        // Can only score in opponent's goal
        if (drone.team === goal.team) {
            return false;
        }
        
        // Get goal posts
        const topPost = goal.posts[0];
        const bottomPost = goal.posts[1];
        
        // Define goal line
        let goalX, minY, maxY;
        
        if (goal.team === 1) {
            // Left goal
            goalX = topPost.position.x + topPost.width;
            minY = topPost.position.y + topPost.height;
            maxY = bottomPost.position.y;
        } else {
            // Right goal
            goalX = topPost.position.x;
            minY = topPost.position.y + topPost.height;
            maxY = bottomPost.position.y;
        }
        
        // Check if drone is near the goal line
        const droneLeft = drone.position.x - drone.radius;
        const droneRight = drone.position.x + drone.radius;
        const droneY = drone.position.y;
        
        // Initialize scoring state if not set
        if (drone.scoringState === undefined) {
            drone.scoringState = {
                enteredFromFront: false,
                exitedThroughBack: false,
                crossedGoalLine: false,
                scored: false,
                returnedToOwnHalf: true // Initially true to allow scoring at game start
            };
        }
        
        // If already scored in this sequence, don't score again until reset
        if (drone.scoringState.scored) {
            return false;
        }
        
        // Check if drone is crossing the goal line between the posts
        let isCrossingGoalLine = false;
        let isEnteringFromFront = false;
        let isExitingThroughBack = false;
        
        if (goal.team === 1) {
            // Left goal
            isCrossingGoalLine = droneLeft <= goalX && droneRight >= goalX && droneY >= minY && droneY <= maxY;
            
            // For left goal:
            // - Entering from front: drone is moving left (velocity.x < 0) and crossing from right to left
            // - Exiting through back: drone has already entered and is still moving left
            
            // Check if the drone's right edge is crossing the goal line from right to left
            const crossingFromRight = droneRight >= goalX && droneLeft < goalX;
            
            // Check if the drone's left edge is crossing the goal line from right to left
            const crossingFromLeft = droneLeft <= goalX && droneRight > goalX;
            
            // Entering from front: moving left and crossing from right
            isEnteringFromFront = isCrossingGoalLine && drone.velocity.x < 0 && crossingFromRight;
            
            // Exiting through back: already entered from front and now crossing from left
            isExitingThroughBack = drone.scoringState.enteredFromFront && isCrossingGoalLine && crossingFromLeft;
            
            // Update scoring state
            if (isEnteringFromFront && !drone.scoringState.enteredFromFront) {
                drone.scoringState.enteredFromFront = true;
                console.log(`Team ${drone.team} drone entered left goal from front`);
            }
            
            if (drone.scoringState.enteredFromFront && isExitingThroughBack && !drone.scoringState.exitedThroughBack) {
                drone.scoringState.exitedThroughBack = true;
                console.log(`Team ${drone.team} drone exited left goal through back`);
            }
        } else {
            // Right goal
            isCrossingGoalLine = droneRight >= goalX && droneLeft <= goalX && droneY >= minY && droneY <= maxY;
            
            // For right goal:
            // - Entering from front: drone is moving right (velocity.x > 0) and crossing from left to right
            // - Exiting through back: drone has already entered and is still moving right
            
            // Check if the drone's left edge is crossing the goal line from left to right
            const crossingFromLeft = droneLeft <= goalX && droneRight > goalX;
            
            // Check if the drone's right edge is crossing the goal line from left to right
            const crossingFromRight = droneRight >= goalX && droneLeft < goalX;
            
            // Entering from front: moving right and crossing from left
            isEnteringFromFront = isCrossingGoalLine && drone.velocity.x > 0 && crossingFromLeft;
            
            // Exiting through back: already entered from front and now crossing from right
            isExitingThroughBack = drone.scoringState.enteredFromFront && isCrossingGoalLine && crossingFromRight;
            
            // Update scoring state
            if (isEnteringFromFront && !drone.scoringState.enteredFromFront) {
                drone.scoringState.enteredFromFront = true;
                console.log(`Team ${drone.team} drone entered right goal from front`);
            }
            
            if (drone.scoringState.enteredFromFront && isExitingThroughBack && !drone.scoringState.exitedThroughBack) {
                drone.scoringState.exitedThroughBack = true;
                console.log(`Team ${drone.team} drone exited right goal through back`);
            }
        }
        
        // Update crossing state
        drone.scoringState.crossedGoalLine = isCrossingGoalLine;
        
        // Check if a goal has been scored (entered from front and exited through back)
        // AND the striker has returned to their own half after their last goal
        if (drone.scoringState.enteredFromFront && 
            drone.scoringState.exitedThroughBack && 
            !drone.scoringState.scored &&
            drone.scoringState.returnedToOwnHalf) {
            
            drone.scoringState.scored = true;
            drone.scoringState.returnedToOwnHalf = false; // Reset this flag - must return to own half before scoring again
            
            console.log(`Team ${drone.team} drone scored in ${goal.team === 1 ? 'left' : 'right'} goal!`);
            
            // Return scoring information
            return {
                isStriker: true
            };
        }
        
        return false;
    }

    /**
     * Check for collision between a drone and goal posts
     * @param {Object} drone - The drone object
     * @param {Object} goal - The goal object
     * @returns {Object|false} - Collision information or false if no collision
     */
    checkGoalPostCollision(drone, goal) {
        // Check collision with each post
        for (let i = 0; i < goal.posts.length; i++) {
            const post = goal.posts[i];
            
            // Check if drone collides with this post
            if (this.checkRectCircleCollision(
                post.position.x, 
                post.position.y, 
                post.position.x + post.width, 
                post.position.y + post.height,
                drone.position.x, 
                drone.position.y, 
                drone.radius
            )) {
                return { post: i };
            }
        }
        
        return false;
    }

    /**
     * Check collision between a rectangle and a circle
     * @param {number} rectLeft - Rectangle left edge
     * @param {number} rectTop - Rectangle top edge
     * @param {number} rectRight - Rectangle right edge
     * @param {number} rectBottom - Rectangle bottom edge
     * @param {number} circleX - Circle center X
     * @param {number} circleY - Circle center Y
     * @param {number} circleRadius - Circle radius
     * @returns {boolean} - True if collision detected
     */
    checkRectCircleCollision(rectLeft, rectTop, rectRight, rectBottom, circleX, circleY, circleRadius) {
        // Find the closest point to the circle within the rectangle
        const closestX = Math.max(rectLeft, Math.min(circleX, rectRight));
        const closestY = Math.max(rectTop, Math.min(circleY, rectBottom));
        
        // Calculate the distance between the circle's center and this closest point
        const distanceX = circleX - closestX;
        const distanceY = circleY - closestY;
        
        // If the distance is less than the circle's radius, an intersection occurs
        const distanceSquared = (distanceX * distanceX) + (distanceY * distanceY);
        return distanceSquared < (circleRadius * circleRadius);
    }

    /**
     * Handle collision between a drone and goal posts
     * @param {Object} drone - The drone object
     * @param {Object} goal - The goal object
     * @param {Object} collision - Collision information
     */
    handleGoalPostCollision(drone, goal, collision) {
        const post = goal.posts[collision.post];
        
        // Find the closest point on the post to the drone center
        const closestX = Math.max(post.position.x, Math.min(drone.position.x, post.position.x + post.width));
        const closestY = Math.max(post.position.y, Math.min(drone.position.y, post.position.y + post.height));
        
        // Calculate direction from closest point to drone center
        const dx = drone.position.x - closestX;
        const dy = drone.position.y - closestY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Normalize direction
        const nx = dx / distance;
        const ny = dy / distance;
        
        // Move drone outside of post
        drone.position.x = closestX + nx * (drone.radius + 1);
        drone.position.y = closestY + ny * (drone.radius + 1);
        
        // Calculate reflection vector for velocity
        const dotProduct = drone.velocity.x * nx + drone.velocity.y * ny;
        
        // Apply reflection and damping
        drone.velocity.x = (drone.velocity.x - 2 * dotProduct * nx) * 0.8;
        drone.velocity.y = (drone.velocity.y - 2 * dotProduct * ny) * 0.8;
    }

    /**
     * Apply physics update to an object
     * @param {Object} obj - Object with position and velocity
     * @param {number} deltaTime - Time elapsed since last update in seconds
     */
    update(obj, deltaTime) {
        // Apply a very mild friction - less than before since we're handling acceleration/deceleration with inertia
        obj.velocity = obj.velocity.multiply(0.998);
        
        // Update position based on velocity
        obj.position = obj.position.add(obj.velocity.multiply(deltaTime));
    }
} 