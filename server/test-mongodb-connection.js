import mongoose from 'mongoose';
import dns from 'dns';
import 'dotenv/config';

const testConnection = async () => {
  console.log('\n🔍 MongoDB Connection Diagnostic Test\n');
  console.log('='.repeat(50));

  // Configure DNS servers to use Google DNS (fixes DNS resolution issues)
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
  console.log('\n0️⃣ DNS Configuration:');
  console.log('   Using DNS servers: 8.8.8.8, 8.8.4.4, 1.1.1.1');

  // Check if .env is loaded
  console.log('\n1️⃣ Checking Environment Variables:');
  console.log('   MONGODB_URI exists:', !!process.env.MONGODB_URI);

  if (process.env.MONGODB_URI) {
    const maskedUri = process.env.MONGODB_URI.replace(/\/\/.*@/, '//***:***@');
    console.log('   MONGODB_URI:', maskedUri);
    console.log('   URI length:', process.env.MONGODB_URI.length);
    console.log('   Has /lms:', process.env.MONGODB_URI.includes('/lms'));
  } else {
    console.log('   ❌ ERROR: MONGODB_URI is not set!');
    console.log('   Make sure your .env file exists and contains MONGODB_URI');
    process.exit(1);
  }

  // Test DNS resolution
  console.log('\n2️⃣ Testing DNS Resolution:');
  try {
    const dns = await import('dns/promises');
    const hostname = 'cluster0.7wnposz.mongodb.net';
    console.log(`   Resolving: ${hostname}`);
    const addresses = await dns.resolve4(hostname);
    console.log('   ✅ DNS resolved successfully');
    console.log('   IP addresses:', addresses.join(', '));
  } catch (error) {
    console.log('   ❌ DNS resolution failed:', error.message);
    console.log('   This might indicate:');
    console.log('   - Internet connection issue');
    console.log('   - DNS server problem');
    console.log('   - MongoDB Atlas cluster is paused');
  }

  // Test MongoDB connection
  console.log('\n3️⃣ Testing MongoDB Connection:');
  try {
    const mongoUri = process.env.MONGODB_URI.trim();
    const finalUri = mongoUri.includes('/lms') ? mongoUri : `${mongoUri}/lms`;

    console.log('   Connecting... (this may take up to 10 seconds)');

    await mongoose.connect(finalUri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
    });

    console.log('   ✅ Connected successfully!');
    console.log('   Host:', mongoose.connection.host);
    console.log('   Database:', mongoose.connection.name);
    console.log('   Ready State:', mongoose.connection.readyState);

    // Test a simple operation
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('   Collections found:', collections.length);

    await mongoose.disconnect();
    console.log('   ✅ Disconnected successfully');

    console.log('\n✅ All tests passed! Your MongoDB connection is working.\n');
    process.exit(0);

  } catch (error) {
    console.log('   ❌ Connection failed!');
    console.log('\n   Error Details:');
    console.log('   Name:', error.name);
    console.log('   Message:', error.message);

    if (error.message.includes('ECONNREFUSED') || error.message.includes('querySrv')) {
      console.log('\n   🔧 Possible Solutions:');
      console.log('   1. Check if MongoDB Atlas cluster is paused (most common)');
      console.log('      → Go to https://cloud.mongodb.com/ and resume it');
      console.log('   2. Whitelist your IP address in MongoDB Atlas');
      console.log('      → Network Access → Add IP Address');
      console.log('   3. Check your internet connection');
      console.log('   4. Try disabling VPN if active');
    } else if (error.message.includes('authentication')) {
      console.log('\n   🔧 Possible Solutions:');
      console.log('   1. Check username and password in connection string');
      console.log('   2. Verify database user exists in MongoDB Atlas');
    } else if (error.message.includes('ENOTFOUND')) {
      console.log('\n   🔧 Possible Solutions:');
      console.log('   1. Check internet connection');
      console.log('   2. MongoDB Atlas cluster might be deleted');
      console.log('   3. DNS resolution issue - try different DNS server');
    }

    console.log('\n');
    process.exit(1);
  }
};

testConnection();
