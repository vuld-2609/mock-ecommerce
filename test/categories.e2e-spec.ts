import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { App } from 'supertest/types';

import type { ApiResponse } from '../src/common/interceptors/response.interceptor';
import { PrismaService } from '../src/prisma/prisma.service';
import { AppModule } from './../src/app.module';
import { setupApp } from './../src/setup-app';

interface CategoryPayload {
  id: number;
  name: string;
  description: string;
}

interface TokenPayload {
  accessToken: string;
  refreshToken: string;
}

describe('Categories (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminToken: string;
  let userToken: string;
  let createdCategoryId: number;

  async function createActivatedUser(email: string, role: Role) {
    await prisma.user.create({
      data: {
        email,
        password: await bcrypt.hash('123456', 10),
        fullName: 'E2E Category Tester',
        role,
        isActive: true,
      },
    });

    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: '123456' });

    return (response.body as ApiResponse<TokenPayload>).data!.accessToken;
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    setupApp(app);
    await app.init();

    prisma = moduleFixture.get(PrismaService);

    adminToken = await createActivatedUser(
      `e2e-categories-admin-${Date.now()}@example.com`,
      Role.ADMIN,
    );
    userToken = await createActivatedUser(
      `e2e-categories-user-${Date.now()}@example.com`,
      Role.USER,
    );
  });

  afterAll(async () => {
    await prisma.category.deleteMany({ where: { name: { startsWith: 'E2E Category' } } });
    await prisma.user.deleteMany({ where: { email: { startsWith: 'e2e-categories-' } } });
    await app.close();
  }, 15000);

  it('GET /categories without token returns 401', async () => {
    const response = await request(app.getHttpServer()).get('/categories');

    expect(response.status).toBe(401);
  });

  it('GET /categories with a valid token returns 200', async () => {
    const response = await request(app.getHttpServer())
      .get('/categories')
      .set('Authorization', `Bearer ${userToken}`);

    expect(response.status).toBe(200);
    expect(Array.isArray((response.body as ApiResponse<CategoryPayload[]>).data)).toBe(true);
  });

  it('POST /categories as a non-admin user is rejected with 403', async () => {
    const response = await request(app.getHttpServer())
      .post('/categories')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ name: 'E2E Category Forbidden', description: 'should not be created' });

    expect(response.status).toBe(403);
  });

  it('POST /categories as admin creates a category', async () => {
    const response = await request(app.getHttpServer())
      .post('/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'E2E Category Books', description: 'Sách và văn phòng phẩm' });

    expect(response.status).toBe(201);
    const category = (response.body as ApiResponse<CategoryPayload>).data!;
    expect(category.name).toBe('E2E Category Books');
    createdCategoryId = category.id;
  });

  it('POST /categories with a duplicate name is rejected with 409', async () => {
    const response = await request(app.getHttpServer())
      .post('/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'E2E Category Books', description: 'Sách và văn phòng phẩm' });

    expect(response.status).toBe(409);
  });

  it('PUT /categories/:id as admin updates the category', async () => {
    const response = await request(app.getHttpServer())
      .put(`/categories/${createdCategoryId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'E2E Category Books Updated', description: 'Cập nhật mô tả' });

    expect(response.status).toBe(200);
    expect((response.body as ApiResponse<CategoryPayload>).data!.name).toBe(
      'E2E Category Books Updated',
    );
  });

  it('DELETE /categories/:id for a non-existent category returns 404', async () => {
    const response = await request(app.getHttpServer())
      .delete('/categories/999999')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(404);
  });

  it('DELETE /categories/:id as admin deletes the category', async () => {
    const response = await request(app.getHttpServer())
      .delete(`/categories/${createdCategoryId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
  });
});
