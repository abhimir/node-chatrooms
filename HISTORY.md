0.0.8, 2011/05/18
-----------------

* Fixed the problem where messages would be sent to all users
* Saves chat rooms and messages in Mongo with Mongoose

0.0.6, 2011/05/18
-----------------

* Refactored code to make things cleaner
* Created seperate files for urls, views, and models (kinda like Django)

0.0.5, 2011/05/17
-----------------

* Changed code from long-polling to leverage Socket.IO
* Refactored a lot of code

0.0.2, 2011/05/17
-----------------

* Changed some methods that altered data to POST instead of GET
* Refactored some code to get parameters using Express helpers

0.0.1, 2011/05/16
-----------------

* Initial commit
* Working using long-polling, node.js, and Express