import bcrypt from 'bcrypt';

const password = process.argv[2];
if (!password) {
  console.error('Usage: bun hash-password.js <password>');
  process.exit(1);
}

try {
  const hash = await bcrypt.hash(password, 10);
  console.log(hash);
} catch (err) {
  console.error('Error:', err);
  process.exit(1);
}