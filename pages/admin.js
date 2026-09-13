import { useState, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { supabase } from '../lib/supabase'
import {
  Coffee,
  ShieldCheck,
  Plus,
  FileSpreadsheet,
  Trash2,
  Edit,
  Power,
  Search,
  ArrowRight,
  CheckCircle,
  Clock,
  MapPin,
  Calendar,
  Users,
  LogOut,
  ExternalLink,
  Filter
} from 'lucide-react'

const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'chaykhane1404'

export default function Admin() {
  const [authed, setAuthed] = useState(false)
  const [pass, setPass] = useState('')
  const [loginErr, setLoginErr] = useState('')

  const [rounds, setRounds] = useState([])
  const [regs, setRegs] = useState([])
  const [activeRound, setActiveRound] = useState(null)
  const [view, setView] = useState('rounds') // 'rounds' | 'regs' | 'new-round' | 'edit-round'
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState(null)

  // Filters for registrations view
  const [searchTerm, setSearchTerm] = useState('')
  const [filterNeighborhood, setFilterNeighborhood] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')

  const [roundForm, setRoundForm] = useState({
    title: '',
    description: '',
    dates: '',
    shrine_location: 'صحن کوثر حرم مطهر امام رضا (ع)',
    departure_city: 'میناب (مسجد جامع)',
    capacity: 35,
    max_reg_per_person: 1,
    is_open: true,
    rules: 'حضور به موقع در شیفت‌ها و رعایت شئونات خادمیاری'
  })

  useEffect(() => {
    if (authed) {
      fetchAll()
    }
  }, [authed])

  async function fetchAll() {
    setLoading(true)
    try {
      const { data: r } = await supabase
        .from('rounds')
        .select('*')
        .order('created_at', { ascending: false })
      const { data: reg } = await supabase
        .from('registrations')
        .select('*')
        .order('registered_at', { ascending: false })
      if (r) setRounds(r)
      if (reg) setRegs(reg)
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  function login(e) {
    if (e) e.preventDefault()
    if (pass === ADMIN_PASSWORD) {
      setAuthed(true)
      setLoginErr('')
    } else {
      setLoginErr('رمز عبور وارد شده نادرست است (رمز پیش‌فرض: chaykhane1404)')
    }
  }

  function showMsg(text, type = 'success') {
    setMsg({ text, type })
    setTimeout(() => setMsg(null), 4000)
  }

  // ---- Round Management ----
  function startNewRound() {
    setRoundForm({
      title: '',
      description: '',
      dates: '',
      shrine_location: 'صحن کوثر حرم مطهر امام رضا (ع)',
      departure_city: 'میناب (مسجد جامع)',
      capacity: 35,
      max_reg_per_person: 1,
      is_open: true,
      rules: 'حضور به موقع در کاروان اعزامی از میناب و التزام به ضوابط آستان قدس'
    })
    setView('new-round')
  }

  function startEditRound(round) {
    setRoundForm({
      shrine_location: round.shrine_location || 'صحن کوثر حرم مطهر امام رضا (ع)',
      departure_city: round.departure_city || 'میناب (مسجد جامع)',
      rules: round.rules || '',
      ...round
    })
    setActiveRound(round)
    setView('edit-round')
  }

  async function saveRound(e) {
    e.preventDefault()
    if (!roundForm.title.trim() || !roundForm.dates.trim()) {
      return showMsg('لطفاً عنوان کاروان و بازه زمانی را وارد فرمایید.', 'error')
    }
    setLoading(true)
    try {
      if (view === 'new-round') {
        const { error } = await supabase.from('rounds').insert({ ...roundForm })
        if (error) throw error
        showMsg('دوره جدید اعزام خادمیاران میناب با موفقیت ایجاد شد.')
      } else {
        const { error } = await supabase
          .from('rounds')
          .update({ ...roundForm })
          .eq('id', activeRound.id)
        if (error) throw error
        showMsg('اطلاعات دوره با موفقیت به‌روزرسانی شد.')
      }
      await fetchAll()
      setView('rounds')
    } catch (err) {
      showMsg('خطا در ذخیره‌سازی دوره. لطفاً مجدداً امتحان کنید.', 'error')
    }
    setLoading(false)
  }

  async function toggleRound(round) {
    await supabase.from('rounds').update({ is_open: !round.is_open }).eq('id', round.id)
    showMsg(round.is_open ? 'ثبت‌نام این دوره موقتاً بسته شد.' : 'ثبت‌نام این دوره فعال و باز گردید.')
    fetchAll()
  }

  async function deleteRound(round) {
    if (!confirm(`آیا از حذف دوره «${round.title}» و همه پرونده‌های ثبت‌نامی آن اطمینان دارید؟`)) return
    await supabase.from('rounds').delete().eq('id', round.id)
    showMsg('دوره و سوابق آن حذف شد.')
    fetchAll()
  }

  // ---- Registrations Management ----
  function viewRegs(round) {
    setActiveRound(round)
    setSearchTerm('')
    setFilterNeighborhood('all')
    setFilterStatus('all')
    setView('regs')
  }

  async function updateRegStatus(regId, newStatus) {
    await supabase.from('registrations').update({ status: newStatus }).eq('id', regId)
    showMsg(`وضعیت خادمیار به «${newStatus}» تغییر یافت.`)
    fetchAll()
  }

  async function deleteReg(id) {
    if (!confirm('آیا از حذف این پرونده ثبت‌نام مطمئنید؟')) return
    await supabase.from('registrations').delete().eq('id', id)
    showMsg('پرونده خادمیار حذف گردید.')
    fetchAll()
  }

  function exportCSV(round) {
    const roundRegs = regs.filter(r => r.round_id === round.id)
    if (roundRegs.length === 0) {
      alert('هنوز ثبت‌نامی در این دوره انجام نشده است.')
      return
    }
    const headers = ['کد پیگیری', 'نام و نام خانوادگی', 'شماره همراه', 'کد ملی', 'سن', 'منطقه/روستای میناب', 'مهارت', 'وضعیت', 'زمان ثبت‌نام']
    const rows = [headers]
    
    roundRegs.forEach(r => {
      rows.push([
        r.tracking_code || '',
        r.full_name || '',
        `\t${r.phone || ''}`,
        `\t${r.national_id || ''}`,
        r.age || '',
        r.neighborhood || r.city || 'میناب',
        r.skill || 'خدمت عمومی',
        r.status || 'تایید شده',
        new Date(r.registered_at || r.created_at).toLocaleString('fa-IR')
      ])
    })

    const csvContent = rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `لیست_خادمیاران_میناب_${round.title.replace(/\s+/g, '_')}.csv`
    a.click()
  }

  // --- LOGIN SCREEN ---
  if (!authed) {
    return (
      <>
        <Head>
          <title>ورود به پنل مدیریت — چایخانه حرم میناب</title>
        </Head>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', background: 'linear-gradient(145deg, #052a1b 0%, #0a462c 100%)' }}>
          <div style={{ background: '#ffffff', borderRadius: 24, padding: '2.5rem', maxWidth: 420, width: '100%', boxShadow: '0 20px 40px rgba(0,0,0,0.3)', border: '2px solid var(--gold)' }}>
            <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
              <div style={{ width: 60, height: 60, borderRadius: 16, background: 'linear-gradient(135deg, var(--gold) 0%, var(--gold-dark) 100%)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', boxShadow: '0 8px 20px rgba(179,130,26,0.3)' }}>
                <Coffee size={30} />
              </div>
              <h1 style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--primary-dark)', marginBottom: 4 }}>
                پنل مدیریت خادمیاران چایخانه
              </h1>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                ستاد هماهنگی و اعزام کاروان‌های شهرستان میناب
              </p>
            </div>

            <form onSubmit={login}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 6 }}>
                  رمز عبور مدیریت
                </label>
                <input
                  type="password"
                  placeholder="رمز عبور مدیر"
                  value={pass}
                  onChange={e => setPass(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.85rem 1rem',
                    borderRadius: 10,
                    border: '1.5px solid var(--border)',
                    fontSize: '1rem',
                    outline: 'none'
                  }}
                  autoFocus
                />
              </div>

              {loginErr && (
                <div style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', padding: '0.75rem', borderRadius: 8, fontSize: '0.82rem', marginBottom: '1rem' }}>
                  {loginErr}
                </div>
              )}

              <button
                type="submit"
                style={{
                  width: '100%',
                  padding: '0.9rem',
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)',
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: '0.95rem',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                ورود به پنل
              </button>
            </form>

            <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
              <Link href="/" style={{ fontSize: '0.84rem', color: 'var(--text-light)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <ArrowRight size={14} />
                <span>بازگشت به سامانه اصلی</span>
              </Link>
            </div>
          </div>
        </div>
      </>
    )
  }

  // Active round registrations filtering
  const activeRoundRegs = activeRound ? regs.filter(r => r.round_id === activeRound.id) : []
  const filteredRegs = activeRoundRegs.filter(r => {
    const q = searchTerm.trim().toLowerCase()
    const matchSearch = !q ||
      (r.full_name && r.full_name.toLowerCase().includes(q)) ||
      (r.national_id && r.national_id.includes(q)) ||
      (r.phone && r.phone.includes(q)) ||
      (r.tracking_code && r.tracking_code.toLowerCase().includes(q))

    const matchNeighborhood = filterNeighborhood === 'all' || (r.neighborhood && r.neighborhood === filterNeighborhood)
    const matchStatus = filterStatus === 'all' || (r.status && r.status === filterStatus)

    return matchSearch && matchNeighborhood && matchStatus
  })

  // All neighborhoods in active round for filter dropdown
  const uniqueNeighborhoods = Array.from(new Set(activeRoundRegs.map(r => r.neighborhood || r.city || 'میناب'))).filter(Boolean)

  return (
    <>
      <Head>
        <title>پنل مدیریت کاروان‌های چایخانه — شهرستان میناب</title>
      </Head>

      <div style={{ minHeight: '100vh', background: 'var(--bg-page)', display: 'flex', flexDirection: 'column' }}>
        {/* Admin Header */}
        <header style={{ background: '#052a1b', color: '#fff', borderBottom: '2px solid var(--gold)', padding: '1rem 0' }}>
          <div className="max-content" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                <Coffee size={22} />
              </div>
              <div>
                <h1 style={{ fontSize: '1.05rem', fontWeight: 800 }}>پنل مدیریت خادمیاران چایخانه حرم</h1>
                <p style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.7)' }}>
                  ستاد هماهنگی شهرستان میناب | {rounds.length} دوره · {regs.length} خادم ثبت‌شده
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Link
                href="/"
                target="_blank"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: '0.8rem',
                  color: '#fff',
                  background: 'rgba(255,255,255,0.1)',
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: '1px solid rgba(255,255,255,0.2)'
                }}
              >
                <span>مشاهده سایت</span>
                <ExternalLink size={13} />
              </Link>

              <button
                onClick={() => setAuthed(false)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: '0.8rem',
                  color: '#fca5a5',
                  background: 'rgba(239,68,68,0.15)',
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: '1px solid rgba(239,68,68,0.3)'
                }}
              >
                <LogOut size={13} />
                <span>خروج</span>
              </button>
            </div>
          </div>
        </header>

        {/* Admin Content */}
        <main className="max-content" style={{ padding: '2rem 1.25rem', flex: 1 }}>
          {msg && (
            <div className={`alert-box ${msg.type}`} style={{ marginBottom: '1.5rem' }}>
              {msg.type === 'error' ? <ShieldCheck size={18} /> : <CheckCircle size={18} />}
              <span>{msg.text}</span>
            </div>
          )}

          {/* VIEW: ROUNDS LIST */}
          {view === 'rounds' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--primary-dark)' }}>
                    دوره‌ها و فراخوان‌های اعزام خادمیاران میناب
                  </h2>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    مدیریت ظرفیت‌ها، باز و بسته کردن ثبت‌نام و دریافت لیست پرونده‌ها
                  </p>
                </div>

                <button
                  onClick={startNewRound}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '0.65rem 1.25rem',
                    background: 'var(--primary)',
                    color: '#fff',
                    borderRadius: 10,
                    fontWeight: 700,
                    fontSize: '0.88rem'
                  }}
                >
                  <Plus size={16} />
                  <span>تعریف دوره اعزام جدید</span>
                </button>
              </div>

              {/* Rounds Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {rounds.map(round => {
                  const used = regs.filter(r => r.round_id === round.id).length
                  const left = round.capacity - used
                  const pct = Math.min(100, Math.round((used / round.capacity) * 100))

                  return (
                    <div key={round.id} style={{ background: '#fff', borderRadius: 16, border: '1.5px solid var(--border)', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                        <div>
                          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary-dark)', marginBottom: 4 }}>
                            {round.title}
                          </h3>
                          <div style={{ display: 'flex', gap: 12, fontSize: '0.82rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                            <span>📅 {round.dates}</span>
                            <span>📍 {round.shrine_location || 'چایخانه حرم رضوی'}</span>
                            <span>🚌 مبدا: {round.departure_city || 'میناب'}</span>
                          </div>
                        </div>

                        <span
                          style={{
                            background: round.is_open && left > 0 ? '#d1fae5' : '#fee2e2',
                            color: round.is_open && left > 0 ? '#065f46' : '#991b1b',
                            padding: '4px 12px',
                            borderRadius: 20,
                            fontSize: '0.78rem',
                            fontWeight: 700
                          }}
                        >
                          {!round.is_open ? 'ثبت‌نام بسته' : left <= 0 ? 'ظرفیت تکمیل' : 'ثبت‌نام فعال'}
                        </span>
                      </div>

                      {/* Stats grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, margin: '1rem 0' }}>
                        <div style={{ background: 'var(--surface-alt)', borderRadius: 10, padding: '10px 14px', textAlign: 'center' }}>
                          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--primary)' }}>{used} نفر</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-light)' }}>ثبت‌نام شده</div>
                        </div>
                        <div style={{ background: 'var(--surface-alt)', borderRadius: 10, padding: '10px 14px', textAlign: 'center' }}>
                          <div style={{ fontSize: '1.3rem', fontWeight: 800 }}>{round.capacity} نفر</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-light)' }}>ظرفیت کل کاروان</div>
                        </div>
                        <div style={{ background: 'var(--surface-alt)', borderRadius: 10, padding: '10px 14px', textAlign: 'center' }}>
                          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: left > 0 ? 'var(--gold-dark)' : 'var(--danger)' }}>
                            {Math.max(0, left)} نفر
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-light)' }}>ظرفیت باقی‌مانده</div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingTop: '0.5rem', borderTop: '1px solid var(--border)' }}>
                        <button
                          onClick={() => viewRegs(round)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '8px 16px',
                            background: 'var(--primary)',
                            color: '#fff',
                            borderRadius: 8,
                            fontSize: '0.84rem',
                            fontWeight: 700
                          }}
                        >
                          <Users size={14} />
                          <span>مشاهده خادمان ثبت‌نامی ({used})</span>
                        </button>

                        <button
                          onClick={() => exportCSV(round)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '8px 14px',
                            background: '#fff',
                            border: '1px solid var(--border)',
                            borderRadius: 8,
                            fontSize: '0.84rem'
                          }}
                        >
                          <FileSpreadsheet size={14} color="#0d5436" />
                          <span>خروجی اکسل (CSV)</span>
                        </button>

                        <button
                          onClick={() => toggleRound(round)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '8px 14px',
                            background: '#fff',
                            border: '1px solid var(--border)',
                            borderRadius: 8,
                            fontSize: '0.84rem',
                            color: round.is_open ? 'var(--warning)' : 'var(--primary)'
                          }}
                        >
                          <Power size={14} />
                          <span>{round.is_open ? 'بستن ثبت‌نام' : 'باز کردن ثبت‌نام'}</span>
                        </button>

                        <button
                          onClick={() => startEditRound(round)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '8px 14px',
                            background: '#fff',
                            border: '1px solid var(--border)',
                            borderRadius: 8,
                            fontSize: '0.84rem'
                          }}
                        >
                          <Edit size={14} />
                          <span>ویرایش</span>
                        </button>

                        <button
                          onClick={() => deleteRound(round)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '8px 14px',
                            background: '#fff',
                            border: '1px solid #fecaca',
                            borderRadius: 8,
                            fontSize: '0.84rem',
                            color: 'var(--danger)'
                          }}
                        >
                          <Trash2 size={14} />
                          <span>حذف</span>
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* VIEW: NEW / EDIT ROUND */}
          {(view === 'new-round' || view === 'edit-round') && (
            <div style={{ maxWidth: 680, margin: '0 auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1.25rem' }}>
                <button
                  onClick={() => setView('rounds')}
                  style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 12px', fontSize: '0.85rem' }}
                >
                  ← بازگشت به دوره‌ها
                </button>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary-dark)' }}>
                  {view === 'new-round' ? 'تعریف دوره و کاروان جدید خادمیاران میناب' : 'ویرایش اطلاعات دوره'}
                </h2>
              </div>

              <div style={{ background: '#fff', borderRadius: 20, border: '1.5px solid var(--border)', padding: '2rem' }}>
                <form onSubmit={saveRound}>
                  <div style={{ marginBottom: '1.15rem' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: 6 }}>
                      عنوان کاروان و دوره اعزام *
                    </label>
                    <input
                      type="text"
                      className="field-input"
                      placeholder="مثال: کاروان خادمان بهشت میناب — ایام عید غدیر"
                      value={roundForm.title}
                      onChange={e => setRoundForm(f => ({ ...f, title: e.target.value }))}
                      required
                    />
                  </div>

                  <div style={{ marginBottom: '1.15rem' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: 6 }}>
                      تاریخ و مدت خدمت در مشهد مقدس *
                    </label>
                    <input
                      type="text"
                      className="field-input"
                      placeholder="مثال: ۱۵ تا ۲۲ تیر ۱۴۰۴ (شیفت عصر و مغرب)"
                      value={roundForm.dates}
                      onChange={e => setRoundForm(f => ({ ...f, dates: e.target.value }))}
                      required
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.15rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: 6 }}>
                        محل چایخانه در حرم
                      </label>
                      <input
                        type="text"
                        className="field-input"
                        placeholder="صحن کوثر / صحن غدیر / پیامبر اعظم"
                        value={roundForm.shrine_location}
                        onChange={e => setRoundForm(f => ({ ...f, shrine_location: e.target.value }))}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: 6 }}>
                        محل حرکت در میناب
                      </label>
                      <input
                        type="text"
                        className="field-input"
                        placeholder="میناب (مقابل مسجد جامع)"
                        value={roundForm.departure_city}
                        onChange={e => setRoundForm(f => ({ ...f, departure_city: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.15rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: 6 }}>
                        ظرفیت کاروان (تعداد نفرات)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={300}
                        className="field-input"
                        value={roundForm.capacity}
                        onChange={e => setRoundForm(f => ({ ...f, capacity: parseInt(e.target.value) || 1 }))}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: 6 }}>
                        حداکثر سهمیه ثبت‌نام هر کد ملی
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={5}
                        className="field-input"
                        value={roundForm.max_reg_per_person}
                        onChange={e => setRoundForm(f => ({ ...f, max_reg_per_person: parseInt(e.target.value) || 1 }))}
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: '1.15rem' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: 6 }}>
                      توضیحات و پیام ویژه کاروان میناب
                    </label>
                    <textarea
                      rows={3}
                      className="field-input"
                      placeholder="توضیحات تکمیلی برای مشتاقان خدمت در میناب..."
                      value={roundForm.description}
                      onChange={e => setRoundForm(f => ({ ...f, description: e.target.value }))}
                    />
                  </div>

                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600 }}>
                      <input
                        type="checkbox"
                        checked={roundForm.is_open}
                        onChange={e => setRoundForm(f => ({ ...f, is_open: e.target.checked }))}
                        style={{ width: 18, height: 18, accentColor: 'var(--primary)' }}
                      />
                      <span>ثبت‌نام برای عموم اهالی میناب باز و فعال باشد</span>
                    </label>
                  </div>

                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      type="submit"
                      disabled={loading}
                      style={{
                        flex: 1,
                        padding: '0.85rem',
                        background: 'var(--primary)',
                        color: '#fff',
                        borderRadius: 10,
                        fontWeight: 800,
                        fontSize: '0.95rem'
                      }}
                    >
                      {loading ? 'در حال ذخیره‌سازی...' : 'ذخیره و انتشار دوره'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setView('rounds')}
                      style={{
                        padding: '0.85rem 1.5rem',
                        background: '#f3f4f6',
                        border: '1px solid var(--border)',
                        borderRadius: 10,
                        fontWeight: 600
                      }}
                    >
                      انصراف
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* VIEW: REGISTRATIONS LIST */}
          {view === 'regs' && activeRound && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button
                    onClick={() => setView('rounds')}
                    style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 12px', fontSize: '0.85rem' }}
                  >
                    ← بازگشت
                  </button>
                  <div>
                    <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary-dark)' }}>
                      لیست خادمان ثبت‌نامی: {activeRound.title}
                    </h2>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      {activeRoundRegs.length} نفر از {activeRound.capacity} نفر ظرفیت کاروان میناب
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => exportCSV(activeRound)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      background: 'var(--primary)',
                      color: '#fff',
                      padding: '8px 16px',
                      borderRadius: 8,
                      fontSize: '0.85rem',
                      fontWeight: 700
                    }}
                  >
                    <FileSpreadsheet size={15} />
                    <span>دانلود لیست اکسل (CSV)</span>
                  </button>
                </div>
              </div>

              {/* Filters Bar */}
              <div style={{ background: '#fff', borderRadius: 12, border: '1px solid var(--border)', padding: '1rem', marginBottom: '1.25rem', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ flex: 1, minWidth: 200, display: 'flex', alignItems: 'center', gap: 8, background: '#fdfbf7', border: '1px solid var(--border)', borderRadius: 8, padding: '0 10px' }}>
                  <Search size={16} color="var(--text-light)" />
                  <input
                    type="text"
                    placeholder="جستجو با نام، کد ملی، شماره تماس یا کد پیگیری..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    style={{ border: 'none', background: 'transparent', outline: 'none', padding: '8px 0', width: '100%', fontSize: '0.85rem' }}
                  />
                </div>

                {uniqueNeighborhoods.length > 0 && (
                  <select
                    value={filterNeighborhood}
                    onChange={e => setFilterNeighborhood(e.target.value)}
                    style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: '0.85rem', background: '#fff' }}
                  >
                    <option value="all">همه مناطق میناب</option>
                    {uniqueNeighborhoods.map(n => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                )}

                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: '0.85rem', background: '#fff' }}
                >
                  <option value="all">همه وضعیت‌ها</option>
                  <option value="تایید شده">تایید شده</option>
                  <option value="در انتظار بررسی">در انتظار بررسی</option>
                  <option value="لیست رزرو">لیست رزرو</option>
                </select>
              </div>

              {filteredRegs.length === 0 && (
                <div style={{ textAlign: 'center', padding: '3.5rem', background: '#fff', borderRadius: 16, border: '1px solid var(--border)' }}>
                  <p style={{ color: 'var(--text-muted)' }}>هیچ خادمیاری با این مشخصات یافت نشد.</p>
                </div>
              )}

              {filteredRegs.length > 0 && (
                <>
                  {/* Desktop Table */}
                  <div className="admin-table-desktop" style={{ background: '#fff', borderRadius: 16, border: '1.5px solid var(--border)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ background: 'var(--surface-alt)', borderBottom: '1.5px solid var(--border)', color: 'var(--text-muted)' }}>
                          <th style={{ padding: '12px 14px' }}>ردیف</th>
                          <th style={{ padding: '12px 14px' }}>کد پیگیری</th>
                          <th style={{ padding: '12px 14px' }}>نام و نام خانوادگی</th>
                          <th style={{ padding: '12px 14px' }}>کد ملی</th>
                          <th style={{ padding: '12px 14px' }}>شماره همراه</th>
                          <th style={{ padding: '12px 14px' }}>منطقه در میناب</th>
                          <th style={{ padding: '12px 14px' }}>مهارت</th>
                          <th style={{ padding: '12px 14px' }}>وضعیت</th>
                          <th style={{ padding: '12px 14px', textAlign: 'center' }}>عملیات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRegs.map((reg, index) => (
                          <tr key={reg.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                            <td style={{ padding: '12px 14px', color: 'var(--text-light)' }}>{index + 1}</td>
                            <td style={{ padding: '12px 14px', fontWeight: 700, direction: 'ltr', textAlign: 'right', color: 'var(--primary)' }}>
                              {reg.tracking_code || '-'}
                            </td>
                            <td style={{ padding: '12px 14px', fontWeight: 700 }}>{reg.full_name}</td>
                            <td style={{ padding: '12px 14px', direction: 'ltr', textAlign: 'right' }}>{reg.national_id}</td>
                            <td style={{ padding: '12px 14px', direction: 'ltr', textAlign: 'right' }}>{reg.phone}</td>
                            <td style={{ padding: '12px 14px' }}>{reg.neighborhood || reg.city || 'میناب'}</td>
                            <td style={{ padding: '12px 14px', color: 'var(--text-muted)', fontSize: '0.78rem' }}>{reg.skill || 'عمومی'}</td>
                            <td style={{ padding: '12px 14px' }}>
                              <select
                                value={reg.status || 'تایید شده'}
                                onChange={e => updateRegStatus(reg.id, e.target.value)}
                                style={{
                                  padding: '3px 8px',
                                  borderRadius: 6,
                                  fontSize: '0.78rem',
                                  fontWeight: 700,
                                  background: reg.status === 'تایید شده' ? '#d1fae5' : '#fef3c7',
                                  color: reg.status === 'تایید شده' ? '#065f46' : '#92400e',
                                  border: '1px solid #d1d5db'
                                }}
                              >
                                <option value="تایید شده">تایید شده</option>
                                <option value="در انتظار بررسی">در انتظار بررسی</option>
                                <option value="لیست رزرو">لیست رزرو</option>
                              </select>
                            </td>
                            <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                              <button
                                onClick={() => deleteReg(reg.id)}
                                style={{
                                  background: '#fee2e2',
                                  color: 'var(--danger)',
                                  border: 'none',
                                  borderRadius: 6,
                                  padding: '4px 8px',
                                  fontSize: '0.75rem',
                                  cursor: 'pointer'
                                }}
                              >
                                حذف
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards for Registrations */}
                  <div className="admin-cards-mobile">
                    {filteredRegs.map((reg, index) => (
                      <div
                        key={reg.id}
                        style={{
                          background: '#fff',
                          border: '1.5px solid var(--border)',
                          borderRadius: 14,
                          padding: '1rem',
                          boxShadow: 'var(--shadow-sm)'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontSize: '0.74rem', color: 'var(--text-light)', fontWeight: 700 }}>#{index + 1}</span>
                              <h4 style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--primary-dark)' }}>{reg.full_name}</h4>
                            </div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{reg.neighborhood || reg.city || 'شهرستان میناب'}</span>
                          </div>
                          <span
                            style={{
                              background: 'var(--gold-subtle)',
                              color: 'var(--gold-dark)',
                              border: '1px solid var(--gold-border)',
                              padding: '2px 8px',
                              borderRadius: 6,
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              direction: 'ltr'
                            }}
                          >
                            {reg.tracking_code || '-'}
                          </span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: '0.78rem', background: '#fdfbf7', padding: '0.65rem 0.75rem', borderRadius: 8, margin: '0.6rem 0' }}>
                          <div>
                            <span style={{ color: 'var(--text-light)', fontSize: '0.68rem', display: 'block' }}>تلفن تماس (تماس فوری):</span>
                            <a href={`tel:${reg.phone}`} style={{ fontWeight: 700, direction: 'ltr', textAlign: 'right', display: 'inline-block', color: 'var(--primary)', textDecoration: 'underline' }}>
                              {reg.phone}
                            </a>
                          </div>
                          <div>
                            <span style={{ color: 'var(--text-light)', fontSize: '0.68rem', display: 'block' }}>کد ملی:</span>
                            <span style={{ fontWeight: 700, direction: 'ltr', textAlign: 'right', display: 'inline-block' }}>
                              {reg.national_id}
                            </span>
                          </div>
                          {reg.age && (
                            <div>
                              <span style={{ color: 'var(--text-light)', fontSize: '0.68rem', display: 'block' }}>سن:</span>
                              <span style={{ fontWeight: 600 }}>{reg.age} سال</span>
                            </div>
                          )}
                          <div>
                            <span style={{ color: 'var(--text-light)', fontSize: '0.68rem', display: 'block' }}>مهارت:</span>
                            <span style={{ fontWeight: 600 }}>{reg.skill || 'عمومی'}</span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border-subtle)' }}>
                          <select
                            value={reg.status || 'تایید شده'}
                            onChange={e => updateRegStatus(reg.id, e.target.value)}
                            style={{
                              flex: 1,
                              padding: '6px 10px',
                              borderRadius: 8,
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              background: reg.status === 'تایید شده' ? '#d1fae5' : '#fef3c7',
                              color: reg.status === 'تایید شده' ? '#065f46' : '#92400e',
                              border: '1px solid #d1d5db',
                              minHeight: 38
                            }}
                          >
                            <option value="تایید شده">تایید شده</option>
                            <option value="در انتظار بررسی">در انتظار بررسی</option>
                            <option value="لیست رزرو">لیست رزرو</option>
                          </select>

                          <button
                            onClick={() => deleteReg(reg.id)}
                            style={{
                              background: '#fee2e2',
                              color: 'var(--danger)',
                              border: '1px solid #fecaca',
                              borderRadius: 8,
                              padding: '6px 12px',
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              minHeight: 38,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4
                            }}
                          >
                            <Trash2 size={13} />
                            <span>حذف</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </main>
      </div>
    </>
  )
}
