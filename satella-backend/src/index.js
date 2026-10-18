require('dotenv').config();

if (!process.env.JWT_SECRET) {
  console.error('Falta JWT_SECRET en el archivo .env (ver .env.example).');
  process.exit(1);
}

const app = require('./app');

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Satella API corriendo en http://localhost:${PORT}`);
});
