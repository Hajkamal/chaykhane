import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Initial sample data for mock storage
const INITIAL_ROUNDS = [
  {
    id: 'round-1',
    title: 'دوره اعیاد شعبانیه — چایخانه صحن غدیر',
    dates: '۱ تا ۸ تیر ۱۴۰۴',
    description: 'توزیع چای و متبرکات به زائران محترم حرم مطهر امام رضا (ع) در شیفت عصر و مغرب',
    capacity: 30,
    max_reg_per_person: 1,
    is_open: true,
    created_at: new Date(Date.now() - 3600000 * 24 * 3).toISOString()
  },
  {
    id: 'round-2',
    title: 'دوره دهه ولایت و امامت — چایخانه صحن کوثر',
    dates: '۱۵ تا ۲۲ تیر ۱۴۰۴',
    description: 'پذیرایی ویژه از عاشقان و شیفتگان آستان مقدس حضرت ثامن الحجج (ع)',
    capacity: 25,
    max_reg_per_person: 1,
    is_open: true,
    created_at: new Date(Date.now() - 3600000 * 24 * 2).toISOString()
  },
  {
    id: 'round-3',
    title: 'دوره دهه کرامت — چایخانه صحن پیامبر اعظم (ص)',
    dates: '۲۰ تا ۲۷ خرداد ۱۴۰۴',
    description: 'پذیرایی باشکوه از زائران همزمان با میلاد باسعادت امام رضا (ع)',
    capacity: 20,
    max_reg_per_person: 1,
    is_open: false,
    created_at: new Date(Date.now() - 3600000 * 24 * 20).toISOString()
  }
]

const INITIAL_REGS = [
  {
    id: 'reg-1',
    round_id: 'round-1',
    full_name: 'محمد صادقی',
    phone: '09121112233',
    national_id: '0012345678',
    age: 28,
    city: 'مشهد',
    has_prev_exp: true,
    registered_at: new Date(Date.now() - 3600000 * 30).toISOString()
  },
  {
    id: 'reg-2',
    round_id: 'round-1',
    full_name: 'رضا حسینی',
    phone: '09351114455',
    national_id: '0923456789',
    age: 34,
    city: 'تهران',
    has_prev_exp: false,
    registered_at: new Date(Date.now() - 3600000 * 18).toISOString()
  },
  {
    id: 'reg-3',
    round_id: 'round-2',
    full_name: 'علیرضا تقوی',
    phone: '09159998877',
    national_id: '0845678901',
    age: 24,
    city: 'مشهد',
    has_prev_exp: true,
    registered_at: new Date(Date.now() - 3600000 * 12).toISOString()
  }
]

const memoryStore = {
  rounds: [...INITIAL_ROUNDS],
  registrations: [...INITIAL_REGS]
}

function getStore(table) {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = window.localStorage.getItem(`chaykhane_${table}`)
      if (raw) return JSON.parse(raw)
      const initial = table === 'rounds' ? INITIAL_ROUNDS : INITIAL_REGS
      window.localStorage.setItem(`chaykhane_${table}`, JSON.stringify(initial))
      return initial
    } catch (e) {
      // Ignore localStorage errors
    }
  }
  return memoryStore[table] || []
}

function saveStore(table, data) {
  memoryStore[table] = data
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(`chaykhane_${table}`, JSON.stringify(data))
    } catch (e) {
      // Ignore localStorage errors
    }
  }
}

class MockQueryBuilder {
  constructor(table) {
    this.table = table
    this.action = 'select'
    this.filters = []
    this.insertPayload = null
    this.updatePayload = null
    this.orderCol = null
    this.orderAsc = true
    this.selectCols = '*'
  }

  select(cols = '*') {
    this.action = 'select'
    this.selectCols = cols
    return this
  }

  insert(data) {
    this.action = 'insert'
    this.insertPayload = data
    return this
  }

  update(data) {
    this.action = 'update'
    this.updatePayload = data
    return this
  }

  delete() {
    this.action = 'delete'
    return this
  }

  eq(col, val) {
    this.filters.push({ col, val })
    return this
  }

  order(col, { ascending = true } = {}) {
    this.orderCol = col
    this.orderAsc = ascending
    return this
  }

  async execute() {
    let items = [...getStore(this.table)]

    if (this.action === 'select') {
      let filtered = items.filter(item => {
        return this.filters.every(f => String(item[f.col]) === String(f.val))
      })

      if (this.orderCol) {
        filtered.sort((a, b) => {
          const valA = a[this.orderCol]
          const valB = b[this.orderCol]
          if (valA < valB) return this.orderAsc ? -1 : 1
          if (valA > valB) return this.orderAsc ? 1 : -1
          return 0
        })
      }

      if (this.selectCols && this.selectCols !== '*') {
        const cols = this.selectCols.split(',').map(s => s.trim())
        filtered = filtered.map(r => {
          const row = {}
          cols.forEach(c => { row[c] = r[c] })
          return row
        })
      }

      return { data: filtered, error: null }
    }

    if (this.action === 'insert') {
      const records = Array.isArray(this.insertPayload) ? this.insertPayload : [this.insertPayload]
      const inserted = records.map(r => ({
        id: r.id || 'id_' + Math.random().toString(36).substr(2, 9),
        created_at: r.created_at || new Date().toISOString(),
        registered_at: r.registered_at || new Date().toISOString(),
        ...r
      }))
      items = [...items, ...inserted]
      saveStore(this.table, items)
      return { data: inserted, error: null }
    }

    if (this.action === 'update') {
      let updated = []
      items = items.map(item => {
        const match = this.filters.every(f => String(item[f.col]) === String(f.val))
        if (match) {
          const newItem = { ...item, ...this.updatePayload }
          updated.push(newItem)
          return newItem
        }
        return item
      })
      saveStore(this.table, items)
      return { data: updated, error: null }
    }

    if (this.action === 'delete') {
      let deleted = []
      items = items.filter(item => {
        const match = this.filters.every(f => String(item[f.col]) === String(f.val))
        if (match) {
          deleted.push(item)
          return false
        }
        return true
      })
      saveStore(this.table, items)
      return { data: deleted, error: null }
    }

    return { data: null, error: null }
  }

  then(onFulfilled, onRejected) {
    return this.execute().then(onFulfilled, onRejected)
  }
}

const mockClient = {
  from(table) {
    return new MockQueryBuilder(table)
  }
}

let realClient = null
if (
  supabaseUrl &&
  supabaseAnonKey &&
  typeof supabaseUrl === 'string' &&
  supabaseUrl.startsWith('http')
) {
  try {
    realClient = createClient(supabaseUrl, supabaseAnonKey)
  } catch (err) {
    console.warn('[AI Studio] Supabase client initialization error, falling back to mock:', err)
  }
}

export const supabase = realClient || mockClient
