import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

//VALIDAR CON EL AMBIENTE DE DESARROLLO LA CONEXION A LA BASE DE DATOS QUE SE NECESITA (dev, qa, prod);


// const poolProd = mysql.createPool({
//   host:     process.env.DB_HOST     || '75.102.23.17',
//   port:     Number(process.env.DB_PORT) || 3306,
//   user:     process.env.DB_USER     || 'clickplus_matematicas',
//   password: process.env.DB_PASSWORD || 'Gl0b4lClick@2026',
//   database: process.env.DB_NAME     || 'clickplus_matematicas',
//   waitForConnections: true,
//   connectionLimit:    20,
//   queueLimit:         0,
//   timezone:           'Z',          // UTC
//   charset:            'utf8mb4',
// });

const pool = mysql.createPool({
  host:    '75.102.23.17',
  port:     3306,
  user:     'clickplus_regularizacion',
  password: 'Gl0b4lClick@2026',
  database: 'clickplus_matematicas_qa',
  waitForConnections: true,
  connectionLimit:    20,
  queueLimit:         0,
  timezone:           'Z',          // UTC
  charset:            'utf8mb4',
});

/* Verificar conexión al iniciar */
export async function testConnection(): Promise<void> {
  const conn = await pool.getConnection();
  await conn.ping();
  conn.release();
  console.log('✓ MySQL conectado correctamente');
}

export default pool;
