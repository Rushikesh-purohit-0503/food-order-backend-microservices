# 🍕 Food Order Backend - Microservices Architecture

> A learning-focused microservices implementation demonstrating core distributed systems patterns

## 📚 What You'll Learn

This project demonstrates fundamental microservices concepts:
- ✅ Service decomposition and bounded contexts
- ✅ API Gateway pattern
- ✅ Synchronous communication (HTTP/REST)
- ✅ Asynchronous communication (Message Queue with Redis + BullMQ)
- ✅ Event-driven architecture
- ✅ Caching strategies with Redis
- ✅ Service isolation and independence
- ✅ Horizontal scaling and load balancing
- ✅ Containerization with Docker
- ✅ Service orchestration with Docker Compose

---

## 🏗️ Architecture Overview

```
                                  ┌─────────────┐
                                  │   Client    │
                                  └──────┬──────┘
                                         │
                                         ▼
                              ┌──────────────────┐
                              │  API Gateway     │
                              │   Port: 8000     │
                              └────────┬─────────┘
                                       │
        ┌──────────────┬───────────────┼───────────────┬─────────────┐
        ▼              ▼               ▼               ▼             ▼
┌──────────────┐ ┌──────────┐ ┌──────────────┐ ┌─────────────┐ ┌─────────────┐
│Auth Service  │ │Restaurant│ │Order Service │ │Payment      │ │Notification │
│Port: 4001    │ │Service   │ │Port: 4003    │ │Service      │ │Service      │
│              │ │Port: 4002│ │              │ │Port: 4004   │ │(Worker)     │
└──────┬───────┘ └────┬─────┘ └──────┬───────┘ └──────┬──────┘ └──────┬──────┘
       │              │               │                │               │
       └──────────────┴───────────────┴────────────────┘               │
                      │                                                │
                      ▼                                                │
              ┌───────────────┐                                        │
              │   PostgreSQL  │                                        │
              │   Port: 5432  │                                        │
              └───────────────┘                                        │
                                                                       │
                      ┌────────────────────────────────────────────────┘
                      ▼
              ┌───────────────┐
              │     Redis     │
              │  Port: 6379   │
              └───────────────┘
```

---

## 📦 Services Breakdown

### 1. **API Gateway** (`services/api-gateway`)
- **Purpose**: Single entry point for all client requests
- **Pattern**: API Gateway Pattern
- **Routes**:
  - `/auth/*` → Auth Service
  - `/restaurants/*` → Restaurant Service
  - `/orders/*` → Order Service
  - `/payments/*` → Payment Service

### 2. **Auth Service** (`services/auth-service`)
- **Purpose**: User authentication and authorization
- **Endpoints**:
  - `POST /auth/register` - Register new user
  - `POST /auth/login` - Login and get JWT token
- **Database**: `users` table

### 3. **Restaurant Service** (`services/restaurant-service`)
- **Purpose**: Manage restaurant catalog
- **Endpoints**:
  - `POST /restaurants` - Add new restaurant
  - `GET /restaurants` - List all restaurants (with Redis cache)
- **Database**: `restaurants` table
- **Cache**: Redis (60s TTL)

### 4. **Order Service** (`services/order-service`)
- **Purpose**: Handle order placement
- **Endpoints**:
  - `POST /orders` - Create new order
- **Database**: `orders` table
- **Events**: Publishes `order.created` event to queue

### 5. **Payment Service** (`services/payment-service`)
- **Purpose**: Process payments
- **Endpoints**:
  - `POST /payments` - Process payment (mock)

### 6. **Notification Service** (`services/notification-service`)
- **Purpose**: Send notifications (email, SMS, push)
- **Type**: Background worker (no HTTP endpoints)
- **Events**: Listens to `order.created` events from queue

---

## 🗄️ Infrastructure Components

### **Redis Data Flow Diagram**

```
┌─────────────────────┐         ┌─────────────────────┐
│ Restaurant Service  │         │   Order Service     │
│                     │         │                     │
│  GET /restaurants   │         │  POST /orders       │
└──────┬──────────────┘         └──────┬──────────────┘
       │                               │
       │ Cache Read/Write              │ Publish Event
       ▼                               ▼
┌────────────────────────────────────────────────────┐
│                    REDIS                           │
│  ┌─────────────────┐      ┌──────────────────┐   │
│  │  CACHE          │      │  MESSAGE QUEUE   │   │
│  │  ===============│      │  =============== │   │
│  │  restaurants:   │      │  order-events:   │   │
│  │  {...}          │      │  - job-1         │   │
│  │  TTL: 60s       │      │  - job-2         │   │
│  └─────────────────┘      └──────────────────┘   │
└────────────────────────────────────────────────────┘
                                     │
                                     │ Consume Event
                                     ▼
                          ┌──────────────────────┐
                          │ Notification Service │
                          │   (Background Worker)│
                          └──────────────────────┘
```

### **PostgreSQL** (Port 5432)
- **Purpose**: Primary data store for all services
- **Usage**: 
  - Each service has its own tables (simulating database-per-service pattern)
  - `users` table for Auth Service
  - `restaurants` table for Restaurant Service
  - `orders` table for Order Service
- **Note**: In true production microservices, each service would have a separate database instance

### **Redis** (Port 6379)
Redis serves **TWO critical purposes** in this architecture:

#### 1. **Message Queue/Event Bus** 
- **Technology**: BullMQ (uses Redis as backend)
- **Purpose**: Asynchronous communication between services
- **Flow**:
  ```javascript
  Order Service → Publishes event → Redis Queue → Notification Service consumes
  ```
- **Example**: When an order is created, Order Service publishes `order.created` event to Redis queue, and Notification Service picks it up asynchronously
- **Benefits**: Decoupling, fault tolerance, retry mechanisms

#### 2. **Caching Layer**
- **Purpose**: Reduce database load and improve response times
- **Usage**: Restaurant Service caches the restaurant list
- **Implementation**:
  ```javascript
  // Check cache first
  const cache = await redis.get("restaurants");
  if (cache) return JSON.parse(cache);
  
  // If not cached, fetch from DB and cache for 60 seconds
  const result = await db.query("SELECT * FROM restaurants");
  await redis.setEx("restaurants", 60, JSON.stringify(result.rows));
  ```
- **TTL**: 60 seconds (configurable)

---

## 🔑 Key Microservices Concepts Demonstrated

### 1. **Bounded Contexts**
Each service owns a specific business capability:
- Auth → User management
- Restaurant → Catalog management
- Order → Order lifecycle
- Payment → Payment processing
- Notification → User notifications

### 2. **Communication Patterns**

#### Synchronous (HTTP/REST)
Used for request-response operations where immediate response is needed:
```javascript
// API Gateway proxies requests to services
app.use("/auth", createProxyMiddleware({ 
  target: "http://auth-service:4001" 
}));

// Client → API Gateway → Auth Service → Response
```
**Examples**: User login, fetching restaurant list, placing orders

#### Asynchronous (Message Queue via Redis + BullMQ)
Used for fire-and-forget operations, background processing, and event-driven workflows:
```javascript
// Order Service publishes event to Redis queue
const { orderQueue } = require("./shared/queue/redis");
await orderQueue.add("order.created", { orderId: id });

// Notification Service consumes events from Redis queue
new Worker("order-events", async job => {
  console.log("Processing:", job.name, job.data);
  // Send email, SMS, push notification, etc.
}, { connection: redisConnection });
```
**Benefits**:
- Services don't need to know about each other
- If Notification Service is down, messages wait in queue
- Automatic retries on failure
- Scales independently (add more workers)

**Examples**: Sending notifications, processing payments, generating reports

### 3. **Service Independence**
- Each service has its own codebase
- Independent deployment (can update one without touching others)
- Isolated failures (one service crash doesn't bring down others)
- Separate scaling (can scale order-service independently)

### 4. **Database per Service**
Each service manages its own data:
- `users` table → Auth Service only
- `restaurants` table → Restaurant Service only
- `orders` table → Order Service only

### 5. **Service Discovery**
Services find each other via Docker DNS:
```javascript
// Instead of localhost or IP, use service name
target: "http://auth-service:4001"
```

---

## 🚀 Getting Started

### Prerequisites
- Docker & Docker Compose
- Node.js 18+ (for local development)
- Git

### Installation

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd food-order-backend
```

2. **Create environment file**
```bash
# Create .env file in root directory
echo "JWT_SECRET=your-super-secret-key-change-in-production" > .env
```

3. **Start all services**
```bash
docker-compose up --build
```

4. **Verify services are running**
```bash
# Check running containers
docker-compose ps

# Should see:
# - postgres
# - redis
# - api-gateway (port 8000)
# - auth-service (port 4001)
# - restaurant-service (port 4002)
# - order-service (port 4003)
# - payment-service (port 4004)
# - notification-service
```

---

## 🧪 Testing the Services

### 1. Register a User
```bash
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123",
    "role": "USER"
  }'
```

**Response:**
```json
{ "message": "User registered" }
```

### 2. Login
```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

**Response:**
```json
{ "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." }
```

### 3. Add a Restaurant
```bash
curl -X POST http://localhost:8000/restaurants \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Pizza Palace"
  }'
```

**Response:**
```json
{ "id": "550e8400-e29b-41d4-a716-446655440000" }
```

### 4. Get Restaurants
```bash
curl http://localhost:8000/restaurants
```

**Response:**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Pizza Palace"
  }
]
```

### 5. Place an Order
```bash
curl -X POST http://localhost:8000/orders \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Response:**
```json
{
  "orderId": "660e8400-e29b-41d4-a716-446655440001",
  "status": "PLACED"
}
```

**🔔 Check notification-service logs:**
```bash
docker-compose logs notification-service
# You should see: [NOTIFICATION-SERVICE] Processing job order.created
```

### 6. Process Payment
```bash
curl -X POST http://localhost:8000/payments \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "660e8400-e29b-41d4-a716-446655440001",
    "amount": 29.99
  }'
```

**Response:**
```json
{ "status": "PAYMENT_SUCCESS" }
```

---

## 🔍 Exploring the Architecture

### Redis in Action

**See the Message Queue working:**
```bash
# Terminal 1: Watch notification service
docker-compose logs -f notification-service

# Terminal 2: Create an order
curl -X POST http://localhost:8000/orders -H "Content-Type: application/json" -d '{}'

# You'll see notification-service immediately process the event from Redis queue!
# Output: [NOTIFICATION-SERVICE] Processing job order.created { orderId: '...' }
```

**See the Cache working:**
```bash
# First request - fetches from database
curl http://localhost:8000/restaurants
# Check logs: Restaurant Service hits database

# Second request within 60 seconds - served from Redis cache
curl http://localhost:8000/restaurants
# Much faster! Served from Redis cache

# Wait 60+ seconds and try again - cache expired, hits database again
```

**Inspect Redis directly:**
```bash
# Access Redis CLI
docker exec -it $(docker ps -qf "name=redis") redis-cli

# See cached data
KEYS *
GET restaurants

# Monitor real-time commands
MONITOR

# See queue jobs
KEYS bull:order-events:*
```

### View Service Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f auth-service
docker-compose logs -f order-service
```

### Access Databases
```bash
# PostgreSQL
docker exec -it <postgres-container-id> psql -U foodapp -d foodapp

# Check tables
\dt
SELECT * FROM users;
SELECT * FROM restaurants;
SELECT * FROM orders;
```

### Access Redis
```bash
# Redis CLI
docker exec -it <redis-container-id> redis-cli

# Check cached data
KEYS *
GET restaurants
```

### Restart Individual Service
```bash
# Rebuild and restart just one service
docker-compose up -d --build auth-service

# Other services keep running!
```

---

## 📖 Learning Exercises

### Beginner
1. ✅ Add a new endpoint to restaurant-service to get a single restaurant by ID
2. ✅ Add validation to check if email already exists during registration
3. ✅ Add a health check endpoint (`GET /health`) to each service

### Intermediate
4. ✅ Implement JWT authentication middleware in API Gateway
5. ✅ Add user's order history endpoint in order-service
6. ✅ Implement restaurant menu management (CRUD operations)
7. ✅ Send notification when payment succeeds (add payment.success event)

### Advanced
8. ✅ Add retry logic with exponential backoff for queue workers
9. ✅ Implement circuit breaker pattern for inter-service calls
10. ✅ Add distributed tracing with correlation IDs
11. ✅ Separate databases (one Postgres instance per service)

---

## 🛠️ Development

### Project Structure
```
food-order-backend/
├── services/
│   ├── api-gateway/
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── index.js
│   ├── auth-service/
│   ├── order-service/
│   ├── restaurant-service/
│   ├── payment-service/
│   └── notification-service/
├── shared/
│   ├── db/
│   │   └── postgres.js      # Shared DB connection
│   └── queue/
│       └── redis.js         # Shared queue setup
├── docker-compose.yml
├── .env
├── .gitignore
└── README.md
```

### Adding a New Service

1. Create service directory: `services/new-service/`
2. Add `package.json`, `index.js`, `Dockerfile`
3. Add service to `docker-compose.yml`
4. Add route to API Gateway
5. Rebuild and restart

---

## 📈 Horizontal Scaling Guide

One of the **biggest advantages** of microservices is the ability to scale services independently based on demand.

### What is Horizontal Scaling?

**Vertical Scaling (Scale Up)**: Add more CPU/RAM to existing server ❌ Limited, expensive
**Horizontal Scaling (Scale Out)**: Add more instances of the service ✅ Unlimited, cost-effective

```
Before Scaling:                    After Horizontal Scaling:
┌─────────────┐                   ┌─────────────┐
│   Client    │                   │   Client    │
└──────┬──────┘                   └──────┬──────┘
       │                                 │
       ▼                                 ▼
┌─────────────┐                   ┌─────────────┐
│ API Gateway │                   │ Load Balancer│
└──────┬──────┘                   └──────┬──────┘
       │                                 │
       ▼                          ┌──────┴──────┬──────┐
┌─────────────┐                  ▼              ▼      ▼
│Order Service│            ┌──────────┐  ┌──────────┐ ┌──────────┐
│  (1 instance)│           │  Order-1 │  │  Order-2 │ │  Order-3 │
└─────────────┘            └──────────┘  └──────────┘ └──────────┘
```

### Why Scale Horizontally?

- 🚀 **Performance**: Handle more concurrent requests
- 💪 **Reliability**: If one instance fails, others continue
- 💰 **Cost-Effective**: Use smaller machines, pay for what you need
- 🔄 **Flexibility**: Scale up during peak hours, scale down at night
- 🎯 **Service-Specific**: Scale only the bottleneck services

---

## 🔧 Scaling with Docker Compose (Local/Dev)

### Scale a Single Service

```bash
# Scale order-service to 3 instances
docker-compose up --scale order-service=3

# Scale multiple services
docker-compose up --scale order-service=3 --scale restaurant-service=2

# View scaled instances
docker-compose ps
```

**What happens:**
```
food-order-backend-order-service-1   Running on port 4003 (mapped to random host port)
food-order-backend-order-service-2   Running on port 4003 (mapped to random host port)
food-order-backend-order-service-3   Running on port 4003 (mapped to random host port)
```

### Load Balancing

Docker Compose automatically load balances requests using **round-robin** DNS:

```javascript
// API Gateway calls "order-service" (service name)
target: "http://order-service:4003"

// Docker DNS resolves to one of the 3 instances:
// Request 1 → order-service-1
// Request 2 → order-service-2
// Request 3 → order-service-3
// Request 4 → order-service-1 (round-robin)
```

### Test Load Balancing

```bash
# Terminal 1: Scale order service to 3 instances
docker-compose up --scale order-service=3

# Terminal 2: Watch logs from all order-service instances
docker-compose logs -f order-service

# Terminal 3: Send multiple requests
for i in {1..10}; do
  curl -X POST http://localhost:8000/orders -H "Content-Type: application/json" -d '{}'
done

# You'll see requests distributed across all 3 instances!
```

### Limitation of Docker Compose Scaling

⚠️ **Port Conflict Issue:**
```yaml
# This won't work with scaling:
order-service:
  ports:
    - "4003:4003"  # ❌ Can't bind same host port to multiple containers
```

**Solution for local testing:**
```yaml
# Remove fixed port mapping to enable scaling
order-service:
  expose:
    - "4003"  # ✅ Only expose internally, not to host
  # Let Docker assign random host ports
```

---

## ☸️ Scaling with Kubernetes (Production)

For production, use **Kubernetes** which is designed for horizontal scaling.

### Kubernetes Deployment Example

Create `k8s/order-service-deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
spec:
  replicas: 3  # Start with 3 instances
  selector:
    matchLabels:
      app: order-service
  template:
    metadata:
      labels:
        app: order-service
    spec:
      containers:
      - name: order-service
        image: food-order-backend/order-service:latest
        ports:
        - containerPort: 4003
        env:
        - name: POSTGRES_HOST
          value: postgres-service
        - name: REDIS_HOST
          value: redis-service
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"
---
apiVersion: v1
kind: Service
metadata:
  name: order-service
spec:
  selector:
    app: order-service
  ports:
  - port: 4003
    targetPort: 4003
  type: ClusterIP  # Internal load balancer
```

### Manual Scaling in Kubernetes

```bash
# Scale to 5 replicas
kubectl scale deployment order-service --replicas=5

# View pods
kubectl get pods -l app=order-service

# Output:
# order-service-7d8f9c5b6-abc12   Running
# order-service-7d8f9c5b6-def34   Running
# order-service-7d8f9c5b6-ghi56   Running
# order-service-7d8f9c5b6-jkl78   Running
# order-service-7d8f9c5b6-mno90   Running
```

### Auto-Scaling in Kubernetes (HPA)

Create `k8s/order-service-hpa.yaml`:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: order-service-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: order-service
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70  # Scale up when CPU > 70%
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80  # Scale up when Memory > 80%
```

Apply it:
```bash
kubectl apply -f k8s/order-service-hpa.yaml

# Kubernetes will automatically:
# - Scale UP when CPU > 70% or Memory > 80%
# - Scale DOWN when load decreases
# - Keep between 2-10 replicas
```

### Watch Auto-Scaling in Action

```bash
# Terminal 1: Watch HPA
kubectl get hpa order-service-hpa --watch

# Terminal 2: Watch pods being created/destroyed
kubectl get pods -l app=order-service --watch

# Terminal 3: Generate load
kubectl run -i --tty load-generator --rm --image=busybox --restart=Never -- /bin/sh
# Inside the pod:
while true; do wget -q -O- http://order-service:4003/orders; done
```

---

## 🎯 What Makes a Service Scalable?

Not all services can be horizontally scaled easily. Follow these principles:

### ✅ 1. **Stateless Services**

**Bad (Stateful):**
```javascript
// ❌ In-memory state - doesn't work with multiple instances
let orderCount = 0;

app.post("/orders", (req, res) => {
  orderCount++;  // Different value in each instance!
  res.json({ count: orderCount });
});
```

**Good (Stateless):**
```javascript
// ✅ State in database - works with multiple instances
app.post("/orders", async (req, res) => {
  const result = await db.query("SELECT COUNT(*) FROM orders");
  res.json({ count: result.rows[0].count });
});
```

### ✅ 2. **External Session Storage**

**Bad:**
```javascript
// ❌ In-memory sessions - user might hit different instance next request
app.use(session({ 
  store: new MemoryStore()  // Lost when instance restarts!
}));
```

**Good:**
```javascript
// ✅ Redis session store - shared across all instances
const RedisStore = require("connect-redis")(session);
app.use(session({ 
  store: new RedisStore({ client: redisClient })
}));
```

### ✅ 3. **Distributed Locks**

**Bad:**
```javascript
// ❌ Local lock - only works for single instance
let processing = false;

if (!processing) {
  processing = true;
  await processOrder();
  processing = false;
}
```

**Good:**
```javascript
// ✅ Redis distributed lock - works across instances
const lock = await redlock.acquire(['order-lock'], 5000);
try {
  await processOrder();
} finally {
  await lock.release();
}
```

### ✅ 4. **Load Balancer Health Checks**

Add health check endpoint:
```javascript
app.get("/health", (req, res) => {
  // Check if service is healthy
  const healthy = db.isConnected() && redis.isConnected();
  
  if (healthy) {
    res.status(200).json({ status: "healthy" });
  } else {
    res.status(503).json({ status: "unhealthy" });
  }
});

app.get("/ready", (req, res) => {
  // Check if service is ready to handle requests
  const ready = dbInitialized && warmupComplete;
  
  res.status(ready ? 200 : 503).json({ ready });
});
```

---

## 📊 Scaling Strategy by Service

Not all services need the same scaling strategy:

### Order Service → **High Scaling**
```bash
# Order placement is the main bottleneck
replicas: 5-10 (manual)
HPA: 5-20 (auto-scale based on traffic)
```
**Why?** Handles customer orders, high traffic during peak hours

### Restaurant Service → **Medium Scaling**
```bash
replicas: 2-3 (manual)
HPA: 2-5 (auto-scale)
```
**Why?** Read-heavy, benefits from caching, moderate traffic

### Auth Service → **Low Scaling**
```bash
replicas: 2-3 (manual, for redundancy)
HPA: Not needed
```
**Why?** Login/register are infrequent, mostly stateless

### Payment Service → **Medium Scaling**
```bash
replicas: 3-5 (manual)
HPA: 3-8 (auto-scale)
```
**Why?** Critical service, needs redundancy, peaks with orders

### Notification Service → **Worker Scaling**
```bash
replicas: 3-10 (manual based on queue size)
HPA: Based on Redis queue length
```
**Why?** Background workers, scale based on job backlog

---

## 🚀 Practical Scaling Exercise

### Exercise 1: Scale and Load Test

1. **Start with 1 instance:**
```bash
docker-compose up order-service
```

2. **Benchmark single instance:**
```bash
# Install Apache Bench
# Linux: apt-get install apache2-utils
# Mac: brew install apache2-utils
# Windows: Download from Apache website

# Create a simple payload file
echo '{}' > order.json

# Run benchmark: 1000 requests, 10 concurrent
ab -n 1000 -c 10 -p order.json -T application/json http://localhost:8000/orders
```

3. **Scale to 3 instances:**
```bash
docker-compose up --scale order-service=3
```

4. **Benchmark again:**
```bash
ab -n 1000 -c 10 -p order.json -T application/json http://localhost:8000/orders

# Compare results:
# - Requests per second increased
# - Time per request decreased
# - Better fault tolerance (if one instance fails, others continue)
```

### Exercise 2: Test Fault Tolerance

```bash
# Scale to 3 instances
docker-compose up --scale order-service=3

# While sending requests, kill one instance
docker kill food-order-backend-order-service-2

# Requests continue to work! Other instances handle the load
```

---

## 🎓 Key Takeaways

✅ **Microservices enable independent scaling** of each service  
✅ **Horizontal scaling is unlimited** (add more instances)  
✅ **Docker Compose is good for learning** scaling concepts locally  
✅ **Kubernetes is production-ready** with auto-scaling capabilities  
✅ **Stateless services scale easily**, stateful services need careful design  
✅ **Use Redis for shared state** (sessions, cache, locks)  
✅ **Add health checks** for proper load balancing  
✅ **Scale based on metrics** (CPU, memory, queue length, response time)  

---

## 🤔 Common Questions

### Q: Why use API Gateway?
**A:** Single entry point, reduces coupling, handles cross-cutting concerns (auth, logging, rate limiting)

### Q: Why message queue instead of direct HTTP calls?
**A:** Decoupling, fault tolerance, async processing, better scalability

### Q: Can I scale individual services?
**A:** Yes! See the **[📈 Horizontal Scaling Guide](#-horizontal-scaling-guide)** section above for detailed instructions on scaling with Docker Compose and Kubernetes.

### Q: Why separate databases?
**A:** Service independence, avoid coupling, independent scaling, isolated failures

### Q: Is this production-ready?
**A:** No, this is for learning. Production needs: proper error handling, validation, security, monitoring, testing, CI/CD, Kubernetes, etc.

---

## 🎯 Next Steps

Once comfortable with this setup, explore:

1. **Horizontal Scaling**: Try the exercises in the [Horizontal Scaling Guide](#-horizontal-scaling-guide) above
2. **Security**: Add helmet.js, rate limiting, input validation
3. **Observability**: Add Prometheus metrics, distributed tracing
4. **Resilience**: Circuit breakers, retries, timeouts
5. **Testing**: Unit tests, integration tests, contract tests, load testing
6. **Deployment**: Deploy to Kubernetes with auto-scaling (try Minikube locally)
7. **Service Mesh**: Explore Istio/Linkerd for advanced traffic management
8. **API Documentation**: Add Swagger/OpenAPI specs

---

## 📚 Resources

### Microservices Patterns
- [Microservices.io Patterns](https://microservices.io/patterns/index.html)
- [Martin Fowler - Microservices](https://martinfowler.com/articles/microservices.html)

### Technologies Used
- [Express.js](https://expressjs.com/) - Web framework for REST APIs
- [BullMQ](https://docs.bullmq.io/) - Message queue library (uses Redis)
- [PostgreSQL](https://www.postgresql.org/) - Relational database
- [Redis](https://redis.io/) - In-memory data store (used for both caching and message queue backend)
- [Docker](https://www.docker.com/) - Containerization platform

### Why Redis?
Redis is **perfect for microservices** because it's:
- ⚡ **Fast**: In-memory, microsecond latency
- 🔄 **Versatile**: Cache, queue, pub/sub, session store
- 📈 **Scalable**: Handles millions of operations per second
- 🛡️ **Reliable**: Persistence options, replication support
- 🔌 **Simple**: Easy to integrate, minimal setup

### Books
- *Building Microservices* by Sam Newman
- *Microservices Patterns* by Chris Richardson

---

## 🐛 Troubleshooting

### Services won't start
```bash
# Check logs
docker-compose logs

# Rebuild from scratch
docker-compose down -v
docker-compose up --build
```

### Database connection errors
```bash
# Verify postgres is running
docker-compose ps postgres

# Check connection
docker exec -it <postgres-container> psql -U foodapp -d foodapp
```

### Port already in use
```bash
# Find process using port
lsof -i :8000  # macOS/Linux
netstat -ano | findstr :8000  # Windows

# Kill process or change port in docker-compose.yml
```

---

## 📝 License

MIT License - Feel free to use for learning!

---

## 🤝 Contributing

This is a learning project! Feel free to:
- Report issues
- Suggest improvements
- Add new features
- Share your learning journey

---

**Happy Learning! 🚀**

*Remember: The goal is to understand microservices concepts, not build a production system.*

