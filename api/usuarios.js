import bcrypt from 'bcrypt'
import prisma from './prisma.js'

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

function getQueryParams(url) {
  try {
    const urlObj = new URL(url, `http://${req.headers?.host || 'localhost'}`)
    return Object.fromEntries(urlObj.searchParams)
  } catch {
    return {}
  }
}

export default async function handler(req, res) {
  const url = req.url || ''
  const queryStart = url.indexOf('?')
  const queryString = queryStart >= 0 ? url.substring(queryStart + 1) : ''
  const params = new URLSearchParams(queryString)
  
  const id = params.get('id')
  const action = params.get('action')
  const page = params.get('page') || '1'
  const limit = params.get('limit') || '10'
  const search = params.get('search')
  
  const { username, password, role, nome_completo, usuario_id, usuario_role, new_role } = req.body || {}
  const userRole = usuario_role

  // GET /usuarios (listar)
  if (req.method === 'GET' && !id) {
    try {
      const skip = (parseInt(page) - 1) * parseInt(limit)

      const [usuarios, total] = await Promise.all([
        prisma.usuario.findMany({
          skip,
          take: parseInt(limit),
          orderBy: [{ role: 'desc' }, { nomeCompleto: 'asc' }]
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

  // GET /usuarios?action=inativos
  if (req.method === 'GET' && action === 'inativos') {
    try {
      const usuarios = await prisma.usuario.findMany({
        where: { ativo: false },
        include: { usuarioExcluidoPor: { select: { username: true, nomeCompleto: true } } },
        orderBy: { createdAt: 'desc' }
      })

      return res.json(usuarios.map(u => ({
        id: u.id,
        username: u.username,
        role: u.role,
        nome_completo: u.nomeCompleto,
        ativo: u.ativo,
        created_at: u.createdAt,
        excluido_por_nome: u.usuarioExcluidoPor?.nomeCompleto || null
      })))
    } catch (error) {
      console.error('Erro ao listar usuários inativos:', error)
      return res.status(500).json({ error: 'Erro interno do servidor' })
    }
  }

  // POST /usuarios (criar)
  if (req.method === 'POST' && !id) {
    // Supervisor pode criar apenas funcionários
    if (userRole === 'supervisor') {
      if (role !== 'funcionário') {
        return res.status(403).json({ error: 'Supervisores só podem criar funcionários' })
      }
    }
    // Apenas gerente e supervisor podem criar
    if (userRole !== 'gerente' && userRole !== 'supervisor') {
      return res.status(403).json({ error: 'Apenas gerentes e supervisores podem criar usuários' })
    }

    if (!username || !password || !role || !nome_completo) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios' })
    }

    const validRoles = ['funcionário', 'supervisor', 'gerente']
    const roleValue = validRoles.includes(role) ? role : 'funcionário'

    try {
      const hash = await bcrypt.hash(password, 10)
      
      const user = await prisma.usuario.create({
        data: { username, passwordHash: hash, role: roleValue, nomeCompleto: nome_completo }
      })

      const usuarioId = usuario_id ? parseInt(usuario_id) : null
      await gerarLog(prisma, 'CREATE', 'usuarios', user.id, null, { username, role: roleValue, nome_completo }, usuarioId)

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

  // GET /usuarios/:id
  if (req.method === 'GET' && id) {
    try {
      const usuario = await prisma.usuario.findUnique({ where: { id: parseInt(id) } })
      if (!usuario) {
        return res.status(404).json({ error: 'Usuário não encontrado' })
      }
      return res.json(usuario)
    } catch (error) {
      console.error('Erro ao buscar usuário:', error)
      return res.status(500).json({ error: 'Erro interno do servidor' })
    }
  }

  // PUT /usuarios/:id
  if (req.method === 'PUT' && id) {
    // Supervisor pode alterar apenas funcionários e outros supervisores
    if (userRole === 'supervisor') {
      const targetUser = await prisma.usuario.findUnique({ where: { id: parseInt(id) } })
      if (targetUser?.role === 'gerente') {
        return res.status(403).json({ error: 'Supervisores não podem alterar gerentes' })
      }
    }
    // Funcionários não podem alterar ninguém
    if (userRole !== 'gerente' && userRole !== 'supervisor') {
      return res.status(403).json({ error: 'Apenas gerentes e supervisores podem atualizar usuários' })
    }

    try {
      const userId = parseInt(id)
      const usuarioId = parseInt(usuario_id)

      const current = await prisma.usuario.findUnique({ where: { id: userId } })
      if (!current) {
        return res.status(404).json({ error: 'Usuário não encontrado' })
      }

      const updateData = {}
      if (username) updateData.username = username
      if (nome_completo) updateData.nomeCompleto = nome_completo
      if (new_role) updateData.role = new_role
      if (password) updateData.passwordHash = await bcrypt.hash(password, 10)

      const user = await prisma.usuario.update({ where: { id: userId }, data: updateData })
      await gerarLog(prisma, 'UPDATE', 'usuarios', user.id, current, updateData, usuarioId)

      return res.json({
        id: user.id,
        username: user.username,
        role: user.role,
        nome_completo: user.nomeCompleto
      })
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error)
      if (error.code === 'P2002') {
        return res.status(400).json({ error: 'Username já existe' })
      }
      return res.status(500).json({ error: 'Erro interno do servidor' })
    }
  }

  // DELETE /usuarios/:id
  if (req.method === 'DELETE' && id) {
    console.log('DELETE usuarios - id:', id, 'userRole:', userRole, 'usuario_id:', usuario_id)
    if (userRole !== 'gerente' && userRole !== 'supervisor') {
      return res.status(403).json({ error: 'Apenas gerentes e supervisores podem desativar usuários' })
    }

    try {
      const current = await prisma.usuario.findUnique({ where: { id: parseInt(id) } })
      
      if (current?.role === 'gerente' && userRole !== 'gerente') {
        return res.status(403).json({ error: 'Supervisores não podem desativar gerentes' })
      }
      
      const usuarioId = parseInt(usuario_id)
      
      await prisma.usuario.update({ where: { id: parseInt(id) }, data: { ativo: false, excluidoPor: usuarioId } })
      await gerarLog(prisma, 'DELETE', 'usuarios', parseInt(id), { ativo: false }, null, usuarioId)

      return res.json({ success: true })
    } catch (error) {
      console.error('Erro ao desativar usuário:', error)
      return res.status(500).json({ error: 'Erro interno do servidor' })
    }
  }

  // POST /usuarios?action=restore&id=X
  if (req.method === 'POST' && action === 'restore' && id) {
    if (userRole !== 'gerente' && userRole !== 'supervisor') {
      return res.status(403).json({ error: 'Apenas gerentes e supervisores podem reativar usuários' })
    }

    try {
      const current = await prisma.usuario.findUnique({ where: { id: parseInt(id) } })
      if (!current) {
        return res.status(404).json({ error: 'Usuário não encontrado' })
      }

      if (current?.role === 'gerente' && userRole !== 'gerente') {
        return res.status(403).json({ error: 'Supervisores não podem reativar gerentes' })
      }

      await prisma.usuario.update({ where: { id: parseInt(id) }, data: { ativo: true, excluidoPor: null } })
      await gerarLog(prisma, 'RESTORE', 'usuarios', parseInt(id), { ativo: false }, { ativo: true }, usuario_id ? parseInt(usuario_id) : null)

      return res.json({ success: true })
    } catch (error) {
      console.error('Erro ao reativar usuário:', error)
      return res.status(500).json({ error: 'Erro interno do servidor' })
    }
  }

  return res.status(405).json({ error: 'Método não permitido' })
}
