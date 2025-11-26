 Core Components
1. Entry Point: index.js
Purpose: Initializes Express app, connects to database, registers routes, starts server.
Key Features:
•	Security: Helmet middleware for HTTP headers
•	CORS: Configurable via ALLOWED_ORIGINS env var (supports comma-separated list or wildcard *)
•	Health Check: GET /health → { status: 'UP', service: 'user-service' }
•	Database: Sequelize authentication + model sync on startup
•	Routes: All user endpoints under /api/users
•	Error Handling: Centralized error handler normalizing responses to { message, errors? }
Startup Flow:
•	
•	
•	
•	
________________________________________
2. Database Config: database.js
Purpose: Sequelize connection configuration.
Environment Variables:
•	DB_HOST (default: localhost)
•	DB_PORT (default: 5432)
•	DB_NAME (default: ecommerce)
•	DB_USERNAME (default: postgres)
•	DB_PASSWORD (default: password)
Features:
•	Connection pooling (max: 10, idle timeout: 10s)
•	Snake_case column naming (underscored: true)
•	SQL query logging to console
________________________________________
3. User Model: user.js
Purpose: Sequelize model for users table.
Schema:
•	
•	
•	
•	
Table Name: users (underscored)
________________________________________
4. Routes: userRoutes.js
Purpose: Defines REST endpoints with validation.
Endpoints:
Method	Path	Validation	Handler	Description
GET	/health	-	inline	Health check
POST	/	email (valid), password (≥6 chars), phone (10 digits)	createUser
Register new user
POST	/login
email (valid), password (≥6 chars)	login
Authenticate user → JWT
GET	/:id
-	getUserById
Fetch user by ID
GET	/email/:email
-	getUserByEmail
Fetch user by email
GET	/	query params: page, size
getAllUsers
Paginated user list
PUT	/:id
-	updateUser
Update user details
DELETE	/:id
-	deleteUser
Delete user
Validation: Uses express-validator for request body checks.
________________________________________
5. Controllers: userController.js
Purpose: Request handlers (parse request → call service → return response).
Functions:
createUser(req, res, next)
•	Validates request body
•	Calls userService.createUser()
•	Returns 201 with user DTO (password excluded)
login(req, res, next)
•	Extracts email and password
•	Calls userService.authenticate()
•	Signs JWT with payload: { sub: userId, email: userEmail }
•	Returns { accessToken, expiresIn, user }
getUserById(req, res, next)
•	Fetches user by req.params.id
•	Returns 404 if not found
getAllUsers(req, res, next)
•	Paginated fetch using page and size query params
•	Default: page 0, size 10
updateUser(req, res, next)
•	Updates firstName, lastName, phone, password (optional)
•	Returns updated user DTO
deleteUser(req, res, next)
•	Deletes user, returns 204 No Content
JWT Configuration:
•	Secret: JWT_SECRET env var (default: dev-secret)
•	Expiration: JWT_EXPIRES_IN env var (default: 1h)
________________________________________
6. Service Layer: userService.js
Purpose: Business logic (password hashing, database operations).
Functions:
createUser(userDTO)
•	Checks if email already exists (throws 400 error if duplicate)
•	Hashes password using bcrypt (10 rounds)
•	Creates user in database
•	Returns DTO (password excluded)
authenticate(email, password)
•	Fetches user by email
•	Bcrypt Hash Detection: Checks if password starts with $2 (bcrypt prefix)
o	If hashed: Uses bcrypt.compare()
o	If plaintext (legacy): Compares directly, then auto-migrates to bcrypt hash
•	Returns user DTO or null if invalid
updateUser(id, userDTO)
•	Updates user fields (firstName, lastName, phone)
•	If password provided, re-hashes with bcrypt
•	Returns updated user DTO
deleteUser(id)
•	Hard deletes user from database
•	Returns true if deleted, false if not found
toDTO(user)
•	Strips password field from user object
•	Returns safe user object: { id, email, firstName, lastName, phone, isActive }
Password Security:
•	Bcrypt hashing with configurable salt rounds (BCRYPT_SALT_ROUNDS env var, default: 10)
•	Legacy migration: Plaintext passwords auto-migrated to bcrypt on first login
________________________________________
7. Auth Middleware: auth.js
Purpose: JWT authentication middleware (validates Bearer tokens).
Flow:
•	
•	
•	
•	
Usage Example:
•	
•	
•	
•	
________________________________________
🐳 Docker Setup
Dockerfile
Base Image: node:20-alpine
Stages:
1.	Copy package.json and package-lock.json
2.	Install production dependencies (npm ci --only=production)
3.	Copy src/ folder
4.	Create non-root user (appuser)
5.	Expose port 8080
6.	Health check: wget http://localhost:8080/health every 30s
Build Command:
•	
•	
•	
•	
________________________________________
docker-compose.yml
Services:
postgres
•	Image: postgres:15-alpine
•	Port: 5432:5432
•	Database: userdb, credentials: postgres/postgres
•	Volume: postgres_data for persistence
user-service
•	Image: Built from local Dockerfile
•	Port: 8081:8080 (host:container)
•	Environment:
o	DB_HOST=postgres
o	DB_NAME=userdb
o	Credentials: postgres/postgres
Run Locally:
•	
•	
•	
•	
________________________________________
☸️ Kubernetes Deployment
deployment.yaml
Key Features:
•	Namespace: ecommerce
•	Replicas: 1
•	Image: ECR repository 297473910235.dkr.ecr.ap-south-1.amazonaws.com/user-service:latest
•	Port: 8080
Environment Variables:
•	Database: postgres service in same namespace
o	DB_HOST=postgres, DB_PORT=5432, DB_NAME=ecommerce
o	Credentials from pg-credentials Secret
•	AWS Credentials: aws-creds Secret (for LocalStack)
•	LocalStack: USE_LOCALSTACK=true, endpoint from ConfigMap
•	CORS: ALLOWED_ORIGINS set to frontend ELB (http + https)
Secrets/ConfigMaps Referenced:
•	aws-config (ConfigMap): aws_region, aws_endpoint, LOCALSTACK_ENDPOINT
•	aws-creds (Secret): AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
•	pg-credentials (Secret): POSTGRES_USER, POSTGRES_PASSWORD
________________________________________
service.yaml
Type: ClusterIP (internal service)
•	Selector: app: user-service
•	Port: 8080 (HTTP)
Access: Other services within cluster call http://user-service:8080
________________________________________
📦 Dependencies (package.json)
Production:
•	express (4.21.2): Web framework
•	sequelize (6.31.1): ORM for Postgres
•	pg (8.11.0): Postgres driver
•	bcrypt (5.1.0): Password hashing
•	jsonwebtoken (9.0.0): JWT signing/verification
•	cors (2.8.5): Cross-origin requests
•	helmet (7.0.0): Security headers
•	dotenv (16.6.1): Environment variable loader
•	express-validator (7.3.0): Request validation
Development:
•	nodemon (3.1.11): Auto-restart on file changes
Scripts:
•	npm start: Runs node src/index.js
•	npm run dev: Runs nodemon src/index.js
________________________________________
🔐 Security Features
1.	Password Hashing: Bcrypt with 10 rounds (configurable)
2.	Legacy Migration: Auto-upgrades plaintext passwords to bcrypt on login
3.	JWT Authentication: Stateless token-based auth (1-hour expiration)
4.	CORS Protection: Configurable allowed origins
5.	Helmet Middleware: Sets secure HTTP headers
6.	Input Validation: express-validator on all POST/PUT routes
7.	Non-Root User: Docker container runs as appuser (not root)

