// Express docs: http://expressjs.com/en/api.html
const express = require('express')
// Passport docs: http://www.passportjs.org/docs/
const passport = require('passport')

// pull in Mongoose model for battlebots
const BattleBot = require('../models/battlebot')

// this is a collection of methods that help us detect situations when we need
// to throw a custom error
const customErrors = require('../../lib/custom_errors')

// we'll use this function to send 404 when non-existant document is requested
const handle404 = customErrors.handle404
// we'll use this function to send 401 when a user tries to modify a resource
// that's owned by someone else
const requireOwnership = customErrors.requireOwnership

// this is middleware that will remove blank fields from `req.body`, e.g.
// { battlebot: { title: '', text: 'foo' } } -> { battlebot: { text: 'foo' } }
const removeBlanks = require('../../lib/remove_blank_fields')
// passing this as a second argument to `router.<verb>` will make it
// so that a token MUST be passed for that route to be available
// it will also set `req.user`
const requireToken = passport.authenticate('bearer', { session: false })

// instantiate a router (mini app that only handles routes)
const router = express.Router()

// INDEX
// GET /battlebots
router.get('/battlebots', (req, res, next) => {
	BattleBot.find()
		.then((battlebots) => {
			// `battlebots` will be an array of Mongoose documents
			// we want to convert each one to a POJO, so we use `.map` to
			// apply `.toObject` to each one
			return battlebots.map((battlebot) => battlebot.toObject())
		})
		// respond with status 200 and JSON of the battlebots
		.then((battlebots) => res.status(200).json({ battlebots }))
		// if an error occurs, pass it to the handler
		.catch(next)
})

// SHOW
// GET /battlebots/5a7db6c74d55bc51bdf39793
router.get('/battlebots/:id', (req, res, next) => {
	// req.params.id will be set based on the `:id` in the route
	BattleBot.findById(req.params.id)
		.then(handle404)
		// if `findById` is succesful, respond with 200 and "battlebot" JSON
		.then((battlebot) => res.status(200).json({ battlebot: battlebot.toObject() }))
		// if an error occurs, pass it to the handler
		.catch(next)
})

// CREATE
// POST /battlebots
router.post('/battlebots', requireToken, (req, res, next) => {

	// set owner of new battlebot to be current user
	req.body.battlebot.owner = req.user.id

	BattleBot.create(req.body.battlebot)
		// respond to succesful `create` with status 201 and JSON of new "battlebot"
		.then((battlebot) => {
			res.status(201).json({ battlebot: battlebot.toObject() })
		})
		// if an error occurs, pass it off to our error handler
		// the error handler needs the error message and the `res` object so that it
		// can send an error message back to the client
		.catch(next)
})

// UPDATE
// PATCH /battlebots/5a7db6c74d55bc51bdf39793
router.patch('/battlebots/:id', requireToken, removeBlanks, (req, res, next) => {
	// if the client attempts to change the `owner` property by including a new
	// owner, prevent that by deleting that key/value pair
	delete req.body.battlebot.owner

	BattleBot.findById(req.params.id)
		.then(handle404)
		.then((battlebot) => {
			// pass the `req` object and the Mongoose record to `requireOwnership`
			// it will throw an error if the current user isn't the owner
			requireOwnership(req, battlebot)
			// pass the result of Mongoose's `.update` to the next `.then`
			return battlebot.updateOne(req.body.battlebot)
		})
		// if that succeeded, return 204 and no JSON
		.then(() => res.sendStatus(204))
		// if an error occurs, pass it to the handler
		.catch(next)
})

// DESTROY
// DELETE /battlebots/5a7db6c74d55bc51bdf39793
router.delete('/battlebots/:id', requireToken, (req, res, next) => {
	BattleBot.findById(req.params.id)
		.then(handle404)
		.then((battlebot) => {

			// pass the `req` object and the Mongoose record to `requireOwnership`
			// it will throw an error if the current user isn't the owner
			requireOwnership(req, battlebot)

			// delete the battlebot ONLY IF the above didn't throw
			battlebot.deleteOne()
		})
		// send back 204 and no content if the deletion succeeded
		.then(() => res.sendStatus(204))
		// if an error occurs, pass it to the handler
		.catch(next)
})

module.exports = router
