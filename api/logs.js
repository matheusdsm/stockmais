import prisma from './prisma.js'

const acaoLabels = {
  'CREATE': 'Criação',
  'UPDATE': 'Atualização',
  'DELETE': 'Exclusão',
  'RESTORE': 'Restauração',
  'entrada': 'Entrada',
  'saida': 'Saída',
  'ajuste': 'Ajuste'
}

export default async function handler(req, res) {
  const url = req.url || ''
  const queryStart = url.indexOf('?')
  const queryString = queryStart >= 0 ? url.substring(queryStart + 1) : ''
  const params = new URLSearchParams(queryString)
  
  const action = params.get('action')
  const tabela = params.get('tabela')
  const acao = params.get('acao')
  const data_inicio = params.get('data_inicio')
  const data_fim = params.get('data_fim')
  const page = params.get('page') || '1'
  const limit = params.get('limit') || '30'

  // GET /logs (listar)
  if (req.method === 'GET' && !action) {
    try {
      const skip = (parseInt(page) - 1) * parseInt(limit)

      const filters = {}
      if (tabela) filters.tabela = tabela
      if (acao) filters.acao = acao

      const dataInicioStr = data_inicio ? data_inicio.trim() : ''
      const dataFimStr = data_fim ? data_fim.trim() : ''

      if (dataInicioStr && dataInicioStr === dataFimStr) {
        const dia = new Date(dataInicioStr + 'T00:00:00')
        filters.createdAt = { gte: dia, lt: new Date(dia.getTime() + 24 * 60 * 60 * 1000) }
      } else {
        if (data_inicio) filters.createdAt = { ...filters.createdAt, gte: new Date(data_inicio) }
        if (data_fim) filters.createdAt = { ...filters.createdAt, lte: new Date(data_fim + 'T23:59:59') }
      }

      const [logs, total] = await Promise.all([
        prisma.log.findMany({
          where: filters,
          skip,
          take: parseInt(limit),
          orderBy: { createdAt: 'desc' },
          include: { usuario: { select: { username: true, nomeCompleto: true, role: true } } }
        }),
        prisma.log.count({ where: filters })
      ])

      return res.json({
        data: logs.map(l => ({
          id: l.id,
          acao: l.acao,
          tabela: l.tabela,
          registro_id: l.registroId,
          dados_anteriores: l.dadosAnteriores,
          dados_novos: l.dadosNovos,
          usuario_id: l.usuarioId,
          usuario_username: l.usuario?.username || null,
          usuario_nome: l.usuario?.nomeCompleto || null,
          usuario_role: l.usuario?.role || null,
          created_at: l.createdAt
        })),
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      })
    } catch (error) {
      console.error('Erro ao listar logs:', error)
      return res.status(500).json({ error: 'Erro interno do servidor' })
    }
  }

  // GET /logs?action=export
  if (req.method === 'GET' && action === 'export') {
    try {
      const filters = {}
      if (tabela) filters.tabela = tabela
      if (acao) filters.acao = acao

      const dataInicioStr = data_inicio ? data_inicio.trim() : ''
      const dataFimStr = data_fim ? data_fim.trim() : ''

      if (dataInicioStr && dataInicioStr === dataFimStr) {
        const dia = new Date(dataInicioStr + 'T00:00:00')
        filters.createdAt = { gte: dia, lt: new Date(dia.getTime() + 24 * 60 * 60 * 1000) }
      } else {
        if (data_inicio) filters.createdAt = { ...filters.createdAt, gte: new Date(data_inicio) }
        if (data_fim) filters.createdAt = { ...filters.createdAt, lte: new Date(data_fim + 'T23:59:59') }
      }

      const logs = await prisma.log.findMany({
        where: filters,
        orderBy: { createdAt: 'desc' },
        take: 10000,
        include: { usuario: { select: { username: true, nomeCompleto: true, role: true } } }
      })

      const csvLines = ['ID,Ação,Tabela,SKU,Registro ID,Usuário,Nome,Função,Data']
      
      for (const l of logs) {
        const dadosNovos = l.dadosNovos ? JSON.parse(l.dadosNovos) : null
        const dadosAnteriores = l.dadosAnteriores ? JSON.parse(l.dadosAnteriores) : null
        const sku = dadosNovos?.sku || dadosAnteriores?.sku || ''
        
        csvLines.push(`${l.id},${acaoLabels[l.acao] || l.acao},${l.tabela},${sku},${l.registroId || ''},${l.usuario?.username || ''},${l.usuario?.nomeCompleto || ''},${l.usuario?.role || ''},${l.createdAt}`)
      }

      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', 'attachment; filename=logs_stockmais.csv')
      return res.send(csvLines.join('\n'))
    } catch (error) {
      console.error('Erro ao exportar logs:', error)
      return res.status(500).json({ error: 'Erro interno do servidor' })
    }
  }

  return res.status(405).json({ error: 'Método não permitido' })
}
