import request from 'supertest';
import { app } from './app'; // Adjust the path to your Express app

let token = '';

beforeAll(async () => {
  // Log in to get an authentication token
  const loginResponse = await request(app)
    .post('/api/v1/user/login') // Adjust the path to your login route
    .send({
      email: 'deadly7036@gmail.com', // Replace with valid credentials
      password: 'deadly7036', // Replace with valid credentials
    });

  // Extract the token from the response
  token = loginResponse.body.data.accessToken; // Adjust based on how your token is returned
});

describe('POST /api/v1/videos/add', () => {
  it('should publish a video with valid data', async () => {
    const response = await request(app)
      .post('/api/v1/videos') // Endpoint for publishing a video
      .set('Authorization', `Bearer ${token}`) // Use the token obtained from login
      .field('title', 'Test Video Title')
      .field('description', 'Test Video Description')
      .attach('videoFile', './book.mov') // Replace with a valid file path
      .attach('thumbnail', './book.jpg'); // Replace with a valid file path

    expect(response.status).toBe(201);
    expect(response.body.message).toBe('Video uploaded successfully');
  });
});
