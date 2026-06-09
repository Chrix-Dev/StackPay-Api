import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.error('ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env');
    process.exit(1);
  }

  const firstName = 'Stack';
  const lastName = 'Admin';

  const existing = await prisma.developer.findUnique({
    where: { email },
  });

  if (existing) {
    console.log('Admin already exists');
    process.exit(0);
  }

  const hashed = await bcrypt.hash(password, 10);

  await prisma.developer.create({
    data: {
      email,
      password: hashed,
      firstName,
      lastName,
      isVerified: true,
      role: 'ADMIN',
    },
  });

  console.log(`Admin created: ${email}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());