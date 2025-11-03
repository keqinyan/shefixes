import React, { useState, useRef, useEffect } from 'react';
import { Menu, X, Wrench, Shield, Heart, AlertCircle, CheckCircle, Star, Globe, Camera, Search, MapPin } from 'lucide-react';

const SheFixes = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [region, setRegion] = useState('us');
  const [currentPage, setCurrentPage] = useState('home');
  const [userPreference, setUserPreference] = useState('women-only');
  const [searchAddress, setSearchAddress] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [regStep, setRegStep] = useState(1);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', city: '', preference: 'women-only' });
  const [photo, setPhoto] = useState(null);
  const [stream, setStream] = useState(null);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [error, setError] = useState('');
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const t = {
    us: {
      currency: '$',
      nav: { home: 'Home', find: 'Find', register: 'Register' },
      hero: { title: 'Fix it. Own it.', subtitle: 'Safe repair for women by women', find: 'Find Technician', reg: 'Register' },
      search: {
        title: 'Find Your Technician',
        address: 'Address or Zip',
        addressPH: 'Durham, NC or 27701',
        category: 'What needs fixing?',
        catPH: 'Select category',
        cats: ['Furniture', 'Network', 'Computer', 'Lighting', 'Appliances', '3D/Sewing', 'Other'],
        search: 'Search',
        noResult: 'No Technicians Yet',
        noMsg: 'We are finding technicians in your area!',
        wait: 'Join Waitlist',
        results: 'Available Technicians'
      },
      tech: {
        pref: 'Preference',
        prefs: [
          { value: 'women-only', label: 'Women only' },
          { value: 'women-nb', label: 'Women & NB' },
          { value: 'all-inclusive', label: 'All' }
        ],
        works: 'Works with:',
        rate: '/hr',
        book: 'Book',
        area: 'Service Area'
      },
      reg: {
        title: 'Register',
        s1: 'Step 1: Info',
        s2: 'Step 2: Photo',
        s3: 'Complete!',
        name: 'Name',
        email: 'Email',
        phone: 'Phone',
        city: 'City',
        pref: 'Preference',
        prefs: [
          { value: 'women-only', label: 'Women only' },
          { value: 'women-nb', label: 'Women & NB' },
          { value: 'all-inclusive', label: 'All' }
        ],
        photo: 'Live Selfie',
        photoDesc: 'Live photo required for safety',
        start: 'Start Camera',
        take: 'Take Photo',
        retake: 'Retake',
        next: 'Next',
        submit: 'Submit',
        back: 'Back',
        success: 'Welcome!',
        successMsg: 'We will contact you in 24h',
        camErr: 'Cannot access camera',
        fillAll: 'Fill all fields',
        takeFirst: 'Take photo first'
      }
    },
    cn: {
      currency: '¥',
      nav: { home: '首页', find: '找技师', register: '注册' },
      hero: { title: '她修她世界', subtitle: '为女性打造的安全维修社区', find: '找技师', reg: '注册' },
      search: {
        title: '找技师',
        address: '地址或邮编',
        addressPH: '杭州市西湖区',
        category: '需要什么服务？',
        catPH: '选择类别',
        cats: ['家具', '网络', '电脑', '灯具', '家电', '3D/缝纫', '其他'],
        search: '搜索',
        noResult: '暂无技师',
        noMsg: '正在寻找您当地的技师！',
        wait: '加入等候',
        results: '可用技师'
      },
      tech: {
        pref: '偏好',
        prefs: [
          { value: 'women-only', label: '仅女性' },
          { value: 'women-nb', label: '女性与非二元' },
          { value: 'all-inclusive', label: '全包容' }
        ],
        works: '服务：',
        rate: '/时',
        book: '预约',
        area: '服务区'
      },
      reg: {
        title: '注册',
        s1: '第一步',
        s2: '第二步',
        s3: '完成！',
        name: '姓名',
        email: '邮箱',
        phone: '手机',
        city: '城市',
        pref: '偏好',
        prefs: [
          { value: 'women-only', label: '仅女性' },
          { value: 'women-nb', label: '女性与非二元' },
          { value: 'all-inclusive', label: '全包容' }
        ],
        photo: '自拍',
        photoDesc: '安全需要实时拍照',
        start: '开相机',
        take: '拍照',
        retake: '重拍',
        next: '下一步',
        submit: '提交',
        back: '返回',
        success: '欢迎！',
        successMsg: '24小时内联系您',
        camErr: '无法访问相机',
        fillAll: '请填写全部',
        takeFirst: '请先拍照'
      }
    }
  };

  const c = t[region];

  const techs = [
    { id: 1, name: region === 'us' ? 'Maya' : '陈晓雨', avatar: '👩‍🔧', rating: 4.9, jobs: 127, rate: region === 'us' ? 45 : 150,
      specs: region === 'us' ? ['Network', 'Computer'] : ['网络', '电脑'], pref: 'women-only', gender: 'woman',
      area: region === 'us' ? 'Durham, Chapel Hill' : '杭州市区', cats: region === 'us' ? ['Network', 'Computer'] : ['网络', '电脑'] },
    { id: 2, name: region === 'us' ? 'Jamie' : '刘芳', avatar: '👩‍💼', rating: 4.8, jobs: 93, rate: region === 'us' ? 40 : 135,
      specs: region === 'us' ? ['Furniture'] : ['家具'], pref: 'women-nb', gender: 'woman',
      area: region === 'us' ? 'Durham' : '杭州', cats: region === 'us' ? ['Furniture'] : ['家具'] },
    { id: 3, name: region === 'us' ? 'Alex' : '张可欣', avatar: '👩‍🎨', rating: 5.0, jobs: 68, rate: region === 'us' ? 50 : 165,
      specs: region === 'us' ? ['3D/Sewing'] : ['3D/缝纫'], pref: 'all-inclusive', gender: 'non-binary',
      area: region === 'us' ? 'Chapel Hill' : '萧山', cats: region === 'us' ? ['3D/Sewing'] : ['3D/缝纫'] }
  ];

  const search = () => {
    if (!searchAddress || !selectedCategory) {
      setError(region === 'us' ? 'Fill all fields' : '请填写全部');
      return;
    }
    setError('');
    setShowResults(true);
  };

  const filtered = () => {
    let f = techs;
    if (userPreference === 'women-only') f = f.filter(t => t.gender === 'woman');
    else if (userPreference === 'women-nb') f = f.filter(t => t.gender === 'woman' || t.gender === 'non-binary');
    if (searchAddress) {
      const a = searchAddress.toLowerCase();
      f = f.filter(t => t.area.toLowerCase().includes(a.split(',')[0].trim().toLowerCase()));
    }
    if (selectedCategory && selectedCategory !== 'Other') {
      f = f.filter(t => t.cats.includes(selectedCategory));
    }
    return f;
  };

  const prefLabel = (p) => {
    const l = { us: { 'women-only': 'Women', 'women-nb': 'Women&NB', 'all-inclusive': 'All' },
                cn: { 'women-only': '仅女性', 'women-nb': '女性非二元', 'all-inclusive': '全包容' } };
    return l[region][p];
  };

  const startCam = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      setStream(s);
      if (videoRef.current) videoRef.current.srcObject = s;
      setIsCameraOn(true);
      setError('');
    } catch (e) {
      setError(c.reg.camErr);
    }
  };

  const stopCam = () => {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      setStream(null);
      setIsCameraOn(false);
    }
  };

  const takeP = () => {
    if (videoRef.current && canvasRef.current) {
      const v = videoRef.current;
      const can = canvasRef.current;
      const ctx = can.getContext('2d');
      can.width = v.videoWidth;
      can.height = v.videoHeight;
      ctx.drawImage(v, 0, 0);
      setPhoto(can.toDataURL('image/jpeg'));
      stopCam();
    }
  };

  const retake = () => { setPhoto(null); startCam(); };

  useEffect(() => { return () => stopCam(); }, []);

  const val1 = () => {
    if (!formData.name || !formData.email || !formData.phone || !formData.city) {
      setError(c.reg.fillAll);
      return false;
    }
    setError('');
    return true;
  };

  const val2 = () => {
    if (!photo) {
      setError(c.reg.takeFirst);
      return false;
    }
    setError('');
    return true;
  };

  const submit = () => {
    if (val2()) {
      console.log('Reg:', formData, photo);
      setRegStep(3);
    }
  };

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
            <button onClick={() => setCurrentPage('find')} className="hover:text-pink-500">{c.nav.find}</button>
            <button onClick={() => setCurrentPage('register')} className="hover:text-pink-500">{c.nav.register}</button>
            <button onClick={() => setRegion(region === 'us' ? 'cn' : 'us')} className="hover:text-pink-500">
              <Globe size={20} />
            </button>
          </div>
          <button className="md:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </nav>

      {currentPage === 'home' && (
        <div className="bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 pt-20 pb-16 px-4">
          <div className="max-w-6xl mx-auto text-center">
            <h1 className="text-5xl font-bold mb-4">{c.hero.title}</h1>
            <p className="text-2xl mb-8">{c.hero.subtitle}</p>
            <div className="flex gap-4 justify-center">
              <button onClick={() => setCurrentPage('find')} className="bg-pink-500 text-white px-8 py-4 rounded-full font-semibold">
                {c.hero.find}
              </button>
              <button onClick={() => setCurrentPage('register')} className="bg-white text-pink-500 border-2 border-pink-500 px-8 py-4 rounded-full font-semibold">
                {c.hero.reg}
              </button>
            </div>
          </div>
        </div>
      )}

      {currentPage === 'find' && (
        <div className="py-16 px-4 bg-gray-50 min-h-screen">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-4xl font-bold text-center mb-8">{c.search.title}</h1>

            <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block font-semibold mb-2">{c.search.address}</label>
                  <input type="text" value={searchAddress} onChange={e => setSearchAddress(e.target.value)}
                    placeholder={c.search.addressPH} className="w-full px-4 py-3 border-2 rounded-lg focus:border-pink-500" />
                </div>
                <div>
                  <label className="block font-semibold mb-2">{c.search.category}</label>
                  <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}
                    className="w-full px-4 py-3 border-2 rounded-lg focus:border-pink-500">
                    <option value="">{c.search.catPH}</option>
                    {c.search.cats.map((cat, i) => <option key={i} value={cat}>{cat}</option>)}
                  </select>
                </div>
              </div>

              <div className="mb-6">
                <label className="block font-semibold mb-3">{c.tech.pref}</label>
                <div className="grid md:grid-cols-3 gap-3">
                  {c.tech.prefs.map(p => (
                    <label key={p.value} className="flex items-center gap-2 p-3 border-2 rounded-lg cursor-pointer hover:border-pink-300">
                      <input type="radio" name="pref" value={p.value} checked={userPreference === p.value}
                        onChange={e => setUserPreference(e.target.value)} />
                      <span className="text-sm font-semibold">{p.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
                  <AlertCircle className="text-red-500" size={20} />
                  <span className="text-red-700 text-sm">{error}</span>
                </div>
              )}

              <button onClick={search} className="w-full bg-pink-500 hover:bg-pink-600 text-white py-4 rounded-lg font-semibold flex items-center justify-center gap-2">
                <Search size={20} />
                {c.search.search}
              </button>
            </div>

            {showResults && (
              <>
                {filtered().length > 0 ? (
                  <>
                    <h2 className="text-2xl font-bold mb-6">{c.search.results}</h2>
                    <div className="grid md:grid-cols-3 gap-6">
                      {filtered().map(tech => (
                        <div key={tech.id} className="bg-white rounded-2xl shadow-lg p-6">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="text-5xl">{tech.avatar}</div>
                            <div>
                              <h3 className="font-bold text-lg">{tech.name}</h3>
                              <div className="flex items-center gap-1 text-sm">
                                <Star className="text-yellow-400 fill-yellow-400" size={16} />
                                <span>{tech.rating}</span>
                                <span className="text-gray-500">({tech.jobs})</span>
                              </div>
                            </div>
                          </div>
                          <div className="mb-3 p-2 bg-blue-50 rounded text-sm">
                            <div className="text-xs text-gray-600">{c.tech.area}</div>
                            <div className="font-semibold">{tech.area}</div>
                          </div>
                          <div className="mb-3 p-2 bg-purple-50 rounded text-sm">
                            <div className="text-xs text-gray-600">{c.tech.works}</div>
                            <div className="font-semibold">{prefLabel(tech.pref)}</div>
                          </div>
                          <div className="mb-3 flex justify-between">
                            <span className="text-sm text-gray-600">{c.tech.rate}</span>
                            <span className="text-2xl font-bold text-pink-500">{c.currency}{tech.rate}</span>
                          </div>
                          <button className="w-full bg-pink-500 hover:bg-pink-600 text-white py-3 rounded-lg font-semibold">
                            {c.tech.book}
                          </button>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
                    <AlertCircle className="text-gray-400 mx-auto mb-4" size={64} />
                    <h3 className="text-2xl font-bold mb-2">{c.search.noResult}</h3>
                    <p className="text-gray-600 mb-6">{c.search.noMsg}</p>
                    <button className="bg-pink-500 text-white px-8 py-3 rounded-full font-semibold">
                      {c.search.wait}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {currentPage === 'register' && (
        <div className="py-16 px-4 bg-gray-50 min-h-screen">
          <div className="max-w-2xl mx-auto">
            <h1 className="text-4xl font-bold text-center mb-8">{c.reg.title}</h1>

            <div className="mb-8 flex justify-between">
              {[1, 2, 3].map(s => (
                <div key={s} className="flex items-center flex-1">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${regStep >= s ? 'bg-pink-500 text-white' : 'bg-gray-200'}`}>{s}</div>
                  {s < 3 && <div className={`flex-1 h-1 mx-2 ${regStep > s ? 'bg-pink-500' : 'bg-gray-200'}`} />}
                </div>
              ))}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center gap-3">
                <AlertCircle className="text-red-500" size={24} />
                <p className="text-red-700">{error}</p>
              </div>
            )}

            {regStep === 1 && (
              <div className="bg-white rounded-2xl shadow-lg p-8">
                <h2 className="text-2xl font-bold mb-6">{c.reg.s1}</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block font-semibold mb-2">{c.reg.name}</label>
                    <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-pink-500" />
                  </div>
                  <div>
                    <label className="block font-semibold mb-2">{c.reg.email}</label>
                    <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-pink-500" />
                  </div>
                  <div>
                    <label className="block font-semibold mb-2">{c.reg.phone}</label>
                    <input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})}
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-pink-500" />
                  </div>
                  <div>
                    <label className="block font-semibold mb-2">{c.reg.city}</label>
                    <input type="text" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})}
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-pink-500" />
                  </div>
                  <div>
                    <label className="block font-semibold mb-2">{c.reg.pref}</label>
                    <div className="space-y-2">
                      {c.reg.prefs.map(p => (
                        <label key={p.value} className="flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer hover:border-pink-300">
                          <input type="radio" name="pref" value={p.value} checked={formData.preference === p.value}
                            onChange={e => setFormData({...formData, preference: e.target.value})} />
                          <span>{p.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                <button onClick={() => { if (val1()) setRegStep(2); }}
                  className="w-full mt-6 bg-pink-500 hover:bg-pink-600 text-white py-4 rounded-lg font-semibold">
                  {c.reg.next}
                </button>
              </div>
            )}

            {regStep === 2 && (
              <div className="bg-white rounded-2xl shadow-lg p-8">
                <button onClick={() => setRegStep(1)} className="text-gray-600 mb-4">← {c.reg.back}</button>
                <h2 className="text-2xl font-bold mb-6">{c.reg.s2}</h2>
                <p className="text-gray-600 mb-4">{c.reg.photoDesc}</p>
                <div className="bg-gray-900 rounded-lg overflow-hidden relative aspect-video mb-6">
                  {!isCameraOn && !photo && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <button onClick={startCam} className="bg-pink-500 text-white px-8 py-4 rounded-full font-semibold flex items-center gap-2">
                        <Camera size={24} />
                        {c.reg.start}
                      </button>
                    </div>
                  )}
                  {isCameraOn && !photo && (
                    <>
                      <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                      <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                        <button onClick={takeP} className="bg-white text-gray-900 px-8 py-4 rounded-full font-semibold flex items-center gap-2">
                          <Camera size={24} />
                          {c.reg.take}
                        </button>
                      </div>
                    </>
                  )}
                  {photo && (
                    <>
                      <img src={photo} alt="Captured" className="w-full h-full object-cover" />
                      <div className="absolute top-4 right-4">
                        <CheckCircle className="text-green-500 bg-white rounded-full" size={48} />
                      </div>
                      <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                        <button onClick={retake} className="bg-white text-gray-900 px-6 py-3 rounded-full font-semibold flex items-center gap-2">
                          <X size={20} />
                          {c.reg.retake}
                        </button>
                      </div>
                    </>
                  )}
                </div>
                <canvas ref={canvasRef} className="hidden" />
                <button onClick={submit} disabled={!photo}
                  className={`w-full py-4 rounded-lg font-semibold ${photo ? 'bg-pink-500 hover:bg-pink-600 text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
                  {c.reg.submit}
                </button>
              </div>
            )}

            {regStep === 3 && (
              <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
                <CheckCircle className="text-green-500 mx-auto mb-4" size={80} />
                <h2 className="text-3xl font-bold mb-3">{c.reg.success}</h2>
                <p className="text-lg text-gray-600">{c.reg.successMsg}</p>
                <button onClick={() => setCurrentPage('home')} className="mt-6 bg-pink-500 text-white px-8 py-3 rounded-full font-semibold">
                  {region === 'us' ? 'Back to Home' : '返回首页'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <footer className="bg-gray-900 text-white py-12 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <Wrench size={32} className="mx-auto mb-4" />
          <p className="text-2xl font-bold mb-2">SheFixes</p>
          <p className="text-gray-400 text-sm">hello@shefixes.com</p>
          <p className="text-gray-500 text-sm mt-4">© 2025 SheFixes</p>
        </div>
      </footer>
    </div>
  );
};

export default SheFixes;