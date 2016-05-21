'use strict';

/*
  This project is an implementation of a mastermind
  backend for the vanhackatron challenge provided by
  axiom-zen.

  Author: Sergio Moura
  2016-05-20
*/

var dispatch = require('dispatchjs');
var io = require('socket.io')(3001);
var mastermind = require('./mastermind');

var public_info = ['player_keys', 'key', 'color_count', 'rounds', 'valid_colors', 'positions'];

// Creates a new game
function new_game(params) {
	var game = mastermind.createGame(params.player_keys, params.color_count, params.positions, params.rounds);

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

// Using socket.io for multiplayer stuff

var players = [];

function updateCount(count, socket) {
	socket.broadcast.emit('count', count);
	socket.emit('count', count);
}

var get_player_with_key = function(key) {
	for (var i = 0; i < players.length; i++) {
		if (players[i].key == key) {
			return(players[i]);
		}
	}
	return(null);
};

var exit_game = function(player, reason, cascade) {
	if (!player) return;
	if (!player.game) return;

	console.log(player.key + ' is leaving the game.');

	player.status = "idle";
	if (player.game.player_keys.length > 1) {
		var i, l = game.player_name.length;
		// Emmit game finish to everyone
		for (i = 0; i < l; i++) {
			var p = get_player_with_key(player.game.player_keys[i]);
			if (p.status != idle) {
				exit_game(p, reason);
			}
		}
	}
	player.game = null;
	player.socket.emit('exit_game', reason);
};

var emmit_stat = function(game, stat) {
	var gameinfo = mastermind.gameInfo(game.key);
	var i, l = gameinfo.player_keys.length;
	for (i = 0; i < l; i++) {
		var p = get_player_with_key(game.player_keys[i]);
		p.socket.emit('status', stat);
	}
};

io.on('connection', function(socket) {
	var player = {
		"key": mastermind.generateKey(12),
		"socket": socket,
		"name": "noname",
		"status": "idle",
		"gamekey": null,
		"gamesize": 1,
		"game": null
	};

	players.push(player);
	updateCount(players.length, socket);

	socket.on('disconnect', function(){
		exit_game(player);
		for (var i = 0; i < players.length; i++) {
			if (players[i].key == player.key) {
				players.splice(i, 1);
				updateCount(players.length, socket);
				return;
			}
		}
	});

	socket.on('join', function(data) {
		if (player.game != null) {
			socket.emit('message', 'You are already playing a game!');
			return;
		}
		if (data.player_count < 1) {
			data.player_count = 1;
		}

		player.name = data.player_name;

		if (data.player_count == 1) {
			data.player_keys = [ player.key ];
			player.game = new_game(data);
			player.status = 'playing';
			socket.emit('game_start', player.game);

			console.log(player.game);
		}
	});

	socket.on('guess', function(data) {
		console.log("Guessing");
		console.log(data);
		var ret = mastermind.guess(data.key, data.answer);
		emmit_stat(player.game, ret);
	});

	socket.on('exit', function(data) {
		if (player.game == null) {
			socket.emit('message', 'You\'re not playing anything yet.')
			return;
		}

		exit_game(player, player.name + ' has left the game.');
	});

	socket.on('players', function() {
		console.log(players);
		var ret = players.map(function(player) {
			var keys = Object.keys(player).filter(function(a) { return(a != 'socket');  });
			var obj = {};
			keys.forEach(function(k) { obj[k] = player[k] });
			return(obj);
		});

		socket.emit('players', ret);
	})

});
