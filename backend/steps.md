The error shows authentication failed for user `eldray`, but you created `hospital_user`. Let me guide you through setting up PostgreSQL correctly:

## Step 1: Check Current PostgreSQL Status

```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# If not running, start it
sudo systemctl start postgresql

# Enable it to start on boot
sudo systemctl enable postgresql
```

## Step 2: Access PostgreSQL and Check Current Setup

```bash
# Access as postgres user
sudo -u postgres psql

# Inside psql, check existing databases and users
\l
\du
```

## Step 3: Create Correct Database and User

While in the PostgreSQL prompt (`postgres=#`), run these commands:

```sql
-- List existing databases
\l

-- List existing users
\du

-- If hospital_db exists, drop it (optional)
DROP DATABASE IF EXISTS hospital_db;

-- If hospital_user exists, drop it (optional) 
DROP USER IF EXISTS hospital_user;

-- Create the database
CREATE DATABASE veridian_hms;

-- Create the user with a secure password
CREATE USER hospital_user WITH PASSWORD 'hospital123';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE hospital_db TO hospital_user;

-- Make the user a superuser (for development only)
ALTER USER hospital_user WITH SUPERUSER;

-- Exit PostgreSQL
\q
```

## Step 4: Test the Connection

```bash
# Test connection with the new user
psql -h localhost -U hospital_user -d hospital_db -W
# Enter password: hospital123

# You should see: hospital_db=>
# Then type \q to exit
```

## Step 5: Update Your Environment Variables

Make sure your `.env` file has the correct credentials:

```env
# Update your .env file with these exact values
DATABASE_URL="postgresql://hospital_user:hospital123@localhost:5432/hospital_db"

# JWT Secret
JWT_SECRET="your-jwt-secret-key"

# App Configuration
NODE_ENV="development"
PORT=3000
```

## Step 6: Fix PostgreSQL Authentication (if needed)

If you still get authentication errors, you may need to update PostgreSQL's authentication configuration:

```bash
# Edit PostgreSQL client authentication configuration
sudo nano /etc/postgresql/*/main/pg_hba.conf
```

Look for lines like these and make sure they include `md5` authentication:

```
# IPv4 local connections:
host    all             all             127.0.0.1/32            md5

# IPv6 local connections:
host    all             all             ::1/128                 md5
```

If you need to add these lines, do so, then restart PostgreSQL:

```bash
sudo systemctl restart postgresql
```

## Step 7: Run Prisma Migration

Now try the migration again:

```bash
npx prisma migrate dev --name init
```

## Step 8: If Still Having Issues - Complete Reset

If you're still having problems, let's do a complete reset:

```bash
# Stop PostgreSQL
sudo systemctl stop postgresql

# Remove existing PostgreSQL data (WARNING: This deletes all databases!)
sudo rm -rf /var/lib/postgresql/*/main/

# Reinitialize PostgreSQL
sudo -u postgres pg_createcluster --start $(ls /etc/postgresql) main

# Start PostgreSQL
sudo systemctl start postgresql

# Now go back to Step 3 and recreate database/user
```

## Alternative: Use Different Connection Method

If you continue having issues, try connecting via socket:

```env
# In your .env file, try this instead:
DATABASE_URL="postgresql://hospital_user:hospital123@localhost:5432/hospital_db?host=/var/run/postgresql"
```

## Verification Steps

After setup, verify everything works:

```bash
# 1. Test database connection
psql -h localhost -U hospital_user -d hospital_db -W

# 2. Generate Prisma client
npx prisma generate

# 3. Run migration
npx prisma migrate dev --name init

# 4. Test with a simple script
npx ts-node test-connection.ts
```

## Create Test Connection Script

Create `test-connection.ts`:

```typescript
// test-connection.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testConnection() {
  try {
    console.log('Testing database connection...')
    
    // Test raw query
    const result = await prisma.$queryRaw`SELECT version()`
    console.log('✅ Database connection successful!')
    console.log('PostgreSQL version:', result)
    
    // Test creating a user
    const user = await prisma.user.create({
      data: {
        username: 'testadmin',
        password: 'temp123',
        fullName: 'Test Admin',
        role: 'admin',
        email: 'test@hospital.com'
      }
    })
    console.log('✅ Test user created:', user)
    
  } catch (error) {
    console.error('❌ Database connection failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testConnection()
```

Run the test:
```bash
npx ts-node test-connection.ts
```

## Summary

The key issues were:
1. Wrong username in your `.env` file (using `eldray` instead of `hospital_user`)
2. Possibly incorrect password or permissions

Follow these steps in order, and your Prisma migration should work! Let me know if you encounter any specific errors at any step.
