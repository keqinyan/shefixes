import React, { useState, useRef, useEffect } from 'react';
import { Menu, X, Wrench, Shield, Heart, AlertCircle, CheckCircle, Star, Globe, Camera, Search, MapPin, User, LogOut, Eye, EyeOff, Mail, Lock, Phone, Package, MessageCircle, Send, Calendar, Clock, Home, DollarSign, Image as ImageIcon } from 'lucide-react';
import { supabase } from './supabaseClient';
import SelfieVerification from './components/SelfieVerification';
import VerifiedBadge from './components/VerifiedBadge';

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

  // 预约表单数据
  const [bookingForm, setBookingForm] = useState({
    service_type: '',
    service_address: '',
    description: '',
    preferred_date: '',
    preferred_time: '',
    photo_url: null
  });

  // 聊天数据
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [chatOpen, setChatOpen] = useState(false);

  // 评价数据
  const [reviewForm, setReviewForm] = useState({
    booking_id: null,
    rating: 5,
    comment: ''
  });
  const [showReviewModal, setShowReviewModal] = useState(false);

  // 自拍验证数据
  const [showSelfieVerification, setShowSelfieVerification] = useState(false);
  const [userSelfieVerified, setUserSelfieVerified] = useState(false);
  const [pendingBooking, setPendingBooking] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const messagesEndRef = useRef(null);

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
        await checkSelfieVerification(user.id);
      }
    } catch (error) {
      console.error('Error checking user:', error);
    } finally {
      setLoading(false);
    }
  };

  // 检查用户自拍验证状态
  const checkSelfieVerification = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('selfie_verified')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setUserSelfieVerified(data?.selfie_verified || false);
    } catch (error) {
      console.error('Error checking selfie verification:', error);
    }
  };

  const fetchUserBookings = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          technician:technicians(name, photo_url, rating, selfie_verified)
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

  // 提交预约
  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser) {
      alert(region === 'us' ? 'Please login first' : '请先登录');
      setCurrentPage('auth');
      return;
    }

    // 检查自拍验证状态
    if (!userSelfieVerified) {
      // 保存待提交的订单数据
      setPendingBooking(bookingForm);
      // 显示自拍验证模态框
      setShowSelfieVerification(true);
      return;
    }

    // 继续提交订单
    await submitBooking();
  };

  // 实际提交订单
  const submitBooking = async () => {
    setError('');
    setLoading(true);

    try {
      const bookingData = pendingBooking || bookingForm;

      const { data, error } = await supabase
        .from('bookings')
        .insert([{
          user_id: currentUser.id,
          service_type: bookingData.service_type,
          service_address: bookingData.service_address,
          description: bookingData.description,
          preferred_date: bookingData.preferred_date,
          preferred_time: bookingData.preferred_time,
          status: 'pending',
          photo_url: bookingData.photo_url
        }])
        .select();

      if (error) throw error;

      alert(region === 'us' ? 'Booking submitted successfully!' : '预约提交成功！');
      setBookingForm({
        service_type: '',
        service_address: '',
        description: '',
        preferred_date: '',
        preferred_time: '',
        photo_url: null
      });
      setPendingBooking(null);
      setCurrentPage('dashboard');
      await fetchUserBookings(currentUser.id);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // 自拍验证完成回调
  const handleSelfieVerificationComplete = async (photoUrl) => {
    setUserSelfieVerified(true);
    setShowSelfieVerification(false);

    // 如果有待提交的订单，现在提交它
    if (pendingBooking) {
      await submitBooking();
    }
  };

  // 获取聊天消息
  const fetchMessages = async (bookingId) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  // 发送消息
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedBooking) return;

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert([{
          booking_id: selectedBooking.id,
          sender_id: currentUser.id,
          sender_type: 'user',
          message: newMessage
        }])
        .select();

      if (error) throw error;

      setMessages([...messages, data[0]]);
      setNewMessage('');
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  // 监听新消息
  useEffect(() => {
    if (!selectedBooking) return;

    const channel = supabase
      .channel(`messages:${selectedBooking.id}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `booking_id=eq.${selectedBooking.id}` },
        (payload) => {
          setMessages(prev => [...prev, payload.new]);
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedBooking]);

  // 打开聊天窗口
  const openChat = (booking) => {
    setSelectedBooking(booking);
    setChatOpen(true);
    fetchMessages(booking.id);
  };

  // 提交评价
  const handleSubmitReview = async () => {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .insert([{
          booking_id: reviewForm.booking_id,
          user_id: currentUser.id,
          technician_id: selectedBooking.technician_id,
          rating: reviewForm.rating,
          comment: reviewForm.comment
        }])
        .select();

      if (error) throw error;

      // 更新订单状态为已评价
      await supabase
        .from('bookings')
        .update({ has_review: true })
        .eq('id', reviewForm.booking_id);

      alert(region === 'us' ? 'Review submitted successfully!' : '评价提交成功！');
      setShowReviewModal(false);
      setReviewForm({ booking_id: null, rating: 5, comment: '' });
      await fetchUserBookings(currentUser.id);
    } catch (error) {
      console.error('Error submitting review:', error);
      alert(region === 'us' ? 'Failed to submit review' : '评价提交失败');
    }
  };

  // 文本内容（简化版）
  const t = {
    us: {
      nav: { home: 'Home', find: 'Find', dashboard: 'My Orders', login: 'Login', logout: 'Logout', booking: 'Book Service' },
      auth: {
        login: 'Login', register: 'Register', email: 'Email', password: 'Password',
        name: 'Name', phone: 'Phone', city: 'City', loginBtn: 'Log In', registerBtn: 'Create Account',
        noAccount: "Don't have an account?", haveAccount: 'Have an account?', signUp: 'Sign up', signIn: 'Sign in'
      },
      dashboard: {
        title: 'My Orders',
        noOrders: 'No orders yet',
        startBooking: 'Book a Service',
        status: { pending: 'Pending', confirmed: 'Confirmed', in_progress: 'In Progress', completed: 'Completed', cancelled: 'Cancelled' },
        chat: 'Chat',
        review: 'Write Review'
      },
      booking: {
        title: 'Book a Service',
        serviceType: 'Service Type',
        address: 'Service Address',
        description: 'Problem Description',
        date: 'Preferred Date',
        time: 'Preferred Time',
        photo: 'Upload Photo (Optional)',
        submit: 'Submit Booking',
        selectService: 'Select service type...',
        services: {
          plumbing: 'Plumbing',
          electrical: 'Electrical',
          hvac: 'HVAC',
          carpentry: 'Carpentry',
          painting: 'Painting',
          other: 'Other'
        }
      },
      chat: {
        title: 'Chat with Technician',
        typeMessage: 'Type a message...',
        send: 'Send'
      },
      review: {
        title: 'Write a Review',
        rating: 'Rating',
        comment: 'Your Comments',
        submit: 'Submit Review',
        cancel: 'Cancel'
      }
    },
    cn: {
      nav: { home: '首页', find: '找技师', dashboard: '我的订单', login: '登录', logout: '退出', booking: '预约服务' },
      auth: {
        login: '登录', register: '注册', email: '邮箱', password: '密码',
        name: '姓名', phone: '手机', city: '城市', loginBtn: '登录', registerBtn: '创建账号',
        noAccount: '还没有账号？', haveAccount: '已有账号？', signUp: '注册', signIn: '登录'
      },
      dashboard: {
        title: '我的订单',
        noOrders: '暂无订单',
        startBooking: '预约服务',
        status: { pending: '待确认', confirmed: '已确认', in_progress: '进行中', completed: '已完成', cancelled: '已取消' },
        chat: '聊天',
        review: '写评价'
      },
      booking: {
        title: '预约服务',
        serviceType: '服务类型',
        address: '服务地址',
        description: '问题描述',
        date: '期望日期',
        time: '期望时间',
        photo: '上传照片（可选）',
        submit: '提交预约',
        selectService: '选择服务类型...',
        services: {
          plumbing: '水管维修',
          electrical: '电路维修',
          hvac: '空调暖气',
          carpentry: '木工',
          painting: '油漆粉刷',
          other: '其他'
        }
      },
      chat: {
        title: '与技师聊天',
        typeMessage: '输入消息...',
        send: '发送'
      },
      review: {
        title: '写评价',
        rating: '评分',
        comment: '您的评价',
        submit: '提交评价',
        cancel: '取消'
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
            <button onClick={() => setCurrentPage('booking')} className="hover:text-pink-500">{c.nav.booking}</button>
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

      {/* 预约表单页面 */}
      {currentPage === 'booking' && (
        <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 py-16 px-4">
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <h1 className="text-4xl font-bold mb-8 text-center">{c.booking.title}</h1>

              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
                  <AlertCircle className="text-red-500" size={20} />
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              <form onSubmit={handleBookingSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold mb-2 flex items-center gap-2">
                    <Wrench size={18} />
                    {c.booking.serviceType}
                  </label>
                  <select
                    value={bookingForm.service_type}
                    onChange={(e) => setBookingForm({ ...bookingForm, service_type: e.target.value })}
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-pink-500"
                    required
                  >
                    <option value="">{c.booking.selectService}</option>
                    <option value="plumbing">{c.booking.services.plumbing}</option>
                    <option value="electrical">{c.booking.services.electrical}</option>
                    <option value="hvac">{c.booking.services.hvac}</option>
                    <option value="carpentry">{c.booking.services.carpentry}</option>
                    <option value="painting">{c.booking.services.painting}</option>
                    <option value="other">{c.booking.services.other}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2 flex items-center gap-2">
                    <MapPin size={18} />
                    {c.booking.address}
                  </label>
                  <input
                    type="text"
                    value={bookingForm.service_address}
                    onChange={(e) => setBookingForm({ ...bookingForm, service_address: e.target.value })}
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-pink-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2 flex items-center gap-2">
                    <AlertCircle size={18} />
                    {c.booking.description}
                  </label>
                  <textarea
                    value={bookingForm.description}
                    onChange={(e) => setBookingForm({ ...bookingForm, description: e.target.value })}
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-pink-500"
                    rows="4"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2 flex items-center gap-2">
                      <Calendar size={18} />
                      {c.booking.date}
                    </label>
                    <input
                      type="date"
                      value={bookingForm.preferred_date}
                      onChange={(e) => setBookingForm({ ...bookingForm, preferred_date: e.target.value })}
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-pink-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2 flex items-center gap-2">
                      <Clock size={18} />
                      {c.booking.time}
                    </label>
                    <input
                      type="time"
                      value={bookingForm.preferred_time}
                      onChange={(e) => setBookingForm({ ...bookingForm, preferred_time: e.target.value })}
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-pink-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2 flex items-center gap-2">
                    <ImageIcon size={18} />
                    {c.booking.photo}
                  </label>
                  <input
                    type="text"
                    value={bookingForm.photo_url || ''}
                    onChange={(e) => setBookingForm({ ...bookingForm, photo_url: e.target.value })}
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-pink-500"
                    placeholder="https://..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-4 rounded-lg font-semibold text-white text-lg ${loading ? 'bg-gray-400' : 'bg-pink-500 hover:bg-pink-600'}`}
                >
                  {loading ? '...' : c.booking.submit}
                </button>
              </form>
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
                        <p className="text-gray-500 text-xs mt-1">
                          {booking.preferred_date} {booking.preferred_time}
                        </p>
                      </div>
                      <span className={`px-4 py-2 rounded-full text-sm font-semibold ${
                        booking.status === 'completed' ? 'bg-green-100 text-green-700' :
                        booking.status === 'confirmed' ? 'bg-blue-100 text-blue-700' :
                        booking.status === 'in_progress' ? 'bg-purple-100 text-purple-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {c.dashboard.status[booking.status]}
                      </span>
                    </div>
                    <p className="text-gray-700 mb-4">{booking.description}</p>
                    {booking.technician && (
                      <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg mb-4">
                        <div className="relative">
                          <div className="text-3xl">👩‍🔧</div>
                          {booking.technician.selfie_verified && (
                            <div className="absolute -bottom-1 -right-1">
                              <VerifiedBadge size="sm" region={region} />
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold flex items-center gap-2">
                            {booking.technician.name}
                          </p>
                          <div className="flex items-center gap-1">
                            <Star className="text-yellow-400 fill-yellow-400" size={16} />
                            <span className="text-sm">{booking.technician.rating}</span>
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="flex gap-3">
                      {(booking.status === 'confirmed' || booking.status === 'in_progress') && (
                        <button
                          onClick={() => openChat(booking)}
                          className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-2"
                        >
                          <MessageCircle size={18} />
                          {c.dashboard.chat}
                        </button>
                      )}
                      {booking.status === 'completed' && !booking.has_review && (
                        <button
                          onClick={() => {
                            setSelectedBooking(booking);
                            setReviewForm({ booking_id: booking.id, rating: 5, comment: '' });
                            setShowReviewModal(true);
                          }}
                          className="flex-1 bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-2"
                        >
                          <Star size={18} />
                          {c.dashboard.review}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 聊天窗口 */}
      {chatOpen && selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl h-[600px] flex flex-col">
            <div className="bg-pink-500 text-white p-4 rounded-t-2xl flex justify-between items-center">
              <div className="flex items-center gap-2">
                <MessageCircle size={24} />
                <h2 className="text-xl font-bold">{c.chat.title}</h2>
              </div>
              <button onClick={() => setChatOpen(false)} className="hover:bg-pink-600 p-2 rounded-lg">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.sender_type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] px-4 py-3 rounded-2xl ${
                    msg.sender_type === 'user'
                      ? 'bg-pink-500 text-white rounded-br-none'
                      : 'bg-white text-gray-800 shadow rounded-bl-none'
                  }`}>
                    <p>{msg.message}</p>
                    <p className={`text-xs mt-1 ${msg.sender_type === 'user' ? 'text-pink-100' : 'text-gray-500'}`}>
                      {new Date(msg.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t bg-white rounded-b-2xl">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder={c.chat.typeMessage}
                  className="flex-1 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-pink-500"
                />
                <button
                  onClick={handleSendMessage}
                  className="bg-pink-500 hover:bg-pink-600 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2"
                >
                  <Send size={20} />
                  {c.chat.send}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 评价模态框 */}
      {showReviewModal && selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
            <h2 className="text-2xl font-bold mb-6 text-center">{c.review.title}</h2>

            <div className="mb-6">
              <label className="block text-sm font-semibold mb-3">{c.review.rating}</label>
              <div className="flex gap-2 justify-center">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                    className="transition-transform hover:scale-110"
                  >
                    <Star
                      size={40}
                      className={star <= reviewForm.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold mb-2">{c.review.comment}</label>
              <textarea
                value={reviewForm.comment}
                onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-pink-500"
                rows="4"
                placeholder={region === 'us' ? 'Share your experience...' : '分享你的体验...'}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowReviewModal(false)}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-3 rounded-lg font-semibold"
              >
                {c.review.cancel}
              </button>
              <button
                onClick={handleSubmitReview}
                className="flex-1 bg-pink-500 hover:bg-pink-600 text-white px-6 py-3 rounded-lg font-semibold"
              >
                {c.review.submit}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 自拍验证模态框 */}
      {showSelfieVerification && currentUser && (
        <SelfieVerification
          userId={currentUser.id}
          userType="user"
          region={region}
          onVerificationComplete={handleSelfieVerificationComplete}
          onClose={() => {
            setShowSelfieVerification(false);
            setPendingBooking(null);
          }}
        />
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