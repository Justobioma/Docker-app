const express = require('express');
const multer = require('multer');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const { MongoClient } = require('mongodb');

const app = express();
const PORT = 3000;

// MongoDB configuration
const mongoUrl = 'mongodb://admin:password@mongodb:27017/?authSource=admin';
const dbName = 'my-db';
const collectionName = 'users';

let db;

// Connect to MongoDB and start server only when ready
MongoClient.connect(mongoUrl, { useUnifiedTopology: true })
  .then(client => {
    db = client.db(dbName);
    console.log('✅ Connected to MongoDB');

    // Middleware
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(express.static(path.join(__dirname, 'public')));

    // Multer setup
    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        const dir = path.join(__dirname, 'public', 'uploads');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
      },
      filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
      }
    });
    const upload = multer({ storage });

    // Route to serve form
    app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });

    // Route to handle form submission
    app.post('/profile', upload.single('photo'), async (req, res) => {
      const { firstName, lastName, phone, email } = req.body;
      const photoFilename = req.file?.filename || null;

      if (!firstName || !lastName || !email || !phone) {
        return res.status(400).send("Missing required fields.");
      }

      try {
        if (!db) throw new Error("MongoDB connection not initialized.");

        const profile = { firstName, lastName, email, phone, photoFilename };
        const result = await db.collection(collectionName).insertOne(profile);

        if (!result.insertedId) throw new Error("Insert failed.");

        res.send(`
          <h2>✅ Profile Saved</h2>
          <p>Database: <strong>${dbName}</strong></p>
          <p>Collection: <strong>${collectionName}</strong></p>
          <p>Name: ${firstName} ${lastName}</p>
          <p>Phone: ${phone}</p>
          <p>Email: ${email}</p>
          ${photoFilename ? `<img src="/uploads/${photoFilename}" width="150" />` : ''}
          <br/><a href="/">Go Back</a>
        `);
      } catch (err) {
        console.error("❌ Profile save error:", err.message);
        res.status(500).send(`<h2>Server Error</h2><p>${err.message}</p><br/><a href="/">Go Back</a>`);
      }
    });

    app.listen(PORT, () => {
      console.log(`🚀 Server running at http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error("❌ MongoDB connection error:", err.message);
  });