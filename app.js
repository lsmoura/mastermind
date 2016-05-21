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

function updateCount(count) {
	io.sockets.emit('count', count);
	console.log("Currently %d players connected", count);
}

var get_player_with_key = function(key) {
	for (var i = 0; i < players.length; i++) {
		if (players[i].key == key) {
			return(players[i]);
		}
	}
	return(null);
};

var remove_player = function(player_key) {
	for (var i = 0; i < players.length; i++) {
		if (players[i].key == player_key) {
			players.splice(i, 1);
			updateCount(players.length);
			return;
		}
	}
}

var exit_game = function(player, reason, cascade) {
	if (!player) return;
	if (!player.game) return;

	console.log(player.key + ' is leaving the game.');

	player.status = "idle";
	if (player.game.player_keys.length > 1) {
		var i, l = player.game.player_keys.length;
		// Emmit game finish to everyone
		for (i = 0; i < l; i++) {
			var p = get_player_with_key(player.game.player_keys[i]);
			if (p.status != 'idle') {
				exit_game(p, reason);
			}
		}
	}
	player.game = null;
	if (player.socket)
		player.socket.emit('exit_game', reason);
	else
		player.message = reason;
};

var emmit_stat = function(game, stat) {
	var gameinfo = mastermind.gameInfo(game.key);
	var i, l = gameinfo.player_keys.length;
	for (i = 0; i < l; i++) {
		var p = get_player_with_key(game.player_keys[i]);
		if (p.socket)
			p.socket.emit('status', stat);
		else
			p.message = stat;
	}
};

var try_start = function(gamesize, parameters) {
	var available_players = [];
	var i, l = players.length;

	for (i = 0; i < l; i++) {
		if (players[i].status === 'waiting' && players[i].gamesize == gamesize) {
			available_players.push(players[i]);
		}
	}

	if (available_players.length >= gamesize) {
		var keys = available_players.map(function(x) { return(x.key); });
		parameters.player_keys = keys;
		var game = new_game(parameters);
		l = available_players.length;
		for (i = 0; i < l; i++) {
			available_players[i].status = 'playing';
			available_players[i].game = game;
			if (available_players[i].socket != null)
				available_players[i].socket.emit('game_start', game);
		}
	}
	else {
		console.log("Not enough players for a game of %d. Currently have %d waiting.", gamesize, available_players.length);
		return(false);
	}

	return(true);
};

// Dispatch logic
dispatch.map('POST', '/hello', function() {
	var player = {
		"key": mastermind.generateKey(12),
		"socket": null,
		"name": "noname",
		"status": "idle",
		"gamekey": null,
		"gamesize": 1,
		"game": null,
		"message": null
	};

	players.push(player);
	var ret = { 'player_key': player.key };
	updateCount(players.length);
	this(JSON.stringify(ret), { 'Content-Type': 'application/json' });
});

dispatch.map('POST', '/goodbye', function() {
	var params = this.fields;
	var player = null;
	if (params.player_key) {
		player = get_player_with_key(params.player_key);
	}
	if (player == null) {
		this(JSON.stringify({ error: "invalid key." }), { 'Content-Type': 'application/json' });
		return;
	}

	exit_game(player);
	remove_player(player.key);
	this(JSON.stringify({ message: "disconnected." }), { 'Content-Type': 'application/json' });
	updateCount(players.length);
});

dispatch.map('POST', '/join', function() {
	var data = this.fields;
	var player = null;
	if (data.player_key) {
		player = get_player_with_key(data.player_key);
	}
	if (player == null) {
		this(JSON.stringify({ error: "invalid player key." }), { 'Content-Type': 'application/json' });
		return;
	}

	if (player.game != null) {
		this(JSON.stringify({ error: "You are already playing a game!" }), { 'Content-Type': 'application/json' });
		return;
	}

	if (data.hasOwnProperty('player_count') == false)
		data.player_count = 1;

	// You cannot play a game with less than one player.
	if (data.player_count < 1) {
		data.player_count = 1;
	}

	if (data.player_count == 1) {
		data.player_keys = [ player.key ];
		player.game = new_game(data);
		player.status = 'playing';
		this(JSON.stringify({ game: player.game }), { 'Content-Type': 'application/json' });
	}
	else {
		player.gamesize = data.player_count;
		player.status = 'waiting';
		if (try_start(player.gamesize, data)) {
			this(JSON.stringify({ game: player.game }), { 'Content-Type': 'application/json' });
		}
		else {
			this(JSON.stringify({ message: "Waiting for more players." }), { 'Content-Type': 'application/json' });
		}
	}
});

dispatch.map('POST', '/exit', function() {
	var data = this.fields;
	var player = null;
	if (data.player_key) {
		player = get_player_with_key(data.player_key);
	}

	if (player == null) {
		this(JSON.stringify({ error: "invalid player key." }), { 'Content-Type': 'application/json' });
		return;
	}

	if (player.status === 'waiting') {
		player.status = 'idle';
		this(JSON.stringify({ message: 'You\'re no longer waiting for a game.' }));
		return;
	}

	if (player.game == null) {
		this(JSON.stringify({ message: 'You\'re not playing anything yet.' }));
		return;
	}

	exit_game(player, player.name + ' has left the game.');
	this(JSON.stringify({ message: 'You left the game.' }));
});

dispatch.map('POST', '/guess', function() {
	var data = this.fields;
	var player = null;
	if (data.player_key) {
		player = get_player_with_key(data.player_key);
	}

	if (player == null) {
		this(JSON.stringify({ error: "invalid player key." }), { 'Content-Type': 'application/json' });
		return;
	}

	if (player.game == null) {
		if (player.message != null) {
			this(JSON.stringify({ message: player.message }), { 'Content-Type': 'application/json' });
			player.message = null;
			return;
		}
		this(JSON.stringify({ error: "You're not in a game." }), { 'Content-Type': 'application/json' });
		return;
	}

	var ret = mastermind.guess(player.game.key, data.answer, player.key);
	if (ret.hasOwnProperty('error') == false) {
		emmit_stat(player.game, ret);
		player.message = null;
	}
	this(JSON.stringify(ret), { 'Content-Type': 'application/json' });
});

dispatch.map('POST', '/status', function() {
	var data = this.fields;
	var player = null;
	if (data.player_key) {
		player = get_player_with_key(data.player_key);
	}

	if (player == null) {
		this(JSON.stringify({ error: "invalid player key." }), { 'Content-Type': 'application/json' });
		return;
	}

	if (player.game == null) {
		if (player.status == 'idle') {
			this(JSON.stringify({ status: "idle" }), { 'Content-Type': 'application/json' });
		}
		else if (player.status = 'waiting') {
			this(JSON.stringify({ status: "waiting for more players" }), { 'Content-Type': 'application/json' });
		}
		else {
			this(JSON.stringify({ status: "unknown status: " + player.status }), { 'Content-Type': 'application/json' });
		}
		return;
	}

	var obj = {
		game: state(player.game.key)
	};
	if (player.message != null) {
		obj.message = player.message;
		player.message = null;
	}

	this(JSON.stringify(obj), { 'Content-Type': 'application/json' });
});

dispatch(3000, {});

// Socket.io logic
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
	updateCount(players.length);

	socket.emit('key', player.key);

	socket.on('disconnect', function(){
		exit_game(player);
		remove_player(player.key);
	});

	socket.on('join', function(data) {
		// If the player is already in a game, tell him so.
		// If the player is on the line for a game, we let him re-join the queue with new settings.
		if (player.game != null) {
			socket.emit('message', 'You are already playing a game!');
			return;
		}

		// You cannot play a game with less than one player.
		if (data.player_count < 1) {
			data.player_count = 1;
		}

		player.name = data.player_name;

		if (data.player_count == 1) {
			data.player_keys = [ player.key ];
			player.game = new_game(data);
			player.status = 'playing';
			socket.emit('game_start', player.game);
		}
		else {
			player.gamesize = data.player_count;
			player.status = 'waiting';
			socket.emit('message', 'Waiting for more players...');
			try_start(player.gamesize, data);
		}
	});

	socket.on('guess', function(data) {
		// Guess the value...
		var ret = mastermind.guess(data.key, data.answer, player.key);

		if (ret.hasOwnProperty('error')) {
			// tell the error just for him.
			socket.emit('status', ret);
			return;
		}

		// or tell everyone on the same game the result.
		emmit_stat(player.game, ret);
	});

	socket.on('exit', function(data) {
		if (player.status === 'waiting') {
			player.status = 'idle';
			socket.emit('message', 'You\'re no longer waiting for a game.');
			return;
		}

		if (player.game == null) {
			socket.emit('message', 'You\'re not playing anything yet.')
			return;
		}

		exit_game(player, player.name + ' has left the game.');
	});

	socket.on('state', function() {
		if (player.game == null) {
			socket.emit('message', 'You\'re not on a game.');
			return;
		}

		var ret = state(player.game.key);
		socket.emit('game_info', ret);
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
	});
});

console.log("Waiting for connections...");

