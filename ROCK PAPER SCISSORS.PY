import random

# Define options and outcomes
choices = ['stone', 'paper', 'scissors']

# Determine the winner between two choices
def determine_winner(choice1, choice2):
    if choice1 == choice2:
        return "It's a tie!"
    elif (choice1 == 'stone' and choice2 == 'scissors') or \
         (choice1 == 'scissors' and choice2 == 'paper') or \
         (choice1 == 'paper' and choice2 == 'stone'):
        return "Player 1 wins!"
    else:
        return "Player 2 wins!"

# Single-player mode
def single_player():
    player_choice = input("Choose stone, paper, or scissors: ").lower()
    if player_choice not in choices:
        return "Invalid choice. Try again."
    computer_choice = random.choice(choices)
    print(f"Computer chose: {computer_choice}")
    result = determine_winner(player_choice, computer_choice)
    print(result)

# Multiplayer mode
def multiplayer():
    player1_choice = input("Player 1, choose stone, paper, or scissors: ").lower()
    player2_choice = input("Player 2, choose stone, paper, or scissors: ").lower()
    if player1_choice not in choices or player2_choice not in choices:
        return "Invalid choice(s). Try again."
    result = determine_winner(player1_choice, player2_choice)
    print(result)

# Game loop with mode selection
def play_game():
    mode = input("Choose game mode - Type 'singleplayer' or 'multiplayer': ").lower()
    if mode == 'singleplayer':
        single_player()
    elif mode == 'multiplayer':
        multiplayer()
    else:
        print("Invalid mode. Type 'singleplayer' or 'multiplayer'.")

# Run the game
play_game()
