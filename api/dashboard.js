import prisma from './prisma.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' })
  }

  try {
    // Data de hoje em Brasília
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    const amanha = new Date(hoje.getTime() + 24 * 60 * 60 * 1000)

    const [totalProdutos, totalEstoque, valorTotal, movimentacoesHoje, ultimasMovimentacoes, ultimosProdutos] = await Promise.all([
      prisma.produto.count({ where: { deleted: false } }),
      prisma.produto.aggregate({
        where: { deleted: false },
        _sum: { quantidade: true }
      }),
      prisma.produto.findMany({
        where: { deleted: false },
        select: { quantidade: true, precoUnitario: true }
      }),
      prisma.movimentacao.count({
        where: {
          createdAt: {
            gte: hoje,
            lt: amanha
          }
        }
      }),
      prisma.movimentacao.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          produto: { select: { nome: true } }
        }
      }),
      prisma.produto.findMany({
        where: { deleted: false },
        take: 5,
        orderBy: { createdAt: 'desc' }
      })
    ])

    return res.json({
      totalProdutos,
      totalEstoque: totalEstoque._sum.quantidade || 0,
      valorTotal: valorTotal.reduce((acc, p) => acc + (p.quantidade * p.precoUnitario), 0),
      movimentacoesHoje,
      ultimasMovimentacoes: ultimasMovimentacoes.map(m => ({
        id: m.id,
        produto_nome: m.produto.nome,
        tipo: m.tipo,
        quantidade: m.quantidade,
        created_at: m.createdAt
      })),
      ultimosProdutos: ultimosProdutos.map(p => ({
        id: p.id,
        sku: p.sku,
        nome: p.nome,
        quantidade: p.quantidade,
        categoria: p.categoria,
        created_at: p.createdAt
      }))
    })
  } catch (error) {
    console.error('Erro ao buscar dashboard:', error)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
}