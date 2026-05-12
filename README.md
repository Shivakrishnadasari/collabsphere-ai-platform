# CollabSphere — AI-Powered Project Management Platform

> A production-grade, full-stack real-time project management platform built with Java Spring Boot microservices and React — featuring JWT authentication, WebSocket collaboration, AI task generation, and enterprise-grade resilience patterns.

---

## 🚀 Features

- **Real-Time Kanban Board** — Live task updates via WebSocket/STOMP with drag-and-drop reordering and optimistic locking to prevent concurrent conflicts
- **JWT Authentication** — Stateless auth with access/refresh token rotation across a dedicated auth-service
- **Role-Based Access Control** — 4-tier permission system (Owner, Team Lead, Member, Viewer) enforced at the service layer via a centralized permission guard
- **AI Assistant** — Groq LLaMA 3.1 integration that parses project briefs, generates structured task breakdowns, and lets users approve or reject each task individually before board insertion
- **Document Upload** — Upload project documents directly to the AI assistant for context-aware task generation
- **Email Invitations** — Cross-service invitation flow where project-service resolves user identity via auth-service
- **Circuit Breaker** — Resilience4j circuit breaker protecting cross-service calls, failing fast when auth-service is unavailable
- **Schema Evolution** — Flyway migrations managing all database schema changes
- **Async AI Processing** — Dedicated thread pool for AI requests preventing Tomcat thread exhaustion

---

## 🛠️ Tech Stack

### Backend
| Technology | Purpose |
|---|---|
| Java 17 | Primary language |
| Spring Boot 3 | Microservices framework |
| Spring Security | Authentication & authorization |
| JWT (Access + Refresh) | Stateless auth with token rotation |
| WebSocket / STOMP | Real-time communication |
| Hibernate / JPA | ORM and database access |
| Flyway | Database schema migrations |
| Resilience4j | Circuit breaker & fault tolerance |
| Groq LLaMA 3.1 | AI task generation |
| PostgreSQL | Primary database (per service) |
| Swagger / OpenAPI | API documentation |

### Frontend
| Technology | Purpose |
|---|---|
| React 18 | UI framework |
| Vite | Build tool |
| Axios | HTTP client |
| HTML / CSS | Styling |

---

## 🏗️ Architecture

CollabSphere follows a **microservices architecture** with two independently deployable services:

```
┌─────────────────────────────────────────────────────┐
│                    React Frontend                    │
│                  (Vite + Axios)                      │
└──────────────────────┬──────────────────────────────┘
                       │ REST + WebSocket
          ┌────────────┴────────────┐
          │                         │
┌─────────▼─────────┐   ┌──────────▼──────────┐
│   Auth Service    │   │   Project Service    │
│                   │◄──│                      │
│  - JWT Auth       │   │  - Projects & Tasks  │
│  - User Mgmt      │   │  - Kanban Board      │
│  - Token Rotation │   │  - AI Integration    │
│                   │   │  - Email Invitations │
└─────────┬─────────┘   └──────────┬──────────┘
          │                         │
┌─────────▼─────────┐   ┌──────────▼──────────┐
│   PostgreSQL DB   │   │   PostgreSQL DB       │
│   (Auth Service)  │   │  (Project Service)   │
└───────────────────┘   └──────────────────────┘
```

### Key Design Decisions

**Why Microservices?**
Separating auth and project concerns allows independent scaling, deployment, and failure isolation. Auth-service can be scaled independently during peak login traffic.

**Why JWT with Refresh Token Rotation?**
Stateless auth eliminates session storage overhead. Refresh token rotation ensures compromised tokens are invalidated automatically.

**Why Optimistic Locking?**
In a real-time collaborative environment, multiple users can update the same task simultaneously. Optimistic locking detects conflicts at the database level without expensive pessimistic locks.

**Why Resilience4j Circuit Breaker?**
When project-service calls auth-service for user identity resolution during email invitations, a slow or unavailable auth-service would cascade failures. Circuit breaker fails fast and returns a fallback response.

**Why Async Thread Pool for AI?**
Groq API calls can take 2-5 seconds. Blocking Tomcat threads for this duration under load would cause thread exhaustion. Offloading to a dedicated thread pool keeps the main thread pool available.

---

## 🔐 Security Implementation

- JWT access tokens (short-lived) + refresh tokens (long-lived) with rotation on every refresh
- Spring Security filter chain validates JWT on every request before reaching controllers
- Role-based permission checks enforced at service layer — not just controller level
- WebSocket connections authenticated via JWT during the STOMP handshake
- CORS, preflight, and WebSocket JWT handshake handled in a unified `SecurityConfig`
- Cross-service calls authenticated via internal service tokens

---

## 🤖 AI Integration Flow

1. User uploads a project brief document or types a description
2. Request is dispatched to a dedicated async thread pool
3. Project-service calls Groq LLaMA 3.1 API with the brief and a structured prompt
4. LLaMA returns a JSON task breakdown (title, description, priority, assignee suggestions)
5. Tasks are presented to the user one by one — approve or ignore each individually
6. Approved tasks are inserted directly into the Kanban board via WebSocket

---

## ⚙️ Getting Started

### Prerequisites
- Java 17+
- Node.js 18+
- PostgreSQL
- Maven

### Backend Setup

```bash
# Clone the repository
git clone https://github.com/Shivakrishnadasari/collabsphere-ai-platform.git
cd collabsphere-ai-platform

# Configure environment variables
# Set the following in application.properties for both services:
# - DB_URL, DB_USERNAME, DB_PASSWORD
# - JWT_SECRET
# - GROQ_API_KEY

# Run auth-service
cd auth-service
mvn spring-boot:run

# Run project-service (in a new terminal)
cd project-service
mvn spring-boot:run
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

---

## 📁 Project Structure

```
collabsphere-ai-platform/
├── auth-service/          # Authentication microservice
│   ├── src/
│   │   ├── controller/    # Auth endpoints
│   │   ├── service/       # Business logic
│   │   ├── security/      # JWT & Spring Security config
│   │   └── model/         # User entity & DTOs
│   └── pom.xml
├── project-service/       # Core project management microservice
│   ├── src/
│   │   ├── controller/    # Project, task, board endpoints
│   │   ├── service/       # Business logic & AI integration
│   │   ├── websocket/     # WebSocket & STOMP config
│   │   ├── security/      # Permission guard & RBAC
│   │   └── model/         # Project, task entities & DTOs
│   └── pom.xml
└── frontend/              # React + Vite frontend
    ├── src/
    │   ├── components/    # UI components
    │   ├── pages/         # Page components
    │   └── api/           # Axios API calls
    └── package.json
```

---

## 🔄 API Overview

### Auth Service
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login and get tokens |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/logout` | Invalidate refresh token |

### Project Service
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/projects` | Get all user projects |
| POST | `/api/projects` | Create new project |
| POST | `/api/projects/{id}/invite` | Invite member via email |
| GET | `/api/projects/{id}/tasks` | Get all tasks |
| POST | `/api/tasks` | Create task |
| PUT | `/api/tasks/{id}` | Update task |
| POST | `/api/ai/generate-tasks` | Generate tasks via AI |

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

## 👤 Author

**Dasari Shiva Krishna**  
Full-Stack Developer | Java & Spring Boot | React  
[GitHub](https://github.com/Shivakrishnadasari) • [LinkedIn](www.linkedin.com/in/shiva-krishna-dasari-92638a24b) • [LeetCode](https://leetcode.com/u/Shivakrishna122/)
