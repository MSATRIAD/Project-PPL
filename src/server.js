require('dotenv').config();
const express = require('express');
const passport = require('passport');
const pool = require('./config/db');
const session = require('express-session');
const cors = require('cors');
require('./config/passport');

async function fetchData() {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log("Database time:", result.rows[0].now);
  } catch (error) {
    console.error('Query Error:', error);
  }
}

fetchData();

const app = express();
const port = process.env.PORT || 5000;

const whitelist = [
  "https://becycle-web.netlify.app",
  "http://localhost:3000",
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || whitelist.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"], 
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({ secret: 'secret', resave: false, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());

const authRoutes = require('./routes/authRoutes');
app.use('/auth', authRoutes);

app.get('/', (req, res) => {
  res.send('Backend berjalan dengan sukses di Railway!');
});

app.get('/success', (req, res) => {
  const token = req.query.token;
  res.send(`Login SSO berhasil. Token kamu: ${token}`);
});

const articleRoutes = require('./routes/generalRoutes');
const verifyJWT = require('./middlewares/verifyJWT');
app.use('/', verifyJWT, articleRoutes);

app.listen(port, () => console.log(`Server running on port ${port}`));
