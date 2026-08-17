import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest'; // default import, không phải "* as"
import { AppModule } from '../src/app.module';

describe('App E2E', () => {
  let app: INestApplication;
  let accessToken: string;
  let createdTaskId: number;
  const testEmail = `e2e-${Date.now()}@example.com`;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/auth/register (POST) - đăng ký thành công', () => {
    return request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: testEmail, password: '123456' })
      .expect(201);
  });

  it('/auth/login (POST) - đăng nhập, lấy accessToken', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: testEmail, password: '123456' })
      .expect(200);

    accessToken = res.body.accessToken;
    expect(accessToken).toBeDefined();
  });

  it('/tasks (POST) - tạo task mới', async () => {
    const res = await request(app.getHttpServer())
      .post('/tasks')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'E2E test task' })
      .expect(201);

    createdTaskId = res.body.id;
    expect(res.body.title).toBe('E2E test task');
  });

  it('/tasks/:id (GET) - lấy task vừa tạo', async () => {
    const res = await request(app.getHttpServer())
      .get(`/tasks/${createdTaskId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.id).toBe(createdTaskId);
    expect(res.body.title).toBe('E2E test task');
  });

  it('/tasks/:id (DELETE) - xóa task vừa tạo', async () => {
    await request(app.getHttpServer())
      .delete(`/tasks/${createdTaskId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(204);
  });

  it('/tasks/:id (GET) - xác nhận task đã bị xóa (soft delete -> 404)', async () => {
    await request(app.getHttpServer())
      .get(`/tasks/${createdTaskId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(404);
  });
});
