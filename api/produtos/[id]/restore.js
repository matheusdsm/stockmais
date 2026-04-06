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

  // POST - Restaurar produto
  if (req.method === 'POST') {
    if (userRole !== 'gerente' && userRole !== 'supervisor') {
      return res.status(403).json({ error: 'Apenas gerentes e supervisores podem restaurar produtos' })
    }

    try {
      const current = await prisma.produto.findFirst({
        where: { id: parseInt(id) }
      })

      if (!current) {
        return res.status(404).json({ error: 'Produto não encontrado' })
      }

      await prisma.produto.update({
        where: { id: parseInt(id) },
        data: { deleted: false, excluidoPor: null }
      })

      await gerarLog(prisma, 'RESTORE', 'produtos', parseInt(id), { deleted: true, sku: current.sku }, { deleted: false, sku: current.sku }, usuario_id ? parseInt(usuario_id) : null)

      return res.json({ success: true })
    } catch (error) {
      console.error('Erro ao restaurar produto:', error)
      return res.status(500).json({ error: 'Erro interno do servidor' })
    }
  }

  return res.status(405).json({ error: 'Método não permitido' })
}