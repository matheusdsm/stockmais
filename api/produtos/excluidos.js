import prisma from '../prisma.js'

export default async function handler(req, res) {
  // GET - Listar produtos excluídos
  if (req.method === 'GET') {
    try {
      const produtos = await prisma.produto.findMany({
        where: { deleted: true },
        include: {
          excluidoPorUsuario: {
            select: { username: true, nomeCompleto: true }
          }
        },
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

  return res.status(405).json({ error: 'Método não permitido' })
}