import express from 'express';
import cors from 'cors';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Configure AWS S3
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME;
const JWT_SECRET = process.env.JWT_SECRET;

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Forbidden' });
    req.user = user;
    next();
  });
};

// Login endpoint (simplified for demo)
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  
  // In a real app, validate credentials against a database
  // This is just a simplified example
  if (username === 'demo' && password === 'password') {
    const user = { id: 1, username };
    const token = jwt.sign(user, JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// Generate presigned URL for upload
app.post('/api/generate-upload-url', authenticateToken, async (req, res) => {
  try {
    const { fileName, fileType, contentType } = req.body;
    
    // Validate file type based on requirements
    const allowedTypes = {
      'image': ['image/jpeg', 'image/png', 'image/gif'],
      'pdf': ['application/pdf'],
      'doc': ['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    };
    
    const fileCategory = req.body.fileCategory; // 'image', 'pdf', or 'doc'
    
    if (!allowedTypes[fileCategory]?.includes(contentType)) {
      return res.status(400).json({ 
        error: `Invalid file type. Only ${fileCategory} files are allowed.` 
      });
    }
    
    // Generate a unique key for the file
    const objectKey = `${req.user.id}/${fileCategory}/${randomUUID()}-${fileName}`;
    
    // Create the presigned URL for upload
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: objectKey,
      ContentType: contentType
    });
    
    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    
    res.json({
      uploadUrl: presignedUrl,
      objectKey,
      expiresIn: 3600
    });
  } catch (error) {
    console.error('Error generating upload URL:', error);
    res.status(500).json({ error: 'Failed to generate upload URL' });
  }
});

// Generate presigned URL for download
app.get('/api/files/:objectKey', authenticateToken, async (req, res) => {
  try {
    const objectKey = decodeURIComponent(req.params.objectKey);
    
    // Verify that the user has access to this file
    // In a real app, you would check if the file belongs to the user
    if (!objectKey.startsWith(`${req.user.id}/`)) {
      return res.status(403).json({ error: 'You do not have access to this file' });
    }
    
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: objectKey
    });
    
    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    
    res.json({
      downloadUrl: presignedUrl,
      expiresIn: 3600
    });
  } catch (error) {
    console.error('Error generating download URL:', error);
    res.status(500).json({ error: 'Failed to generate download URL' });
  }
});

// Get list of user's files
app.get('/api/files', authenticateToken, async (req, res) => {
  try {
    // In a real app, you would query a database for the user's files
    // This is just a simplified example
    res.json({
      files: [
        { 
          name: 'example.jpg', 
          objectKey: `${req.user.id}/image/example.jpg`,
          type: 'image',
          uploadDate: new Date().toISOString()
        }
      ]
    });
  } catch (error) {
    console.error('Error fetching files:', error);
    res.status(500).json({ error: 'Failed to fetch files' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});