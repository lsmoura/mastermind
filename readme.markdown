Mastermind Back-End
=================

This project is an implementation of a mastermind backend for the vanhackatron challenge provided by axiom-zen.

This project uses [dispatchjs](https://github.com/lsmoura/dispatchjs.git). A nodejs library for handling and dispatching HTTP requests, created by the same author.


Multiplayer Games
----------------

When joining multiplayer games, the parameters passed by the LAST participant is the one which counts.

The game will select one of the players at random to start the game.


Testing
------

Clone the repository and retrieve depedencies with `npm update`.

Then, run the backend using `node app.js`, and open the index.html on any browser and you're good to go.

HTTP endpoints
--------------

all requests are POST requests, even without parameters.

* `/hello` (no parameters needed) Talks to the API. Get a player key.
* `/goodbye` required parameter: `player_key`. Unregister yourself and exit your games.
* `/join` required parameter: `player_key`. optional parameters: `color_count`, `position`, `rounds`, `player_count`. Requests to join a new game. One-player games will be created immediately while more than one-player games must wait until there are enough players.
* `/exit` required parameter: `player_key`. Exits the current game (and boots everyone else from the game if it's a multiplayer game).
* `/guess` required parameters: `player_key`, `answer`. Guesses the current game.
* `/status` required parameter: `player_key`. Return the current player and game status.

Author
-----
Sergio Moura <sergio@moura.us>

* [Linkedin profile](https://linkedin.com/in/luissergiomoura)
* [Stack overflow careers](http://careers.stackoverflow.com/lsmoura)

License
-------

MIT