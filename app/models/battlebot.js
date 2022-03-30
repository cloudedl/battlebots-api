const mongoose = require('mongoose')

const battlebotSchema = new mongoose.Schema(
	{
		name: {
			type: String,
			required: true,
		},
		primaryWeapon: {
			type: String,
			required: true,
		},
		currentWins: {
			type: Number
		},
		currentLosses: {
			type: Number
		},
		owner: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			required: true,
		},
	},
	{
		timestamps: true,
	}
)

module.exports = mongoose.model('BattleBot', battlebotSchema)
