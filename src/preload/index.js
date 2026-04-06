const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  usuarios: {
    create: (data) => ipcRenderer.invoke('db:usuarios:create', data),
    login: (username, password) => ipcRenderer.invoke('db:usuarios:login', username, password),
    list: (ativo) => ipcRenderer.invoke('db:usuarios:list', ativo),
    update: (id, data) => ipcRenderer.invoke('db:usuarios:update', id, data),
    delete: (id) => ipcRenderer.invoke('db:usuarios:delete', id)
  },
  produtos: {
    create: (data) => ipcRenderer.invoke('db:produtos:create', data),
    list: (search) => ipcRenderer.invoke('db:produtos:list', search),
    get: (id) => ipcRenderer.invoke('db:produtos:get', id),
    update: (id, data) => ipcRenderer.invoke('db:produtos:update', id, data),
    delete: (id) => ipcRenderer.invoke('db:produtos:delete', id)
  },
  movimentacoes: {
    create: (data) => ipcRenderer.invoke('db:movimentacoes:create', data),
    list: (filters) => ipcRenderer.invoke('db:movimentacoes:list', filters)
  },
  logs: {
    list: (filters) => ipcRenderer.invoke('db:logs:list', filters),
    export: (filters) => ipcRenderer.invoke('db:logs:export', filters)
  },
  dashboard: () => ipcRenderer.invoke('db:dashboard')
});
