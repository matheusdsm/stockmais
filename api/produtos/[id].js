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
  const { nome, descricao, quantidade, preco_unitario, localizacao, categoria, usuario_id, role: userRole } = req.body

  // GET - Buscar produto
  if (req.method === 'GET') {
    try {
      const produto = await prisma.produto.findFirst({
        where: { id: parseInt(id), deleted: false }
      })

      if (!produto) {
        return res.status(404).json({ error: 'Produto não encontrado' })
      }

      return res.json(produto)
    } catch (error) {
      console.error('Erro ao buscar produto:', error)
      return res.status(500).json({ error: 'Erro interno do servidor' })
    }
  }

  // PUT - Atualizar produto
  if (req.method === 'PUT') {
    if (userRole === 'visitante') {
      return res.status(403).json({ error: 'Visitantes não podem atualizar produtos' })
    }

    try {
      const produtoId = parseInt(id)
      const usuarioId = parseInt(usuario_id)

      const current = await prisma.produto.findUnique({ where: { id: produtoId } })
      if (!current) {
        return res.status(404).json({ error: 'Produto não encontrado' })
      }

      const updateData = {}
      if (nome) updateData.nome = nome
      if (descricao !== undefined) updateData.descricao = descricao
      if (quantidade !== undefined) updateData.quantidade = quantidade
      if (preco_unitario !== undefined) updateData.precoUnitario = preco_unitario
      if (localizacao !== undefined) updateData.localizacao = localizacao
      if (categoria !== undefined) updateData.categoria = categoria

      const produto = await prisma.produto.update({
        where: { id: produtoId },
        data: updateData
      })

      await gerarLog(prisma, 'UPDATE', 'produtos', produto.id, current, { ...updateData, sku: current.sku }, usuarioId)

      return res.json(produto)
    } catch (error) {
      console.error('Erro ao atualizar produto:', error)
      return res.status(500).json({ error: 'Erro interno do servidor' })
    }
  }

  // DELETE - Excluir produto
  if (req.method === 'DELETE') {
    if (userRole !== 'gerente' && userRole !== 'supervisor') {
      return res.status(403).json({ error: 'Apenas gerentes e supervisores podem excluir produtos' })
    }

    try {
      const current = await prisma.produto.findUnique({ where: { id: parseInt(id) } })
      const usuarioId = parseInt(usuario_id)
      
      await prisma.produto.update({
        where: { id: parseInt(id) },
        data: { deleted: true, excluidoPor: usuarioId }
      })

      await gerarLog(prisma, 'DELETE', 'produtos', parseInt(id), current, { deleted: true, sku: current.sku }, usuarioId)

      return res.json({ success: true })
    } catch (error) {
      console.error('Erro ao excluir produto:', error)
      return res.status(500).json({ error: 'Erro interno do servidor' })
    }
  }

  return res.status(405).json({ error: 'Método não permitido' })
}