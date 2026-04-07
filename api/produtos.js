import prisma from './prisma.js'

function gerarSKU(produto) {
  const categoria = produto.categoria?.substring(0, 3).toUpperCase() || 'GEN'
  const letras = produto.nome.substring(0, 2).toUpperCase()
  const timestamp = Date.now().toString().slice(-4)
  return `${categoria}-${letras}-${timestamp}`
}

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
  const url = req.url || ''
  const queryStart = url.indexOf('?')
  const queryString = queryStart >= 0 ? url.substring(queryStart + 1) : ''
  const params = new URLSearchParams(queryString)
  
  const id = params.get('id')
  const action = params.get('action')
  const page = params.get('page') || '1'
  const limit = params.get('limit') || '10'
  const search = params.get('search')
  
  const { nome, descricao, quantidade, preco_unitario, localizacao, categoria, usuario_id, usuario_role, new_role } = req.body || {}
  const userRole = usuario_role

  // GET /produtos?action=excluidos
  if (req.method === 'GET' && action === 'excluidos') {
    try {
      const produtos = await prisma.produto.findMany({
        where: { deleted: true },
        include: { excluidoPorUsuario: { select: { username: true, nomeCompleto: true } } },
        orderBy: { updatedAt: 'desc' }
      })

      return res.json(produtos.map(p => ({
        id: p.id,
        sku: p.sku,
        nome: p.nome,
        descricao: p.descricao,
        quantidade: p.quantidade,
        preco_unitario: p.precoUnitario,
        localizacao: p.localizacao,
        categoria: p.categoria,
        updated_at: p.updatedAt,
        excluido_por_nome: p.excluidoPorUsuario?.nomeCompleto || null
      })))
    } catch (error) {
      console.error('Erro ao listar produtos excluídos:', error)
      return res.status(500).json({ error: 'Erro interno do servidor' })
    }
  }

  // GET /produtos (listar)
  if (req.method === 'GET' && !id) {
    try {
      const skip = (parseInt(page) - 1) * parseInt(limit)

      const where = { deleted: false }

      if (search) {
        where.OR = [
          { nome: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
          { categoria: { contains: search, mode: 'insensitive' } }
        ]
      }

      const [produtos, total] = await Promise.all([
        prisma.produto.findMany({
          where,
          skip,
          take: parseInt(limit),
          orderBy: { createdAt: 'desc' },
          include: { usuario: { select: { username: true, nomeCompleto: true, role: true } } }
        }),
        prisma.produto.count({ where })
      ])

      return res.json({
        data: produtos.map(p => ({
          id: p.id,
          sku: p.sku,
          nome: p.nome,
          descricao: p.descricao,
          quantidade: p.quantidade,
          preco_unitario: p.precoUnitario,
          localizacao: p.localizacao,
          categoria: p.categoria,
          created_at: p.createdAt,
          updated_at: p.updatedAt,
          usuario_id: p.usuarioId,
          usuario_nome: p.usuario?.nomeCompleto || null
        })),
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      })
    } catch (error) {
      console.error('Erro ao listar produtos:', error)
      return res.status(500).json({ error: 'Erro interno do servidor' })
    }
  }

  // POST /produtos (criar)
  if (req.method === 'POST' && !id) {
    if (userRole === 'visitante') {
      return res.status(403).json({ error: 'Visitantes não podem criar produtos' })
    }

    if (!nome) {
      return res.status(400).json({ error: 'Nome é obrigatório' })
    }

    try {
      const sku = gerarSKU({ nome, categoria })
      const usuarioId = usuario_id ? parseInt(usuario_id) : null

      const produto = await prisma.produto.create({
        data: { sku, nome, descricao, quantidade: quantidade || 0, precoUnitario: preco_unitario || 0, localizacao, categoria, usuarioId }
      })

      await gerarLog(prisma, 'CREATE', 'produtos', produto.id, null, { nome, sku }, usuarioId)

      return res.json({
        id: produto.id,
        sku: produto.sku,
        nome: produto.nome,
        descricao: produto.descricao,
        quantidade: produto.quantidade,
        preco_unitario: produto.precoUnitario,
        localizacao: produto.localizacao,
        categoria: produto.categoria
      })
    } catch (error) {
      console.error('Erro ao criar produto:', error)
      if (error.code === 'P2002') {
        return res.status(400).json({ error: 'SKU já existe' })
      }
      return res.status(500).json({ error: 'Erro interno do servidor' })
    }
  }

  // GET /produtos/:id
  if (req.method === 'GET' && id) {
    try {
      const produto = await prisma.produto.findFirst({ where: { id: parseInt(id), deleted: false } })
      if (!produto) {
        return res.status(404).json({ error: 'Produto não encontrado' })
      }
      return res.json(produto)
    } catch (error) {
      console.error('Erro ao buscar produto:', error)
      return res.status(500).json({ error: 'Erro interno do servidor' })
    }
  }

  // PUT /produtos/:id
  if (req.method === 'PUT' && id) {
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

      const produto = await prisma.produto.update({ where: { id: produtoId }, data: updateData })
      await gerarLog(prisma, 'UPDATE', 'produtos', produto.id, current, { ...updateData, sku: current.sku }, usuarioId)

      return res.json(produto)
    } catch (error) {
      console.error('Erro ao atualizar produto:', error)
      return res.status(500).json({ error: 'Erro interno do servidor' })
    }
  }

  // DELETE /produtos/:id
  if (req.method === 'DELETE' && id) {
    if (userRole !== 'gerente' && userRole !== 'supervisor') {
      return res.status(403).json({ error: 'Apenas gerentes e supervisores podem excluir produtos' })
    }

    try {
      const current = await prisma.produto.findUnique({ where: { id: parseInt(id) } })
      const usuarioId = parseInt(usuario_id)

      await prisma.produto.update({ where: { id: parseInt(id) }, data: { deleted: true, excluidoPor: usuarioId } })
      await gerarLog(prisma, 'DELETE', 'produtos', parseInt(id), current, { deleted: true, sku: current.sku }, usuarioId)

      return res.json({ success: true })
    } catch (error) {
      console.error('Erro ao excluir produto:', error)
      return res.status(500).json({ error: 'Erro interno do servidor' })
    }
  }

  // POST /produtos?action=restore&id=X
  if (req.method === 'POST' && action === 'restore' && id) {
    if (userRole !== 'gerente' && userRole !== 'supervisor') {
      return res.status(403).json({ error: 'Apenas gerentes e supervisores podem restaurar produtos' })
    }

    try {
      const current = await prisma.produto.findFirst({ where: { id: parseInt(id) } })
      if (!current) {
        return res.status(404).json({ error: 'Produto não encontrado' })
      }

      await prisma.produto.update({ where: { id: parseInt(id) }, data: { deleted: false, excluidoPor: null } })
      await gerarLog(prisma, 'RESTORE', 'produtos', parseInt(id), { deleted: true, sku: current.sku }, { deleted: false, sku: current.sku }, usuario_id ? parseInt(usuario_id) : null)

      return res.json({ success: true })
    } catch (error) {
      console.error('Erro ao restaurar produto:', error)
      return res.status(500).json({ error: 'Erro interno do servidor' })
    }
  }

  return res.status(405).json({ error: 'Método não permitido' })
}
