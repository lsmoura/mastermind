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

dispatch.setOption('debug', true);

dispatch.map('POST', '/new_game', function() {
	var game = mastermind.createGame(this.fields.player_name, this.fields.color_count, this.fields.positions, this.fields.rounds);

	var valid_keys = ['player_name', 'key', 'color_count', 'rounds', 'valid_colors'];

	// Let's filter out some stuff
	var ret = {};
	public_info.forEach(function(x) {
		ret[x] = game[x];
	});

	this(JSON.stringify(ret), { 'Content-Type': 'application/json '});
});

dispatch.map('POST', '/guess', function() {
	var ret = mastermind.guess(this.fields.key, this.fields.answer);

	this(JSON.stringify(ret), { 'Content-Type': 'application/json '});
});

dispatch.map('POST', '/state', function() {
	var game = mastermind.gameInfo(this.fields.key);

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
	}
	else {
		ret = { error: 'invalid game key.' };
	}

	this(JSON.stringify(ret), { 'Content-Type': 'application/json '});
});

dispatch(3000, {});
