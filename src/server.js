require('dotenv').config();
const express = require('express');
const passport = require('passport');
const pool = require('./config/db');
const session = require('express-session');
require('./config/passport');

async function fetchData() {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log(result.rows);
  } catch (error) {
    console.error('Query Error:', error);
  }
}

fetchData();

const app = express();
const port = process.env.PORT || 5000;

app.use(express.json());
app.use(session({ secret: 'secret', resave: false, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());

const authRoutes = require('./routes/authRoutes');
app.use('/auth', authRoutes);

const articleRoutes = require('./routes/generalRoutes');
app.use('/', articleRoutes);

app.get('/', (req, res) => {
  res.send('Backend berjalan dengan sukses di Railway!');
});

app.get('/success', (req, res) => {
  const token = req.query.token;
  res.send(`Login SSO berhasil. Token kamu: ${token}`);
});

app.listen(port, () => console.log(`Server running on port ${port}`));
