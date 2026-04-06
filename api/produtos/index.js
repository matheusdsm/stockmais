import prisma from '../prisma.js'

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
  // GET - Listar produtos
  if (req.method === 'GET') {
    try {
      const { search = '', page = 1, limit = 10 } = req.query
      const skip = (parseInt(page) - 1) * parseInt(limit)

      const where = {
        deleted: false
      }

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
          include: {
            usuario: {
              select: { username: true, nomeCompleto: true, role: true }
            }
          }
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

  // POST - Criar produto
  if (req.method === 'POST') {
    const { nome, descricao, quantidade, preco_unitario, localizacao, categoria, usuario_id, role: userRole } = req.body

    // Visitantes não podem criar
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
        data: {
          sku,
          nome,
          descricao,
          quantidade: quantidade || 0,
          precoUnitario: preco_unitario || 0,
          localizacao,
          categoria,
          usuarioId
        }
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

  return res.status(405).json({ error: 'Método não permitido' })
}