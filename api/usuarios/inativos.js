import prisma from '../prisma.js'

export default async function handler(req, res) {
  // GET - Listar usuários inativos
  if (req.method === 'GET') {
    try {
      const usuarios = await prisma.usuario.findMany({
        where: { ativo: false },
        include: {
          usuarioExcluidoPor: {
            select: { username: true, nomeCompleto: true }
          }
        },
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

  return res.status(405).json({ error: 'Método não permitido' })
}