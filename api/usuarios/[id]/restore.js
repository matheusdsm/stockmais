import prisma from '../../prisma.js'

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
  const { usuario_id, role: userRole } = req.body

  // POST - Reativar usuário
  if (req.method === 'POST') {
    if (userRole !== 'gerente' && userRole !== 'supervisor') {
      return res.status(403).json({ error: 'Apenas gerentes e supervisores podem reativar usuários' })
    }

    try {
      const current = await prisma.usuario.findUnique({ where: { id: parseInt(id) } })
      if (!current) {
        return res.status(404).json({ error: 'Usuário não encontrado' })
      }

      // Supervisores não podem reativar gerentes
      if (current?.role === 'gerente' && userRole !== 'gerente') {
        return res.status(403).json({ error: 'Supervisores não podem reativar gerentes' })
      }

      await prisma.usuario.update({
        where: { id: parseInt(id) },
        data: { ativo: true, excluidoPor: null }
      })

      await gerarLog(prisma, 'RESTORE', 'usuarios', parseInt(id), { ativo: false }, { ativo: true }, usuario_id ? parseInt(usuario_id) : null)

      return res.json({ success: true })
    } catch (error) {
      console.error('Erro ao reativar usuário:', error)
      return res.status(500).json({ error: 'Erro interno do servidor' })
    }
  }

  return res.status(405).json({ error: 'Método não permitido' })
}