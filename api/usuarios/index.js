import bcrypt from 'bcrypt'
import prisma from '../prisma.js'

function gerarLog(prisma, acao, tabela, registroId, dadosAnteriores, dadosNovos, usuarioId) {
  return prisma.log.create({
    data: {
      acao,
      tabela,
      registroId,
      dadosAnteriores: dadosAnteriores ? JSON.stringify(dadosAnteriores) : null,
      dadosNovos: dadosNovos ? JSON.stringify(dadosNovos) : null,
      usuarioId
    }
  })
}

export default async function handler(req, res) {
  // GET - Listar usuários
  if (req.method === 'GET') {
    try {
      const { page = 1, limit = 5 } = req.query
      const skip = (parseInt(page) - 1) * parseInt(limit)

      const [usuarios, total] = await Promise.all([
        prisma.usuario.findMany({
          skip,
          take: parseInt(limit),
          orderBy: [
            { role: 'desc' },
            { nomeCompleto: 'asc' }
          ]
        }),
        prisma.usuario.count()
      ])

      return res.json({
        data: usuarios.map(u => ({
          id: u.id,
          username: u.username,
          role: u.role,
          nome_completo: u.nomeCompleto,
          ativo: u.ativo,
          created_at: u.createdAt
        })),
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      })
    } catch (error) {
      console.error('Erro ao listar usuários:', error)
      return res.status(500).json({ error: 'Erro interno do servidor' })
    }
  }

  // POST - Criar usuário
  if (req.method === 'POST') {
    const { username, password, role: newRole, nome_completo, usuario_id, usuario_role } = req.body

    // Verificar se é gerente
    if (usuario_role !== 'gerente') {
      return res.status(403).json({ error: 'Apenas gerentes podem criar usuários' })
    }

    if (!username || !password || !newRole || !nome_completo) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios' })
    }

    // Validar role - apenas valores válidos do enum
    const validRoles = ['funcionário', 'supervisor', 'gerente']
    const role = validRoles.includes(newRole) ? newRole : 'funcionário'

    try {
      const hash = await bcrypt.hash(password, 10)
      
      const user = await prisma.usuario.create({
        data: {
          username,
          passwordHash: hash,
          role,
          nomeCompleto: nome_completo
        }
      })

      const usuarioId = usuario_id ? parseInt(usuario_id) : null

      await gerarLog(prisma, 'CREATE', 'usuarios', user.id, null, { username, role, nome_completo }, usuarioId)

      return res.json({
        id: user.id,
        username: user.username,
        role: user.role,
        nome_completo: user.nomeCompleto,
        ativo: user.ativo
      })
    } catch (error) {
      console.error('Erro ao criar usuário:', error)
      if (error.code === 'P2002') {
        return res.status(400).json({ error: 'Username já existe' })
      }
      return res.status(500).json({ error: 'Erro interno do servidor' })
    }
  }

  return res.status(405).json({ error: 'Método não permitido' })
}