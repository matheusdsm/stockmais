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
  const { produto_id, tipo, quantidade, motivo, usuario_id, role: userRole } = req.body
  const { page = 1, limit = 10 } = req.query
  const skip = (parseInt(page) - 1) * parseInt(limit)

  // GET - Listar movimentações
  if (req.method === 'GET') {
    try {
      const filters = {}
      if (req.query.produto_id) filters.produtoId = parseInt(req.query.produto_id)
      if (req.query.tipo) filters.tipo = req.query.tipo

      let dataInicio = req.query.data_inicio
      let dataFim = req.query.data_fim

      if (dataInicio === dataFim && dataInicio) {
        const dia = new Date(dataInicio)
        dia.setHours(0, 0, 0, 0)
        filters.createdAt = {
          gte: dia,
          lt: new Date(dia.getTime() + 24 * 60 * 60 * 1000)
        }
      } else {
        if (dataInicio) filters.createdAt = { ...filters.createdAt, gte: new Date(dataInicio) }
        if (dataFim) filters.createdAt = { ...filters.createdAt, lte: new Date(dataFim + 'T23:59:59') }
      }

      const [movimentacoes, total] = await Promise.all([
        prisma.movimentacao.findMany({
          where: filters,
          skip,
          take: parseInt(limit),
          orderBy: { createdAt: 'desc' },
          include: {
            produto: { select: { nome: true, sku: true } },
            usuario: { select: { username: true, nomeCompleto: true, role: true } }
          }
        }),
        prisma.movimentacao.count({ where: filters })
      ])

      return res.json({
        data: movimentacoes.map(m => ({
          id: m.id,
          produto_id: m.produtoId,
          produto_nome: m.produto.nome,
          tipo: m.tipo,
          quantidade: m.quantidade,
          motivo: m.motivo,
          usuario_id: m.usuarioId,
          usuario_username: m.usuario?.username || null,
          usuario_nome: m.usuario?.nomeCompleto || null,
          usuario_role: m.usuario?.role || null,
          created_at: m.createdAt
        })),
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      })
    } catch (error) {
      console.error('Erro ao listar movimentações:', error)
      return res.status(500).json({ error: 'Erro interno do servidor' })
    }
  }

  // POST - Criar movimentação
  if (req.method === 'POST') {
    if (userRole === 'visitante') {
      return res.status(403).json({ error: 'Visitantes não podem criar movimentações' })
    }

    if (!produto_id || !tipo || quantidade === undefined || !usuario_id) {
      return res.status(400).json({ error: 'Dados incompletos' })
    }

    try {
      const produtoId = parseInt(produto_id)
      const usuarioId = parseInt(usuario_id)
      
      const produto = await prisma.produto.findUnique({ where: { id: produtoId } })
      if (!produto) {
        return res.status(404).json({ error: 'Produto não encontrado' })
      }

      let novaQuantidade = produto.quantidade
      if (tipo === 'entrada') novaQuantidade += quantidade
      else if (tipo === 'saida') novaQuantidade -= quantidade
      else if (tipo === 'ajuste') novaQuantidade = quantidade

      const [movimentacao] = await prisma.$transaction([
        prisma.movimentacao.create({
          data: {
            produtoId: produtoId,
            tipo,
            quantidade,
            motivo,
            usuarioId
          }
        }),
        prisma.produto.update({
          where: { id: produtoId },
          data: { quantidade: novaQuantidade }
        })
      ])

      await gerarLog(prisma, tipo, 'movimentacoes', movimentacao.id, null, { produto_id, tipo, quantidade, sku: produto.sku }, usuarioId)

      return res.json({
        id: movimentacao.id,
        nova_quantidade: novaQuantidade
      })
    } catch (error) {
      console.error('Erro ao criar movimentação:', error)
      return res.status(500).json({ error: 'Erro interno do servidor' })
    }
  }

  return res.status(405).json({ error: 'Método não permitido' })
}