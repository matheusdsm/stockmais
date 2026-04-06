import bcrypt from 'bcrypt'
import prisma from '../prisma.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' })
  }

  const { username, password } = req.body

  if (!username || !password) {
    return res.status(400).json({ error: 'Username e senha são obrigatórios' })
  }

  // Login especial para visitante
  if (username === 'visitante' && password === 'visitante') {
    return res.json({ id: 0, username: 'visitante', role: 'visitante', nome_completo: 'Visitante', ativo: 1 })
  }

  try {
    const user = await prisma.usuario.findUnique({
      where: { username }
    })

    if (!user || !user.ativo) {
      return res.status(401).json({ error: 'Credenciais inválidas' })
    }

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      return res.status(401).json({ error: 'Credenciais inválidas' })
    }

    const { passwordHash, nomeCompleto, ...userData } = user
    return res.json({
      ...userData,
      nome_completo: nomeCompleto
    })
  } catch (error) {
    console.error('Erro no login:', error)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
}