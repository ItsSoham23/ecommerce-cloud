class AppError extends Error {
	constructor(message, status = 500) {
		super(message);
		this.status = status;
	}
}

class BadRequestError extends AppError {
	constructor(message = 'Bad Request') {
		super(message, 400);
	}
}

class NotFoundError extends AppError {
	constructor(message = 'Not Found') {
		super(message, 404);
	}
}

module.exports = { AppError, BadRequestError, NotFoundError };
