import { useState, useEffect } from 'react'
import Head from 'next/head'
import { supabase } from '../lib/supabase'

export default function Home() {
  const [rounds, setRounds] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedRound, setSelectedRound] = useState(null)
  const [form, setForm] = useState({ full_name: '', phone: '', national_id: '', age: '', city: '', has_prev_exp: '', agree: false })
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg] = useState(null)
  const [counts, setCounts] = useState({})
  const [successData, setSuccessData] = useState(null)

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
    setForm({ full_name: '', phone: '', national_id: '', age: '', city: '', has_prev_exp: '', agree: false })
    setMsg(null)
    setSuccessData(null)
    setTimeout(() => document.getElementById('reg-form')?.scrollIntoView({ behavior: 'smooth' }), 100)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const { full_name, phone, national_id, age, city, has_prev_exp, agree } = form
    if (!full_name.trim() || !phone.trim() || !national_id.trim() || !age || !city.trim() || !has_prev_exp)
      return setMsg({ type: 'error', text: 'لطفاً همه فیلدها را پر کنید' })
    if (!agree)
      return setMsg({ type: 'error', text: 'لطفاً موافقت خود را اعلام کنید' })
    if (!/^09\d{9}$/.test(phone))
      return setMsg({ type: 'error', text: 'شماره تلفن معتبر نیست — باید با ۰۹ شروع شود' })
    if (!/^\d{10}$/.test(national_id))
      return setMsg({ type: 'error', text: 'کد ملی باید دقیقاً ۱۰ رقم باشد' })
    if (parseInt(age) < 15 || parseInt(age) > 80)
      return setMsg({ type: 'error', text: 'سن باید بین ۱۵ تا ۸۰ سال باشد' })

    setSubmitting(true)
    setMsg(null)

    try {
      const { data: prevInRound } = await supabase.from('registrations').select('id').eq('round_id', selectedRound.id).eq('national_id', national_id)
      if (prevInRound && prevInRound.length > 0) {
        setMsg({ type: 'error', text: 'شما قبلاً در این دوره ثبت‌نام کرده‌اید' })
        setSubmitting(false); return
      }
      const { data: allPrev } = await supabase.from('registrations').select('id').eq('national_id', national_id)
      if (allPrev && allPrev.length >= selectedRound.max_reg_per_person) {
        const txt = selectedRound.max_reg_per_person === 1
          ? 'شما قبلاً ثبت‌نام کرده‌اید و امکان ثبت‌نام مجدد وجود ندارد'
          : `شما ${allPrev.length} بار ثبت‌نام کرده‌اید (حداکثر ${selectedRound.max_reg_per_person} بار)`
        setMsg({ type: 'error', text: txt })
        setSubmitting(false); return
      }
      const used = counts[selectedRound.id] || 0
      if (used >= selectedRound.capacity) {
        setMsg({ type: 'warn', text: 'متأسفانه ظرفیت این دوره تکمیل شده است' })
        setSubmitting(false); return
      }
      const { error } = await supabase.from('registrations').insert({
        round_id: selectedRound.id,
        full_name: full_name.trim(),
        phone: phone.trim(),
        national_id: national_id.trim(),
        age: parseInt(age),
        city: city.trim(),
        has_prev_exp: has_prev_exp === 'yes'
      })
      if (error) throw error
      const newUsed = used + 1
      setCounts(prev => ({ ...prev, [selectedRound.id]: newUsed }))
      setSuccessData({ name: full_name.trim(), round: selectedRound.title, left: selectedRound.capacity - newUsed })
      setSelectedRound(null)
      setForm({ full_name: '', phone: '', national_id: '', age: '', city: '', has_prev_exp: '', agree: false })
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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;500;700&display=swap" rel="stylesheet" />
      </Head>

      <div className="page-wrap">
        {/* Header */}
        <header className="site-header">
          <div className="header-inner">
            <div className="header-logo">
              <div className="logo-icon">☕</div>
              <div>
                <div className="logo-title">چایخانه حرم مطهر امام رضا (ع)</div>
                <div className="logo-sub">سامانه ثبت‌نام خدمتگزاری</div>
              </div>
            </div>
            <a href="/admin" className="admin-link">ورود مدیر</a>
          </div>
        </header>

        {/* Hero */}
        <section className="hero">
          <div className="hero-ornament top-ornament">❋ ✦ ❋ ✦ ❋</div>
          <div className="hero-content">
            <div className="hero-badge">یا ثامن الحجج (ع)</div>
            <h1 className="hero-title">افتخار خدمتگزاری به زائران</h1>
            <p className="hero-desc">با ثبت‌نام در دوره‌های خدمتگزاری چایخانه، در پذیرایی از زائران حرم مطهر سهیم شوید</p>
          </div>
          <div className="hero-ornament bottom-ornament">❋ ✦ ❋ ✦ ❋</div>
        </section>

        <main className="main-content">
          {/* Success */}
          {successData && (
            <div className="success-card">
              <div className="success-icon">✓</div>
              <h3>ثبت‌نام با موفقیت انجام شد</h3>
              <p>{successData.name} عزیز، ثبت‌نام شما در «{successData.round}» تأیید شد.</p>
              {successData.left > 0 && <span className="success-left">{successData.left} جای خالی باقی است</span>}
              {successData.left === 0 && <span className="success-full">ظرفیت تکمیل شد</span>}
            </div>
          )}

          {/* Registration Form */}
          {selectedRound && (
            <div className="form-card" id="reg-form">
              <div className="form-header">
                <div>
                  <div className="form-round-label">ثبت‌نام در دوره</div>
                  <h2 className="form-round-title">{selectedRound.title}</h2>
                  <div className="form-round-dates">{selectedRound.dates}</div>
                </div>
                <button className="form-close" onClick={() => setSelectedRound(null)}>✕</button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="form-grid">
                  <div className="field">
                    <label>نام و نام خانوادگی <span className="req">*</span></label>
                    <input type="text" placeholder="مثال: علی احمدی" value={form.full_name}
                      onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
                  </div>
                  <div className="field">
                    <label>کد ملی <span className="req">*</span></label>
                    <input type="text" placeholder="۱۰ رقم" value={form.national_id} style={{direction:'ltr',textAlign:'right'}}
                      onChange={e => setForm(f => ({ ...f, national_id: e.target.value }))} maxLength={10} />
                  </div>
                  <div className="field">
                    <label>شماره تلفن همراه <span className="req">*</span></label>
                    <input type="tel" placeholder="09xxxxxxxxx" value={form.phone} style={{direction:'ltr',textAlign:'right'}}
                      onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} maxLength={11} />
                  </div>
                  <div className="field">
                    <label>سن <span className="req">*</span></label>
                    <input type="number" placeholder="مثال: ۲۵" value={form.age} min={15} max={80}
                      onChange={e => setForm(f => ({ ...f, age: e.target.value }))} />
                  </div>
                  <div className="field field-full">
                    <label>شهر محل سکونت <span className="req">*</span></label>
                    <input type="text" placeholder="مثال: مشهد" value={form.city}
                      onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
                  </div>
                  <div className="field field-full">
                    <label>سابقه خدمتگزاری قبلی <span className="req">*</span></label>
                    <div className="radio-group">
                      <label className={`radio-opt ${form.has_prev_exp === 'yes' ? 'selected' : ''}`}>
                        <input type="radio" name="prev_exp" value="yes" checked={form.has_prev_exp === 'yes'}
                          onChange={e => setForm(f => ({ ...f, has_prev_exp: e.target.value }))} />
                        بله، سابقه دارم
                      </label>
                      <label className={`radio-opt ${form.has_prev_exp === 'no' ? 'selected' : ''}`}>
                        <input type="radio" name="prev_exp" value="no" checked={form.has_prev_exp === 'no'}
                          onChange={e => setForm(f => ({ ...f, has_prev_exp: e.target.value }))} />
                        خیر، اولین بار است
                      </label>
                    </div>
                  </div>
                </div>

                <div className="disclaimer">
                  <div className="disclaimer-icon">⚠</div>
                  <p>چنانچه اطلاعات وارد شده با مدارک شناسایی مطابقت نداشته باشد، از پذیرش معذوریم.</p>
                </div>

                <label className="agree-row">
                  <input type="checkbox" checked={form.agree} onChange={e => setForm(f => ({ ...f, agree: e.target.checked }))} />
                  <span>اطلاعات فوق را صحیح وارد کرده‌ام و با قوانین موافقم</span>
                </label>

                {msg && <div className={`form-msg ${msg.type}`}>{msg.text}</div>}

                <button type="submit" className="btn-submit" disabled={submitting}>
                  {submitting ? 'در حال ثبت...' : 'ثبت‌نام می‌کنم'}
                </button>
              </form>
            </div>
          )}

          {loading && <div className="loading">در حال بارگذاری...</div>}

          {!loading && openRounds.length > 0 && (
            <section>
              <div className="section-label">دوره‌های باز برای ثبت‌نام</div>
              <div className="rounds-list">
                {openRounds.map(r => <RoundCard key={r.id} round={r} count={counts[r.id]||0} onRegister={() => openForm(r)} />)}
              </div>
            </section>
          )}

          {!loading && closedRounds.length > 0 && (
            <section style={{marginTop:'2rem'}}>
              <div className="section-label closed-label">دوره‌های پایان‌یافته</div>
              <div className="rounds-list">
                {closedRounds.map(r => <RoundCard key={r.id} round={r} count={counts[r.id]||0} onRegister={null} />)}
              </div>
            </section>
          )}

          {!loading && rounds.length === 0 && (
            <div className="empty">در حال حاضر دوره‌ای برای ثبت‌نام وجود ندارد</div>
          )}
        </main>

        <footer className="site-footer">
          <div className="footer-ornament">❋ ✦ ❋</div>
          <p>سامانه ثبت‌نام خدمتگزاری چایخانه حرم مطهر امام رضا (ع)</p>
        </footer>
      </div>
    </>
  )
}

function RoundCard({ round, count, onRegister }) {
  const left = round.capacity - count
  const pct = Math.min(100, Math.round((count / round.capacity) * 100))
  const isOpen = round.is_open && left > 0
  return (
    <div className={`round-card ${isOpen ? '' : 'round-card-closed'}`}>
      <div className="round-card-top">
        <div className="round-info">
          <h3 className="round-title">{round.title}</h3>
          <div className="round-dates">📅 {round.dates}</div>
          {round.description && <div className="round-desc">{round.description}</div>}
        </div>
        <span className={`badge ${isOpen ? 'badge-open' : left <= 0 ? 'badge-full' : 'badge-closed'}`}>
          {isOpen ? '● ثبت‌نام باز' : left <= 0 ? 'ظرفیت تکمیل' : 'بسته'}
        </span>
      </div>
      <div className="round-stats">
        <div className="stat-item">
          <span className="stat-num">{count}</span>
          <span className="stat-lbl">ثبت‌نام شده</span>
        </div>
        <div className="stat-divider" />
        <div className="stat-item">
          <span className="stat-num">{round.capacity}</span>
          <span className="stat-lbl">ظرفیت کل</span>
        </div>
        <div className="stat-divider" />
        <div className="stat-item">
          <span className={`stat-num ${left > 0 ? 'green' : 'red'}`}>{Math.max(0, left)}</span>
          <span className="stat-lbl">باقی‌مانده</span>
        </div>
      </div>
      <div className="progress-wrap">
        <div className="progress-bar">
          <div className="progress-fill" style={{width: pct+'%', background: left<=0 ? '#c0392b' : 'linear-gradient(90deg,#1a7a4a,#2ecc71)'}} />
        </div>
        <span className="progress-pct">{pct}٪</span>
      </div>
      {onRegister && (
        <button className="btn-reg" onClick={onRegister}>ثبت‌نام در این دوره ←</button>
      )}
    </div>
  )
}
