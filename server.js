const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
const SECRET = 'alex123secret';

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const pool = new Pool({
  user: 'alex',
  host: 'localhost',
  database: 'alex_pedidos',
  password: 'alex123',
  port: 5432,
});

function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Não autorizado' });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido' });
  }
}

app.post('/api/login', async (req, res) => {
  const { usuario, senha } = req.body;
  try {
    const result = await pool.query('SELECT * FROM usuarios WHERE usuario = $1', [usuario]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'Usuário não encontrado' });
    const user = result.rows[0];
    const ok = await bcrypt.compare(senha, user.senha);
    if (!ok) return res.status(401).json({ error: 'Senha incorreta' });
    const token = jwt.sign({ id: user.id, usuario: user.usuario }, SECRET, { expiresIn: '8h' });
    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/pedidos', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM pedidos ORDER BY criado_em DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/pedidos', async (req, res) => {
  const { telefone, nome, produto, endereco } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO pedidos (telefone, nome, produto, endereco) VALUES ($1, $2, $3, $4) RETURNING *',
      [telefone, nome, produto, endereco]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/pedidos/:id', auth, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    const result = await pool.query(
      'UPDATE pedidos SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );
    const pedido = result.rows[0];
    if (status === 'em-entrega' && pedido.telefone) {
      await fetch('http://localhost:8080/message/sendText/alex-pedidos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': '429683C4C977415CAAFCCE10F7D57E11'
        },
        body: JSON.stringify({
          number: pedido.telefone,
          text: '🛵 Seu pedido saiu para entrega! Em breve chegará até você.'
        })
      });
    }
    res.json(pedido);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => {
  console.log('Servidor rodando na porta 3000');
});
