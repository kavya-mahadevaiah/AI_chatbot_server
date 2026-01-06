describe('Chat API', () => {
  let token;
  let chatId;
  const testUser = { userId: 'testuser', password: 'testpass123' };

  // Increase timeout for this suite
  jest.setTimeout(20000);

  beforeAll(async () => {
    console.log('Chat API beforeAll: starting');
    let res;
    try {
      console.log('Chat API beforeAll: trying login');
      res = await request(app)
        .post('/api/users/login')
        .send(testUser);
      console.log('Chat API beforeAll: login response', res && res.body);
    } catch (err) {
      console.error('Login error:', err);
    }
    if (!res || !res.body.token) {
      try {
        console.log('Chat API beforeAll: trying register');
        const regRes = await request(app)
          .post('/api/users/register')
          .send(testUser);
        console.log('Chat API beforeAll: register response', regRes && regRes.body);
      } catch (err) {
        console.error('Register error:', err);
      }
      // Wait for MongoDB write to complete
      await new Promise(r => setTimeout(r, 500));
      // Try login again
      try {
        console.log('Chat API beforeAll: trying login again');
        res = await request(app)
          .post('/api/users/login')
          .send(testUser);
        console.log('Chat API beforeAll: login again response', res && res.body);
      } catch (err) {
        console.error('Login again error:', err);
      }
    }
    if (!res || !res.body.token) {
      console.error('Could not obtain JWT token for chat API tests. Last response:', res && res.body);
      throw new Error('Could not obtain JWT token for chat API tests');
    }
    token = res.body.token;
    console.log('Chat API beforeAll: obtained token');
    // Log at the end of beforeAll
    console.log('Chat API beforeAll: completed');
  });

  it('should create a new chat', async () => {
    console.log('Test: should create a new chat - test starting');
    const res = await request(app)
      .post('/api/chats')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Test Chat' });
    console.log('Test: should create a new chat - response', res.statusCode, res.body);
    if (res.statusCode !== 201) console.error('Create chat error:', res.body);
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('_id');
    expect(res.body).toHaveProperty('title', 'Test Chat');
    chatId = res.body._id;
  });

  it('should list chats for the user', async () => {
    console.log('Test: should list chats for the user - starting');
    const res = await request(app)
      .get('/api/chats')
      .set('Authorization', `Bearer ${token}`);
    console.log('Test: should list chats for the user - response', res.statusCode, res.body);
    if (res.statusCode !== 200) console.error('List chats error:', res.body);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.some(chat => chat._id === chatId)).toBe(true);
  });

  it('should get a chat and its messages', async () => {
    console.log('Test: should get a chat and its messages - starting');
    const res = await request(app)
      .get(`/api/chats/${chatId}`)
      .set('Authorization', `Bearer ${token}`);
    console.log('Test: should get a chat and its messages - response', res.statusCode, res.body);
    if (res.statusCode !== 200) console.error('Get chat error:', res.body);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('_id', chatId);
    expect(res.body).toHaveProperty('messages');
    expect(Array.isArray(res.body.messages)).toBe(true);
  });

  it('should update (rename) a chat', async () => {
    console.log('Test: should update (rename) a chat - starting');
    const res = await request(app)
      .put(`/api/chats/${chatId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Renamed Chat' });
    console.log('Test: should update (rename) a chat - response', res.statusCode, res.body);
    if (res.statusCode !== 200) console.error('Update chat error:', res.body);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('title', 'Renamed Chat');
  });

  it('should delete a chat', async () => {
    console.log('Test: should delete a chat - starting');
    const res = await request(app)
      .delete(`/api/chats/${chatId}`)
      .set('Authorization', `Bearer ${token}`);
    console.log('Test: should delete a chat - response', res.statusCode, res.body);
    if (res.statusCode !== 200) console.error('Delete chat error:', res.body);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('success', true);
  });
});

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../server');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.disconnect();
  await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  process.env.JWT_SECRET = 'testsecret';
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

describe('Basic API Test', () => {
  it('should return 404 for unknown route', async () => {
    const res = await request(app).get('/unknown');
    expect(res.statusCode).toBe(404);
  });
});

describe('User API', () => {
  const testUser = { userId: 'testuser', password: 'testpass123' };

  beforeAll(async () => {
    // Connect to the test database if not already connected
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    }
    // Remove test user if exists
    await mongoose.connection.collection('users').deleteMany({ userId: testUser.userId });
  });

  afterAll(async () => {
    // Clean up test user
    await mongoose.connection.collection('users').deleteMany({ userId: testUser.userId });
    await mongoose.disconnect();
  });

  it('should register a new user', async () => {
    const res = await request(app)
      .post('/api/users/register')
      .send(testUser);
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('userId', testUser.userId);
  });

  it('should not register an existing user', async () => {
    const res = await request(app)
      .post('/api/users/register')
      .send(testUser);
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('message', 'User already exists');
  });

  it('should login with correct credentials', async () => {
    const res = await request(app)
      .post('/api/users/login')
      .send(testUser);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('userId', testUser.userId);
    expect(res.body).toHaveProperty('token');
  });

  it('should not login with wrong password', async () => {
    const res = await request(app)
      .post('/api/users/login')
      .send({ userId: testUser.userId, password: 'wrongpass' });
    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty('message', 'Invalid credentials');
  });

  it('should not login with non-existent user', async () => {
    const res = await request(app)
      .post('/api/users/login')
      .send({ userId: 'nouser', password: 'nopass' });
    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty('message', 'Invalid credentials');
  });
});
