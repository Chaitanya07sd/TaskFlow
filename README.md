# TaskFlow — Full-Stack Task Manager with CI/CD

[![Java 17](https://img.shields.io/badge/Java-17%20LTS-ED8B00?style=flat&logo=openjdk&logoColor=white)](https://openjdk.org/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.3.4-6DB33F?style=flat&logo=springboot&logoColor=white)](https://spring.io/projects/spring-boot)
[![MySQL 8.0](https://img.shields.io/badge/MySQL-8.0-4479A1?style=flat&logo=mysql&logoColor=white)](https://www.mysql.com/)
[![Docker](https://img.shields.io/badge/Docker-Enabled-2496ED?style=flat&logo=docker&logoColor=white)](https://www.docker.com/)
[![Jenkins](https://img.shields.io/badge/Jenkins-CI%2FCD-D24939?style=flat&logo=jenkins&logoColor=white)](https://www.jenkins.io/)

**TaskFlow** is a modern, production-grade full-stack task management web application built with **Java 17**, **Spring Boot 3**, **Spring Security 6**, **MySQL 8.0**, and a responsive **Vanilla JavaScript (ES6+)** frontend. The project includes automated JUnit 5/MockMvc tests, Docker containerization, and an 8-stage declarative Jenkins CI/CD pipeline.

---

## Architecture Overview

```
                      +---------------------------------------+
                      |         Web Browser Client            |
                      |   (HTML5, CSS Tokens, Vanilla ES6+)   |
                      +-------------------+-------------------+
                                          |
                      HTTPS / HTTP (Same-Origin Session + CSRF)
                                          |
                                          v
+-----------------------------------------------------------------------------------+
| Spring Boot 3.3.4 Backend                                                         |
|                                                                                   |
|  +------------------------+   +-----------------------+   +--------------------+  |
|  | WebMvc / Static Assets |   |  Spring Security 6    |   | Actuator (/health) |  |
|  |  (/, /login, /register)|   |  (Session, CSRF, Auth)|   +--------------------+  |
|  +------------------------+   +-----------+-----------+                           |
|                                           |                                       |
|  +------------------------+   +-----------v-----------+                           |
|  | AuthController         |   | TaskController        |                           |
|  | (/api/auth/**)         |   | (/api/tasks/**)       |                           |
|  +-----------+------------+   +-----------+-----------+                           |
|              |                            |                                       |
|  +-----------v------------+   +-----------v-----------+                           |
|  | UserService            |   | TaskService           |                           |
|  | (BCrypt Hashing)       |   | (User Isolation Enforced)                         |
|  +-----------+------------+   +-----------+-----------+                           |
|              |                            |                                       |
|  +-----------v----------------------------v-----------+                           |
|  | Spring Data JPA / Hibernate Layer                  |                           |
|  +------------------------+---------------------------+                           |
+---------------------------|-------------------------------------------------------+
                            |
                   JDBC Connection (Port 3306)
                            |
                            v
            +-------------------------------+
            | MySQL 8.0 Database            |
            | Database: task_manager_db     |
            | Tables: users, tasks          |
            +-------------------------------+
```

---

## Key Features

1. **Enterprise Security & Session Management**:
   - Server-side session authentication with `TASKFLOW_SESSIONID` cookie (`HttpOnly`, `SameSite=Lax`).
   - Session fixation protection with automatic session ID migration on authentication.
   - Dual CSRF protection (cookie-to-header token verification with `CsrfCookieFilter`).
   - Strong BCrypt password hashing (strength 12) with zero plaintext credential persistence.
   - Normalized emails (lowercase, trimmed) with unique constraints at database and application levels.
   - Restful JSON 401/403 handlers for single-page application and AJAX flows.

2. **Strict User Ownership & Data Isolation**:
   - Every task is linked to a user via `@ManyToOne`.
   - Security context verification on all operations (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`).
   - **IDOR Protection**: Insecure direct object reference requests for another user's task ID return `404 Not Found` without disclosing metadata.

3. **Modern SaaS User Experience**:
   - Soft off-white canvas with indigo/deep violet brand identity.
   - Real-time statistics: Total Tasks, Pending Tasks, Completed Tasks, and Completion Rate.
   - Live search (debounced), status filtering (All, Pending, Completed), and sorting.
   - Custom checkbox toggles with optimistic UI updates.
   - Accessible modal forms for task creation and editing.
   - Delete confirmation modal preventing accidental deletions.
   - Lightweight SVG icons (Lucide-inspired) and non-blocking toast notifications.

---

## Directory Structure

```
todo/
├── backend/
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/com/taskflow/
│   │   │   │   ├── config/            # WebSecurityConfig, WebMvcConfig
│   │   │   │   ├── controller/        # AuthController, TaskController
│   │   │   │   ├── dto/               # Request and response models
│   │   │   │   ├── entity/            # User, Task, TaskStatus
│   │   │   │   ├── exception/         # GlobalExceptionHandler, custom exceptions
│   │   │   │   ├── repository/        # UserRepository, TaskRepository
│   │   │   │   ├── security/          # UserDetails, CsrfFilter, RestEntryPoints
│   │   │   │   ├── service/           # UserService, TaskService
│   │   │   │   └── TaskFlowApplication.java
│   │   │   └── resources/
│   │   │       └── application.properties
│   │   └── test/
│   │       ├── java/com/taskflow/     # Integration and isolated test suites
│   │       └── resources/
│   │           └── application.properties
│   ├── Dockerfile                     # Multi-stage production container build
│   └── pom.xml                        # Maven configuration with Java 17
├── frontend/
│   ├── css/
│   │   ├── variables.css              # Design tokens, color palette, typography
│   │   ├── auth.css                   # Login & registration styling
│   │   └── dashboard.css              # Dashboard layout, modals, cards, toasts
│   ├── js/
│   │   ├── api.js                     # Centralized Fetch wrapper with CSRF
│   │   ├── auth.js                    # Auth form validation & submission
│   │   └── dashboard.js               # State management & task CRUD
│   ├── index.html                     # Main dashboard view
│   ├── login.html                     # User authentication
│   └── register.html                  # Account registration
├── .gitignore
├── compose.yaml                       # Docker Compose specification
├── Jenkinsfile                        # 8-stage declarative CI/CD pipeline
└── README.md
```

---

## Prerequisites

- **Java**: OpenJDK 17 LTS
- **Maven**: Apache Maven 3.8+
- **MySQL**: MySQL 8.0 Server running on port 3306
- **Docker**: Docker Desktop (Engine 20.10+)
- **Git**: Git 2.30+

---

## Local Setup & Configuration

### 1. Database Setup

Ensure your local MySQL service is running on port 3306. Create the dedicated database `task_manager_db`:

```sql
CREATE DATABASE IF NOT EXISTS task_manager_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

> **Note**: Spring Boot automatically manages and updates schema tables (`users` and `tasks`) using `spring.jpa.hibernate.ddl-auto=update`.

### 2. Configure Environment Variables

TaskFlow reads all database credentials from standard environment variables. Never hardcode passwords in configuration files.

#### On Windows (PowerShell):
```powershell
$env:DB_HOST = "localhost"
$env:DB_PORT = "3306"
$env:DB_NAME = "task_manager_db"
$env:DB_USERNAME = "root"
$env:DB_PASSWORD = "your_actual_mysql_password"
```

#### On Linux / macOS (Bash):
```bash
export DB_HOST=localhost
export DB_PORT=3306
export DB_NAME=task_manager_db
export DB_USERNAME=root
export DB_PASSWORD=your_actual_mysql_password
```

### 3. Build & Run the Backend

From the project root:

```bash
cd backend
mvn clean spring-boot:run
```

The application starts on `http://localhost:8080`.

- **Web Dashboard**: [http://localhost:8080](http://localhost:8080)
- **Sign In**: [http://localhost:8080/login.html](http://localhost:8080/login.html)
- **Sign Up**: [http://localhost:8080/register.html](http://localhost:8080/register.html)
- **Health Check**: [http://localhost:8080/actuator/health](http://localhost:8080/actuator/health)

---

## Running Automated Tests

TaskFlow includes an automated integration test suite running on an **in-memory H2 database**. The tests execute in complete isolation without altering or requiring access to live MySQL data.

To run the automated tests:

```bash
cd backend
mvn test
```

### Test Coverage Highlights:
- **Registration**: Tests account creation, email uniqueness check, and BCrypt hashing validation.
- **Authentication**: Tests login success, invalid password rejection, non-existent user handling, and session invalidation on logout.
- **Security**: Verifies unauthenticated endpoint rejection (401 JSON) and CSRF protection.
- **Task CRUD**: Tests task creation, retrieval, updates, status toggling, and deletion.
- **Ownership Isolation (IDOR)**: Verifies that User A's tasks cannot be read, updated, or deleted by User B.

---

## Docker Deployment

TaskFlow features a multi-stage Dockerfile that packages the backend and bundled frontend into a lightweight, non-root production container.

### Option A: Connect Container to Existing Windows MySQL (Recommended)

When running the containerized app while your MySQL server runs on the Windows host:

```bash
# Set your host MySQL credentials
$env:DB_PASSWORD="your_actual_password"

# Build and start via Docker Compose
docker compose up -d --build taskflow-app
```

The container automatically connects to your Windows MySQL via `host.docker.internal:3306`.

### Option B: Fully Containerized Stack (Isolated MySQL Container)

To launch both TaskFlow and a separate containerized MySQL 8.0 instance on port 3307 (preventing collision with Windows port 3306):

```bash
docker compose --profile containerized-db up -d --build
```

### Verify Container Health

```bash
docker ps
curl http://localhost:8080/actuator/health
```

---

## Jenkins CI/CD Pipeline

The project includes a declarative `Jenkinsfile` executing 8 sequential stages:

```
[Stage 1: Checkout] ──> [Stage 2: Validate Env] ──> [Stage 3: Compile & Test]
                                                              │
[Stage 6: Docker Build] <── [Stage 5: Frontend Verify] <── [Stage 4: Package JAR]
        │
        └──> [Stage 7: Deploy] ──> [Stage 8: Health Check]
```

### Pipeline Stages:
1. **Checkout**: Retrieves source code from Git repository.
2. **Validate Environment**: Verifies Java 17, Maven 3, Git, and Docker CLI.
3. **Compile & Test**: Executes `mvn clean test` and publishes JUnit test reports.
4. **Package JAR**: Compiles production JAR and archives build artifacts.
5. **Frontend Verification**: Validates file presence, templates, and script dependencies.
6. **Build Docker Image**: Constructs version-tagged container (`taskflow-app:${BUILD_NUMBER}`).
7. **Deploy**: Automatically deploys container to test/production port 8080.
8. **Health Check**: Queries `http://localhost:8080/actuator/health` to confirm `UP` status.

### Jenkins Configuration Guide:

1. **Install Required Jenkins Plugins**:
   - *Pipeline*
   - *Git Plugin*
   - *JUnit Plugin*
   - *Docker Pipeline*
   - *Credentials Binding Plugin*

2. **Configure Tools in Jenkins Global Tool Configuration**:
   - **JDK**: Name `Java-17`, pointing to JDK 17.
   - **Maven**: Name `Maven-3`, pointing to Maven 3.8+.

3. **Configure GitHub Webhook**:
   - In your GitHub repository: Navigate to **Settings** > **Webhooks** > **Add webhook**.
   - Payload URL: `http://<your-jenkins-server>:8080/github-webhook/`
   - Content type: `application/json`
   - Trigger: *Just the push event*.

---

## REST API Reference

All task endpoints require an active session cookie (`TASKFLOW_SESSIONID`). State-changing requests (`POST`, `PUT`, `PATCH`, `DELETE`) require the `X-XSRF-TOKEN` header.

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/auth/register` | Register a new user | No |
| `POST` | `/api/auth/login` | Authenticate and start session | No |
| `GET` | `/api/auth/me` | Get current user profile | Yes |
| `POST` | `/api/auth/logout` | Invalidate current session | Yes |
| `GET` | `/api/auth/csrf` | Fetch CSRF token metadata | No |
| `GET` | `/api/tasks` | Get user tasks (with search/filter/sort) | Yes |
| `POST` | `/api/tasks` | Create a new task | Yes |
| `GET` | `/api/tasks/{id}` | Get task details by ID | Yes |
| `PUT` | `/api/tasks/{id}` | Update task title and description | Yes |
| `PATCH` | `/api/tasks/{id}/status` | Toggle task status (`PENDING`/`COMPLETED`) | Yes |
| `DELETE` | `/api/tasks/{id}` | Delete task | Yes |
| `GET` | `/api/tasks/stats` | Retrieve user task statistics | Yes |
| `GET` | `/actuator/health` | Service health status | No |

---

## Troubleshooting Common Errors

### 1. `Access denied for user 'root'@'localhost'`
- **Cause**: Incorrect MySQL credentials provided.
- **Solution**: Set the environment variable `$env:DB_PASSWORD = "your_actual_password"` in PowerShell before launching Spring Boot.

### 2. `Communications link failure / Connection refused`
- **Cause**: MySQL 8.0 service is stopped or port 3306 is blocked.
- **Solution**: Verify MySQL status:
  ```powershell
  Get-Service *mysql*
  Start-Service MySQL80
  ```

### 3. Docker Container Cannot Reach Host MySQL (`host.docker.internal`)
- **Cause**: Docker container cannot access the Windows host network loopback.
- **Solution**:
  - In `compose.yaml`, the `extra_hosts: ["host.docker.internal:host-gateway"]` setting is already included.
  - In MySQL, ensure root or your user is allowed to connect from `%` or `172.%`:
    ```sql
    GRANT ALL PRIVILEGES ON task_manager_db.* TO 'root'@'%' IDENTIFIED BY 'your_password';
    FLUSH PRIVILEGES;
    ```

### 4. CSRF Token Missing or Invalid (HTTP 403 Forbidden)
- **Cause**: Missing `X-XSRF-TOKEN` header in state-changing JavaScript requests.
- **Solution**: `frontend/js/api.js` automatically reads the `XSRF-TOKEN` cookie set by Spring Security and attaches the `X-XSRF-TOKEN` header. If testing via Postman or cURL, supply the header obtained from `/api/auth/csrf`.

---

## License

MIT License. Designed and engineered for academic demonstration and professional portfolios.

## CI/CD Automation Test
