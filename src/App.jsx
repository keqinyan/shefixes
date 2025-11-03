import React, { useState } from 'react';
import { Menu, X, Wrench, Shield, Heart, AlertCircle, CheckCircle, Star, Globe } from 'lucide-react';

const SheFixes = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [region, setRegion] = useState('us');
  const [currentPage, setCurrentPage] = useState('home');
  const [userPreference, setUserPreference] = useState('women-only');

  const content = {
    us: {
      currency: '$',
      nav: { home: 'Home', findTech: 'Find Technicians', joinUs: 'Join Us', transparency: 'Transparency' },
      hero: { title: 'Fix it. Own it.', subtitle: 'A safe repair community for women, by women', ctaBook: 'Find a Technician', ctaJoin: 'Become a Technician' },
      community: { 
        badge: 'Women-Centered Community', 
        title: 'A Safe Space', 
        safety: 'Mutual Safety', 
        safetyDesc: 'Either party can end service immediately if uncomfortable. Platform covers all costs.',
        preference: 'Preference Matching',
        preferenceDesc: 'Set preferences for who you work with.'
      },
      tech: {
        title: 'Find Your Technician',
        filterTitle: 'Your Preference',
        filterDesc: 'We only show technicians matching your preferences',
        prefs: [
          { value: 'women-only', label: 'Women only', desc: 'Show only women' },
          { value: 'women-nb', label: 'Women & Non-binary', desc: 'Women and non-binary' },
          { value: 'all-inclusive', label: 'All Inclusive', desc: 'All who support our mission' }
        ],
        techPref: 'Works with:',
        rate: '/hour',
        book: 'Book Now'
      },
      join: {
        title: 'Become a Technician',
        subtitle: 'Turn skills into income',
        benefits: ['Set Your Rates', 'Flexible Schedule', 'Platform Protection', 'Build Reputation'],
        prefTitle: 'Client Preference',
        prefDesc: 'Choose which clients you work with:',
        prefOpts: ['Women only', 'Women & non-binary', 'All who respect values'],
        apply: 'Apply Now'
      },
      transparency: {
        title: 'Financial Transparency',
        subtitle: 'Where every dollar goes',
        total: 'Total Revenue',
        breakdown: 'Breakdown',
        cats: { tech: 'Technicians', safety: 'Safety', platform: 'Platform', marketing: 'Marketing', reserve: 'Reserve' },
        note: '(Sample data - real numbers after launch)'
      },
      footer: { slogan: 'Fix it. Own it.', email: 'hello@shefixes.com' }
    },
    cn: {
      currency: '¥',
      nav: { home: '首页', findTech: '找技师', joinUs: '成为技师', transparency: '收支透明' },
      hero: { title: '她修她世界', subtitle: '为女性打造的安全维修社区', ctaBook: '找技师', ctaJoin: '成为技师' },
      community: { 
        badge: '女性友好社区', 
        title: '安心空间', 
        safety: '双向安全', 
        safetyDesc: '任何一方感到不适可立即终止。平台承担费用。',
        preference: '偏好匹配',
        preferenceDesc: '设置服务对象偏好'
      },
      tech: {
        title: '找到你的技师',
        filterTitle: '你的偏好',
        filterDesc: '只展示符合你偏好的技师',
        prefs: [
          { value: 'women-only', label: '仅女性', desc: '只显示女性' },
          { value: 'women-nb', label: '女性与非二元', desc: '女性和非二元' },
          { value: 'all-inclusive', label: '全包容', desc: '所有支持使命的人' }
        ],
        techPref: '服务对象：',
        rate: '/小时',
        book: '预约'
      },
      join: {
        title: '成为技师',
        subtitle: '用技能创造收入',
        benefits: ['自主定价', '灵活时间', '平台保护', '建立口碑'],
        prefTitle: '客户偏好',
        prefDesc: '选择你愿意服务的客户：',
        prefOpts: ['仅女性', '女性与非二元', '所有尊重价值观的人'],
        apply: '立即申请'
      },
      transparency: {
        title: '财务透明',
        subtitle: '每笔资金去向',
        total: '总收入',
        breakdown: '明细',
        cats: { tech: '技师', safety: '安全', platform: '平台', marketing: '营销', reserve: '储备' },
        note: '（示例数据 - 正式后实时更新）'
      },
      footer: { slogan: '她修她世界', email: 'hello@shefixes.com' }
    }
  };

  const c = content[region];

  const techs = [
    {
      id: 1, name: region === 'us' ? 'Maya Chen' : '陈晓雨', avatar: '👩‍🔧', rating: 4.9, jobs: 127,
      rate: region === 'us' ? 45 : 150, specs: region === 'us' ? ['Network', 'Computer'] : ['网络', '电脑'],
      tools: region === 'us' ? ['Cable tester', 'Laptop kit'] : ['网络测试仪', '笔记本套装'],
      bio: region === 'us' ? 'Former engineer!' : '前工程师！', pref: 'women-only', gender: 'woman'
    },
    {
      id: 2, name: region === 'us' ? 'Jamie Liu' : '刘芳', avatar: '👩‍💼', rating: 4.8, jobs: 93,
      rate: region === 'us' ? 40 : 135, specs: region === 'us' ? ['Furniture', 'Lighting'] : ['家具', '灯具'],
      tools: region === 'us' ? ['Power drill', 'Toolkit'] : ['电钻', '工具'],
      bio: region === 'us' ? 'DIY enthusiast!' : 'DIY爱好者！', pref: 'women-nb', gender: 'woman'
    },
    {
      id: 3, name: region === 'us' ? 'Alex Zhang' : '张可欣', avatar: '👩‍🎨', rating: 5.0, jobs: 68,
      rate: region === 'us' ? 50 : 165, specs: region === 'us' ? ['3D Print', 'Sewing'] : ['3D打印', '缝纫'],
      tools: region === 'us' ? ['3D toolkit', 'Calibration'] : ['3D工具', '校准'],
      bio: region === 'us' ? 'Maker regular!' : '创客常客！', pref: 'all-inclusive', gender: 'non-binary'
    },
    {
      id: 4, name: region === 'us' ? 'Sam Rivera' : '李心怡', avatar: '🧑‍🔧', rating: 4.9, jobs: 84,
      rate: region === 'us' ? 42 : 140, specs: region === 'us' ? ['Electronics', 'Audio'] : ['电子', '音响'],
      tools: region === 'us' ? ['Soldering', 'Multimeter'] : ['焊接', '万用表'],
      bio: region === 'us' ? 'Electronics pro!' : '电子专家！', pref: 'all-inclusive', gender: 'non-binary'
    }
  ];

  const financials = {
    total: region === 'us' ? 4850 : 16200,
    items: [
      { cat: 'tech', amt: region === 'us' ? 3880 : 12960, pct: 80 },
      { cat: 'safety', amt: region === 'us' ? 290 : 970, pct: 6 },
      { cat: 'platform', amt: region === 'us' ? 340 : 1130, pct: 7 },
      { cat: 'marketing', amt: region === 'us' ? 195 : 650, pct: 4 },
      { cat: 'reserve', amt: region === 'us' ? 145 : 490, pct: 3 }
    ]
  };

  const getPrefLabel = (p) => {
    const l = { us: { 'women-only': 'Women only', 'women-nb': 'Women & NB', 'all-inclusive': 'All' },
                cn: { 'women-only': '仅女性', 'women-nb': '女性与非二元', 'all-inclusive': '全包容' } };
    return l[region][p];
  };

  const filtered = techs.filter(t => {
    if (userPreference === 'women-only') return t.gender === 'woman';
    if (userPreference === 'women-nb') return t.gender === 'woman' || t.gender === 'non-binary';
    return true;
  });

  return (
    <div className="min-h-screen bg-white">
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex justify-between items-center">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setCurrentPage('home')}>
            <Wrench className="text-pink-500" size={28} />
            <span className="text-2xl font-bold">SheFixes</span>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <button onClick={() => setCurrentPage('home')} className="hover:text-pink-500">{c.nav.home}</button>
            <button onClick={() => setCurrentPage('findTech')} className="hover:text-pink-500">{c.nav.findTech}</button>
            <button onClick={() => setCurrentPage('joinUs')} className="hover:text-pink-500">{c.nav.joinUs}</button>
            <button onClick={() => setCurrentPage('transparency')} className="hover:text-pink-500">{c.nav.transparency}</button>
            <button onClick={() => setRegion(region === 'us' ? 'cn' : 'us')} className="flex items-center gap-1 hover:text-pink-500">
              <Globe size={20} />
              <span>{region === 'us' ? '🇨🇳' : '🇺🇸'}</span>
            </button>
          </div>
          <button className="md:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
        {isMenuOpen && (
          <div className="md:hidden py-4 px-4 space-y-3 border-t">
            <button onClick={() => { setCurrentPage('home'); setIsMenuOpen(false); }} className="block w-full text-left py-2">{c.nav.home}</button>
            <button onClick={() => { setCurrentPage('findTech'); setIsMenuOpen(false); }} className="block w-full text-left py-2">{c.nav.findTech}</button>
            <button onClick={() => { setCurrentPage('joinUs'); setIsMenuOpen(false); }} className="block w-full text-left py-2">{c.nav.joinUs}</button>
            <button onClick={() => { setCurrentPage('transparency'); setIsMenuOpen(false); }} className="block w-full text-left py-2">{c.nav.transparency}</button>
            <button onClick={() => setRegion(region === 'us' ? 'cn' : 'us')} className="block w-full text-left py-2">
              {region === 'us' ? '🇨🇳 中文' : '🇺🇸 English'}
            </button>
          </div>
        )}
      </nav>

      {currentPage === 'home' && (
        <>
          <div className="bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 pt-20 pb-16 px-4">
            <div className="max-w-6xl mx-auto text-center">
              <div className="inline-block bg-pink-100 text-pink-700 px-4 py-2 rounded-full text-sm font-semibold mb-4">
                {c.community.badge}
              </div>
              <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-4">{c.hero.title}</h1>
              <p className="text-2xl text-gray-700 mb-8">{c.hero.subtitle}</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button onClick={() => setCurrentPage('findTech')} className="bg-pink-500 hover:bg-pink-600 text-white px-8 py-4 rounded-full font-semibold shadow-lg">
                  {c.hero.ctaBook}
                </button>
                <button onClick={() => setCurrentPage('joinUs')} className="bg-white text-pink-500 border-2 border-pink-500 px-8 py-4 rounded-full font-semibold shadow-lg">
                  {c.hero.ctaJoin}
                </button>
              </div>
            </div>
          </div>

          <div className="py-16 px-4 bg-white">
            <div className="max-w-4xl mx-auto">
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-3xl p-8 md:p-12">
                <h2 className="text-3xl font-bold mb-6">{c.community.title}</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-white rounded-2xl p-6">
                    <Shield className="text-pink-500 mb-3" size={32} />
                    <h3 className="font-bold mb-2">{c.community.safety}</h3>
                    <p className="text-sm text-gray-700">{c.community.safetyDesc}</p>
                  </div>
                  <div className="bg-white rounded-2xl p-6">
                    <Heart className="text-purple-500 mb-3" size={32} />
                    <h3 className="font-bold mb-2">{c.community.preference}</h3>
                    <p className="text-sm text-gray-700">{c.community.preferenceDesc}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {currentPage === 'findTech' && (
        <div className="py-16 px-4 bg-gradient-to-br from-purple-50 to-pink-50 min-h-screen">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-4xl font-bold text-center mb-12">{c.tech.title}</h1>
            
            <div className="bg-white rounded-2xl p-6 mb-8 max-w-2xl mx-auto shadow-lg">
              <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                <Heart className="text-pink-500" size={24} />
                {c.tech.filterTitle}
              </h3>
              <p className="text-sm text-gray-600 mb-4">{c.tech.filterDesc}</p>
              <div className="space-y-3">
                {c.tech.prefs.map(p => (
                  <label key={p.value} className="flex items-start gap-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 border-2 border-transparent hover:border-pink-200">
                    <input type="radio" name="pref" value={p.value} checked={userPreference === p.value} onChange={e => setUserPreference(e.target.value)} className="mt-1" />
                    <div>
                      <div className="font-semibold">{p.label}</div>
                      <div className="text-sm text-gray-600">{p.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map(t => (
                <div key={t.id} className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="text-5xl">{t.avatar}</div>
                    <div>
                      <h3 className="font-bold text-lg">{t.name}</h3>
                      <div className="flex items-center gap-1 text-sm">
                        <Star className="text-yellow-400 fill-yellow-400" size={16} />
                        <span className="font-semibold">{t.rating}</span>
                        <span className="text-gray-500">({t.jobs})</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-4 italic">{t.bio}</p>
                  <div className="mb-4 p-3 bg-purple-50 rounded-lg">
                    <div className="text-xs text-gray-600">{c.tech.techPref}</div>
                    <div className="font-semibold text-sm text-purple-700">{getPrefLabel(t.pref)}</div>
                  </div>
                  <div className="mb-4 flex justify-between items-center">
                    <span className="text-gray-600 text-sm">{c.tech.rate}</span>
                    <span className="text-2xl font-bold text-pink-500">{c.currency}{t.rate}</span>
                  </div>
                  <div className="mb-4">
                    <div className="flex flex-wrap gap-2">
                      {t.specs.map((s, i) => (
                        <span key={i} className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-full">{s}</span>
                      ))}
                    </div>
                  </div>
                  <button className="w-full bg-pink-500 hover:bg-pink-600 text-white py-3 rounded-lg font-semibold">
                    {c.tech.book}
                  </button>
                </div>
              ))}
            </div>

            {filtered.length === 0 && (
              <div className="text-center py-12 bg-white rounded-2xl shadow-lg">
                <AlertCircle className="text-gray-400 mx-auto mb-4" size={48} />
                <p className="text-gray-600">No technicians match your preferences yet.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {currentPage === 'joinUs' && (
        <div className="py-16 px-4 bg-gradient-to-br from-blue-50 to-purple-50 min-h-screen">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl font-bold text-center mb-4">{c.join.title}</h1>
            <p className="text-xl text-center text-gray-600 mb-12">{c.join.subtitle}</p>
            
            <div className="bg-white rounded-3xl p-8 mb-8">
              <div className="grid md:grid-cols-2 gap-6 mb-8">
                {c.join.benefits.map((b, i) => (
                  <div key={i} className="flex items-center gap-3 p-4 bg-pink-50 rounded-xl">
                    <CheckCircle className="text-pink-500" size={24} />
                    <span className="font-semibold">{b}</span>
                  </div>
                ))}
              </div>

              <div className="border-t pt-8">
                <h3 className="font-bold text-xl mb-3">{c.join.prefTitle}</h3>
                <p className="text-gray-600 mb-4">{c.join.prefDesc}</p>
                <ul className="space-y-2">
                  {c.join.prefOpts.map((opt, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <CheckCircle className="text-purple-500" size={18} />
                      <span>{opt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="text-center">
              <button className="bg-pink-500 hover:bg-pink-600 text-white px-12 py-4 rounded-full text-lg font-semibold shadow-lg">
                {c.join.apply}
              </button>
            </div>
          </div>
        </div>
      )}

      {currentPage === 'transparency' && (
        <div className="py-16 px-4 bg-gradient-to-br from-blue-50 to-purple-50 min-h-screen">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl font-bold text-center mb-4">{c.transparency.title}</h1>
            <p className="text-lg text-center text-gray-600 mb-12">{c.transparency.subtitle}</p>
            
            <div className="bg-white rounded-2xl p-8 mb-8 text-center">
              <h2 className="text-2xl font-bold text-gray-700 mb-2">{c.transparency.total}</h2>
              <div className="text-5xl font-bold text-pink-500">{c.currency}{financials.total.toLocaleString()}</div>
            </div>

            <div className="bg-white rounded-2xl p-8">
              <h2 className="text-2xl font-bold mb-6">{c.transparency.breakdown}</h2>
              <div className="space-y-6">
                {financials.items.map((item, i) => (
                  <div key={i}>
                    <div className="flex justify-between mb-2">
                      <span className="font-semibold">{c.transparency.cats[item.cat]}</span>
                      <span className="font-bold">{c.currency}{item.amt.toLocaleString()} ({item.pct}%)</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div className="bg-gradient-to-r from-pink-500 to-purple-500 h-3 rounded-full" style={{ width: `${item.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-sm text-gray-500 mt-6 text-center italic">{c.transparency.note}</p>
            </div>
          </div>
        </div>
      )}

      <footer className="bg-gray-900 text-white py-12 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Wrench size={28} />
            <span className="text-2xl font-bold">SheFixes</span>
          </div>
          <p className="text-gray-400 italic mb-4">{c.footer.slogan}</p>
          <p className="text-gray-400 text-sm">{c.footer.email}</p>
          <p className="text-gray-500 text-sm mt-8">© 2025 SheFixes</p>
        </div>
      </footer>
    </div>
  );
};

export default SheFixes;