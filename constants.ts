
export const TRANSACTION_CATEGORIES = [
  'Alimentação',
  'Transporte',
  'Lazer',
  'Educação',
  'Saúde',
  'Moradia',
  'Salário',
  'Salário PJ',
  'Outros'
];

export const MOCK_TRANSACTIONS = [
  {
    id: '1',
    date: '2025-01-10',
    type: 'EXPENSE',
    value: 120.50,
    category: 'Alimentação',
    note: 'Jantar com amigos'
  },
  {
    id: '2',
    date: '2025-01-05',
    type: 'INCOME',
    value: 5000.00,
    category: 'Salário',
    note: 'Mensalidade normal'
  }
];

export const MOCK_LEDGERS = [
  {
    id: 'ledger-1',
    title: 'Viagem Natal 2024',
    friendName: 'Bruno',
    publicSlug: 'viagem-natal-2024-xyz789',
    publicReadEnabled: true,
    entries: [
      {
        id: 'e1',
        date: '2024-12-24',
        amount: 350.00,
        paidBy: 'me',
        owesTo: 'friend',
        description: 'Aluguel do carro',
        status: 'open'
      },
      {
        id: 'e2',
        date: '2024-12-25',
        amount: 120.00,
        paidBy: 'friend',
        owesTo: 'me',
        description: 'Mercado',
        status: 'open'
      }
    ]
  }
];
