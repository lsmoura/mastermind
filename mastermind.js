'use strict';

var validChars = '0123456789sergioabcdfhjklmnpqtuvwxyz';
var validColors = 'RGBYOPCM';

function generateKey(length) {
	length = length || 32;

	var ret = '';

	while(ret.length < length) {
		ret += validChars[Math.floor(Math.random() * validChars.length)];
	}

	return(ret);
}

var games = {};

function createGame(keys, color_count, positions, rounds) {
	if (!Array.isArray(keys)) {
		if (keys.length == 0)
			keys = [ 'I have no name' ];
	}

	color_count = color_count || 8;
	positions = positions || 8;
	rounds = rounds || 12;

	if (color_count > validColors.length)
		color_count = validColors.length;

	var gameInfo = {};

	gameInfo.player_keys = keys;
	gameInfo.key = generateKey();
	gameInfo.color_count = color_count;
	gameInfo.positions = positions;
	gameInfo.rounds = rounds;
	gameInfo.current_round = 0;
	gameInfo.guesses = [];
	gameInfo.finished = false;
	gameInfo.player_turn = null;

	if (gameInfo.player_keys.length > 1) {
		gameInfo.player_count = gameInfo.player_keys.length;
		// Select a starting player at random
		gameInfo.player_turn = Math.floor(Math.random() * gameInfo.player_count);
	}
	else
		gameInfo.player_count = 1;

	// If the player is using less than the maximum number of colors
	// let's make sure that he gets a random selection of colors.
	gameInfo.valid_colors = '';
	if (color_count == validColors.length) {
		gameInfo.valid_colors = validColors;
	}
	else {
		var idx = [];
		var i = 0;
		while (idx.length < validColors.length)
			idx.push(i++);

		while (gameInfo.valid_colors.length < color_count) {
			var n = idx.splice(Math.floor(Math.random() * idx.length), 1); // This is the index we're going to use
			gameInfo.valid_colors += validColors[n];
		}
	}

	// Generate the answer, unsing the validColors obtained in the last step
	gameInfo.answer = '';
	while (gameInfo.answer.length < positions)
		gameInfo.answer += gameInfo.valid_colors[Math.floor(Math.random() * gameInfo.valid_colors.length)];

	games[gameInfo.key] = gameInfo;

	return(gameInfo);
}

function gameInfo(gameKey) {
	if (games.hasOwnProperty(gameKey))
		return(games[gameKey]);

	return(null);
}

// This is a private function.
function checkColors(validColors, answer) {
	var i;
	for (i = 0; i < answer.length; i++) {
		if (validColors.indexOf(answer[i]) == -1)
			return(false);
	}

	return(true);
}

function guess(gameKey, answer, player_key) {
	var game = gameInfo(gameKey);

	// Some sanity check before we begin...
	if (game == null) return({ error: 'invalid gamekey' });
	if (game.current_round >= game.rounds) return({ error: 'max rounds reached. answer was ' + game.answer });
	if (game.finished === true) return({ error: 'this game is already finished. answer was ' + game.answer });
	if (!answer) return({ error: 'we need a valid guess for this game to work, you know?' });
	if (answer.length != game.positions) return({ error: 'invalid answer length' });
	if (checkColors(game.valid_colors, answer) == false) return({ error: 'answer with invalid colors. Valid colors are ' + game.valid_colors });

	var playerIdx = game.player_keys.indexOf(player_key);

	if (game.player_keys.length > 1) {
		console.log("Debugging multiplayer game");
		console.log(game.player_keys);
		console.log("Player turn: " + game.player_turn);
		console.log("Player: %s (%d)", player_key, playerIdx);
	}

	if (playerIdx < 0) {
		return({ error: 'You do not belong in this game. '});
	}

	if (game.player_turn !== null && playerIdx != game.player_turn) {
		return({ error: 'Invalid player. It\'s player "' + game.player_keys[game.player_turn] + '" turn now.' });
	}

	var thisTry = {
		guess: answer,
		exact: 0,
		near: 0,
		round: game.current_round
	};

	if (game.player_turn !== null) {
		thisTry.player = game.player_turn;
		game.player_turn++;
		if (game.player_turn >= game.player_keys.length)
			game.player_turn = 0;
	}

	// Let's check for exact results first.
	// Everything that checks out gets changed by ' ' (space character).
	var i, j;
	var test = game.answer.split('');
	var a = answer.split('');
	for (i = 0; i < test.length; i++) {
		if (a[i] === test[i]) {
			test[i] = ' ';
			a[i] = ' ';
			thisTry.exact++;
		}
	}

	// Now let's check for the near ones
	for (i = 0; i < a.length; i++) {
		if (a[i] != ' ') {
			for (j = 0; j < test.length; j++) {
				if (test[j] != ' ' && a[i] != ' ' && test[j] === a[i]) {
					a[i] = ' ';
					test[j] = ' ';
					thisTry.near++;
				}
			}
		}
	}

	game.current_round++;

	if (game.current_round >= game.rounds) {
		game.finished = true;
		thisTry.finished = true;
		thisTry.answer = game.answer;
	}

	game.guesses.push(thisTry);

	if (thisTry.exact == game.positions) {
		game.finished = true;
		thisTry.finished = true;
	}

	// Sets next player key on multiplayer games
	if (!game.finished && game.player_keys.length > 1) {
		thisTry.nextPlayer = game.player_keys[game.player_turn];
	}

	return(thisTry);
}

if (module.exports) {
	module.exports.generateKey = generateKey;
	module.exports.createGame = createGame;
	module.exports.gameInfo = gameInfo;
	module.exports.guess = guess;
}
