# MongoDB Atlas Setup for Cloud Run

Complete guide for configuring MongoDB Atlas with Google Cloud Run.

## Table of Contents

1. [Create MongoDB Atlas Account](#create-mongodb-atlas-account)
2. [Create Cluster](#create-cluster)
3. [Network Configuration](#network-configuration)
4. [Database Setup](#database-setup)
5. [Connection String](#connection-string)
6. [Store in Secret Manager](#store-in-secret-manager)
7. [Connection Options](#connection-options)
8. [Indexing Strategy](#indexing-strategy)
9. [Backup & Recovery](#backup--recovery)

---

## Create MongoDB Atlas Account

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)
2. Sign up with Google account (recommended)
3. Verify email address

## Create Cluster

### For Development (Free)

1. Click **Build a Database**
2. Choose **M0 Sandbox** (Free forever, 512MB storage)
3. Select **Cloud Provider & Region**
   - Provider: AWS
   - Region: Choose closest to your Cloud Run region
   - Example: `us-central1` → `Iowa (us-central)`
4. Cluster Name: `live-interview-coach`
5. Click **Create Cluster** (takes 2-3 minutes)

### For Production (Paid)

| Tier | RAM | Storage | Price/hr |
|------|-----|---------|----------|
| M10 | 2GB | 10GB | ~$0.16 |
| M20 | 4GB | 20GB | ~$0.32 |
| M30 | 8GB | 40GB | ~$0.64 |

**Recommendation:** Start with M10 for production

---

## Network Configuration

### Option A: Public Access (Simple)

1. Navigate to: **Security** → **Network Access**
2. Click **Add IP Address**
3. Add: `0.0.0.0/0` (allows all IPs)
4. Click **Confirm**

**Note:** This enables access from anywhere. For production, see Option B.

### Option B: VPC Peering (Recommended for Production)

#### 1. Create VPC Network

```bash
# Create VPC network for Cloud Run
gcloud compute networks create live-interview-vpc \
  --subnet-mode=auto \
  --project=$PROJECT_ID

# Create subnet
gcloud compute networks subnets create live-interview-subnet \
  --network=live-interview-vpc \
  --region=us-central1 \
  --range=10.1.0.0/24 \
  --project=$PROJECT_ID
```

#### 2. Enable Private Google Access

```bash
gcloud compute subnets update live-interview-subnet \
  --region=us-central1 \
  --enable-private-ip-google-access \
  --project=$PROJECT_ID
```

#### 3. Configure VPC Peering in Atlas

1. In MongoDB Atlas, go to: **Network Access**
2. Click **Peering**
3. Click **Add New Peering Connection**
4. Enter:
   - **GCP Project ID:** Your project ID
   - **Network Name:** live-interview-vpc
   - **Region:** us-central1
5. Click **Initiate Peering**
6. Copy the **Atlas Network CIDR** shown
7. Run this command in your terminal:

```bash
# Create peer network
gcloud compute networks peerings create atlas-peer \
  --network=live-interview-vpc \
  --peer-project=org-[ATLAS_PROJECT_ID] \
  --peer-network=live-interview-coach-[CLUSTER_ID] \
  --peer-cidr=[ATLAS_CIDR] \
  --project=$PROJECT_ID

# Exchange routes
gcloud compute networks peerings routing update atlas-peer \
  --network=live-interview-vpc \
  --project=$PROJECT_ID
```

#### 4. Update Cloud Run Service

```bash
gcloud run services update $SERVICE_NAME \
  --region=$REGION \
  --vpc-egress=private-ranges-only \
  --add-vpc-egress=10.1.0.0/24 \
  --project=$PROJECT_ID
```

---

## Database Setup

### Create Database User

1. Go to: **Security** → **Database Access**
2. Click **Add New Database User**
3. Enter:
   - **Username:** `live-interview-app`
   - **Password:** Use the password generator (save this!)
   - **Authentication Method:** SCRAM
4. **Privileges:** Read and write to any database
5. Click **Add User**

### Create Database and Collections

Use MongoDB Shell or Compass to connect and run:

```javascript
// Switch to database
use live_interview_coach;

// Collections
db.createCollection("interviewsessions");
db.createCollection("users");
db.createCollection("feedback");
db.createCollection("analytics");

// Verify
show collections;
```

### Create Indexes

```javascript
// Interview sessions indexes
db.interviewsessions.createIndex({ sessionId: 1 }, { unique: true });
db.interviewsessions.createIndex({ userId: 1 });
db.interviewsessions.createIndex({ createdAt: -1 });
db.interviewsessions.createIndex({ lastActivityAt: -1 });
db.interviewsessions.createIndex({ status: 1 });
db.interviewsessions.createIndex({ "metadata.jobDescription": "text" }); // Full-text search

// Users indexes
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ googleId: 1 }, { sparse: true });
db.users.createIndex({ createdAt: -1 });

// Feedback indexes
db.feedback.createIndex({ sessionId: 1 });
db.feedback.createIndex({ userId: 1 });
db.feedback.createIndex({ createdAt: -1 });

// Analytics indexes
db.analytics.createIndex({ sessionId: 1 });
db.analytics.createIndex({ timestamp: -1 });
db.analytics.createIndex({ eventType: 1 });

// TTL index for session cleanup (30 days)
db.interviewsessions.createIndex(
  { lastActivityAt: 1 },
  { expireAfterSeconds: 2592000, name: "cleanup_old_sessions" }
);
```

---

## Connection String

### Format

```
mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

### Components

- **Protocol:** `mongodb+srv://` (auto-discovers servers)
- **Username:** `live-interview-app`
- **Password:** Your database user password
- **Host:** `cluster0.xxxxx.mongodb.net`
- **Options:**
  - `retryWrites=true` - Automatic retry on write failure
  - `w=majority` - Acknowledge writes to majority of replica set

### Production Connection String

Add these options:

```
mongodb+srv://user:pass@cluster.mongodb.net/dbname?
  retryWrites=true&
  w=majority&
  appName=live-interview-coach&
  connectTimeoutMS=10000&
  socketTimeoutMS=45000&
  serverSelectionTimeoutMS=10000
```

---

## Store in Secret Manager

```bash
# Store MongoDB URI
echo -n "mongodb+srv://live-interview-app:PASSWORD@cluster0.xxxxx.mongodb.net/live_interview_coach?retryWrites=true&w=majority" | \
  gcloud secrets create mongodb-uri \
    --data-file=- \
    --project=$PROJECT_ID

# Verify
gcloud secrets describe mongodb-uri --project=$PROJECT_ID

# Access (for testing)
gcloud secrets versions access latest --secret=mongodb-uri --project=$PROJECT_ID
```

---

## Connection Options

### For Cloud Run

The connection string should include these options:

```
mongodb+srv://user:pass@cluster.mongodb.net/dbname?
  retryWrites=true&
  w=majority&
  appName=live-interview-coach&
  connectTimeoutMS=10000&
  socketTimeoutMS=45000&
  serverSelectionTimeoutMS=10000&
  maxIdleTimeMS=60000
```

### Code Configuration

In `src/database/database.module.ts`:

```typescript
MongooseModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    uri: config.get<string>('MONGODB_URI'),
    connectionFactory: (connection) => {
      // Auto-increment plugin
      connection.plugin(require('./plugins/auto-timestamp.plugin'));

      // Event handlers
      connection.on('connected', () => {
        console.log('MongoDB connected successfully');
      });

      connection.on('error', (err) => {
        console.error('MongoDB connection error:', err);
      });

      return connection;
    },
    // Connection pool options for Cloud Run
    options: {
      maxPoolSize: 50,
      minPoolSize: 10,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      retryWrites: true,
      retryReads: true,
    },
  }),
})
```

---

## Indexing Strategy

### TTL Index (Auto-Cleanup)

```javascript
// Delete inactive sessions after 30 days
db.interviewsessions.createIndex(
  { lastActivityAt: 1 },
  {
    name: "cleanup_old_sessions",
    expireAfterSeconds: 2592000 // 30 days in seconds
  }
);
```

### Compound Indexes

```javascript
// Session queries with user + date range
db.interviewsessions.createIndex(
  { userId: 1, createdAt: -1 },
  { name: "user_sessions_by_date" }
);

// Active sessions in date range
db.interviewsessions.createIndex(
  { status: 1, lastActivityAt: -1 },
  { name: "active_sessions" }
);
```

### Text Search Index

```javascript
// Search job descriptions
db.interviewsessions.createIndex(
  {
    "metadata.jobDescription": "text",
    transcript: "text",
  },
  {
    name: "search_index",
    weights: {
      "metadata.jobDescription": 10,
      transcript: 5,
    }
  }
);
```

---

## Backup & Recovery

### MongoDB Atlas Backups

Automatic backups are included:

| Tier | Backup Retention |
|------|-----------------|
| M0-M5 | None |
| M10+ | 36 hours snapshots |
| M20+ | 7 days snapshots |
| M30+ | 35 days snapshots |

### Manual Backup

```javascript
// Export collections (use mongodump CLI)
mongodump \
  --uri="mongodb+srv://user:pass@cluster.mongodb.net/dbname" \
  --out=./backup-$(date +%Y%m%d)
```

### Restore from Backup

```bash
# List available snapshots in Atlas console
# Then restore using API or CLI

mongorestore \
  --uri="mongodb+srv://user:pass@cluster.mongodb.net/dbname" \
  --dir=./backup-20240101
```

### Point-in-Time Recovery

For M30+ clusters:

1. Go to: **Deployment** → **Backups**
2. Click **Restore**
3. Choose snapshot or point-in-time
4. Select target cluster (can be different)
5. Click **Confirm Restore**

---

## Monitoring

### Atlas Metrics

Monitor in **Metrics** tab:

- **Connection Pool:** Average/Max connections
- **Operation Count:** Reads, writes, deletes
- **Latency:** Average operation time
- **Memory:** Cache usage vs wired tiger
- **Query Performance:** Slow query logs

### Alerts

Set up alerts:

1. Go to: **Alerts** → **New Alert**
2. Configure:
   - **CPU > 75%** for 5 minutes
   - **Memory > 80%** for 5 minutes
   - **Connection count > 80%** of max
   - **Query latency > 100ms** average

### Cloud Logging

Enable MongoDB logs to Cloud Logging:

1. In Atlas, go to: **Integration** → **Cloud Logging**
2. Click **Setup Integration**
3. Select project
4. Authorize
5. Logs appear in Cloud Logging under `MongoDB Atlas`

---

## Security Best Practices

### 1. Use SCRAM Authentication

```javascript
// In Atlas Security → Database Access
// Authentication Method: SCRAM
```

### 2. Enable Network Isolation

- Use VPC peering
- Disable public access
- Use Private Endpoints

### 3. Enable Audit Logging

```javascript
// In Atlas Security → Audit Logging
// Enable for production
```

### 4. Implement Field Level Encryption

```javascript
// Use MongoDB Client-Side Encryption
// npm install mongodb-client-encryption
```

### 5. Regular Access Review

```bash
# Review database users
mongosh "mongodb+srv://..." --eval "db.getUsers()"

# Review IP whitelist
# Go to: Security → Network Access
```

---

## Performance Tuning

### Connection Pool Sizing

For Cloud Run with max 100 instances:

```
Max Connections = Instances × Pool Size
                  = 100 × 50 = 5000
```

M10 cluster: Max 500 connections

**Solution:** Use smaller pool or lower instance count:

```javascript
options: {
  maxPoolSize: 5,  // 5 × 100 = 500 connections
  minPoolSize: 1,
}
```

### Query Optimization

```javascript
// Use projections
db.interviewsessions.find(
  { userId: "123" },
  { sessionId: 1, status: 1, createdAt: 1 } // Only needed fields
);

// Limit results
db.interviewsessions.find().limit(50);

// Use indexes
db.interviewsessions.find({ userId: "123" }).sort({ createdAt: -1 });
```

---

## Quick Commands

```bash
# Connect via shell
mongosh "mongodb+srv://user:pass@cluster.mongodb.net/dbname"

# View collections
show collections

# View indexes
db.interviewsessions.getIndexes()

# Stats
db.interviewsessions.stats()

# Slow queries
db.setProfilingLevel(1, { slowms: 100 })
db.system.profile.find().sort({ ts: -1 }).limit(10)
```

---

## Troubleshooting

### Connection Timeout

```bash
# Check IP whitelist
# Go to: Security → Network Access

# Verify connection string
mongosh "mongodb+srv://user:pass@cluster.mongodb.net/dbname" --eval "db.stats()"
```

### Authentication Failed

```bash
# Verify user credentials
# In Atlas: Security → Database Access

# Reset password if needed
# Click user → Edit → Change Password
```

### Query Slow

```bash
# Enable profiling
db.setProfilingLevel(2)

# Check slow queries
db.system.profile.find({ millis: { $gt: 100 } }).sort({ ts: -1 })

# Explain query plan
db.interviewsessions.find({ userId: "123" }).explain("executionStats")
```

### Out of Memory

```bash
# Check metrics in Atlas
# Consider upgrading cluster tier
# Or optimize queries/projections
```
