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
  const { id } = req.query
  const { username, password, role, nome_completo, usuario_id, role: userRole, new_role } = req.body

  // PUT - Atualizar usuário
  if (req.method === 'PUT') {
    if (userRole !== 'gerente') {
      return res.status(403).json({ error: 'Apenas gerentes podem atualizar usuários' })
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

      const user = await prisma.usuario.update({
        where: { id: userId },
        data: updateData
      })

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

  // DELETE - Desativar usuário
  if (req.method === 'DELETE') {
    if (userRole !== 'gerente' && userRole !== 'supervisor') {
      return res.status(403).json({ error: 'Apenas gerentes e supervisores podem desativar usuários' })
    }

    try {
      const current = await prisma.usuario.findUnique({ where: { id: parseInt(id) } })
      
      // Supervisores não podem desativar gerentes
      if (current?.role === 'gerente' && userRole !== 'gerente') {
        return res.status(403).json({ error: 'Supervisores não podem desativar gerentes' })
      }
      
      const usuarioId = parseInt(usuario_id)
      
      await prisma.usuario.update({
        where: { id: parseInt(id) },
        data: { ativo: false, excluidoPor: usuarioId }
      })

      await gerarLog(prisma, 'DELETE', 'usuarios', parseInt(id), { ativo: false }, null, usuarioId)

      return res.json({ success: true })
    } catch (error) {
      console.error('Erro ao desativar usuário:', error)
      return res.status(500).json({ error: 'Erro interno do servidor' })
    }
  }

  return res.status(405).json({ error: 'Método não permitido' })
}