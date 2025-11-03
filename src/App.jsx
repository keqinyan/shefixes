import React, { useState, useRef, useEffect } from 'react';
import { Menu, X, Wrench, Shield, Heart, AlertCircle, CheckCircle, Star, Globe, Camera, Search, MapPin, User, LogOut, Eye, EyeOff, Mail, Lock, Phone, Package } from 'lucide-react';
import { supabase } from './supabaseClient';

const SheFixes = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [region, setRegion] = useState('us');
  const [currentPage, setCurrentPage] = useState('home');
  const [userPreference, setUserPreference] = useState('women-only');
  const [searchAddress, setSearchAddress] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [error, setError] = useState('');
  
  // 认证状态
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'
  const [showPassword, setShowPassword] = useState(false);
  
  // 登录/注册数据
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [registerData, setRegisterData] = useState({
    email: '', password: '', name: '', phone: '', city: '', preference: 'women-only'
  });
  
  // 订单数据
  const [userBookings, setUserBookings] = useState([]);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // 检查用户登录状态
  useEffect(() => {
    checkUser();
    
    // 监听认证状态变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user ?? null);
      if (session?.user) {
        fetchUserBookings(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
      if (user) {
        await fetchUserBookings(user.id);
      }
    } catch (error) {
      console.error('Error checking user:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserBookings = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          technician:technicians(name, photo_url, rating)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setUserBookings(data || []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    }
  };

  // 登录
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginData.email,
        password: loginData.password
      });

      if (error) throw error;

      setCurrentPage('dashboard');
    } catch (error) {
      setError(region === 'us' ? 'Invalid email or password' : '邮箱或密码错误');
    } finally {
      setLoading(false);
    }
  };

  // 注册
  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!registerData.email || !registerData.password || !registerData.name || 
        !registerData.phone || !registerData.city) {
      setError(region === 'us' ? 'Please fill all fields' : '请填写所有字段');
      setLoading(false);
      return;
    }

    if (registerData.password.length < 6) {
      setError(region === 'us' ? 'Password must be at least 6 characters' : '密码至少6个字符');
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: registerData.email,
        password: registerData.password,
        options: {
          data: {
            name: registerData.name,
            phone: registerData.phone,
            city: registerData.city,
            preference: registerData.preference,
            region: region
          }
        }
      });

      if (error) throw error;

      // 创建用户记录
      const { error: insertError } = await supabase
        .from('users')
        .insert([{
          id: data.user.id,
          email: registerData.email,
          name: registerData.name,
          phone: registerData.phone,
          city: registerData.city,
          preference: registerData.preference,
          region: region
        }]);

      if (insertError) throw insertError;

      alert(region === 'us' 
        ? 'Account created! Please check your email to verify.' 
        : '账号创建成功！请查看邮箱验证。');
      
      setAuthMode('login');
    } catch (error) {
      setError(error.message || (region === 'us' ? 'Registration failed' : '注册失败'));
    } finally {
      setLoading(false);
    }
  };

  // 登出
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setCurrentPage('home');
  };

  // 文本内容（简化版）
  const t = {
    us: {
      nav: { home: 'Home', find: 'Find', dashboard: 'My Orders', login: 'Login', logout: 'Logout' },
      auth: {
        login: 'Login', register: 'Register', email: 'Email', password: 'Password',
        name: 'Name', phone: 'Phone', city: 'City', loginBtn: 'Log In', registerBtn: 'Create Account',
        noAccount: "Don't have an account?", haveAccount: 'Have an account?', signUp: 'Sign up', signIn: 'Sign in'
      },
      dashboard: {
        title: 'My Orders',
        noOrders: 'No orders yet',
        startBooking: 'Book a Service',
        status: { pending: 'Pending', confirmed: 'Confirmed', in_progress: 'In Progress', completed: 'Completed', cancelled: 'Cancelled' }
      }
    },
    cn: {
      nav: { home: '首页', find: '找技师', dashboard: '我的订单', login: '登录', logout: '退出' },
      auth: {
        login: '登录', register: '注册', email: '邮箱', password: '密码',
        name: '姓名', phone: '手机', city: '城市', loginBtn: '登录', registerBtn: '创建账号',
        noAccount: '还没有账号？', haveAccount: '已有账号？', signUp: '注册', signIn: '登录'
      },
      dashboard: {
        title: '我的订单',
        noOrders: '暂无订单',
        startBooking: '预约服务',
        status: { pending: '待确认', confirmed: '已确认', in_progress: '进行中', completed: '已完成', cancelled: '已取消' }
      }
    }
  };

  const c = t[region];

  return (
    <div className="min-h-screen bg-white">
      {/* 导航栏 */}
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex justify-between items-center">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setCurrentPage('home')}>
            <Wrench className="text-pink-500" size={28} />
            <span className="text-2xl font-bold">SheFixes</span>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <button onClick={() => setCurrentPage('home')} className="hover:text-pink-500">{c.nav.home}</button>
            <button onClick={() => setCurrentPage('find')} className="hover:text-pink-500">{c.nav.find}</button>
            {currentUser ? (
              <>
                <button onClick={() => setCurrentPage('dashboard')} className="hover:text-pink-500">{c.nav.dashboard}</button>
                <button onClick={handleLogout} className="flex items-center gap-2 hover:text-pink-500">
                  <LogOut size={18} />{c.nav.logout}
                </button>
              </>
            ) : (
              <button onClick={() => setCurrentPage('auth')} className="hover:text-pink-500">{c.nav.login}</button>
            )}
            <button onClick={() => setRegion(region === 'us' ? 'cn' : 'us')} className="hover:text-pink-500">
              <Globe size={20} />
            </button>
          </div>
        </div>
      </nav>

      {/* 主页 */}
      {currentPage === 'home' && (
        <div className="bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 pt-20 pb-16 px-4">
          <div className="max-w-6xl mx-auto text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-4">
              {region === 'us' ? 'Fix it. Own it.' : '她修她世界'}
            </h1>
            <p className="text-2xl text-gray-700 mb-8">
              {region === 'us' ? 'Safe repair for women by women' : '为女性打造的安全维修社区'}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button onClick={() => setCurrentPage('find')} className="bg-pink-500 hover:bg-pink-600 text-white px-8 py-4 rounded-full font-semibold shadow-lg">
                {region === 'us' ? 'Find Technician' : '找技师'}
              </button>
              {!currentUser && (
                <button onClick={() => setCurrentPage('auth')} className="bg-white text-pink-500 border-2 border-pink-500 px-8 py-4 rounded-full font-semibold shadow-lg">
                  {region === 'us' ? 'Register' : '注册'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 登录/注册页面 */}
      {currentPage === 'auth' && !currentUser && (
        <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold mb-2">SheFixes</h1>
              <p className="text-gray-600">
                {authMode === 'login' 
                  ? (region === 'us' ? 'Welcome back!' : '欢迎回来！')
                  : (region === 'us' ? 'Join us' : '加入我们')}
              </p>
            </div>

            <div className="bg-white rounded-2xl p-2 mb-6 flex shadow-sm">
              <button onClick={() => setAuthMode('login')}
                className={`flex-1 py-3 rounded-xl font-semibold transition ${authMode === 'login' ? 'bg-pink-500 text-white' : 'text-gray-600'}`}>
                {c.auth.login}
              </button>
              <button onClick={() => setAuthMode('register')}
                className={`flex-1 py-3 rounded-xl font-semibold transition ${authMode === 'register' ? 'bg-pink-500 text-white' : 'text-gray-600'}`}>
                {c.auth.register}
              </button>
            </div>

            <div className="bg-white rounded-2xl shadow-xl p-8">
              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
                  <AlertCircle className="text-red-500" size={20} />
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              {authMode === 'login' ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">{c.auth.email}</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                      <input type="email" value={loginData.email}
                        onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-pink-500"
                        placeholder="your@email.com" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">{c.auth.password}</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                      <input type={showPassword ? 'text' : 'password'} value={loginData.password}
                        onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                        className="w-full pl-10 pr-12 py-3 border rounded-lg focus:ring-2 focus:ring-pink-500"
                        placeholder="••••••••" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </div>
                  <button onClick={handleLogin} disabled={loading}
                    className={`w-full py-3 rounded-lg font-semibold text-white ${loading ? 'bg-gray-400' : 'bg-pink-500 hover:bg-pink-600'}`}>
                    {loading ? '...' : c.auth.loginBtn}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">{c.auth.email}</label>
                    <input type="email" value={registerData.email}
                      onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-pink-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">{c.auth.password}</label>
                    <input type={showPassword ? 'text' : 'password'} value={registerData.password}
                      onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-pink-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">{c.auth.name}</label>
                    <input type="text" value={registerData.name}
                      onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })}
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-pink-500" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold mb-2">{c.auth.phone}</label>
                      <input type="tel" value={registerData.phone}
                        onChange={(e) => setRegisterData({ ...registerData, phone: e.target.value })}
                        className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-pink-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2">{c.auth.city}</label>
                      <input type="text" value={registerData.city}
                        onChange={(e) => setRegisterData({ ...registerData, city: e.target.value })}
                        className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-pink-500" />
                    </div>
                  </div>
                  <button onClick={handleRegister} disabled={loading}
                    className={`w-full py-3 rounded-lg font-semibold text-white ${loading ? 'bg-gray-400' : 'bg-pink-500 hover:bg-pink-600'}`}>
                    {loading ? '...' : c.auth.registerBtn}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 我的订单页面 */}
      {currentPage === 'dashboard' && currentUser && (
        <div className="py-16 px-4 bg-gray-50 min-h-screen">
          <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-8">
              <h1 className="text-4xl font-bold">{c.dashboard.title}</h1>
              <button onClick={() => setCurrentPage('find')}
                className="bg-pink-500 hover:bg-pink-600 text-white px-6 py-3 rounded-full font-semibold">
                {c.dashboard.startBooking}
              </button>
            </div>

            {userBookings.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
                <Package className="text-gray-300 mx-auto mb-4" size={64} />
                <h3 className="text-2xl font-bold mb-2">{c.dashboard.noOrders}</h3>
                <button onClick={() => setCurrentPage('find')}
                  className="mt-6 bg-pink-500 hover:bg-pink-600 text-white px-8 py-3 rounded-full font-semibold">
                  {c.dashboard.startBooking}
                </button>
              </div>
            ) : (
              <div className="grid gap-6">
                {userBookings.map((booking) => (
                  <div key={booking.id} className="bg-white rounded-2xl shadow-lg p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-bold text-lg">{booking.service_type}</h3>
                        <p className="text-gray-600 text-sm">{booking.service_address}</p>
                      </div>
                      <span className={`px-4 py-2 rounded-full text-sm font-semibold ${
                        booking.status === 'completed' ? 'bg-green-100 text-green-700' :
                        booking.status === 'confirmed' ? 'bg-blue-100 text-blue-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {c.dashboard.status[booking.status]}
                      </span>
                    </div>
                    <p className="text-gray-700 mb-4">{booking.description}</p>
                    {booking.technician && (
                      <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                        <div className="text-3xl">👩‍🔧</div>
                        <div>
                          <p className="font-semibold">{booking.technician.name}</p>
                          <div className="flex items-center gap-1">
                            <Star className="text-yellow-400 fill-yellow-400" size={16} />
                            <span className="text-sm">{booking.technician.rating}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
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