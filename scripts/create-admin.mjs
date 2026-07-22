import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('✗ Set MONGODB_URI in the environment before running this script.');
  process.exit(1);
}

// CompanyAdmin Schema
const companyAdminSchema = new mongoose.Schema(
  {
    companyName: { type: String, required: true },
    companyId: { type: mongoose.Schema.Types.ObjectId },
    businessType: String,
    gstNumber: String,
    panNumber: String,
    address: String,
    city: String,
    state: String,
    pincode: String,
    officialEmail: { type: String, required: true, unique: true },
    officialPhone: String,
    adminFullName: { type: String, required: true },
    adminEmail: { type: String, required: true, unique: true },
    adminPhone: String,
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ['ADMIN', 'STAFF'],
      default: 'ADMIN',
    },
  },
  { timestamps: true }
);

const CompanyAdmin = mongoose.model('CompanyAdmin', companyAdminSchema);

async function createAdmin() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const email = 'admin@csctravel.com';
    const password = 'India@1947';

    // Check if admin already exists
    const existing = await CompanyAdmin.findOne({ adminEmail: email });
    if (existing) {
      console.log('⚠️ Admin already exists with email:', email);
      await mongoose.disconnect();
      process.exit(0);
    }

    // Hash password
    console.log('🔐 Hashing password...');
    const passwordHash = await bcrypt.hash(password, 10);

    // Create admin
    const admin = await CompanyAdmin.create({
      companyName: 'CSC Travel',
      businessType: 'Travel & Transportation',
      address: 'New Delhi',
      city: 'New Delhi',
      state: 'Delhi',
      pincode: '110001',
      officialEmail: 'admin@csctravel.com',
      officialPhone: '+91-9000000000',
      adminFullName: 'Admin User',
      adminEmail: email,
      adminPhone: '+91-9000000000',
      passwordHash: passwordHash,
      role: 'ADMIN',
    });

    console.log('✅ Admin created successfully!');
    console.log('📧 Email:', email);
    console.log('🔑 Password: India@1947');
    console.log('👤 Admin ID:', admin._id);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

createAdmin();
