// 内置示例 JSON：空状态「加载示例」用
export const SAMPLE_JSON = JSON.stringify({
  users: [
    { id: 1, name: 'Alice Chen', email: 'alice@example.com', age: 28, active: true, role: 'admin', joined: '2024-03-15T09:30:00Z' },
    { id: 2, name: 'Bob Wang', email: 'bob@example.com', age: 34, active: true, role: 'user', joined: '2024-06-20T14:00:00Z' },
    { id: 3, name: 'Carol Smith', email: 'carol@example.com', age: 25, active: false, role: 'user', joined: '2025-01-10T11:20:00Z' },
  ],
  meta: {
    total: 3,
    page: 1,
    pageSize: 20,
    source: 'https://api.example.com/users',
    generatedAt: '2026-01-01T00:00:00Z',
  },
}, null, 2)
