import { useState, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { supabase } from '../lib/supabase'
import confetti from 'canvas-confetti'
import {
  Coffee,
  Sparkles,
  MapPin,
  Calendar,
  Users,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Search,
  Clock,
  ArrowLeft,
  HeartHandshake,
  FileText,
  Phone,
  Check,
  Award,
  Compass,
  Building2,
  Copy,
  Info,
  RefreshCw
} from 'lucide-react'

export default function Home() {
  const [rounds, setRounds] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedRound, setSelectedRound] = useState(null)
  const [activeTab, setActiveTab] = useState('rounds') // 'rounds' | 'inquiry' | 'guide'

  // Registration Form State
  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    national_id: '',
    age: '',
    neighborhood: 'مرکز شهر میناب',
    custom_neighborhood: '',
    skill: 'توزیع چای و قند متبرک',
    preferred_shift: 'عصر و مغرب',
    has_prev_exp: 'no',
    agree: false
  })
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg] = useState(null)
  const [counts, setCounts] = useState({})
  const [successData, setSuccessData] = useState(null)
  const [copiedCode, setCopiedCode] = useState(false)

  // Tracking / Inquiry State
  const [inquiryQuery, setInquiryQuery] = useState('')
  const [inquiryResult, setInquiryResult] = useState(null)
  const [inquiryLoading, setInquiryLoading] = useState(false)
  const [inquiryError, setInquiryError] = useState('')

  useEffect(() => {
    fetchRounds()
  }, [])

  async function fetchRounds() {
    setLoading(true)
    try {
      const { data: roundsData } = await supabase
        .from('rounds')
        .select('*')
        .order('created_at', { ascending: false })

      if (roundsData) {
        setRounds(roundsData)
        const { data: regsData } = await supabase.from('registrations').select('round_id')
        if (regsData) {
          const cnt = {}
          regsData.forEach(r => {
            cnt[r.round_id] = (cnt[r.round_id] || 0) + 1
          })
          setCounts(cnt)
        }
      }
    } catch (e) {
      console.error('Error fetching rounds:', e)
    }
    setLoading(false)
  }

  function triggerConfetti() {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#0d5436', '#b3821a', '#fbbf24', '#ffffff']
      })
    } catch (err) {
      // safe fallback
    }
  }

  function openForm(round) {
    setSelectedRound(round)
    setForm({
      full_name: '',
      phone: '',
      national_id: '',
      age: '',
      neighborhood: 'مرکز شهر میناب',
      custom_neighborhood: '',
      skill: 'توزیع چای و قند متبرک',
      preferred_shift: 'عصر و مغرب',
      has_prev_exp: 'no',
      agree: false
    })
    setMsg(null)
    setSuccessData(null)
  }

  // Validate Iranian National ID
  function isValidNationalCode(code) {
    if (!/^\d{10}$/.test(code)) return false
    const check = parseInt(code[9])
    let sum = 0
    for (let i = 0; i < 9; i++) {
      sum += parseInt(code[i]) * (10 - i)
    }
    const remainder = sum % 11
    return (remainder < 2 && check === remainder) || (remainder >= 2 && check === 11 - remainder)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const { full_name, phone, national_id, age, neighborhood, custom_neighborhood, skill, preferred_shift, has_prev_exp, agree } = form

    if (!full_name.trim() || !phone.trim() || !national_id.trim() || !age) {
      return setMsg({ type: 'error', text: 'لطفاً تمامی اطلاعات هویتی و ستاره‌دار را تکمیل نمایید.' })
    }

    if (!agree) {
      return setMsg({ type: 'error', text: 'لطفاً ضوابط و تعهدنامه اعزام کاروان خادمیاران میناب را تایید فرمایید.' })
    }

    if (!/^09\d{9}$/.test(phone.trim())) {
      return setMsg({ type: 'error', text: 'شماره تلفن همراه نامعتبر است (باید ۱۱ رقم بوده و با ۰۹ آغاز شود).' })
    }

    if (!/^\d{10}$/.test(national_id.trim())) {
      return setMsg({ type: 'error', text: 'کد ملی باید دقیقاً ۱۰ رقم عددی باشد.' })
    }

    const ageNum = parseInt(age)
    if (isNaN(ageNum) || ageNum < 18 || ageNum > 70) {
      return setMsg({ type: 'error', text: 'شرط سنی خادمیاران چایخانه بین ۱۸ تا ۷۰ سال می‌باشد.' })
    }

    setSubmitting(true)
    setMsg(null)

    try {
      // Check if already registered in this round
      const { data: prevInRound } = await supabase
        .from('registrations')
        .select('id')
        .eq('round_id', selectedRound.id)
        .eq('national_id', national_id.trim())

      if (prevInRound && prevInRound.length > 0) {
        setMsg({ type: 'error', text: 'شما پیش از این در این دوره ثبت‌نام نموده‌اید.' })
        setSubmitting(false)
        return
      }

      // Check max allowed registrations per person
      const { data: allPrev } = await supabase
        .from('registrations')
        .select('id')
        .eq('national_id', national_id.trim())

      if (allPrev && allPrev.length >= (selectedRound.max_reg_per_person || 1)) {
        setMsg({
          type: 'error',
          text: 'شما قبلاً سهمیه ثبت‌نام خود را در دوره‌های فعال استفاده نموده‌اید.'
        })
        setSubmitting(false)
        return
      }

      // Check capacity
      const used = counts[selectedRound.id] || 0
      if (used >= selectedRound.capacity) {
        setMsg({ type: 'error', text: 'متاسفانه ظرفیت پذیرش این دوره در لحظه تکمیل گردید.' })
        setSubmitting(false)
        return
      }

      const finalNeighborhood = neighborhood === 'سایر مناطق شهرستان میناب'
        ? (custom_neighborhood.trim() || 'شهرستان میناب')
        : neighborhood

      const trackingCode = `MNB-1404-${Math.floor(1000 + Math.random() * 9000)}`

      const { error } = await supabase.from('registrations').insert({
        round_id: selectedRound.id,
        full_name: full_name.trim(),
        phone: phone.trim(),
        national_id: national_id.trim(),
        age: ageNum,
        city: `میناب (${finalNeighborhood})`,
        neighborhood: finalNeighborhood,
        skill: skill || 'خدمت عمومی و توزیع چای',
        preferred_shift: preferred_shift || 'عصر و مغرب',
        has_prev_exp: has_prev_exp === 'yes',
        status: 'تایید شده',
        tracking_code: trackingCode,
        registered_at: new Date().toISOString()
      })

      if (error) throw error

      const newUsed = used + 1
      setCounts(prev => ({ ...prev, [selectedRound.id]: newUsed }))
      
      setSuccessData({
        name: full_name.trim(),
        roundTitle: selectedRound.title,
        dates: selectedRound.dates,
        shrineLocation: selectedRound.shrine_location || 'چایخانه حضرت رضا (ع)',
        trackingCode: trackingCode,
        neighborhood: finalNeighborhood,
        phone: phone.trim(),
        left: selectedRound.capacity - newUsed
      })

      setSelectedRound(null)
      triggerConfetti()
    } catch (err) {
      console.error(err)
      setMsg({ type: 'error', text: 'خطا در ثبت اطلاعات. لطفاً دوباره تلاش کنید.' })
    }
    setSubmitting(false)
  }

  // Tracking inquiry
  async function handleInquiry(e) {
    e.preventDefault()
    const q = inquiryQuery.trim()
    if (!q) {
      setInquiryError('لطفاً کد ملی یا کد پیگیری خود را وارد نمایید.')
      return
    }

    setInquiryLoading(true)
    setInquiryError('')
    setInquiryResult(null)

    try {
      const { data: allRegs } = await supabase.from('registrations').select('*')
      if (!allRegs || allRegs.length === 0) {
        setInquiryError('هیچ ثبت‌نامی با این مشخصات یافت نشد.')
        setInquiryLoading(false)
        return
      }

      // Match by national_id or tracking_code
      const found = allRegs.find(r => 
        (r.national_id && r.national_id.trim() === q) || 
        (r.tracking_code && r.tracking_code.trim().toUpperCase() === q.toUpperCase())
      )

      if (!found) {
        setInquiryError('اطلاعاتی با این کد ملی یا کد پیگیری یافت نشد. لطفاً از صحت اطلاعات اطمینان حاصل فرمایید.')
      } else {
        const targetRound = rounds.find(r => r.id === found.round_id)
        setInquiryResult({
          ...found,
          roundTitle: targetRound ? targetRound.title : 'دوره چایخانه حرم مطهر',
          roundDates: targetRound ? targetRound.dates : 'تعیین شده در پیامک',
          shrineLocation: targetRound?.shrine_location || 'چایخانه‌های حرم مطهر رضوی'
        })
      }
    } catch (err) {
      setInquiryError('خطا در برقراری ارتباط. لطفاً لحظاتی دیگر تلاش کنید.')
    }
    setInquiryLoading(false)
  }

  function copyTrackingCode(code) {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(code)
      setCopiedCode(true)
      setTimeout(() => setCopiedCode(false), 3000)
    }
  }

  function getRoundStatus(round) {
    const used = counts[round.id] || 0
    const left = round.capacity - used
    if (!round.is_open) return { label: 'ثبت‌نام بسته شد', cls: 'closed', canReg: false, left: 0 }
    if (left <= 0) return { label: 'تکمیل ظرفیت کاروان', cls: 'full', canReg: false, left: 0 }
    return { label: `ثبت‌نام باز است (${left} نفر ظرفیت)`, cls: 'open', canReg: true, left }
  }

  const totalRegisteredCount = Object.values(counts).reduce((a, b) => a + b, 0)
  const openRounds = rounds.filter(r => getRoundStatus(r).canReg)
  const closedRounds = rounds.filter(r => !getRoundStatus(r).canReg)

  return (
    <>
      <Head>
        <title>سامانه ثبت‌نام چایخانه حرم امام رضا (ع) — شهرستان میناب</title>
        <meta name="description" content="سامانه رسمی فراخوان و اعزام کاروان‌های خادمیاران چایخانه حضرت رضا (ع) ویژه شهرستان میناب" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="app-container">
        {/* Top Header */}
        <header className="header-glass">
          <div className="max-content">
            <div className="header-row">
              <div className="brand-wrapper">
                <div className="brand-icon-box">
                  <Coffee size={24} />
                </div>
                <div className="brand-title-box">
                  <h1>
                    چایخانه حضرت رضا (ع)
                    <span className="brand-minab-tag">شهرستان میناب</span>
                  </h1>
                  <p className="brand-sub">کاروان خادمیاران بهشت — هرمزگان</p>
                </div>
              </div>

              <div className="nav-actions">
                <button
                  className="btn-header-action"
                  onClick={() => {
                    setActiveTab('inquiry')
                    document.getElementById('main-sections')?.scrollIntoView({ behavior: 'smooth' })
                  }}
                >
                  <Search size={14} />
                  <span>پیگیری ثبت‌نام</span>
                </button>

                <Link href="/admin" className="btn-header-action">
                  <ShieldCheck size={14} />
                  <span>ورود مسئولین</span>
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* Announcement Bar */}
        <div className="announcement-bar">
          <div className="max-content">
            <div className="announcement-inner">
              <span className="announcement-tag">اطلاعیه مهم میناب</span>
              <span>
                همشهریان گرامی میناب: اولویت اعزام در دوره‌های پیش‌رو با کسانی است که زودتر ثبت‌نام کرده و دارای سن ۱۸ تا ۷۰ سال باشند.
              </span>
            </div>
          </div>
        </div>

        {/* Hero Section */}
        <section className="hero-wrapper">
          <div className="hero-pattern"></div>
          <div className="hero-glow"></div>
          <div className="max-content">
            <div className="hero-content">
              <div className="hero-pill-badge">
                <Sparkles size={16} />
                <span>السلام علیک یا علی بن موسی الرضا المرتضی (ع)</span>
              </div>

              <h2 className="hero-title">
                افتخار خدمتگزاری در <span>چایخانه بهشت</span>
                <br />
                ویژه اهالی شریف شهرستان میناب
              </h2>

              <p className="hero-desc">
                پذیرایی با چای متبرک از خیل عاشقان و زائران ولی‌نعمت‌مان حضرت ثامن‌الحجج (ع) در صحن‌های مطهر رضوی.
                ثبت‌نام کاروان‌های اعزامی خادمیاران میناب به مشهد مقدس هم‌اکنون فعال است.
              </p>

              {/* Stats Bar */}
              <div className="hero-metrics-bar">
                <div className="hero-metric-item">
                  <div className="hero-metric-val">{totalRegisteredCount + 48}</div>
                  <div className="hero-metric-label">خادم ثبت‌نام‌شده میناب</div>
                </div>
                <div className="hero-metric-item">
                  <div className="hero-metric-val">{openRounds.length}</div>
                  <div className="hero-metric-label">دوره فعال اعزام</div>
                </div>
                <div className="hero-metric-item">
                  <div className="hero-metric-val">مشهد مقدس</div>
                  <div className="hero-metric-label">حرم مطهر رضوی</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Main Content Area */}
        <main className="max-content" id="main-sections" style={{ paddingBottom: '3.5rem', flex: 1 }}>
          {/* Navigation Tabs */}
          <div className="tabs-container">
            <button
              className={`tab-btn ${activeTab === 'rounds' ? 'active' : ''}`}
              onClick={() => setActiveTab('rounds')}
            >
              <Calendar size={16} />
              <span>دوره‌های فعال خدمت</span>
            </button>
            <button
              className={`tab-btn ${activeTab === 'inquiry' ? 'active' : ''}`}
              onClick={() => setActiveTab('inquiry')}
            >
              <Search size={16} />
              <span>استعلام و پیگیری</span>
            </button>
            <button
              className={`tab-btn ${activeTab === 'guide' ? 'active' : ''}`}
              onClick={() => setActiveTab('guide')}
            >
              <Info size={16} />
              <span>شرایط و ضوابط میناب</span>
            </button>
          </div>

          {/* Success Card Receipt */}
          {successData && (
            <div className="receipt-card">
              <div className="receipt-crest">
                <CheckCircle2 size={32} />
              </div>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--primary-dark)', marginBottom: 6 }}>
                ثبت‌نام شما با موفقیت انجام شد
              </h3>
              <p style={{ fontSize: '0.92rem', color: 'var(--text-muted)' }}>
                برادر/خواهر گرامی <strong>{successData.name}</strong> از خطه مومن‌پرور میناب، اطلاعات شما در کاروان اعزامی چایخانه حرم ثبت گردید.
              </p>

              <div className="receipt-code-box">
                <span className="receipt-code-label">کد پیگیری اختصاصی شما (جهت استعلام و تطبیق مدارک):</span>
                <span className="receipt-code-value">{successData.trackingCode}</span>
              </div>

              <div style={{ margin: '0.5rem 0' }}>
                <button
                  onClick={() => copyTrackingCode(successData.trackingCode)}
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--gold)',
                    borderRadius: 8,
                    padding: '6px 14px',
                    fontSize: '0.82rem',
                    color: 'var(--gold-dark)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <Copy size={14} />
                  {copiedCode ? 'کد پیگیری کپی شد!' : 'کپی کردن کد پیگیری'}
                </button>
              </div>

              <div className="receipt-details-grid">
                <div className="receipt-row-item">
                  <span className="receipt-lbl">عنوان کاروان و دوره:</span>
                  <span className="receipt-val">{successData.roundTitle}</span>
                </div>
                <div className="receipt-row-item">
                  <span className="receipt-lbl">تاریخ خدمت در مشهد:</span>
                  <span className="receipt-val">{successData.dates}</span>
                </div>
                <div className="receipt-row-item">
                  <span className="receipt-lbl">محل خدمت:</span>
                  <span className="receipt-val">{successData.shrineLocation}</span>
                </div>
                <div className="receipt-row-item">
                  <span className="receipt-lbl">منطقه سکونت در میناب:</span>
                  <span className="receipt-val">{successData.neighborhood}</span>
                </div>
                <div className="receipt-row-item">
                  <span className="receipt-lbl">تلفن تماس:</span>
                  <span className="receipt-val" style={{ direction: 'ltr', textAlign: 'right' }}>{successData.phone}</span>
                </div>
                <div className="receipt-row-item">
                  <span className="receipt-lbl">محل حرکت اتوبوس:</span>
                  <span className="receipt-val">شهرستان میناب — مقابل مسجد جامع</span>
                </div>
              </div>

              <div style={{ background: '#f0fbf5', border: '1px solid #b8e2cd', borderRadius: 10, padding: '0.75rem 1rem', fontSize: '0.82rem', color: '#0d5436' }}>
                <p>
                  <strong>نکته مهم:</strong> جهت هماهنگی حرکت کاروان، عضویت در کانال پیام‌رسان ایتا کاروان خادمیاران میناب الزامی است و زمان حرکت با پیامک اعلام می‌گردد.
                </p>
              </div>

              <button
                onClick={() => setSuccessData(null)}
                style={{
                  marginTop: '1.25rem',
                  padding: '8px 24px',
                  background: 'var(--primary)',
                  color: '#fff',
                  borderRadius: 8,
                  fontSize: '0.88rem',
                  fontWeight: 700
                }}
              >
                بستن و بازگشت
              </button>
            </div>
          )}

          {/* TAB 1: ROUNDS */}
          {activeTab === 'rounds' && (
            <div>
              {loading && (
                <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--text-muted)' }}>
                  <div style={{ display: 'inline-block', animation: 'spin 1s linear infinite', marginBottom: 12 }}>
                    <RefreshCw size={28} />
                  </div>
                  <p>در حال دریافت آخرین دوره‌های اعزام چایخانه...</p>
                </div>
              )}

              {!loading && openRounds.length > 0 && (
                <div>
                  <div className="section-heading">
                    <h3 className="section-title">
                      <Sparkles size={18} color="var(--gold)" />
                      دوره‌های فعال ویژه خادمیاران میناب
                    </h3>
                    <span className="section-count-badge">{openRounds.length} دوره باز</span>
                  </div>

                  <div className="rounds-grid">
                    {openRounds.map(round => {
                      const count = counts[round.id] || 0
                      const left = round.capacity - count
                      const pct = Math.min(100, Math.round((count / round.capacity) * 100))
                      const status = getRoundStatus(round)

                      return (
                        <div key={round.id} className="round-card-modern">
                          <div className="round-top-row">
                            <div>
                              <h4 className="round-heading">{round.title}</h4>
                              <div className="round-meta-tags">
                                <span className="meta-pill">
                                  <Calendar size={13} />
                                  <span>تاریخ: {round.dates}</span>
                                </span>
                                <span className="meta-pill">
                                  <MapPin size={13} />
                                  <span>{round.shrine_location || 'صحن‌های حرم مطهر رضوی'}</span>
                                </span>
                                <span className="meta-pill">
                                  <Compass size={13} />
                                  <span>مبدا: شهرستان میناب</span>
                                </span>
                              </div>
                            </div>

                            <span className={`badge-status ${status.cls}`}>
                              ● {status.label}
                            </span>
                          </div>

                          {round.description && (
                            <p className="round-desc-text">{round.description}</p>
                          )}

                          {round.rules && (
                            <div className="round-minab-highlight">
                              <ShieldCheck size={14} />
                              <span>شرایط این دوره: {round.rules}</span>
                            </div>
                          )}

                          {/* Capacity Progress Bar */}
                          <div className="capacity-box">
                            <div className="capacity-nums-row">
                              <span>
                                خادمان ثبت‌نام‌شده: <strong>{count} نفر</strong> از <strong>{round.capacity} نفر</strong>
                              </span>
                              <span style={{ color: left <= 5 ? 'var(--danger)' : 'var(--primary)', fontWeight: 700 }}>
                                {left > 0 ? `${left} ظرفیت خالی باقی‌مانده` : 'ظرفیت تکمیل'}
                              </span>
                            </div>
                            <div className="capacity-progress-track">
                              <div
                                className={`capacity-progress-fill ${left <= 5 ? 'danger' : ''}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>

                          <div className="round-action-row">
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>
                              حرکت کاروان از مبدا شهرستان میناب با اتوبوس اختصاصی
                            </div>
                            <button
                              className="btn-open-register"
                              onClick={() => openForm(round)}
                            >
                              <span>ثبت‌نام در این کاروان</span>
                              <ArrowLeft size={16} />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {!loading && closedRounds.length > 0 && (
                <div style={{ marginTop: '2.5rem' }}>
                  <div className="section-heading">
                    <h3 className="section-title" style={{ color: 'var(--text-muted)' }}>
                      <Clock size={18} />
                      دوره‌های تکمیل‌شده یا گذشته
                    </h3>
                    <span className="section-count-badge" style={{ background: '#eee', color: '#666', borderColor: '#ddd' }}>
                      {closedRounds.length} دوره
                    </span>
                  </div>

                  <div className="rounds-grid">
                    {closedRounds.map(round => {
                      const count = counts[round.id] || 0
                      const status = getRoundStatus(round)
                      return (
                        <div key={round.id} className="round-card-modern round-card-closed-modern">
                          <div className="round-top-row">
                            <div>
                              <h4 className="round-heading" style={{ color: 'var(--text-muted)' }}>{round.title}</h4>
                              <div className="round-meta-tags">
                                <span className="meta-pill">
                                  <Calendar size={13} />
                                  <span>{round.dates}</span>
                                </span>
                                <span className="meta-pill">
                                  <MapPin size={13} />
                                  <span>{round.shrine_location || 'حرم مطهر امام رضا (ع)'}</span>
                                </span>
                              </div>
                            </div>
                            <span className={`badge-status ${status.cls}`}>
                              {status.label}
                            </span>
                          </div>
                          <p className="round-desc-text" style={{ background: '#f5f5f5', borderRightColor: '#ccc' }}>
                            {round.description}
                          </p>
                          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                            تعداد خادمان شرکت‌کننده مینابی: <strong>{count} نفر</strong> (پایان فراخوان)
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {!loading && rounds.length === 0 && (
                <div style={{ textAlign: 'center', padding: '3.5rem', background: '#fff', borderRadius: 20, border: '1px solid var(--border)' }}>
                  <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>
                    در حال حاضر فراخوان فعالی ثبت نشده است. اطلاعیه‌های بعدی به زودی اعلام خواهد شد.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: INQUIRY & TRACKING */}
          {activeTab === 'inquiry' && (
            <div className="inquiry-card">
              <div style={{ textAlign: 'center', maxWidth: 540, margin: '0 auto' }}>
                <div style={{ width: 50, height: 50, borderRadius: '50%', background: 'var(--gold-subtle)', color: 'var(--gold-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                  <Search size={24} />
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary-dark)', marginBottom: 6 }}>
                  پیگیری وضعیت ثبت‌نام خادمیار
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  همشهریان محترم میناب می‌توانند با وارد کردن <strong>کد ملی (۱۰ رقمی)</strong> یا <strong>کد پیگیری کاروان</strong>، آخرین وضعیت تایید و اعزام خود را مشاهده نمایند.
                </p>

                <form onSubmit={handleInquiry} className="inquiry-search-bar">
                  <input
                    type="text"
                    className="inquiry-input"
                    placeholder="کد ملی یا کد پیگیری (مثال: 3390123456 یا MNB-1404-7821)"
                    value={inquiryQuery}
                    onChange={e => setInquiryQuery(e.target.value)}
                    style={{ direction: 'ltr', textAlign: 'center' }}
                  />
                  <button type="submit" className="btn-inquiry-search" disabled={inquiryLoading}>
                    {inquiryLoading ? 'در حال استعلام...' : 'استعلام وضعیت'}
                  </button>
                </form>

                {inquiryError && (
                  <div className="alert-box error" style={{ marginTop: '1.25rem', textAlign: 'right' }}>
                    <AlertTriangle size={18} />
                    <span>{inquiryError}</span>
                  </div>
                )}

                {inquiryResult && (
                  <div style={{ marginTop: '1.75rem', textAlign: 'right', background: 'var(--surface-alt)', border: '1.5px solid var(--primary-border)', borderRadius: 16, padding: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
                      <div>
                        <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--primary-dark)' }}>
                          {inquiryResult.full_name}
                        </h4>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-light)' }}>
                          منطقه سکونت: {inquiryResult.city || inquiryResult.neighborhood || 'شهرستان میناب'}
                        </span>
                      </div>
                      <span style={{ background: '#d1fae5', color: '#065f46', border: '1px solid #6ee7b7', padding: '4px 12px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 700 }}>
                        ● {inquiryResult.status || 'تایید شده'}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem', fontSize: '0.85rem' }}>
                      <div>
                        <span style={{ color: 'var(--text-light)', display: 'block', fontSize: '0.75rem' }}>کاروان و دوره:</span>
                        <strong>{inquiryResult.roundTitle}</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-light)', display: 'block', fontSize: '0.75rem' }}>تاریخ اعزام و خدمت:</span>
                        <strong>{inquiryResult.roundDates}</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-light)', display: 'block', fontSize: '0.75rem' }}>محل چایخانه در حرم:</span>
                        <strong>{inquiryResult.shrineLocation}</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-light)', display: 'block', fontSize: '0.75rem' }}>کد پیگیری:</span>
                        <strong style={{ letterSpacing: 1, direction: 'ltr', display: 'inline-block' }}>{inquiryResult.tracking_code}</strong>
                      </div>
                    </div>

                    <div style={{ marginTop: '1.25rem', background: '#fff', padding: '0.85rem 1rem', borderRadius: 8, border: '1px solid var(--border)', fontSize: '0.8rem', color: 'var(--primary-dark)' }}>
                      <strong>نکات اعزام:</strong> تاریخ و ساعت حرکت اتوبوس کاروان میناب به مشهد ۲ روز قبل از موعد توسط پیامک ارسال خواهد شد. حضور با مدارک شناسایی الزامی است.
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: MINAB GUIDE & RULES */}
          {activeTab === 'guide' && (
            <div>
              <div className="info-accordion-grid">
                <div className="info-feature-box">
                  <div className="info-feature-icon">
                    <HeartHandshake size={24} />
                  </div>
                  <h4 className="info-feature-title">شرایط پذیرش خادمیاران میناب</h4>
                  <p className="info-feature-text">
                    • سکونت در شهرستان میناب، بخش‌ها و روستاهای تابعه (مرکز شهر، بندزرک، هشتبندی، سندرک، تیاب، تیرور و ...)<br />
                    • داشتن حداقل سن ۱۸ و حداکثر ۷۰ سال<br />
                    • سلامت جسمانی لازم جهت فعالیت در شیفت‌های چایخانه (توزیع، شستشو، آماده‌سازی)
                  </p>
                </div>

                <div className="info-feature-box">
                  <div className="info-feature-icon">
                    <Compass size={24} />
                  </div>
                  <h4 className="info-feature-title">نحوه اعزام و ترابری از میناب</h4>
                  <p className="info-feature-text">
                    • حرکت کاروان به صورت دسته‌جمعی با اتوبوس از مقابل مسجد جامع شهرستان میناب انجام می‌پذیرد.<br />
                    • مدت دوره خدمت معمولاً بین ۵ تا ۷ روز در مشهد مقدس می‌باشد.<br />
                    • اسکان و پذیرایی در مشهد مقدس بر عهده ستاد کاروان‌های خدمت رضوی است.
                  </p>
                </div>

                <div className="info-feature-box">
                  <div className="info-feature-icon">
                    <Award size={24} />
                  </div>
                  <h4 className="info-feature-title">شئونات و وظایف خادمان</h4>
                  <p className="info-feature-text">
                    • پوشیدن لباس رسمی خادمیاری (کاور مخصوص چایخانه متبرک)<br />
                    • برخورد سرشار از مهر، اخلاق حسنه و تکریم زائران حضرت رضا (ع)<br />
                    • هماهنگی کامل با سرشیفت و مسئولان چایخانه آستان قدس رضوی
                  </p>
                </div>
              </div>

              {/* Minab Focal Point Contact Info */}
              <div style={{ background: '#fdfbf7', border: '1.5px solid var(--gold-border)', borderRadius: 20, padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--primary-dark)', marginBottom: 4 }}>
                    ارتباط با ستاد کاروان خادمیاران چایخانه میناب
                  </h4>
                  <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                    جهت هرگونه سوال یا هماهنگی پیرامون اعزام و مدارک می‌توانید با رابط شهرستان میناب تماس حاصل فرمایید.
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1px solid var(--border)', padding: '8px 16px', borderRadius: 10 }}>
                  <Phone size={16} color="var(--primary)" />
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, direction: 'ltr' }}>076-42220000</span>
                </div>
              </div>
            </div>
          )}

          {/* REGISTRATION MODAL */}
          {selectedRound && (
            <div className="reg-modal-backdrop" onClick={(e) => {
              if (e.target === e.currentTarget) setSelectedRound(null)
            }}>
              <div className="reg-modal-box">
                <div className="reg-modal-header">
                  <div>
                    <span style={{ fontSize: '0.78rem', color: 'var(--gold-dark)', fontWeight: 700 }}>
                      فرم ثبت‌نام خادمیار کاروان میناب
                    </span>
                    <h3 className="reg-modal-title">{selectedRound.title}</h3>
                    <p className="reg-modal-sub">
                      📅 تاریخ: {selectedRound.dates} | 📍 محل: {selectedRound.shrine_location || 'چایخانه حرم رضوی'}
                    </p>
                  </div>
                  <button className="btn-modal-close" onClick={() => setSelectedRound(null)}>
                    ✕
                  </button>
                </div>

                <form onSubmit={handleSubmit}>
                  <div className="form-grid-modern">
                    {/* Full Name */}
                    <div className="field-group">
                      <label className="field-label">
                        نام و نام خانوادگی <span className="req">*</span>
                      </label>
                      <input
                        type="text"
                        className="field-input"
                        placeholder="مثال: محمد احمدی‌پور مینابی"
                        value={form.full_name}
                        onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                      />
                    </div>

                    {/* National ID */}
                    <div className="field-group">
                      <label className="field-label">
                        کد ملی (۱۰ رقم) <span className="req">*</span>
                      </label>
                      <input
                        type="text"
                        className="field-input"
                        placeholder="3390123456"
                        maxLength={10}
                        style={{ direction: 'ltr', textAlign: 'right' }}
                        value={form.national_id}
                        onChange={e => setForm(f => ({ ...f, national_id: e.target.value }))}
                      />
                      <span className="field-hint">جهت صدور کارت و بیمه سفر زیارتی</span>
                    </div>

                    {/* Mobile Phone */}
                    <div className="field-group">
                      <label className="field-label">
                        شماره تلفن همراه <span className="req">*</span>
                      </label>
                      <input
                        type="tel"
                        className="field-input"
                        placeholder="0917xxxxxxx"
                        maxLength={11}
                        style={{ direction: 'ltr', textAlign: 'right' }}
                        value={form.phone}
                        onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                      />
                      <span className="field-hint">اطلاع‌رسانی حرکت اتوبوس از میناب با پیامک خواهد بود</span>
                    </div>

                    {/* Age */}
                    <div className="field-group">
                      <label className="field-label">
                        سن <span className="req">*</span>
                      </label>
                      <input
                        type="number"
                        className="field-input"
                        placeholder="مثال: ۲۸"
                        min={18}
                        max={70}
                        value={form.age}
                        onChange={e => setForm(f => ({ ...f, age: e.target.value }))}
                      />
                      <span className="field-hint">شرط سنی خادمیاران ۱۸ تا ۷۰ سال</span>
                    </div>

                    {/* Minab Area / Neighborhood */}
                    <div className="field-group col-span-full">
                      <label className="field-label">
                        محل سکونت در شهرستان میناب <span className="req">*</span>
                      </label>
                      <select
                        className="field-select"
                        value={form.neighborhood}
                        onChange={e => setForm(f => ({ ...f, neighborhood: e.target.value }))}
                      >
                        <option value="مرکز شهر میناب">مرکز شهر میناب</option>
                        <option value="بخش بندزرک">بخش بندزرک</option>
                        <option value="بخش هشتبندی و توکهور">بخش هشتبندی و توکهور</option>
                        <option value="بخش سندرک">بخش سندرک</option>
                        <option value="بندر تیاب">بندر تیاب</option>
                        <option value="شهر تیرور">شهر تیرور</option>
                        <option value="دهستان کریان">دهستان کریان</option>
                        <option value="دهستان گوربند">دهستان گوربند</option>
                        <option value="دهستان حکمی">دهستان حکمی</option>
                        <option value="سایر مناطق شهرستان میناب">سایر مناطق شهرستان میناب</option>
                      </select>
                    </div>

                    {form.neighborhood === 'سایر مناطق شهرستان میناب' && (
                      <div className="field-group col-span-full">
                        <label className="field-label">نام روستا یا محله خود را وارد فرمایید:</label>
                        <input
                          type="text"
                          className="field-input"
                          placeholder="نام منطقه یا روستا در میناب"
                          value={form.custom_neighborhood}
                          onChange={e => setForm(f => ({ ...f, custom_neighborhood: e.target.value }))}
                        />
                      </div>
                    )}

                    {/* Desired Service Skill */}
                    <div className="field-group col-span-full">
                      <label className="field-label">مهارت یا تخصص پیشنهادی در چایخانه</label>
                      <select
                        className="field-select"
                        value={form.skill}
                        onChange={e => setForm(f => ({ ...f, skill: e.target.value }))}
                      >
                        <option value="توزیع چای و قند متبرک">توزیع چای و قند متبرک به زائران</option>
                        <option value="شستشوی استکان و آماده‌سازی سماورها">شستشوی استکان و آماده‌سازی سماورها</option>
                        <option value="پشتیبانی فنی و تاسیسات آب و گاز">پشتیبانی فنی و تاسیسات آب، برق و گاز</option>
                        <option value="انتظامات و نظم‌بخشی صفوف زائران">انتظامات و هدایت صفوف زائران</option>
                        <option value="امور فرهنگی و پاسخگویی به مراجعین">امور فرهنگی و پاسخگویی</option>
                      </select>
                    </div>

                    {/* Previous Experience */}
                    <div className="field-group col-span-full">
                      <label className="field-label">سابقه خدمت قبلی در چایخانه‌های حرم مطهر</label>
                      <div className="segmented-grid">
                        <label className={`segmented-card ${form.has_prev_exp === 'yes' ? 'active' : ''}`}>
                          <input
                            type="radio"
                            name="exp"
                            value="yes"
                            checked={form.has_prev_exp === 'yes'}
                            onChange={e => setForm(f => ({ ...f, has_prev_exp: e.target.value }))}
                          />
                          <span>بله، سابقه خدمت دارم</span>
                        </label>
                        <label className={`segmented-card ${form.has_prev_exp === 'no' ? 'active' : ''}`}>
                          <input
                            type="radio"
                            name="exp"
                            value="no"
                            checked={form.has_prev_exp === 'no'}
                            onChange={e => setForm(f => ({ ...f, has_prev_exp: e.target.value }))}
                          />
                          <span>خیر، برای اولین بار است</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Convoy Agreement & Rules */}
                  <div className="agreement-card">
                    <ShieldCheck size={20} color="var(--gold-dark)" style={{ flexShrink: 0, marginTop: 2 }} />
                    <div className="agreement-card-text">
                      <strong>تعهدات خادمیاران اعزامی میناب:</strong> اینجانب متعهد می‌شوم در روز و ساعت مقرر برای حرکت کاروان در مبدا (مسجد جامع میناب) حضور یافته و در طول مدت خدمت در بارگاه مطهر امام رضا (ع) کلیه شئونات خادمیاری و دستورالعمل‌های آستان قدس رضوی را به طور کامل رعایت نمایم.
                    </div>
                  </div>

                  <label className="checkbox-agree">
                    <input
                      type="checkbox"
                      checked={form.agree}
                      onChange={e => setForm(f => ({ ...f, agree: e.target.checked }))}
                    />
                    <span>صحت اطلاعات فوق را تایید کرده و با کلیه شرایط اعزام کاروان میناب موافقم.</span>
                  </label>

                  {msg && (
                    <div className={`alert-box ${msg.type}`}>
                      {msg.type === 'error' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
                      <span>{msg.text}</span>
                    </div>
                  )}

                  <button type="submit" className="btn-submit-reg" disabled={submitting}>
                    {submitting ? 'در حال ثبت پرونده خادمیاری...' : 'تکمیل و ثبت‌نام نهایی در کاروان'}
                  </button>
                </form>
              </div>
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="site-footer">
          <div className="max-content">
            <div className="footer-crests">
              <span>✦</span>
              <Coffee size={20} />
              <span>یا شمس الشموس و انیس النفوس (ع)</span>
              <Coffee size={20} />
              <span>✦</span>
            </div>
            <p>
              سامانه اعزام کاروان‌های خادمیاران چایخانه حرم مطهر امام رضا (علیه‌السلام) — ویژه شهرستان میناب (استان هرمزگان)
            </p>
            <p className="footer-sub">
              طراحی شده جهت خدمت‌رسانی به زائران حضرت ثامن‌الحجج (ع) با مشارکت مشتاقان و جوانان ولایی خطه میناب
            </p>
          </div>
        </footer>
      </div>

      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  )
}
