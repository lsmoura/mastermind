'use strict';

/*
  This project is an implementation of a mastermind
  backend for the vanhackatron challenge provided by
  axiom-zen.

  Author: Sergio Moura
  2016-05-20
*/

var dispatch = require('dispatchjs');
var mastermind = require('./mastermind');

var public_info = ['player_name', 'key', 'color_count', 'rounds', 'valid_colors', 'positions'];

// Creates a new game
function new_game(params) {
	var game = mastermind.createGame(params.player_name, params.color_count, params.positions, params.rounds);

	// Let's filter out some stuff
	var ret = {};
	public_info.forEach(function(x) {
		ret[x] = game[x];
	});

	if (game.player_turn !== null)
		ret.player_turn = game.player_turn;

	return(ret);
}

// Returns the current game state
function state(gameKey) {
	var game = mastermind.gameInfo(gameKey);

	var ret = {};
	if (game != null) {
		// Let's filter out some stuff
		public_info.forEach(function(x) {
			ret[x] = game[x];
		});

		if (game.finished) {
			ret.finished = true;
			ret.answer = game.answer;
		}
		ret.tries = game.guesses;

		if (game.player_turn !== null)
			ret.player_turn = game.player_turn;
	}
	else {
		ret = { error: 'invalid game key.' };
	}

	return(ret);
}

dispatch.setOption('debug', true);

dispatch.map('POST', '/new_game', function() {
	this(JSON.stringify(new_game(this.fields)), { 'Content-Type': 'application/json '});
});

dispatch.map('POST', '/guess', function() {
	var ret = mastermind.guess(this.fields.key, this.fields.answer);

	this(JSON.stringify(ret), { 'Content-Type': 'application/json '});
});

dispatch.map('POST', '/state', function() {
	this(JSON.stringify(state(this.fields.key)), { 'Content-Type': 'application/json '});
});

dispatch(3000, {});
