import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  role: String,
  isActive: Boolean
}, { strict: false });

const User = mongoose.model('User', userSchema);

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');

  const users = await User.find({});
  console.log('Users list:');
  for (const u of users) {
    console.log(`- ID: ${u._id}, Username: ${u.username}, Email: ${u.email}, Role: ${u.role}, Active: ${u.isActive}`);
  }
  await mongoose.disconnect();
}

run().catch(console.error);
