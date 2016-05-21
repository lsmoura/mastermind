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

function createGame(color_count, positions, rounds) {
	color_count = color_count || 8;
	positions = positions || 8;
	rounds = rounds || 12;

	if (color_count > validColors.length)
		color_count = validColors.length;

	var gameInfo = {};

	gameInfo.key = generateKey();
	gameInfo.color_count = color_count;
	gameInfo.positions = positions;
	gameInfo.rounds = rounds;
	gameInfo.current_round = 0;
	gameInfo.guesses = [];
	gameInfo.finished = false;

	// If the player is using less than the maximum number of colors
	// let's make sure that he gets a random selection of colors.
	gameInfo.validColors = '';
	if (color_count == validColors.length) {
		gameInfo.validColors = validColors;
	}
	else {
		var idx = [];
		var i = 0;
		while (idx.length < validColors.length)
			idx.push(i++);

		while (idx.length > color_count) {
			var n = idx.splice(Math.floor(Math.random() * idx.length), 1); // This is the index we're going to use
			gameInfo.validColors += validColors[n];
		}
	}

	// Generate the answer, unsing the validColors obtained in the last step
	gameInfo.answer = '';
	while (gameInfo.answer.length < positions)
		gameInfo.answer += gameInfo.validColors[Math.floor(Math.random() * gameInfo.validColors.length)];

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

function guess(gameKey, answer) {
	var game = gameInfo(gameKey);
	// Some sanity check before we begin...
	if (game == null) return({ error: 'invalid gamekey' });
	if (game.current_round >= game.rounds) return({ error: 'max rounds reached. answer was ' + game.answer });
	if (game.finished === true) return({ error: 'this game is already finished.' });
	if (answer.length != game.positions) return({ error: 'invalid answer length' });
	if (checkColors(game.validColors, answer) == false) return({ error: 'answer with invalid colors. Valid colors are ' + game.validColors });

	var thisTry = {
		guess: answer,
		exact: 0,
		near: 0,
		round: game.current_round
	};

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
	game.guesses.push(thisTry);

	if (thisTry.exact == game.positions) {
		game.finished = true;
	}

	return(thisTry);
}

if (module.exports) {
	module.exports.generateKey = generateKey;
	module.exports.createGame = createGame;
	module.exports.gameInfo = gameInfo;
	module.exports.guess = guess;
}
