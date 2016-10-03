/**
 * User object used with asrielborg server
 * @param {Object} decoded_token - The JWT Token of the user
 */

module.exports = function (decoded_token) {
	this.profile = decoded_token;
	this.status = 'offline';

	this.setStatus = function (status) {
		this.status = status;
	}
};