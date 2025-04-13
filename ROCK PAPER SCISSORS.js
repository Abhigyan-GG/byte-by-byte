let gameMode = "";
let player1Choice = "";

// Function to select the game mode
function selectMode(mode) {
  gameMode = mode;
  document.querySelector(".choices").style.display = "block";
  document.getElementById("gameResult").textContent = `Game mode: ${capitalizeFirstLetter(mode)}`;
}

// Function to handle the player's choice
function playGame(choice) {
  if (gameMode === "singleplayer") {
    playSinglePlayer(choice);
  } else if (gameMode === "multiplayer") {
    if (player1Choice === "") {
      player1Choice = choice;
      document.getElementById("gameResult").textContent = "Player 2, choose your move.";
    } else {
      playMultiplayer(player1Choice, choice);
      player1Choice = "";  // Reset for the next round
    }
  }
}

// Single-player mode: player vs. computer
function playSinglePlayer(playerChoice) {
  const choices = ["stone", "paper", "scissors"];
  const computerChoice = choices[Math.floor(Math.random() * choices.length)];
  const result = determineWinner(playerChoice, computerChoice);
  document.getElementById("gameResult").textContent = `You chose ${playerChoice}, Computer chose ${computerChoice}. ${result}`;
}

// Multiplayer mode: player 1 vs. player 2
function playMultiplayer(choice1, choice2) {
  const result = determineWinner(choice1, choice2);
  document.getElementById("gameResult").textContent = `Player 1 chose ${choice1}, Player 2 chose ${choice2}. ${result}`;
}

// Determine the winner based on choices
function determineWinner(choice1, choice2) {
  if (choice1 === choice2) {
    return "It's a tie!";
  } else if ((choice1 === "stone" && choice2 === "scissors") ||
             (choice1 === "scissors" && choice2 === "paper") ||
             (choice1 === "paper" && choice2 === "stone")) {
    return "Player 1 wins!";
  } else {
    return gameMode === "singleplayer" ? "Computer wins!" : "Player 2 wins!";
  }
}

// Helper function to capitalize the first letter of the mode name
function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}
