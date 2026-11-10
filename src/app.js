require('dotenv').config();

const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const contactoRoutes = require('./routes/contactosRoutes');
const usuariosRoutes = require('./routes/usuariosRoutes');
const crmRoutes = require('./routes/crmRoutes');
const { errorHandler } = require('./middlewares/errorHandler');

const app = express();
const frontendOrigin = process.env.FRONTEND_URL || 'http://localhost:5173';

app.use(
  cors({
    origin: (requestOrigin, callback) => {
      callback(null, requestOrigin === frontendOrigin ? frontendOrigin : false);
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);
app.use(express.json());
app.use('/auth', authRoutes);
app.use('/contactos', contactoRoutes);
app.use('/', crmRoutes);
app.use('/', usuariosRoutes);

app.use((req, res) => {
  return res.status(404).json({ message: 'Ruta no encontrada' });
});

app.use(errorHandler);

module.exports = app;
