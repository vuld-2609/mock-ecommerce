import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const categories = [
  {
    name: 'Điện thoại & Phụ kiện',
    description: 'Các sản phẩm điện thoại di động, ốp lưng, sạc, tai nghe...',
  },
  {
    name: 'Laptop & Máy tính',
    description: 'Máy tính xách tay, PC, màn hình và linh kiện máy tính',
  },
  {
    name: 'Thời trang Nam',
    description: 'Quần áo, giày dép, túi xách và phụ kiện dành cho nam',
  },
  {
    name: 'Thời trang Nữ',
    description: 'Quần áo, váy, đầm, giày dép và phụ kiện dành cho nữ',
  },
  {
    name: 'Thiết bị gia dụng',
    description: 'Đồ dùng điện trong nhà, bếp, tủ lạnh, máy giặt',
  },
];

async function main() {
  console.log('🌱 Đang khởi tạo data cho Category...');

  for (const category of categories) {
    await prisma.category.upsert({
      where: { name: category.name },
      update: {},
      create: {
        name: category.name,
        description: category.description,
      },
    });
  }

  console.log('🎉 Seed data cho Category thành công!');
}

main()
  .catch((e) => {
    console.error('❌ Lỗi seed data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
