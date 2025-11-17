const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const express = require('express');
const bodyParser = require('body-parser');
const variablesRouter = require('../../../routes/variables');
const Variable = require('../../../models/Variable');

describe('Variables API Routes', () => {
  let app;
  let mongoServer;

  beforeAll(async () => {
    // Start in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Setup Express app for testing
    app = express();
    app.use(bodyParser.json());
    app.use('/api/variables', variablesRouter);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    // Clean up database after each test
    await Variable.deleteMany({});
  });

  describe('GET /api/variables', () => {
    it('should return empty array when no variables exist', async () => {
      const response = await request(app)
        .get('/api/variables')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });

    it('should return all variables without exposing encrypted values', async () => {
      // Create test variables directly in database
      await Variable.create([
        {
          name: 'username',
          description: 'Test username',
          encryptedValue: 'encrypted1',
          iv: 'iv1',
          isSensitive: true
        },
        {
          name: 'apiKey',
          description: 'API Key',
          encryptedValue: 'encrypted2',
          iv: 'iv2',
          isSensitive: true
        }
      ]);

      const response = await request(app)
        .get('/api/variables')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0]).toHaveProperty('name');
      expect(response.body.data[0]).toHaveProperty('description');
      expect(response.body.data[0]).not.toHaveProperty('encryptedValue');
      expect(response.body.data[0]).not.toHaveProperty('iv');
    });

    it('should sort variables by name', async () => {
      await Variable.create([
        { name: 'zebra', encryptedValue: 'e1', iv: 'i1' },
        { name: 'apple', encryptedValue: 'e2', iv: 'i2' },
        { name: 'banana', encryptedValue: 'e3', iv: 'i3' }
      ]);

      const response = await request(app)
        .get('/api/variables')
        .expect(200);

      expect(response.body.data[0].name).toBe('apple');
      expect(response.body.data[1].name).toBe('banana');
      expect(response.body.data[2].name).toBe('zebra');
    });
  });

  describe('GET /api/variables/:id', () => {
    it('should return a single variable by ID', async () => {
      const variable = await Variable.create({
        name: 'testVar',
        description: 'Test description',
        encryptedValue: 'encrypted',
        iv: 'testiv'
      });

      const response = await request(app)
        .get(`/api/variables/${variable._id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('testVar');
      expect(response.body.data.description).toBe('Test description');
      expect(response.body.data).not.toHaveProperty('encryptedValue');
    });

    it('should return 404 for non-existent variable', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .get(`/api/variables/${fakeId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Variable not found');
    });

    it('should return 500 for invalid ObjectId', async () => {
      const response = await request(app)
        .get('/api/variables/invalid-id')
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/variables', () => {
    it('should create a new variable with encryption', async () => {
      const newVariable = {
        name: 'password',
        value: 'secret123',
        description: 'User password',
        isSensitive: true
      };

      const response = await request(app)
        .post('/api/variables')
        .send(newVariable)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('password');
      expect(response.body.data.description).toBe('User password');
      expect(response.body.data).not.toHaveProperty('encryptedValue');
      expect(response.body.data).not.toHaveProperty('value');

      // Verify variable was actually encrypted in database
      const savedVariable = await Variable.findById(response.body.data._id);
      expect(savedVariable.encryptedValue).toBeTruthy();
      expect(savedVariable.encryptedValue).not.toBe('secret123');
      expect(savedVariable.iv).toBeTruthy();
    });

    it('should default isSensitive to true', async () => {
      const newVariable = {
        name: 'apiKey',
        value: 'key123'
      };

      const response = await request(app)
        .post('/api/variables')
        .send(newVariable)
        .expect(201);

      expect(response.body.data.isSensitive).toBe(true);
    });

    it('should return 400 when name is missing', async () => {
      const newVariable = {
        value: 'secret123'
      };

      const response = await request(app)
        .post('/api/variables')
        .send(newVariable)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Name and value are required');
    });

    it('should return 400 when value is missing', async () => {
      const newVariable = {
        name: 'username'
      };

      const response = await request(app)
        .post('/api/variables')
        .send(newVariable)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Name and value are required');
    });

    it('should return 400 when variable name already exists', async () => {
      await Variable.create({
        name: 'duplicate',
        encryptedValue: 'encrypted',
        iv: 'testiv'
      });

      const newVariable = {
        name: 'duplicate',
        value: 'newvalue'
      };

      const response = await request(app)
        .post('/api/variables')
        .send(newVariable)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('already exists');
    });
  });

  describe('PUT /api/variables/:id', () => {
    it('should update variable name', async () => {
      const variable = await Variable.create({
        name: 'oldName',
        encryptedValue: 'encrypted',
        iv: 'testiv'
      });

      const response = await request(app)
        .put(`/api/variables/${variable._id}`)
        .send({ name: 'newName' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('newName');
    });

    it('should update variable value and re-encrypt', async () => {
      const variable = await Variable.create({
        name: 'testVar',
        encryptedValue: 'oldencrypted',
        iv: 'oldiv'
      });

      const response = await request(app)
        .put(`/api/variables/${variable._id}`)
        .send({ value: 'newSecretValue' })
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify new encryption
      const updatedVariable = await Variable.findById(variable._id);
      expect(updatedVariable.encryptedValue).not.toBe('oldencrypted');
      expect(updatedVariable.iv).not.toBe('oldiv');
    });

    it('should update description', async () => {
      const variable = await Variable.create({
        name: 'testVar',
        encryptedValue: 'encrypted',
        iv: 'testiv',
        description: 'Old description'
      });

      const response = await request(app)
        .put(`/api/variables/${variable._id}`)
        .send({ description: 'New description' })
        .expect(200);

      expect(response.body.data.description).toBe('New description');
    });

    it('should return 400 when trying to use existing name', async () => {
      await Variable.create([
        { name: 'existing', encryptedValue: 'e1', iv: 'i1' },
        { name: 'toUpdate', encryptedValue: 'e2', iv: 'i2' }
      ]);

      const variable = await Variable.findOne({ name: 'toUpdate' });

      const response = await request(app)
        .put(`/api/variables/${variable._id}`)
        .send({ name: 'existing' })
        .expect(400);

      expect(response.body.error).toContain('already exists');
    });

    it('should return 404 for non-existent variable', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .put(`/api/variables/${fakeId}`)
        .send({ name: 'newName' })
        .expect(404);

      expect(response.body.error).toBe('Variable not found');
    });
  });

  describe('DELETE /api/variables/:id', () => {
    it('should delete a variable', async () => {
      const variable = await Variable.create({
        name: 'toDelete',
        encryptedValue: 'encrypted',
        iv: 'testiv'
      });

      const response = await request(app)
        .delete(`/api/variables/${variable._id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted successfully');

      // Verify deletion
      const deletedVariable = await Variable.findById(variable._id);
      expect(deletedVariable).toBeNull();
    });

    it('should return 404 when deleting non-existent variable', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .delete(`/api/variables/${fakeId}`)
        .expect(404);

      expect(response.body.error).toBe('Variable not found');
    });
  });

  describe('Security tests', () => {
    it('should never expose encrypted values in any response', async () => {
      const variable = await Variable.create({
        name: 'secret',
        encryptedValue: 'encryptedValue123',
        iv: 'testiv123',
        description: 'Secret data'
      });

      // Test GET all
      const getAllResponse = await request(app).get('/api/variables');
      const getAllItem = getAllResponse.body.data.find(v => v.name === 'secret');
      expect(getAllItem).not.toHaveProperty('encryptedValue');
      expect(getAllItem).not.toHaveProperty('iv');

      // Test GET by ID
      const getOneResponse = await request(app).get(`/api/variables/${variable._id}`);
      expect(getOneResponse.body.data).not.toHaveProperty('encryptedValue');
      expect(getOneResponse.body.data).not.toHaveProperty('iv');

      // Test POST
      const postResponse = await request(app)
        .post('/api/variables')
        .send({ name: 'newSecret', value: 'secretValue' });
      expect(postResponse.body.data).not.toHaveProperty('encryptedValue');
      expect(postResponse.body.data).not.toHaveProperty('iv');
      expect(postResponse.body.data).not.toHaveProperty('value');

      // Test PUT
      const putResponse = await request(app)
        .put(`/api/variables/${variable._id}`)
        .send({ description: 'Updated' });
      expect(putResponse.body.data).not.toHaveProperty('encryptedValue');
      expect(putResponse.body.data).not.toHaveProperty('iv');
    });
  });
});
