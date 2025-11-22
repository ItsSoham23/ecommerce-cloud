// Minimal auth middleware placeholder. Extend with JWT or other checks as needed.
function optionalAuth(req, res, next) {
	// If you have an Authorization header, parse and attach user info.
	// For now, just continue.
	next();
}

module.exports = { optionalAuth };
