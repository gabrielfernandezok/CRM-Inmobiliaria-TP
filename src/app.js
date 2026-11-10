require('dotenv').config();

const express = require('express');
const authRoutes = require('./routes/authRoutes');
const contactoRoutes = require('./routes/contactosRoutes');
const usuariosRoutes = require('./routes/usuariosRoutes');
const crmRoutes = require('./routes/crmRoutes');
const { errorHandler } = require('./middlewares/errorHandler');

const app = express();

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
