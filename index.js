const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const axios = require('axios').default;
require('dotenv').config();

const app = express();

app.use(cors());

const uploadDirectory = 'images';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'images/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  },
});

const uploadStorage = multer({ storage: storage });

const port = process.env.PORT || 3000;
const url = process.env.APP_URL || `http://localhost:${port}/`;

app.use('/images', express.static(path.join(__dirname, uploadDirectory)));

app.post('/image-upload', uploadStorage.single('file'), (req, res) => {
  return res.status(200).json({ url: `${url}${req.file.path}` });
});

app.delete('/clear-images', (req, res) => {
  try {
    if (!req.headers.apikey || req.headers.apikey !== process.env.API_KEY) {
      throw new Error('Unauthorised');
    }
    fs.rmdirSync(uploadDirectory, { recursive: true });
    fs.mkdirSync(uploadDirectory);
    return res.status(200).json({ status: 'success', message: 'Thank you' });
  } catch (error) {
    return res.status(401).json({
      status: 'error',
      message: error.message || 'Something went wrong',
    });
  }
});

app.post('/ocr', uploadStorage.single('file'), async (req, res) => {
  try {
    console.log(`${url}${req.file.path}`);
    var options = {
      method: 'POST',
      url: 'https://microsoft-computer-vision3.p.rapidapi.com/ocr',
      params: { detectOrientation: 'true', language: 'unk' },
      headers: {
        'content-type': 'application/json',
        'x-rapidapi-host': 'microsoft-computer-vision3.p.rapidapi.com',
        'x-rapidapi-key': process.env.API_KEY || '',
      },
      data: {
        url: `${url}${req.file.path}`,
      },
    };

    const { data } = await axios.request(options);

    let sentence = '';

    data.regions.forEach((region) => {
      region.lines.forEach((line) => {
        line.words.forEach((word) => {
          sentence += `${word.text} `;
        });
      });
    });

    console.log('sentence', sentence);
    return res.status(200).json({ status: 'success', sentence, data });
  } catch (error) {
    console.log('error', error.message);
    return res.status(400).json({
      status: 'error',
      message: error.message || 'Something went wrong',
    });
  }
});

app.all('*', (req, res, next) => {
  return res.status(200).json({ status: 'success', message: 'Hello Server' });
});

app.listen(port, () => {
  console.log(`App is listening on port ${port}`);
});
