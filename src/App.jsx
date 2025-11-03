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
    city: '', // 城市字段用于自动匹配
    description: '',
    preferred_date: '',
    preferred_time: '',
    photo_url: null
  });

  // 自动匹配相关数据
  const [matchedTechnicians, setMatchedTechnicians] = useState([]);
  const [selectedTechnician, setSelectedTechnician] = useState(null);
  const [availableTimeSlots, setAvailableTimeSlots] = useState([]);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);
  const [showTechnicianSelection, setShowTechnicianSelection] = useState(false);

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

  // 查找匹配的技师
  const findMatchingTechnicians = async () => {
    if (!bookingForm.service_type || !bookingForm.city) {
      alert(region === 'us' ? 'Please select service type and enter city' : '请选择服务类别和输入城市');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('find_matching_technicians', {
        p_service_type: bookingForm.service_type,
        p_city: bookingForm.city,
        p_preferred_date: bookingForm.preferred_date || null
      });

      if (error) throw error;

      setMatchedTechnicians(data || []);
      setShowTechnicianSelection(true);
    } catch (error) {
      console.error('Error finding technicians:', error);
      alert(region === 'us' ? 'Failed to find technicians. Please try again.' : '查找技师失败，请重试。');
    } finally {
      setLoading(false);
    }
  };

  // 获取技师的可用时间槽
  const getAvailableTimeSlots = async (technicianId, date) => {
    try {
      const { data, error } = await supabase.rpc('get_available_slots', {
        p_technician_id: technicianId,
        p_date: date
      });

      if (error) throw error;

      setAvailableTimeSlots(data || []);
    } catch (error) {
      console.error('Error fetching time slots:', error);
      alert(region === 'us' ? 'Failed to fetch available times' : '获取可用时间失败');
    }
  };

  // 选择技师
  const handleSelectTechnician = (technician) => {
    setSelectedTechnician(technician);
    if (bookingForm.preferred_date) {
      getAvailableTimeSlots(technician.technician_id, bookingForm.preferred_date);
    }
  };

  // 选择时间槽
  const handleSelectTimeSlot = (slot) => {
    setSelectedTimeSlot(slot);
    setBookingForm({
      ...bookingForm,
      preferred_time: slot.time_slot
    });
  };

  // 确认预订
  const confirmBooking = async () => {
    if (!selectedTechnician || !selectedTimeSlot) {
      alert(region === 'us' ? 'Please select a technician and time slot' : '请选择技师和时间段');
      return;
    }

    // 检查自拍验证状态
    if (!userSelfieVerified) {
      setPendingBooking({
        ...bookingForm,
        technician_id: selectedTechnician.technician_id,
        time_slot_id: selectedTimeSlot.slot_id
      });
      setShowSelfieVerification(true);
      return;
    }

    await submitBookingWithTechnician();
  };

  // 提交预约（带技师和时间槽）
  const submitBookingWithTechnician = async () => {
    setError('');
    setLoading(true);

    try {
      const bookingData = pendingBooking || {
        ...bookingForm,
        technician_id: selectedTechnician.technician_id,
        time_slot_id: selectedTimeSlot.slot_id
      };

      // 创建预订
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert([{
          user_id: currentUser.id,
          technician_id: bookingData.technician_id,
          service_type: bookingData.service_type,
          service_address: bookingData.service_address,
          description: bookingData.description,
          preferred_date: bookingData.preferred_date,
          preferred_time: bookingData.preferred_time,
          status: 'confirmed', // 自动确认
          photo_url: bookingData.photo_url
        }])
        .select();

      if (bookingError) throw bookingError;

      // 更新时间槽为已预订
      const { error: slotError } = await supabase
        .from('technician_availability')
        .update({
          is_booked: true,
          booking_id: booking[0].id
        })
        .eq('id', bookingData.time_slot_id);

      if (slotError) throw slotError;

      alert(region === 'us' ? 'Booking confirmed successfully!' : '预约确认成功！');

      // 重置表单和状态
      setBookingForm({
        service_type: '',
        service_address: '',
        city: '',
        description: '',
        preferred_date: '',
        preferred_time: '',
        photo_url: null
      });
      setMatchedTechnicians([]);
      setSelectedTechnician(null);
      setAvailableTimeSlots([]);
      setSelectedTimeSlot(null);
      setShowTechnicianSelection(false);
      setPendingBooking(null);

      setCurrentPage('dashboard');
      await fetchUserBookings(currentUser.id);
    } catch (error) {
      console.error('Error submitting booking:', error);
      setError(error.message);
      alert(region === 'us' ? 'Failed to create booking' : '创建预约失败');
    } finally {
      setLoading(false);
    }
  };

  // 提交预约（旧方法 - 保持向后兼容）
  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser) {
      alert(region === 'us' ? 'Please login first' : '请先登录');
      setCurrentPage('auth');
      return;
    }

    // 如果已填写城市和服务类别，显示匹配技师
    if (bookingForm.city && bookingForm.service_type) {
      await findMatchingTechnicians();
    } else {
      alert(region === 'us' ? 'Please select service type and enter city' : '请选择服务类别和输入城市');
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
      // 检查是否是新的预订流程（有technician_id）
      if (pendingBooking.technician_id) {
        await submitBookingWithTechnician();
      } else {
        await submitBooking();
      }
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
                      ? 'All technicians are verified and background-checked for your safety'
                      : '所有技师均经过身份验证和背景调查，确保您的安全'}
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
                    {region === 'us' ? 'Quality Service' : '优质服务'}
                  </h3>
                  <p className="text-gray-600">
                    {region === 'us'
                      ? 'Professional, skilled technicians with excellent customer reviews'
                      : '专业熟练的技师，优质的客户评价'}
                  </p>
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
              <div className="grid md:grid-cols-4 gap-8">
                <div className="text-center">
                  <div className="bg-pink-500 text-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                    1
                  </div>
                  <h3 className="text-xl font-bold mb-3">
                    {region === 'us' ? 'Book Service' : '预约服务'}
                  </h3>
                  <p className="text-gray-600">
                    {region === 'us'
                      ? 'Choose your service and tell us what you need'
                      : '选择服务类型，告诉我们您的需求'}
                  </p>
                </div>
                <div className="text-center">
                  <div className="bg-pink-500 text-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                    2
                  </div>
                  <h3 className="text-xl font-bold mb-3">
                    {region === 'us' ? 'Get Matched' : '匹配技师'}
                  </h3>
                  <p className="text-gray-600">
                    {region === 'us'
                      ? 'We connect you with qualified technicians'
                      : '我们为您匹配合适的专业技师'}
                  </p>
                </div>
                <div className="text-center">
                  <div className="bg-pink-500 text-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                    3
                  </div>
                  <h3 className="text-xl font-bold mb-3">
                    {region === 'us' ? 'Schedule Time' : '安排时间'}
                  </h3>
                  <p className="text-gray-600">
                    {region === 'us'
                      ? 'Confirm appointment time that works for you'
                      : '确认适合您的服务时间'}
                  </p>
                </div>
                <div className="text-center">
                  <div className="bg-pink-500 text-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                    4
                  </div>
                  <h3 className="text-xl font-bold mb-3">
                    {region === 'us' ? 'Get It Fixed' : '完成服务'}
                  </h3>
                  <p className="text-gray-600">
                    {region === 'us'
                      ? 'Enjoy quality service and leave a review'
                      : '享受优质服务并留下评价'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Section */}
          <div className="py-16 px-4 bg-gradient-to-r from-pink-500 to-purple-500 text-white">
            <div className="max-w-6xl mx-auto">
              <div className="grid md:grid-cols-4 gap-8 text-center">
                <div>
                  <div className="text-5xl font-bold mb-2">5000+</div>
                  <p className="text-pink-100">
                    {region === 'us' ? 'Happy Clients' : '满意客户'}
                  </p>
                </div>
                <div>
                  <div className="text-5xl font-bold mb-2">500+</div>
                  <p className="text-pink-100">
                    {region === 'us' ? 'Verified Technicians' : '认证技师'}
                  </p>
                </div>
                <div>
                  <div className="text-5xl font-bold mb-2">15+</div>
                  <p className="text-pink-100">
                    {region === 'us' ? 'Service Categories' : '服务类别'}
                  </p>
                </div>
                <div>
                  <div className="text-5xl font-bold mb-2">4.9</div>
                  <p className="text-pink-100">
                    {region === 'us' ? 'Average Rating' : '平均评分'}
                  </p>
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
                    {Object.entries(c.booking.services).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      placeholder={region === 'us' ? 'Full address' : '完整地址'}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2 flex items-center gap-2">
                      <Home size={18} />
                      {region === 'us' ? 'City' : '城市'}
                    </label>
                    <input
                      type="text"
                      value={bookingForm.city}
                      onChange={(e) => setBookingForm({ ...bookingForm, city: e.target.value })}
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-pink-500"
                      placeholder={region === 'us' ? 'e.g., San Francisco' : '例如：北京'}
                      required
                    />
                  </div>
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
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
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
                  {loading ? '...' : (region === 'us' ? 'Find Available Technicians' : '查找可用技师')}
                </button>
              </form>
            </div>
          </div>

          {/* Technician Selection Modal */}
          {showTechnicianSelection && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b p-6 flex justify-between items-center">
                  <h2 className="text-2xl font-bold">
                    {region === 'us' ? 'Select a Technician' : '选择技师'}
                  </h2>
                  <button
                    onClick={() => {
                      setShowTechnicianSelection(false);
                      setMatchedTechnicians([]);
                      setSelectedTechnician(null);
                      setAvailableTimeSlots([]);
                    }}
                    className="p-2 hover:bg-gray-100 rounded-full"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="p-6">
                  {matchedTechnicians.length === 0 ? (
                    <div className="text-center py-12">
                      <AlertCircle className="mx-auto mb-4 text-gray-400" size={48} />
                      <p className="text-gray-600">
                        {region === 'us'
                          ? 'No technicians available for your area and service type. Please try a different city or service.'
                          : '该地区和服务类型暂无可用技师。请尝试其他城市或服务。'}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Technician List */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold">
                          {region === 'us' ? `${matchedTechnicians.length} Technicians Found` : `找到 ${matchedTechnicians.length} 位技师`}
                        </h3>
                        {matchedTechnicians.map((tech) => (
                          <div
                            key={tech.technician_id}
                            className={`border rounded-lg p-4 cursor-pointer transition ${
                              selectedTechnician?.technician_id === tech.technician_id
                                ? 'border-pink-500 bg-pink-50'
                                : 'border-gray-200 hover:border-pink-300'
                            }`}
                            onClick={() => handleSelectTechnician(tech)}
                          >
                            <div className="flex items-start gap-4">
                              <img
                                src={tech.photo_url || 'https://i.pravatar.cc/150'}
                                alt={tech.name}
                                className="w-16 h-16 rounded-full object-cover"
                              />
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-semibold">{tech.name}</h4>
                                  {tech.selfie_verified && <VerifiedBadge />}
                                </div>
                                <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
                                  <Star className="text-yellow-500 fill-current" size={16} />
                                  <span className="font-semibold">{tech.rating.toFixed(2)}</span>
                                </div>
                                {tech.hourly_rate && (
                                  <p className="text-sm text-gray-600 mt-1">
                                    ${tech.hourly_rate}/{region === 'us' ? 'hour' : '小时'}
                                  </p>
                                )}
                                <p className="text-sm text-gray-600 mt-2">{tech.bio}</p>
                                {tech.available_slots_count > 0 && (
                                  <p className="text-sm text-green-600 font-semibold mt-2">
                                    {tech.available_slots_count} {region === 'us' ? 'time slots available' : '个可用时间段'}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Time Slot Selection */}
                      <div>
                        <h3 className="text-lg font-semibold mb-4">
                          {region === 'us' ? 'Available Time Slots' : '可用时间段'}
                        </h3>
                        {!selectedTechnician ? (
                          <p className="text-gray-500 text-center py-8">
                            {region === 'us' ? 'Select a technician to see available times' : '选择技师以查看可用时间'}
                          </p>
                        ) : availableTimeSlots.length === 0 ? (
                          <div className="text-center py-8">
                            <Clock className="mx-auto mb-2 text-gray-400" size={32} />
                            <p className="text-gray-500">
                              {region === 'us'
                                ? 'No time slots available for the selected date. Try a different date.'
                                : '所选日期没有可用时间。请尝试其他日期。'}
                            </p>
                          </div>
                        ) : (
                          <>
                            <div className="grid grid-cols-2 gap-2 mb-6">
                              {availableTimeSlots.map((slot) => (
                                <button
                                  key={slot.slot_id}
                                  onClick={() => handleSelectTimeSlot(slot)}
                                  className={`px-4 py-3 rounded-lg border font-semibold transition ${
                                    selectedTimeSlot?.slot_id === slot.slot_id
                                      ? 'bg-pink-500 text-white border-pink-600'
                                      : 'bg-white border-gray-300 hover:border-pink-400'
                                  }`}
                                >
                                  <Clock size={16} className="inline mr-2" />
                                  {slot.time_slot}
                                </button>
                              ))}
                            </div>

                            {selectedTimeSlot && (
                              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                <h4 className="font-semibold mb-2">
                                  {region === 'us' ? 'Booking Summary' : '预订摘要'}
                                </h4>
                                <p className="text-sm">
                                  <strong>{region === 'us' ? 'Technician:' : '技师：'}</strong> {selectedTechnician.name}
                                </p>
                                <p className="text-sm">
                                  <strong>{region === 'us' ? 'Date:' : '日期：'}</strong> {bookingForm.preferred_date}
                                </p>
                                <p className="text-sm">
                                  <strong>{region === 'us' ? 'Time:' : '时间：'}</strong> {selectedTimeSlot.time_slot}
                                </p>
                                <button
                                  onClick={confirmBooking}
                                  disabled={loading}
                                  className={`w-full mt-4 py-3 rounded-lg font-semibold text-white ${
                                    loading ? 'bg-gray-400' : 'bg-green-500 hover:bg-green-600'
                                  }`}
                                >
                                  {loading ? '...' : (region === 'us' ? 'Confirm Booking' : '确认预订')}
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
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
                  <button type="submit" disabled={loading}
                    className={`w-full py-3 rounded-lg font-semibold text-white ${loading ? 'bg-gray-400' : 'bg-pink-500 hover:bg-pink-600'}`}>
                    {loading ? '...' : c.auth.registerBtn}
                  </button>
                </form>
              )}

              {/* 技师注册表单 */}
              {authMode === 'register-technician' && (
                <form onSubmit={handleTechnicianRegister} className="space-y-4">
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