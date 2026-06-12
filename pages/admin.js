import { useState, useEffect } from 'react'
import Head from 'next/head'
import { supabase } from '../lib/supabase'

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

  const [roundForm, setRoundForm] = useState({
    title: '', description: '', dates: '', capacity: 30, max_reg_per_person: 1, is_open: true
  })

  useEffect(() => {
    if (authed) { fetchAll() }
  }, [authed])

  async function fetchAll() {
    setLoading(true)
    const { data: r } = await supabase.from('rounds').select('*').order('created_at', { ascending: false })
    const { data: reg } = await supabase.from('registrations').select('*').order('registered_at', { ascending: false })
    if (r) setRounds(r)
    if (reg) setRegs(reg)
    setLoading(false)
  }

  function login() {
    if (pass === ADMIN_PASSWORD) { setAuthed(true); setLoginErr('') }
    else setLoginErr('رمز عبور اشتباه است')
  }

  function showMsg(text, type = 'success') {
    setMsg({ text, type })
    setTimeout(() => setMsg(null), 4000)
  }

  // ---- Round CRUD ----
  function startNewRound() {
    setRoundForm({ title: '', description: '', dates: '', capacity: 30, max_reg_per_person: 1, is_open: true })
    setView('new-round')
  }

  function startEditRound(round) {
    setRoundForm({ ...round })
    setActiveRound(round)
    setView('edit-round')
  }

  async function saveRound(e) {
    e.preventDefault()
    if (!roundForm.title || !roundForm.dates) return showMsg('عنوان و تاریخ اجباری است', 'error')
    setLoading(true)
    if (view === 'new-round') {
      const { error } = await supabase.from('rounds').insert({ ...roundForm })
      if (error) { showMsg('خطا در ذخیره', 'error'); setLoading(false); return }
      showMsg('دوره جدید اضافه شد')
    } else {
      const { error } = await supabase.from('rounds').update({ ...roundForm }).eq('id', activeRound.id)
      if (error) { showMsg('خطا در ذخیره', 'error'); setLoading(false); return }
      showMsg('دوره بروزرسانی شد')
    }
    await fetchAll()
    setView('rounds')
    setLoading(false)
  }

  async function toggleRound(round) {
    await supabase.from('rounds').update({ is_open: !round.is_open }).eq('id', round.id)
    showMsg(round.is_open ? 'ثبت‌نام بسته شد' : 'ثبت‌نام باز شد')
    fetchAll()
  }

  async function deleteRound(round) {
    if (!confirm(`آیا از حذف دوره «${round.title}» و تمام ثبت‌نام‌های آن مطمئنید؟`)) return
    await supabase.from('rounds').delete().eq('id', round.id)
    showMsg('دوره حذف شد')
    fetchAll()
  }

  // ---- Registration management ----
  function viewRegs(round) {
    setActiveRound(round)
    setView('regs')
  }

  async function deleteReg(id) {
    if (!confirm('حذف این ثبت‌نام؟')) return
    await supabase.from('registrations').delete().eq('id', id)
    showMsg('ثبت‌نام حذف شد')
    fetchAll()
  }

  function exportCSV(round) {
    const roundRegs = regs.filter(r => r.round_id === round.id)
    const rows = [['نام', 'تلفن', 'کد ملی', 'زمان ثبت‌نام']]
    roundRegs.forEach(r => rows.push([r.full_name, r.phone, r.national_id, new Date(r.registered_at).toLocaleString('fa-IR')]))
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${round.title}.csv`
    a.click()
  }

  // ---- Login screen ----
  if (!authed) return (
    <>
      <Head><title>ورود مدیر — چایخانه</title></Head>
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
        <div className="card" style={{ width: '100%', maxWidth: 380 }}>
          <h1 style={{ fontSize: 18, fontWeight: 600, marginBottom: 6 }}>پنل مدیریت</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: '1.5rem' }}>چایخانه حرم مطهر امام رضا (ع)</p>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 }}>رمز عبور مدیر</label>
            <input type="password" placeholder="رمز عبور" value={pass}
              onChange={e => setPass(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && login()} />
          </div>
          {loginErr && <div className="msg msg-error" style={{ marginBottom: 10 }}>{loginErr}</div>}
          <button className="btn-primary" onClick={login}>ورود</button>
          <div style={{ marginTop: 12, textAlign: 'center' }}>
            <a href="/" style={{ fontSize: 13, color: 'var(--text-hint)' }}>← بازگشت به سایت</a>
          </div>
        </div>
      </div>
    </>
  )

  const activeRoundRegs = activeRound ? regs.filter(r => r.round_id === activeRound.id) : []

  return (
    <>
      <Head><title>پنل مدیریت — چایخانه</title></Head>
      <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        {/* Admin Header */}
        <header style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '1rem' }}>
          <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ fontSize: 17, fontWeight: 600 }}>پنل مدیریت چایخانه</h1>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{rounds.length} دوره · {regs.length} ثبت‌نام کل</p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <a href="/" style={{ fontSize: 13, color: 'var(--text-hint)', padding: '6px 12px', border: '1px solid var(--border)', borderRadius: 8 }}>مشاهده سایت</a>
              <button onClick={() => setAuthed(false)} style={{ fontSize: 13, color: 'var(--coral)', background: 'none', border: '1px solid rgba(216,90,48,0.3)', borderRadius: 8, padding: '6px 12px' }}>خروج</button>
            </div>
          </div>
        </header>

        <main style={{ maxWidth: 800, margin: '0 auto', padding: '1.5rem 1rem' }}>
          {msg && <div className={`msg msg-${msg.type}`} style={{ marginBottom: '1rem' }}>{msg.text}</div>}

          {/* Rounds List */}
          {view === 'rounds' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h2 style={{ fontSize: 17, fontWeight: 600 }}>دوره‌های خدمتگزاری</h2>
                <button onClick={startNewRound} className="btn-primary" style={{ width: 'auto', padding: '10px 20px' }}>+ دوره جدید</button>
              </div>
              {loading && <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>در حال بارگذاری...</div>}
              {!loading && rounds.length === 0 && (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>هنوز دوره‌ای ثبت نشده</div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {rounds.map(round => {
                  const used = regs.filter(r => r.round_id === round.id).length
                  const left = round.capacity - used
                  const pct = Math.round((used / round.capacity) * 100)
                  return (
                    <div key={round.id} className="card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                        <div>
                          <h3 style={{ fontSize: 16, fontWeight: 600 }}>{round.title}</h3>
                          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{round.dates}</p>
                        </div>
                        <span className={`badge ${round.is_open && left > 0 ? 'badge-open' : left <= 0 ? 'badge-full' : 'badge-closed'}`}>
                          {!round.is_open ? 'بسته' : left <= 0 ? 'تکمیل' : 'باز'}
                        </span>
                      </div>
                      {/* Stats */}
                      <div style={{ display: 'flex', gap: 16, marginBottom: 10 }}>
                        <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '8px 14px', textAlign: 'center', flex: 1 }}>
                          <div style={{ fontSize: 20, fontWeight: 600 }}>{used}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>ثبت‌نام شده</div>
                        </div>
                        <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '8px 14px', textAlign: 'center', flex: 1 }}>
                          <div style={{ fontSize: 20, fontWeight: 600 }}>{round.capacity}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>ظرفیت کل</div>
                        </div>
                        <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '8px 14px', textAlign: 'center', flex: 1 }}>
                          <div style={{ fontSize: 20, fontWeight: 600, color: left > 0 ? 'var(--green)' : 'var(--coral)' }}>{Math.max(0, left)}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>باقی‌مانده</div>
                        </div>
                        <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '8px 14px', textAlign: 'center', flex: 1 }}>
                          <div style={{ fontSize: 20, fontWeight: 600 }}>{round.max_reg_per_person}×</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>حداکثر دفعات</div>
                        </div>
                      </div>
                      {/* Progress */}
                      <div style={{ height: 5, background: '#E8E8E8', borderRadius: 3, overflow: 'hidden', marginBottom: 12 }}>
                        <div style={{ height: '100%', width: pct + '%', background: left <= 0 ? 'var(--coral)' : 'var(--green)', borderRadius: 3 }} />
                      </div>
                      {/* Actions */}
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button onClick={() => viewRegs(round)} className="btn-primary" style={{ width: 'auto', flex: 1, padding: '9px 14px', fontSize: 13 }}>
                          لیست ثبت‌نام‌ها ({used})
                        </button>
                        <button onClick={() => exportCSV(round)} className="btn-secondary" style={{ flex: 1, padding: '9px 14px', fontSize: 13 }}>
                          خروجی CSV
                        </button>
                        <button onClick={() => toggleRound(round)} className="btn-secondary" style={{ flex: 1, padding: '9px 14px', fontSize: 13 }}>
                          {round.is_open ? 'بستن ثبت‌نام' : 'باز کردن'}
                        </button>
                        <button onClick={() => startEditRound(round)} className="btn-secondary" style={{ padding: '9px 14px', fontSize: 13 }}>
                          ویرایش
                        </button>
                        <button onClick={() => deleteRound(round)} className="btn-danger" style={{ padding: '9px 14px', fontSize: 13 }}>
                          حذف
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* New / Edit Round Form */}
          {(view === 'new-round' || view === 'edit-round') && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.25rem' }}>
                <button onClick={() => setView('rounds')} style={{ background: 'none', border: 'none', fontSize: 20, color: 'var(--text-muted)', cursor: 'pointer' }}>←</button>
                <h2 style={{ fontSize: 17, fontWeight: 600 }}>{view === 'new-round' ? 'دوره جدید' : 'ویرایش دوره'}</h2>
              </div>
              <div className="card">
                <form onSubmit={saveRound}>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 }}>عنوان دوره *</label>
                    <input type="text" placeholder="مثال: دوره تابستانه ۱۴۰۴" value={roundForm.title}
                      onChange={e => setRoundForm(f => ({ ...f, title: e.target.value }))} />
                  </div>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 }}>تاریخ خدمتگزاری *</label>
                    <input type="text" placeholder="مثال: ۱ تا ۱۰ تیر ۱۴۰۴" value={roundForm.dates}
                      onChange={e => setRoundForm(f => ({ ...f, dates: e.target.value }))} />
                  </div>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 }}>توضیحات (اختیاری)</label>
                    <textarea placeholder="توضیح کوتاه درباره این دوره..." value={roundForm.description} rows={3}
                      onChange={e => setRoundForm(f => ({ ...f, description: e.target.value }))} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 }}>ظرفیت کل (نفر)</label>
                      <input type="number" min={1} max={500} value={roundForm.capacity}
                        onChange={e => setRoundForm(f => ({ ...f, capacity: parseInt(e.target.value) || 1 }))} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 }}>حداکثر دفعات ثبت‌نام هر فرد</label>
                      <input type="number" min={1} max={10} value={roundForm.max_reg_per_person}
                        onChange={e => setRoundForm(f => ({ ...f, max_reg_per_person: parseInt(e.target.value) || 1 }))} />
                    </div>
                  </div>
                  <div style={{ marginBottom: '1.25rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14 }}>
                      <input type="checkbox" checked={roundForm.is_open}
                        onChange={e => setRoundForm(f => ({ ...f, is_open: e.target.checked }))}
                        style={{ width: 'auto' }} />
                      ثبت‌نام از همان ابتدا باز باشد
                    </label>
                    <p style={{ fontSize: 12, color: 'var(--text-hint)', marginTop: 4 }}>
                      اگر این گزینه را انتخاب نکنید، باید بعداً دستی ثبت‌نام را باز کنید
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button type="submit" className="btn-primary" disabled={loading}>
                      {loading ? 'در حال ذخیره...' : 'ذخیره'}
                    </button>
                    <button type="button" className="btn-secondary" onClick={() => setView('rounds')} style={{ width: 'auto', flex: 1 }}>
                      انصراف
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Registrations List */}
          {view === 'regs' && activeRound && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.25rem' }}>
                <button onClick={() => setView('rounds')} style={{ background: 'none', border: 'none', fontSize: 20, color: 'var(--text-muted)', cursor: 'pointer' }}>←</button>
                <div>
                  <h2 style={{ fontSize: 17, fontWeight: 600 }}>ثبت‌نام‌های: {activeRound.title}</h2>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{activeRoundRegs.length} نفر از {activeRound.capacity} نفر ظرفیت</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: '1rem' }}>
                <button onClick={() => exportCSV(activeRound)} className="btn-secondary" style={{ flex: 1 }}>
                  خروجی CSV
                </button>
                <button onClick={() => { if (confirm('حذف همه ثبت‌نام‌های این دوره؟')) { supabase.from('registrations').delete().eq('round_id', activeRound.id).then(() => { showMsg('همه حذف شدند'); fetchAll() }) } }} className="btn-danger">
                  حذف همه
                </button>
              </div>
              {activeRoundRegs.length === 0 && (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>هنوز کسی ثبت‌نام نکرده</div>
              )}
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {activeRoundRegs.map((reg, i) => (
                  <div key={reg.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '12px 16px', borderBottom: i < activeRoundRegs.length - 1 ? '1px solid var(--border)' : 'none'
                  }}>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: 15 }}>{reg.full_name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, direction: 'ltr', textAlign: 'right' }}>
                        {reg.phone} · {reg.national_id}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 11, color: 'var(--text-hint)' }}>
                        {new Date(reg.registered_at).toLocaleDateString('fa-IR')}
                      </span>
                      <button onClick={() => deleteReg(reg.id)} style={{ background: 'none', border: 'none', color: 'var(--coral)', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  )
}
