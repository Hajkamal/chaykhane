import { useState, useEffect } from 'react'
import Head from 'next/head'
import { supabase } from '../lib/supabase'

export default function Home() {
  const [rounds, setRounds] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedRound, setSelectedRound] = useState(null)
  const [form, setForm] = useState({ full_name: '', phone: '', national_id: '', agree: false })
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg] = useState(null)
  const [counts, setCounts] = useState({})

  useEffect(() => { fetchRounds() }, [])

  async function fetchRounds() {
    setLoading(true)
    const { data: roundsData } = await supabase.from('rounds').select('*').order('created_at', { ascending: false })
    if (roundsData) {
      setRounds(roundsData)
      const { data: regsData } = await supabase.from('registrations').select('round_id')
      if (regsData) {
        const cnt = {}
        regsData.forEach(r => { cnt[r.round_id] = (cnt[r.round_id] || 0) + 1 })
        setCounts(cnt)
      }
    }
    setLoading(false)
  }

  function openForm(round) {
    setSelectedRound(round)
    setForm({ full_name: '', phone: '', national_id: '', agree: false })
    setMsg(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const { full_name, phone, national_id, agree } = form

    if (!full_name.trim() || !phone.trim() || !national_id.trim())
      return setMsg({ type: 'error', text: 'لطفاً همه فیلدها را پر کنید' })
    if (!agree)
      return setMsg({ type: 'error', text: 'لطفاً موافقت خود را اعلام کنید' })
    if (!/^09\d{9}$/.test(phone))
      return setMsg({ type: 'error', text: 'شماره تلفن معتبر نیست — باید با ۰۹ شروع شود' })
    if (!/^\d{10}$/.test(national_id))
      return setMsg({ type: 'error', text: 'کد ملی باید دقیقاً ۱۰ رقم باشد' })

    setSubmitting(true)
    setMsg(null)

    try {
      // بررسی تعداد ثبت‌نام‌های قبلی این کد ملی در این دوره
      const { data: prevInRound } = await supabase
        .from('registrations')
        .select('id')
        .eq('round_id', selectedRound.id)
        .eq('national_id', national_id)

      if (prevInRound && prevInRound.length > 0) {
        setMsg({ type: 'error', text: 'شما قبلاً در این دوره ثبت‌نام کرده‌اید' })
        setSubmitting(false)
        return
      }

      // بررسی حداکثر دفعات ثبت‌نام در کل سیستم
      const { data: allPrev } = await supabase
        .from('registrations')
        .select('id')
        .eq('national_id', national_id)

      if (allPrev && allPrev.length >= selectedRound.max_reg_per_person) {
        const msg = selectedRound.max_reg_per_person === 1
          ? 'شما قبلاً ثبت‌نام کرده‌اید و امکان ثبت‌نام مجدد وجود ندارد'
          : `شما قبلاً ${allPrev.length} بار ثبت‌نام کرده‌اید (حداکثر ${selectedRound.max_reg_per_person} بار مجاز است)`
        setMsg({ type: 'error', text: msg })
        setSubmitting(false)
        return
      }

      // بررسی ظرفیت
      const used = counts[selectedRound.id] || 0
      if (used >= selectedRound.capacity) {
        setMsg({ type: 'warn', text: 'متأسفانه ظرفیت این دوره تکمیل شده است' })
        setSubmitting(false)
        return
      }

      const { error } = await supabase.from('registrations').insert({
        round_id: selectedRound.id,
        full_name: full_name.trim(),
        phone: phone.trim(),
        national_id: national_id.trim()
      })

      if (error) throw error

      const newUsed = used + 1
      const left = selectedRound.capacity - newUsed
      setMsg({
        type: 'success',
        text: left === 0
          ? `✅ ثبت‌نام شما در «${selectedRound.title}» با موفقیت انجام شد! ظرفیت تکمیل گردید.`
          : `✅ ثبت‌نام شما در «${selectedRound.title}» با موفقیت انجام شد! ${left} جای خالی باقی است.`
      })
      setCounts(prev => ({ ...prev, [selectedRound.id]: newUsed }))
      setSelectedRound(null)
      setForm({ full_name: '', phone: '', national_id: '', agree: false })
    } catch (err) {
      setMsg({ type: 'error', text: 'خطا در ثبت اطلاعات. لطفاً دوباره تلاش کنید.' })
    }
    setSubmitting(false)
  }

  function getRoundStatus(round) {
    const used = counts[round.id] || 0
    const left = round.capacity - used
    if (!round.is_open) return { label: 'ثبت‌نام بسته', cls: 'badge-closed', canReg: false }
    if (left <= 0) return { label: 'ظرفیت تکمیل', cls: 'badge-full', canReg: false }
    return { label: 'ثبت‌نام باز', cls: 'badge-open', canReg: true }
  }

  const openRounds = rounds.filter(r => getRoundStatus(r).canReg)
  const closedRounds = rounds.filter(r => !getRoundStatus(r).canReg)

  return (
    <>
      <Head>
        <title>ثبت‌نام خدمتگزاری — چایخانه حرم امام رضا (ع)</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="سامانه ثبت‌نام خدمتگزاری در چایخانه حرم مطهر امام رضا (ع)" />
      </Head>

      <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        {/* Header */}
        <header style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '1rem' }}>
          <div style={{ maxWidth: 700, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--green-dark)' }}>چایخانه حرم مطهر امام رضا (ع)</h1>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>سامانه ثبت‌نام خدمتگزاری</p>
            </div>
            <a href="/admin" style={{ fontSize: 13, color: 'var(--text-hint)', padding: '6px 14px', border: '1px solid var(--border)', borderRadius: 8 }}>
              ورود مدیر
            </a>
          </div>
        </header>

        <main style={{ maxWidth: 700, margin: '0 auto', padding: '2rem 1rem' }}>
          {/* Hero */}
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🍵</div>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>افتخار خدمتگزاری به زائران اباعبدالله</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 15, lineHeight: 1.8 }}>
              برای ثبت‌نام در یکی از دوره‌های خدمتگزاری، دوره مورد نظر را انتخاب کنید.
            </p>
          </div>

          {/* Success message */}
          {msg && !selectedRound && (
            <div className={`msg msg-${msg.type}`} style={{ marginBottom: '1.5rem', fontSize: 15 }}>{msg.text}</div>
          )}

          {/* Registration Form */}
          {selectedRound && (
            <div className="card" style={{ marginBottom: '2rem', border: '2px solid var(--green)', borderRadius: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                <div>
                  <h3 style={{ fontSize: 17, fontWeight: 600 }}>ثبت‌نام در: {selectedRound.title}</h3>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{selectedRound.dates}</p>
                </div>
                <button onClick={() => setSelectedRound(null)} style={{ background: 'none', border: 'none', fontSize: 20, color: 'var(--text-hint)', cursor: 'pointer' }}>×</button>
              </div>
              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 }}>نام و نام خانوادگی</label>
                  <input type="text" placeholder="مثال: علی احمدی" value={form.full_name}
                    onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
                </div>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 }}>شماره تلفن همراه</label>
                  <input type="tel" placeholder="09123456789" value={form.phone} style={{ direction: 'ltr', textAlign: 'right' }}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 }}>کد ملی</label>
                  <input type="text" placeholder="کد ملی ۱۰ رقمی" value={form.national_id} style={{ direction: 'ltr', textAlign: 'right' }}
                    onChange={e => setForm(f => ({ ...f, national_id: e.target.value }))} />
                </div>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', marginBottom: '1.25rem' }}>
                  <input type="checkbox" checked={form.agree} onChange={e => setForm(f => ({ ...f, agree: e.target.checked }))}
                    style={{ width: 'auto', marginTop: 2 }} />
                  <span style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.7 }}>
                    موافقم که اطلاعاتم برای هماهنگی خدمتگزاری استفاده شود
                  </span>
                </label>
                {msg && <div className={`msg msg-${msg.type}`} style={{ marginBottom: 12 }}>{msg.text}</div>}
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? 'در حال ثبت...' : 'ثبت‌نام می‌کنم'}
                </button>
              </form>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>در حال بارگذاری...</div>
          )}

          {/* Open Rounds */}
          {!loading && openRounds.length > 0 && (
            <section style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-muted)', marginBottom: '1rem', paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
                دوره‌های باز برای ثبت‌نام
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {openRounds.map(round => <RoundCard key={round.id} round={round} count={counts[round.id] || 0} onRegister={() => openForm(round)} />)}
              </div>
            </section>
          )}

          {/* Closed Rounds */}
          {!loading && closedRounds.length > 0 && (
            <section>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-muted)', marginBottom: '1rem', paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
                دوره‌های پایان‌یافته
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {closedRounds.map(round => <RoundCard key={round.id} round={round} count={counts[round.id] || 0} onRegister={null} />)}
              </div>
            </section>
          )}

          {!loading && rounds.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              در حال حاضر دوره‌ای برای ثبت‌نام وجود ندارد.
            </div>
          )}
        </main>

        <footer style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-hint)', fontSize: 12, borderTop: '1px solid var(--border)' }}>
          سامانه ثبت‌نام خدمتگزاری چایخانه حرم مطهر امام رضا (ع)
        </footer>
      </div>
    </>
  )
}

function RoundCard({ round, count, onRegister }) {
  const used = count
  const left = round.capacity - used
  const pct = Math.min(100, Math.round((used / round.capacity) * 100))
  const isOpen = round.is_open && left > 0

  return (
    <div className="card" style={{ opacity: isOpen ? 1 : 0.75 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: 17, fontWeight: 600, marginBottom: 4 }}>{round.title}</h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{round.dates}</p>
          {round.description && <p style={{ fontSize: 13, color: 'var(--text-hint)', marginTop: 4 }}>{round.description}</p>}
        </div>
        <span className={`badge ${isOpen ? 'badge-open' : left <= 0 ? 'badge-full' : 'badge-closed'}`}>
          {isOpen ? 'باز' : left <= 0 ? 'تکمیل' : 'بسته'}
        </span>
      </div>

      {/* Progress */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
          <span>{used} نفر ثبت‌نام کرده</span>
          <span>از {round.capacity} نفر</span>
        </div>
        <div style={{ height: 6, background: '#E8E8E8', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: pct + '%', background: left === 0 ? 'var(--coral)' : 'var(--green)', borderRadius: 3, transition: 'width 0.4s' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-hint)', marginTop: 4 }}>
          <span>{pct}٪ پر شده</span>
          {isOpen && <span style={{ color: 'var(--green)' }}>{left} جای خالی</span>}
        </div>
      </div>

      {round.max_reg_per_person > 1 && (
        <p style={{ fontSize: 12, color: 'var(--text-hint)', marginBottom: 10 }}>
          هر فرد می‌تواند تا {round.max_reg_per_person} بار در دوره‌های مختلف ثبت‌نام کند
        </p>
      )}

      {onRegister && (
        <button onClick={onRegister} className="btn-primary">
          ثبت‌نام در این دوره
        </button>
      )}
    </div>
  )
}
