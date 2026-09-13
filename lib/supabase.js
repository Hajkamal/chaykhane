import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Initial realistic rounds tailored for Minab Khademyaran
const INITIAL_ROUNDS = [
  {
    id: 'round-mnb-1',
    title: 'کاروان خادمان بهشت میناب — چایخانه صحن کوثر',
    dates: '۱۵ تا ۲۲ تیر ۱۴۰۴ (شیفت شب و سحر)',
    shrine_location: 'صحن کوثر حرم مطهر امام رضا (ع)',
    description: 'اعزام کاروان خادمیاران اهل میناب جهت خدمتگزاری در چایخانه متبرک صحن کوثر، توزیع چای متبرک و پذیرایی از زائران بارگاه منور رضوی',
    departure_city: 'میناب (حرکت از مقابل مسجد جامع)',
    capacity: 35,
    max_reg_per_person: 1,
    is_open: true,
    rules: 'حضور به موقع در شیفت‌ها، داشتن کارت ملی هوشمند، التزام به شئونات خادمیاری حرم رضوی',
    created_at: new Date(Date.now() - 3600000 * 24 * 3).toISOString()
  },
  {
    id: 'round-mnb-2',
    title: 'دوره دهه ولایت و عید غدیر — چایخانه صحن غدیر',
    dates: '۱ تا ۸ مرداد ۱۴۰۴ (ایام عید سعید غدیر خم)',
    shrine_location: 'صحن غدیر حرم مطهر امام رضا (ع)',
    description: 'پذیرایی باشکوه عید غدیر ویژه مشتاقان و جوانان مومن شهرستان میناب در جوار بارگاه ملکوتی حضرت شمس‌الشموس (ع)',
    departure_city: 'میناب',
    capacity: 40,
    max_reg_per_person: 1,
    is_open: true,
    rules: 'اولویت با خادمانی است که در سال جاری هنوز اعزام نشده‌اند',
    created_at: new Date(Date.now() - 3600000 * 24 * 1).toISOString()
  },
  {
    id: 'round-mnb-3',
    title: 'دوره دهه کرامت و میلاد امام رضا (ع) — صحن پیامبر اعظم (ص)',
    dates: '۲۰ تا ۲۷ اردیبهشت ۱۴۰۴ (تکمیل و اعزام شده)',
    shrine_location: 'صحن پیامبر اعظم (ص)',
    description: 'کاروان ویژه میلاد با برکت امام هشتم (ع) با حضور ۴۵ نفر از خادمیاران شهرستان میناب با موفقیت به پایان رسید.',
    departure_city: 'میناب',
    capacity: 45,
    max_reg_per_person: 1,
    is_open: false,
    rules: 'این دوره با موفقیت برگزار شد.',
    created_at: new Date(Date.now() - 3600000 * 24 * 30).toISOString()
  }
]

const INITIAL_REGS = [
  {
    id: 'reg-mnb-1',
    round_id: 'round-mnb-1',
    full_name: 'علیرضا زاهدی مینابی',
    phone: '09171612345',
    national_id: '3390123456',
    age: 29,
    city: 'میناب - محله نخلستان',
    neighborhood: 'مرکز شهر میناب',
    skill: 'توزیع چای و پذیرایی',
    has_prev_exp: true,
    status: 'تایید شده',
    tracking_code: 'MNB-1404-7821',
    registered_at: new Date(Date.now() - 3600000 * 18).toISOString()
  },
  {
    id: 'reg-mnb-2',
    round_id: 'round-mnb-1',
    full_name: 'محمدرضا حیدری',
    phone: '09173658899',
    national_id: '3381234567',
    age: 34,
    city: 'میناب - بندزرک',
    neighborhood: 'بخش بندزرک',
    skill: 'شستشو و آماده‌سازی سماورها',
    has_prev_exp: false,
    status: 'تایید شده',
    tracking_code: 'MNB-1404-9142',
    registered_at: new Date(Date.now() - 3600000 * 12).toISOString()
  },
  {
    id: 'reg-mnb-3',
    round_id: 'round-mnb-2',
    full_name: 'حسین ذاکری',
    phone: '09179876543',
    national_id: '3395678901',
    age: 26,
    city: 'میناب - هشتبندی',
    neighborhood: 'هشتبندی',
    skill: 'امور فنی و پشتیبانی',
    has_prev_exp: true,
    status: 'در انتظار بررسی',
    tracking_code: 'MNB-1404-4509',
    registered_at: new Date(Date.now() - 3600000 * 4).toISOString()
  }
]

const memoryStore = {
  rounds: [...INITIAL_ROUNDS],
  registrations: [...INITIAL_REGS]
}

function getStore(table) {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = window.localStorage.getItem(`chaykhane_mnb_${table}`)
      if (raw) return JSON.parse(raw)
      const initial = table === 'rounds' ? INITIAL_ROUNDS : INITIAL_REGS
      window.localStorage.setItem(`chaykhane_mnb_${table}`, JSON.stringify(initial))
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
      window.localStorage.setItem(`chaykhane_mnb_${table}`, JSON.stringify(data))
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
        status: r.status || 'تایید شده',
        tracking_code: r.tracking_code || `MNB-1404-${Math.floor(1000 + Math.random() * 9000)}`,
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
