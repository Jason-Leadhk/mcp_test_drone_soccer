# Drone Soccer Simulation

A 2D web-based simulation of a 5v5 drone soccer match based on FAI (Fédération Aéronautique Internationale) drone soccer rules with some custom modifications.

## About Drone Soccer

Drone Soccer is an exciting aerial sport where teams of drone pilots compete to score goals by flying through the opponent's goal. According to our modified rules:

- Teams consist of 5 active players (drones)
- Each team has one designated "Striker" that can score goals
- A match consists of 3 sets, each lasting 3 minutes
- Only the Striker can score by flying through the opponent's goal
- After scoring, **ALL drones** from the scoring team must return to their own half of the field before they can score again
- Goals are only counted if all team drones are in their own half at the time of scoring

## Game Features

- 5v5 drone soccer simulation
- Realistic physics with drone collisions
- Player-controlled drone (Team 1 Striker)
- AI-controlled opponents
- Goal detection and scoring
- Team status indicators showing if all drones are in their own half
- Visual notifications for players
- 3-minute timer
- Scoreboard

## Controls

- Use arrow keys or WASD to control your drone (Team 1 Striker)
- Start/Reset buttons to control the game state
- Watch the team status indicators to know when your team is ready to score

## Technical Implementation

The simulation is built using:
- HTML5 Canvas for rendering
- JavaScript for game logic
- Custom physics engine for collision detection and resolution

## How to Play

1. Open `index.html` in a web browser
2. Click "Start Game" to begin
3. Control your drone (highlighted with a white circle) using arrow keys or WASD
4. Try to score goals by flying through the opponent's goal
5. After scoring, make sure all your team's drones return to your half of the field
6. The game ends after 3 minutes

## Visual Indicators

- Green circle: All drones from the team are in their own half (ready to score)
- Red circle: Not all drones from the team are in their own half (not ready to score)
- On-screen messages will guide you when you need to return to your half

## Development

This project was created as a simulation of drone soccer based on official FAI rules with custom modifications. The physics engine handles drone collisions and goal detection, while the game logic manages the scoring and timer.

## License

This project is open source and available for educational purposes. 