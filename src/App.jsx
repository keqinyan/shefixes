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
  const [authMode, setAuthMode] = useState('login'); // 'login', 'register-user', or 'register-technician'
  const [showPassword, setShowPassword] = useState(false);

  // 登录/注册数据
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [registerData, setRegisterData] = useState({
    email: '', password: '', name: '', phone: '', city: '', preference: 'women-only'
  });

  // 技师注册数据
  const [technicianData, setTechnicianData] = useState({
    email: '', password: '', name: '', phone: '', city: '',
    service_categories: [],
    hourly_rate: '',
    gender: 'female',
    bio: '',
    tools: '',
    client_preference: 'women-only'
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

  // 技师匹配相关
  const [bookingStep, setBookingStep] = useState(1); // 1: 填写信息, 2: 选择技师
  const [matchedTechnicians, setMatchedTechnicians] = useState([]);
  const [selectedTechnician, setSelectedTechnician] = useState(null);
  const [loadingTechnicians, setLoadingTechnicians] = useState(false);

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

  // 从地址中提取城市名称
  const extractCityFromAddress = (address) => {
    // 匹配常见城市模式
    const cityPatterns = [
      /^(.+?[市])/,  // 匹配 "北京市", "上海市" 等
      /^(.+?[省])(.+?[市])/,  // 匹配 "江苏省南京市" 等
      /^(.+?[自治区])(.+?[市])/,  // 匹配 "新疆维吾尔自治区乌鲁木齐市" 等
    ];

    for (const pattern of cityPatterns) {
      const match = address.match(pattern);
      if (match) {
        // 返回最后一个匹配的市
        return match[match.length - 1] || match[1];
      }
    }

    // 简单匹配：取前面的词
    const simpleMatch = address.match(/^([^\s,，]+)/);
    return simpleMatch ? simpleMatch[1] : address;
  };

  // 搜索同城技师
  const searchTechnicians = async () => {
    setLoadingTechnicians(true);
    setError('');

    try {
      const city = extractCityFromAddress(bookingForm.service_address);

      // 查询技师
      let query = supabase
        .from('technicians')
        .select('*')
        .eq('status', 'approved')
        .contains('service_area', [city]);

      // 如果选择了服务类型，筛选匹配的技师
      if (bookingForm.service_type) {
        query = query.contains('service_categories', [bookingForm.service_type]);
      }

      const { data, error } = await query.order('rating', { ascending: false });

      if (error) throw error;

      setMatchedTechnicians(data || []);

      if (data && data.length > 0) {
        setBookingStep(2);
      } else {
        setError(region === 'us'
          ? `No technicians found in ${city}. Try a different location.`
          : `在${city}没有找到技师。请尝试其他地址。`);
      }
    } catch (error) {
      console.error('Error searching technicians:', error);
      setError(region === 'us' ? 'Failed to search technicians' : '搜索技师失败');
    } finally {
      setLoadingTechnicians(false);
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

  // 用户注册
  const handleUserRegister = async (e) => {
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
      // 1. 创建 Auth 用户
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: registerData.email,
        password: registerData.password
      });

      if (authError) throw authError;

      // 2. 在 users 表创建用户记录
      const { error: insertError } = await supabase
        .from('users')
        .insert([{
          id: authData.user.id,
          email: registerData.email,
          name: registerData.name,
          phone: registerData.phone,
          city: registerData.city,
          preference: registerData.preference,
          region: region,
          status: 'approved'
        }]);

      if (insertError) throw insertError;

      alert(region === 'us'
        ? 'Account created successfully!'
        : '账号创建成功！');

      setAuthMode('login');
    } catch (error) {
      setError(error.message || (region === 'us' ? 'Registration failed' : '注册失败'));
    } finally {
      setLoading(false);
    }
  };

  // 技师注册
  const handleTechnicianRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!technicianData.email || !technicianData.password || !technicianData.name ||
        !technicianData.phone || !technicianData.city || !technicianData.hourly_rate ||
        technicianData.service_categories.length === 0) {
      setError(region === 'us' ? 'Please fill all required fields' : '请填写所有必填字段');
      setLoading(false);
      return;
    }

    if (technicianData.password.length < 6) {
      setError(region === 'us' ? 'Password must be at least 6 characters' : '密码至少6个字符');
      setLoading(false);
      return;
    }

    try {
      // 1. 创建 Auth 用户
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: technicianData.email,
        password: technicianData.password
      });

      if (authError) throw authError;

      // 2. 在 users 表创建用户记录
      const { error: userError } = await supabase
        .from('users')
        .insert([{
          id: authData.user.id,
          email: technicianData.email,
          name: technicianData.name,
          phone: technicianData.phone,
          city: technicianData.city,
          region: region,
          status: 'pending'  // 技师需要审核
        }]);

      if (userError) throw userError;

      // 3. 在 technicians 表创建技师记录
      const { error: techError } = await supabase
        .from('technicians')
        .insert([{
          user_id: authData.user.id,
          name: technicianData.name,
          email: technicianData.email,
          phone: technicianData.phone,
          service_area: [technicianData.city],
          service_categories: technicianData.service_categories,
          hourly_rate: parseFloat(technicianData.hourly_rate),
          client_preference: technicianData.client_preference,
          gender: technicianData.gender,
          bio: technicianData.bio || '',
          tools: technicianData.tools || '',
          rating: 5.0,
          jobs_completed: 0,
          status: 'pending',  // 需要审核
          region: region
        }]);

      if (techError) throw techError;

      alert(region === 'us'
        ? 'Technician account created! Please wait for approval.'
        : '技师账号创建成功！请等待审核。');

      setAuthMode('login');
      setTechnicianData({
        email: '', password: '', name: '', phone: '', city: '',
        service_categories: [], hourly_rate: '', gender: 'female',
        bio: '', tools: '', client_preference: 'women-only'
      });
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

  // 提交预约 - 第一步：填写信息
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

    // 第一步：搜索技师
    if (bookingStep === 1) {
      await searchTechnicians();
    }
    // 第二步：确认预约
    else if (bookingStep === 2) {
      if (!selectedTechnician) {
        setError(region === 'us' ? 'Please select a technician' : '请选择一位技师');
        return;
      }
      await submitBooking();
    }
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
          technician_id: selectedTechnician?.id || null,
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

      // 重置表单
      setBookingForm({
        service_type: '',
        service_address: '',
        description: '',
        preferred_date: '',
        preferred_time: '',
        photo_url: null
      });
      setPendingBooking(null);
      setBookingStep(1);
      setMatchedTechnicians([]);
      setSelectedTechnician(null);

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

  // 重置预约流程（当用户导航回首页或其他页面时）
  const resetBookingFlow = () => {
    setBookingStep(1);
    setMatchedTechnicians([]);
    setSelectedTechnician(null);
    setError('');
  };

  // 监听页面切换，重置预约流程
  useEffect(() => {
    if (currentPage !== 'booking') {
      resetBookingFlow();
    }
  }, [currentPage]);

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
        login: 'Login',
        registerUser: 'Register as User',
        registerTech: 'Register as Technician',
        email: 'Email',
        password: 'Password',
        name: 'Full Name',
        phone: 'Phone Number',
        city: 'City',
        loginBtn: 'Log In',
        registerBtn: 'Create Account',
        noAccount: "Don't have an account?",
        haveAccount: 'Have an account?',
        signUp: 'Sign up',
        signIn: 'Sign in',
        // 技师专用字段
        hourlyRate: 'Hourly Rate ($)',
        serviceCategories: 'Service Categories',
        gender: 'Gender',
        bio: 'Bio / About You',
        tools: 'Tools You Own',
        clientPreference: 'Client Preference',
        selectCategories: 'Select all that apply...',
        categories: {
          plumbing: 'Plumbing',
          electrical: 'Electrical',
          hvac: 'HVAC',
          carpentry: 'Carpentry',
          painting: 'Painting',
          appliance: 'Appliance Repair',
          gardening: 'Gardening & Lawn Care',
          landscaping: 'Landscaping',
          cleaning: 'House Cleaning',
          moving: 'Moving & Furniture Assembly',
          roofing: 'Roofing',
          flooring: 'Flooring',
          window_repair: 'Window & Door Repair',
          gutter_cleaning: 'Gutter Cleaning',
          auto_repair: 'Auto Repair',
          pet_care: 'Pet Care',
          other: 'Other'
        },
        genders: {
          female: 'Female',
          male: 'Male',
          nonBinary: 'Non-binary',
          preferNotToSay: 'Prefer not to say'
        },
        preferences: {
          womenOnly: 'Women Only',
          anyone: 'Anyone',
          lgbtqFriendly: 'LGBTQ+ Friendly'
        }
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
          appliance: 'Appliance Repair',
          gardening: 'Gardening & Lawn Care',
          landscaping: 'Landscaping',
          cleaning: 'House Cleaning',
          moving: 'Moving & Furniture Assembly',
          roofing: 'Roofing',
          flooring: 'Flooring',
          window_repair: 'Window & Door Repair',
          gutter_cleaning: 'Gutter Cleaning',
          auto_repair: 'Auto Repair',
          pet_care: 'Pet Care',
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
        login: '登录',
        registerUser: '注册用户',
        registerTech: '注册技师',
        email: '邮箱',
        password: '密码',
        name: '姓名',
        phone: '手机号',
        city: '城市',
        loginBtn: '登录',
        registerBtn: '创建账号',
        noAccount: '还没有账号？',
        haveAccount: '已有账号？',
        signUp: '注册',
        signIn: '登录',
        // 技师专用字段
        hourlyRate: '时薪（元）',
        serviceCategories: '服务类别',
        gender: '性别',
        bio: '个人简介',
        tools: '拥有工具',
        clientPreference: '客户偏好',
        selectCategories: '选择所有适用项...',
        categories: {
          plumbing: '水管维修',
          electrical: '电路维修',
          hvac: '空调暖气',
          carpentry: '木工',
          painting: '油漆粉刷',
          appliance: '家电维修',
          gardening: '园艺与草坪维护',
          landscaping: '景观美化',
          cleaning: '家庭清洁',
          moving: '搬家与家具组装',
          roofing: '屋顶维修',
          flooring: '地板维修',
          window_repair: '门窗维修',
          gutter_cleaning: '排水沟清洁',
          auto_repair: '汽车维修',
          pet_care: '宠物护理',
          other: '其他'
        },
        genders: {
          female: '女',
          male: '男',
          nonBinary: '非二元',
          preferNotToSay: '不愿透露'
        },
        preferences: {
          womenOnly: '仅限女性',
          anyone: '不限',
          lgbtqFriendly: 'LGBTQ+友好'
        }
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
          appliance: '家电维修',
          gardening: '园艺与草坪维护',
          landscaping: '景观美化',
          cleaning: '家庭清洁',
          moving: '搬家与家具组装',
          roofing: '屋顶维修',
          flooring: '地板维修',
          window_repair: '门窗维修',
          gutter_cleaning: '排水沟清洁',
          auto_repair: '汽车维修',
          pet_care: '宠物护理',
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

          {/* 桌面端菜单 */}
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

          {/* 移动端菜单按钮和语言切换 */}
          <div className="flex md:hidden items-center gap-4">
            <button
              onClick={() => setRegion(region === 'us' ? 'cn' : 'us')}
              className="hover:text-pink-500"
              aria-label="Switch Language"
            >
              <Globe size={24} />
            </button>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="hover:text-pink-500"
              aria-label="Toggle Menu"
            >
              {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>

        {/* 移动端下拉菜单 */}
        {isMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-200 shadow-lg">
            <div className="flex flex-col py-2">
              <button
                onClick={() => { setCurrentPage('home'); setIsMenuOpen(false); }}
                className="px-4 py-3 text-left hover:bg-pink-50 hover:text-pink-500"
              >
                {c.nav.home}
              </button>
              <button
                onClick={() => { setCurrentPage('booking'); setIsMenuOpen(false); }}
                className="px-4 py-3 text-left hover:bg-pink-50 hover:text-pink-500"
              >
                {c.nav.booking}
              </button>
              {currentUser ? (
                <>
                  <button
                    onClick={() => { setCurrentPage('dashboard'); setIsMenuOpen(false); }}
                    className="px-4 py-3 text-left hover:bg-pink-50 hover:text-pink-500"
                  >
                    {c.nav.dashboard}
                  </button>
                  <button
                    onClick={() => { handleLogout(); setIsMenuOpen(false); }}
                    className="px-4 py-3 text-left hover:bg-pink-50 hover:text-pink-500 flex items-center gap-2"
                  >
                    <LogOut size={18} />{c.nav.logout}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => { setCurrentPage('auth'); setIsMenuOpen(false); }}
                  className="px-4 py-3 text-left hover:bg-pink-50 hover:text-pink-500"
                >
                  {c.nav.login}
                </button>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* 主页 */}
      {currentPage === 'home' && (
        <>
          {/* Hero Section */}
          <div className="bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 pt-20 pb-16 px-4">
            <div className="max-w-6xl mx-auto text-center">
              <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-4">
                {region === 'us' ? 'Fix it. Own it.' : '她修她世界'}
              </h1>
              <p className="text-2xl text-gray-700 mb-8">
                {region === 'us' ? 'Safe repair for women by women' : '为女性打造的安全维修社区'}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button onClick={() => setCurrentPage('booking')} className="bg-pink-500 hover:bg-pink-600 text-white px-8 py-4 rounded-full font-semibold shadow-lg">
                  {region === 'us' ? 'Book a Service' : '预约服务'}
                </button>
                {!currentUser && (
                  <button onClick={() => setCurrentPage('auth')} className="bg-white text-pink-500 border-2 border-pink-500 px-8 py-4 rounded-full font-semibold shadow-lg">
                    {region === 'us' ? 'Register' : '注册'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Why Choose Us */}
          <div className="py-16 px-4 bg-white">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-4xl font-bold text-center mb-12">
                {region === 'us' ? 'Why Choose SheFixes?' : '为什么选择SheFixes？'}
              </h2>
              <div className="grid md:grid-cols-3 gap-8">
                <div className="text-center p-6">
                  <div className="bg-pink-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Shield className="text-pink-500" size={40} />
                  </div>
                  <h3 className="text-xl font-bold mb-3">
                    {region === 'us' ? 'Safe & Trusted' : '安全可信'}
                  </h3>
                  <p className="text-gray-600">
                    {region === 'us'
                      ? 'All technicians and users are verified through selfie verification for your safety'
                      : '所有技师和用户均经过自拍审核，确保安全'}
                  </p>
                </div>
                <div className="text-center p-6">
                  <div className="bg-purple-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Heart className="text-purple-500" size={40} />
                  </div>
                  <h3 className="text-xl font-bold mb-3">
                    {region === 'us' ? 'Women-Focused' : '女性优先'}
                  </h3>
                  <p className="text-gray-600">
                    {region === 'us'
                      ? 'Empowering women technicians and providing comfortable service for women clients'
                      : '赋能女性技师，为女性客户提供舒适的服务体验'}
                  </p>
                </div>
                <div className="text-center p-6">
                  <div className="bg-blue-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Star className="text-blue-500" size={40} />
                  </div>
                  <h3 className="text-xl font-bold mb-3">
                    {region === 'us' ? 'Community Platform' : '公益平台'}
                  </h3>
                  <p className="text-gray-600">
                    {region === 'us'
                      ? 'Non-profit platform connecting women. Price and details are negotiable between parties. Our mission: helping women thrive together'
                      : '公益性质平台，只提供沟通桥梁。价格、时间可双方协商。初心：帮助女性都过得更好'}
                  </p>
                </div>
              </div>

              {/* 平台说明 */}
              <div className="mt-12 bg-gradient-to-r from-pink-50 to-purple-50 rounded-2xl p-8">
                <div className="max-w-4xl mx-auto">
                  <h3 className="text-2xl font-bold mb-4 text-center">
                    {region === 'us' ? '💝 About Our Platform' : '💝 关于平台'}
                  </h3>
                  <div className="space-y-3 text-gray-700">
                    <p className="flex items-start gap-2">
                      <span className="text-pink-500 font-bold">•</span>
                      <span>
                        {region === 'us'
                          ? 'This is a non-profit community platform. We only provide a communication space for connection.'
                          : '本平台为公益性质，仅提供沟通平台，帮助双方建立联系。'}
                      </span>
                    </p>
                    <p className="flex items-start gap-2">
                      <span className="text-pink-500 font-bold">•</span>
                      <span>
                        {region === 'us'
                          ? 'Price, time, and tool costs are negotiable between both parties. You can also switch to other platforms for communication.'
                          : '具体的价格、时间以及各种工具的损耗和使用双方可以自行协商。如果双方愿意转到别的平台联系也可以。'}
                      </span>
                    </p>
                    <p className="flex items-start gap-2">
                      <span className="text-pink-500 font-bold">•</span>
                      <span>
                        {region === 'us'
                          ? 'This policy will remain even if we add paid features in the future. Our mission is to help all women thrive together.'
                          : '这一条即使付费后也不会取消，因为做这个平台的初衷就是希望能帮助女性都过得更好。'}
                      </span>
                    </p>
                    <p className="flex items-start gap-2">
                      <span className="text-pink-500 font-bold">•</span>
                      <span>
                        {region === 'us'
                          ? 'After service completion, both parties leave ratings and reviews for each other to build trust in our community.'
                          : '服务结束后，双方互相留下评分以及评价，共同建设信任社区。'}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Services Section */}
          <div className="py-16 px-4 bg-gray-50">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-4xl font-bold text-center mb-4">
                {region === 'us' ? 'Our Services' : '我们的服务'}
              </h2>
              <p className="text-center text-gray-600 mb-12 text-lg">
                {region === 'us'
                  ? 'From home repairs to lawn care, we\'ve got you covered'
                  : '从家庭维修到园艺护理，我们为您提供全方位服务'}
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {[
                  { key: 'plumbing', icon: '🔧' },
                  { key: 'electrical', icon: '⚡' },
                  { key: 'hvac', icon: '❄️' },
                  { key: 'carpentry', icon: '🔨' },
                  { key: 'painting', icon: '🎨' },
                  { key: 'appliance', icon: '🔌' },
                  { key: 'gardening', icon: '🌿' },
                  { key: 'landscaping', icon: '🌳' },
                  { key: 'cleaning', icon: '🧹' },
                  { key: 'moving', icon: '📦' },
                  { key: 'roofing', icon: '🏠' },
                  { key: 'flooring', icon: '🪵' },
                  { key: 'window_repair', icon: '🪟' },
                  { key: 'gutter_cleaning', icon: '🚿' },
                  { key: 'auto_repair', icon: '🚗' },
                  { key: 'pet_care', icon: '🐾' },
                  { key: 'other', icon: '🛠️' },
                ].map(({ key, icon }) => (
                  <div
                    key={key}
                    onClick={() => {
                      setBookingForm({ ...bookingForm, service_type: key });
                      setCurrentPage('booking');
                    }}
                    className="bg-white rounded-xl p-6 text-center hover:shadow-lg transition-shadow cursor-pointer group"
                  >
                    <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">{icon}</div>
                    <h3 className="font-semibold text-sm text-gray-800">
                      {c.booking.services[key]}
                    </h3>
                  </div>
                ))}
              </div>
              <div className="text-center mt-8">
                <button
                  onClick={() => setCurrentPage('booking')}
                  className="bg-pink-500 hover:bg-pink-600 text-white px-8 py-3 rounded-full font-semibold"
                >
                  {region === 'us' ? 'Book Now' : '立即预约'}
                </button>
              </div>
            </div>
          </div>

          {/* How It Works */}
          <div className="py-16 px-4 bg-white">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-4xl font-bold text-center mb-12">
                {region === 'us' ? 'How It Works' : '如何使用'}
              </h2>

              {/* 用户流程 */}
              <div className="mb-12">
                <h3 className="text-2xl font-bold mb-6 text-pink-500">
                  {region === 'us' ? '👤 For Users' : '👤 用户端'}
                </h3>
                <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-6">
                  <div className="text-center">
                    <div className="bg-pink-500 text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 text-lg font-bold">
                      1
                    </div>
                    <h4 className="text-lg font-bold mb-2">
                      {region === 'us' ? 'Register' : '注册账号'}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {region === 'us'
                        ? 'Sign up with name, email, and phone'
                        : '姓名、邮箱、手机号'}
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="bg-pink-500 text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 text-lg font-bold">
                      2
                    </div>
                    <h4 className="text-lg font-bold mb-2">
                      {region === 'us' ? 'Selfie Verification' : '自拍审核'}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {region === 'us'
                        ? 'Take selfie before first order (camera only, for verification only, not stored)'
                        : '下第一单前自拍（不可从相册上传，仅供审核，不储存）'}
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="bg-pink-500 text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 text-lg font-bold">
                      3
                    </div>
                    <h4 className="text-lg font-bold mb-2">
                      {region === 'us' ? 'Browse & Book' : '选择下单'}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {region === 'us'
                        ? 'Select service, enter address, view local technicians with hourly rates'
                        : '选择服务、输入地址，查看同城技师及时薪'}
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="bg-pink-500 text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 text-lg font-bold">
                      4
                    </div>
                    <h4 className="text-lg font-bold mb-2">
                      {region === 'us' ? 'Negotiate & Connect' : '协商沟通'}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {region === 'us'
                        ? 'Discuss price, time, and details. You can also switch to other platforms'
                        : '协商价格、时间、工具等，可转至别的平台联系'}
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="bg-pink-500 text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 text-lg font-bold">
                      5
                    </div>
                    <h4 className="text-lg font-bold mb-2">
                      {region === 'us' ? 'Review & Rate' : '评分评价'}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {region === 'us'
                        ? 'Leave rating and review after service'
                        : '服务结束后互相留下评分评价'}
                    </p>
                  </div>
                </div>
              </div>

              {/* 技师流程 */}
              <div>
                <h3 className="text-2xl font-bold mb-6 text-purple-500">
                  {region === 'us' ? '👩‍🔧 For Technicians' : '👩‍🔧 技师端'}
                </h3>
                <div className="grid md:grid-cols-4 gap-6">
                  <div className="text-center">
                    <div className="bg-purple-500 text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 text-lg font-bold">
                      1
                    </div>
                    <h4 className="text-lg font-bold mb-2">
                      {region === 'us' ? 'Register with Selfie' : '注册+自拍'}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {region === 'us'
                        ? 'Fill in name, email, phone, services, tools, city, hourly rate. Must take selfie during registration (camera only, not stored)'
                        : '姓名、邮箱、手机号、服务种类、工具、城市、时薪。注册时必须自拍（不可相册，不储存）'}
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="bg-purple-500 text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 text-lg font-bold">
                      2
                    </div>
                    <h4 className="text-lg font-bold mb-2">
                      {region === 'us' ? 'Admin Approval' : '管理员审核'}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {region === 'us'
                        ? 'Wait for admin to verify your selfie and approve your account'
                        : '等待管理员审核自拍，审核通过后可接单'}
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="bg-purple-500 text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 text-lg font-bold">
                      3
                    </div>
                    <h4 className="text-lg font-bold mb-2">
                      {region === 'us' ? 'Receive & Negotiate' : '接单协商'}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {region === 'us'
                        ? 'Receive orders, discuss price and time with customers'
                        : '接收订单，与客户协商价格和时间'}
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="bg-purple-500 text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 text-lg font-bold">
                      4
                    </div>
                    <h4 className="text-lg font-bold mb-2">
                      {region === 'us' ? 'Review & Rate' : '评分评价'}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {region === 'us'
                        ? 'Leave rating and review after service'
                        : '服务结束后互相留下评分评价'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="py-16 px-4 bg-white">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-4xl font-bold mb-4">
                {region === 'us' ? 'Ready to get started?' : '准备开始了吗？'}
              </h2>
              <p className="text-xl text-gray-600 mb-8">
                {region === 'us'
                  ? 'Join thousands of women who trust SheFixes for their home service needs'
                  : '加入数千名信赖SheFixes的女性，获得优质的家庭服务'}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button onClick={() => setCurrentPage('booking')} className="bg-pink-500 hover:bg-pink-600 text-white px-8 py-4 rounded-full font-semibold shadow-lg">
                  {region === 'us' ? 'Book a Service' : '预约服务'}
                </button>
                {!currentUser && (
                  <button onClick={() => { setCurrentPage('auth'); setAuthMode('register-technician'); }} className="bg-purple-500 hover:bg-purple-600 text-white px-8 py-4 rounded-full font-semibold shadow-lg">
                    {region === 'us' ? 'Become a Technician' : '成为技师'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* 预约表单页面 */}
      {currentPage === 'booking' && (
        <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 py-16 px-4">
          <div className="max-w-5xl mx-auto">
            <div className="bg-white rounded-2xl shadow-xl p-8">
              {/* 步骤指示器 */}
              <div className="flex items-center justify-center mb-8">
                <div className="flex items-center gap-4">
                  <div className={`flex items-center gap-2 ${bookingStep === 1 ? 'text-pink-500' : 'text-gray-400'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${bookingStep === 1 ? 'bg-pink-500 text-white' : 'bg-gray-200'}`}>
                      1
                    </div>
                    <span className="font-semibold">
                      {region === 'us' ? 'Service Info' : '服务信息'}
                    </span>
                  </div>
                  <div className="w-12 h-0.5 bg-gray-300"></div>
                  <div className={`flex items-center gap-2 ${bookingStep === 2 ? 'text-pink-500' : 'text-gray-400'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${bookingStep === 2 ? 'bg-pink-500 text-white' : 'bg-gray-200'}`}>
                      2
                    </div>
                    <span className="font-semibold">
                      {region === 'us' ? 'Select Technician' : '选择技师'}
                    </span>
                  </div>
                </div>
              </div>

              <h1 className="text-4xl font-bold mb-8 text-center">
                {bookingStep === 1 ? c.booking.title : (region === 'us' ? 'Select a Technician' : '选择技师')}
              </h1>

              {/* 平台说明 */}
              {bookingStep === 1 && (
                <div className="mb-6 bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg p-4">
                  <p className="text-sm text-gray-700">
                    <span className="font-semibold text-pink-600">
                      {region === 'us' ? '💝 Community Platform:' : '💝 公益平台：'}
                    </span>{' '}
                    {region === 'us'
                      ? 'After submitting, you will see local technicians with their hourly rates. Prices, time, and details are negotiable. You can communicate on our platform or switch to other platforms.'
                      : '提交后会显示同城技师及时薪。价格、时间、工具等可双方协商，可在平台沟通或转至其他平台联系。'}
                  </p>
                </div>
              )}

              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
                  <AlertCircle className="text-red-500" size={20} />
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              {/* 第一步：填写服务信息 */}
              {bookingStep === 1 && (
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
                    {Object.entries(c.booking.services).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
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
                  disabled={loadingTechnicians}
                  className={`w-full py-4 rounded-lg font-semibold text-white text-lg ${loadingTechnicians ? 'bg-gray-400' : 'bg-pink-500 hover:bg-pink-600'}`}
                >
                  {loadingTechnicians ? '...' : (region === 'us' ? 'Search Technicians' : '搜索技师')}
                </button>
              </form>
              )}

              {/* 第二步：选择技师 */}
              {bookingStep === 2 && (
                <div>
                  {/* 订单信息摘要 */}
                  <div className="mb-6 bg-gray-50 rounded-lg p-4">
                    <h3 className="font-semibold mb-2">{region === 'us' ? 'Service Details:' : '服务详情：'}</h3>
                    <div className="text-sm text-gray-700 space-y-1">
                      <p><span className="font-medium">{region === 'us' ? 'Service:' : '服务：'}</span> {c.booking.services[bookingForm.service_type]}</p>
                      <p><span className="font-medium">{region === 'us' ? 'Address:' : '地址：'}</span> {bookingForm.service_address}</p>
                      <p><span className="font-medium">{region === 'us' ? 'Date:' : '日期：'}</span> {bookingForm.preferred_date} {bookingForm.preferred_time}</p>
                    </div>
                    <button
                      onClick={() => setBookingStep(1)}
                      className="mt-3 text-pink-500 text-sm hover:underline"
                    >
                      {region === 'us' ? '← Edit Service Info' : '← 修改服务信息'}
                    </button>
                  </div>

                  {/* 技师列表 */}
                  <div className="space-y-4 mb-6">
                    <h3 className="font-bold text-xl">
                      {region === 'us' ? `Found ${matchedTechnicians.length} Technicians` : `找到 ${matchedTechnicians.length} 位技师`}
                    </h3>

                    {matchedTechnicians.map((tech) => (
                      <div
                        key={tech.id}
                        onClick={() => setSelectedTechnician(tech)}
                        className={`border-2 rounded-xl p-6 cursor-pointer transition-all hover:shadow-lg ${
                          selectedTechnician?.id === tech.id
                            ? 'border-pink-500 bg-pink-50'
                            : 'border-gray-200 hover:border-pink-300'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="relative">
                                <div className="text-4xl">👩‍🔧</div>
                                {tech.selfie_verified && (
                                  <div className="absolute -bottom-1 -right-1">
                                    <VerifiedBadge size="sm" region={region} />
                                  </div>
                                )}
                              </div>
                              <div>
                                <h4 className="font-bold text-lg">{tech.name}</h4>
                                <div className="flex items-center gap-2">
                                  <div className="flex items-center gap-1">
                                    <Star className="text-yellow-400 fill-yellow-400" size={16} />
                                    <span className="font-semibold">{tech.rating}</span>
                                  </div>
                                  <span className="text-gray-400">•</span>
                                  <span className="text-sm text-gray-600">
                                    {tech.jobs_completed} {region === 'us' ? 'jobs' : '单'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* 时薪 */}
                            <div className="mb-3">
                              <div className="inline-flex items-center gap-2 bg-green-100 text-green-800 px-3 py-1 rounded-full">
                                <DollarSign size={16} />
                                <span className="font-bold">
                                  {region === 'us' ? `$${tech.hourly_rate}/hr` : `¥${tech.hourly_rate}/小时`}
                                </span>
                                <span className="text-xs text-green-600">
                                  ({region === 'us' ? 'Negotiable' : '可协商'})
                                </span>
                              </div>
                            </div>

                            {/* 服务类别 */}
                            <div className="mb-2">
                              <span className="text-sm font-medium text-gray-600">
                                {region === 'us' ? 'Services: ' : '服务类别：'}
                              </span>
                              <div className="flex flex-wrap gap-2 mt-1">
                                {tech.service_categories?.slice(0, 4).map((cat) => (
                                  <span key={cat} className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                                    {c.booking.services[cat] || cat}
                                  </span>
                                ))}
                                {tech.service_categories?.length > 4 && (
                                  <span className="text-xs text-gray-500">
                                    +{tech.service_categories.length - 4} {region === 'us' ? 'more' : '更多'}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* 工具 */}
                            {tech.tools && (
                              <div className="text-sm text-gray-600">
                                <span className="font-medium">{region === 'us' ? 'Tools: ' : '工具：'}</span>
                                {tech.tools}
                              </div>
                            )}

                            {/* 个人简介 */}
                            {tech.bio && (
                              <div className="mt-3 text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                                "{tech.bio}"
                              </div>
                            )}
                          </div>

                          {/* 选中标记 */}
                          {selectedTechnician?.id === tech.id && (
                            <div className="ml-4">
                              <CheckCircle className="text-pink-500" size={32} />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* 确认预约按钮 */}
                  <form onSubmit={handleBookingSubmit}>
                    <button
                      type="submit"
                      disabled={loading || !selectedTechnician}
                      className={`w-full py-4 rounded-lg font-semibold text-white text-lg ${
                        loading || !selectedTechnician ? 'bg-gray-400' : 'bg-pink-500 hover:bg-pink-600'
                      }`}
                    >
                      {loading ? '...' : (region === 'us' ? 'Confirm Booking' : '确认预约')}
                    </button>
                  </form>

                  {!selectedTechnician && (
                    <p className="text-center text-sm text-gray-500 mt-3">
                      {region === 'us' ? 'Please select a technician to continue' : '请选择一位技师以继续'}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 登录/注册页面 */}
      {currentPage === 'auth' && !currentUser && (
        <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-2xl">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold mb-2">SheFixes</h1>
              <p className="text-gray-600">
                {authMode === 'login'
                  ? (region === 'us' ? 'Welcome back!' : '欢迎回来！')
                  : (region === 'us' ? 'Join us' : '加入我们')}
              </p>
            </div>

            {/* 三个标签页 */}
            <div className="bg-white rounded-2xl p-2 mb-6 grid grid-cols-3 gap-2 shadow-sm">
              <button onClick={() => setAuthMode('login')}
                className={`py-3 rounded-xl font-semibold transition ${authMode === 'login' ? 'bg-pink-500 text-white' : 'text-gray-600'}`}>
                {c.auth.login}
              </button>
              <button onClick={() => setAuthMode('register-user')}
                className={`py-3 rounded-xl font-semibold transition ${authMode === 'register-user' ? 'bg-pink-500 text-white' : 'text-gray-600'}`}>
                {c.auth.registerUser}
              </button>
              <button onClick={() => setAuthMode('register-technician')}
                className={`py-3 rounded-xl font-semibold transition ${authMode === 'register-technician' ? 'bg-pink-500 text-white' : 'text-gray-600'}`}>
                {c.auth.registerTech}
              </button>
            </div>

            <div className="bg-white rounded-2xl shadow-xl p-8 max-h-[70vh] overflow-y-auto">
              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
                  <AlertCircle className="text-red-500" size={20} />
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              {/* 登录表单 */}
              {authMode === 'login' && (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">{c.auth.email}</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                      <input type="email" value={loginData.email}
                        onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-pink-500"
                        placeholder="your@email.com" required />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">{c.auth.password}</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                      <input type={showPassword ? 'text' : 'password'} value={loginData.password}
                        onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                        className="w-full pl-10 pr-12 py-3 border rounded-lg focus:ring-2 focus:ring-pink-500"
                        placeholder="••••••••" required />
                      <button type="button" onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </div>
                  <button type="submit" disabled={loading}
                    className={`w-full py-3 rounded-lg font-semibold text-white ${loading ? 'bg-gray-400' : 'bg-pink-500 hover:bg-pink-600'}`}>
                    {loading ? '...' : c.auth.loginBtn}
                  </button>
                </form>
              )}

              {/* 用户注册表单 */}
              {authMode === 'register-user' && (
                <form onSubmit={handleUserRegister} className="space-y-4">
                  {/* 自拍审核说明 */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <div className="flex items-start gap-2">
                      <Camera className="text-blue-500 mt-1" size={20} />
                      <div className="text-sm text-blue-800">
                        <p className="font-semibold mb-1">
                          {region === 'us' ? '📸 Selfie Verification Required' : '📸 需要自拍验证'}
                        </p>
                        <p>
                          {region === 'us'
                            ? 'Before placing your first order, you will need to take a selfie (camera only, no photo upload) for admin verification to ensure women-only access. Your selfie is for verification purposes only and will not be stored in any way.'
                            : '下第一单前需要自拍（不允许从相册上传），经管理员审核是女性后方可下单。这个自拍仅供审核使用，不会以任何方式储存。'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2">{c.auth.email}</label>
                    <input type="email" value={registerData.email}
                      onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-pink-500" required />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">{c.auth.password}</label>
                    <input type={showPassword ? 'text' : 'password'} value={registerData.password}
                      onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-pink-500"
                      placeholder={region === 'us' ? 'At least 6 characters' : '至少6个字符'} required />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">{c.auth.name}</label>
                    <input type="text" value={registerData.name}
                      onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })}
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-pink-500" required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold mb-2">{c.auth.phone}</label>
                      <input type="tel" value={registerData.phone}
                        onChange={(e) => setRegisterData({ ...registerData, phone: e.target.value })}
                        className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-pink-500" required />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2">{c.auth.city}</label>
                      <input type="text" value={registerData.city}
                        onChange={(e) => setRegisterData({ ...registerData, city: e.target.value })}
                        className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-pink-500" required />
                    </div>
                  </div>

                  {/* 账号安全提示 */}
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-xs text-yellow-800">
                      {region === 'us'
                        ? '⚠️ If reported by a technician for not being the account owner, your account will be temporarily suspended pending re-verification.'
                        : '⚠️ 一旦被技师投诉非本人账号就会暂时下线，直到重新审核完毕为止。'}
                    </p>
                  </div>

                  <button type="submit" disabled={loading}
                    className={`w-full py-3 rounded-lg font-semibold text-white ${loading ? 'bg-gray-400' : 'bg-pink-500 hover:bg-pink-600'}`}>
                    {loading ? '...' : c.auth.registerBtn}
                  </button>
                </form>
              )}

              {/* 技师注册表单 */}
              {authMode === 'register-technician' && (
                <form onSubmit={handleTechnicianRegister} className="space-y-4">
                  {/* 技师自拍审核说明 */}
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
                    <div className="flex items-start gap-2">
                      <Camera className="text-purple-500 mt-1" size={20} />
                      <div className="text-sm text-purple-800">
                        <p className="font-semibold mb-1">
                          {region === 'us' ? '📸 Selfie Verification Required at Registration' : '📸 注册时需要自拍验证'}
                        </p>
                        <p>
                          {region === 'us'
                            ? 'During registration, you must take a selfie (camera only, no photo upload) for admin verification. Your selfie is for verification purposes only and will not be stored. If reported by a user for not being the account owner, your account will be temporarily suspended pending re-verification.'
                            : '在注册时就必须自拍（不能由相册上传），经管理员审核后才可以拥有账号。这个自拍仅供审核使用，不会以任何方式储存。一旦被用户投诉非本人账号就会暂时下线，直到重新审核完毕为止。'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold mb-2">{c.auth.email}</label>
                      <input type="email" value={technicianData.email}
                        onChange={(e) => setTechnicianData({ ...technicianData, email: e.target.value })}
                        className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-pink-500" required />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2">{c.auth.password}</label>
                      <input type={showPassword ? 'text' : 'password'} value={technicianData.password}
                        onChange={(e) => setTechnicianData({ ...technicianData, password: e.target.value })}
                        className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-pink-500" required />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold mb-2">{c.auth.name}</label>
                      <input type="text" value={technicianData.name}
                        onChange={(e) => setTechnicianData({ ...technicianData, name: e.target.value })}
                        className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-pink-500" required />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2">{c.auth.phone}</label>
                      <input type="tel" value={technicianData.phone}
                        onChange={(e) => setTechnicianData({ ...technicianData, phone: e.target.value })}
                        className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-pink-500" required />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold mb-2">{c.auth.city}</label>
                      <input type="text" value={technicianData.city}
                        onChange={(e) => setTechnicianData({ ...technicianData, city: e.target.value })}
                        className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-pink-500" required />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2">{c.auth.hourlyRate}</label>
                      <input type="number" step="0.01" value={technicianData.hourly_rate}
                        onChange={(e) => setTechnicianData({ ...technicianData, hourly_rate: e.target.value })}
                        className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-pink-500" required />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2">{c.auth.serviceCategories} *</label>
                    <div className="grid grid-cols-2 gap-2 p-3 border rounded-lg">
                      {Object.entries(c.auth.categories).map(([key, label]) => (
                        <label key={key} className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox"
                            checked={technicianData.service_categories.includes(key)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setTechnicianData({
                                  ...technicianData,
                                  service_categories: [...technicianData.service_categories, key]
                                });
                              } else {
                                setTechnicianData({
                                  ...technicianData,
                                  service_categories: technicianData.service_categories.filter(c => c !== key)
                                });
                              }
                            }}
                            className="w-4 h-4 text-pink-500 rounded" />
                          <span className="text-sm">{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold mb-2">{c.auth.gender}</label>
                      <select value={technicianData.gender}
                        onChange={(e) => setTechnicianData({ ...technicianData, gender: e.target.value })}
                        className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-pink-500">
                        {Object.entries(c.auth.genders).map(([key, label]) => (
                          <option key={key} value={key}>{label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2">{c.auth.clientPreference}</label>
                      <select value={technicianData.client_preference}
                        onChange={(e) => setTechnicianData({ ...technicianData, client_preference: e.target.value })}
                        className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-pink-500">
                        <option value="women-only">{c.auth.preferences.womenOnly}</option>
                        <option value="anyone">{c.auth.preferences.anyone}</option>
                        <option value="lgbtq-friendly">{c.auth.preferences.lgbtqFriendly}</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2">{c.auth.bio}</label>
                    <textarea value={technicianData.bio}
                      onChange={(e) => setTechnicianData({ ...technicianData, bio: e.target.value })}
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-pink-500"
                      rows="3"
                      placeholder={region === 'us' ? 'Tell us about yourself...' : '介绍一下自己...'}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2">{c.auth.tools}</label>
                    <textarea value={technicianData.tools}
                      onChange={(e) => setTechnicianData({ ...technicianData, tools: e.target.value })}
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-pink-500"
                      rows="2"
                      placeholder={region === 'us' ? 'List your tools...' : '列出您的工具...'}
                    />
                  </div>

                  <button type="submit" disabled={loading}
                    className={`w-full py-3 rounded-lg font-semibold text-white ${loading ? 'bg-gray-400' : 'bg-pink-500 hover:bg-pink-600'}`}>
                    {loading ? '...' : c.auth.registerBtn}
                  </button>
                </form>
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
