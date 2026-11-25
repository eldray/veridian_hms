I'll guide you through installing PostgreSQL on Zorin OS (Ubuntu-based) step by step.

## Step 1: Install PostgreSQL

```bash
# Update package list
sudo apt update

# Install PostgreSQL and its contrib package
sudo apt install postgresql postgresql-contrib

# Install additional tools (optional but helpful)
sudo apt install pgadmin4
```

## Step 2: Check PostgreSQL Status

```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# If not running, start it
sudo systemctl start postgresql

# Enable it to start automatically on boot
sudo systemctl enable postgresql
```

## Step 3: Access PostgreSQL

```bash
# Switch to postgres user
sudo -u postgres psql

# You should see the PostgreSQL prompt: postgres=#
```

## Step 4: Create Your Database and User

While in the PostgreSQL prompt (`postgres=#`), run these commands:

```sql
-- Create your database
CREATE DATABASE hospital_db;

-- Create a user for your application
CREATE USER hospital_user WITH PASSWORD 'Pem086p';

-- Grant privileges to the user
GRANT ALL PRIVILEGES ON DATABASE hospital_db TO hospital_user;

-- Grant additional privileges (optional but recommended)
ALTER USER hospital_user CREATEDB;

-- Exit PostgreSQL
\q
```

## Step 5: Configure PostgreSQL for Remote Connections (Optional)

Edit the PostgreSQL configuration files:

```bash
# Edit PostgreSQL configuration
sudo nano /etc/postgresql/*/main/postgresql.conf

# Find and change this line:
# listen_addresses = 'localhost' 
# To:
listen_addresses = '*'
```

```bash
# Edit client authentication configuration
sudo nano /etc/postgresql/*/main/pg_hba.conf

# Add this line at the end for your application to connect:
host    hospital_db    hospital_user    127.0.0.1/32    md5
host    hospital_db    hospital_user    ::1/128         md5
```

## Step 6: Restart PostgreSQL

```bash
# Restart PostgreSQL to apply changes
sudo systemctl restart postgresql
```

## Step 7: Test Your Connection

```bash
# Test connection with your new user
psql -h localhost -U hospital_user -d hospital_db -W

# You should be prompted for the password and then see:
# hospital_db=>
```

## Step 8: Update Your Environment Variables

Now update your `.env` file with the PostgreSQL connection:

```env
# Database
DATABASE_URL="postgresql://hospital_user:your_secure_password@localhost:5432/hospital_db"

# JWT Secret
JWT_SECRET="your-jwt-secret-key"

# App Configuration
NODE_ENV="development"
PORT=3000
```

## Step 9: Install Prisma and Initialize

```bash
# Install Prisma (if not already done)
npm install @prisma/client prisma

# Initialize Prisma
npx prisma init

# This creates:
# - prisma/schema.prisma
# - .env (if it doesn't exist)
```

## Step 10: Set Up Prisma Schema

Replace the content of `prisma/schema.prisma` with the complete schema I provided earlier. Make sure the provider is set to `postgresql`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ... rest of your schema
```

## Step 11: Create Database Tables

```bash
# Create and apply the initial migration
npx prisma migrate dev --name init

# Generate Prisma Client
npx prisma generate
```

## Step 12: Test the Connection

Create a simple test file to verify everything works:

```typescript
// test-connection.ts
import prisma from './config/db'

async function testConnection() {
  try {
    // Test connection by querying the database
    await prisma.$queryRaw`SELECT 1`
    console.log('✅ Database connection successful!')
    
    // Create a test user
    const testUser = await prisma.user.create({
      data: {
        username: 'testadmin',
        password: 'temp123', // You'll hash this later
        fullName: 'Test Admin',
        role: 'admin',
        email: 'test@hospital.com'
      }
    })
    console.log('✅ Test user created:', testUser)
    
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

## Troubleshooting Common Issues

### If you get authentication errors:
```bash
# Reset the password
sudo -u postgres psql
\password hospital_user
```

### If you can't connect:
```bash
# Check if PostgreSQL is listening on the correct port
sudo netstat -tulpn | grep 5432

# Check PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-*.log
```

### If you need to reset everything:
```bash
# Drop and recreate the database
sudo -u postgres psql
DROP DATABASE hospital_db;
CREATE DATABASE hospital_db;
GRANT ALL PRIVILEGES ON DATABASE hospital_db TO hospital_user;
\q
```

## Next Steps After Successful Installation

1. **✅ PostgreSQL is installed and running**
2. **✅ Database and user are created**
3. **✅ Prisma is initialized**
4. **✅ Database schema is created**

Now you can proceed with:
- Updating your controllers to use Prisma
- Creating data migration scripts
- Testing your API endpoints

Would you like me to continue with the controller updates or help with any specific part of the migration?
