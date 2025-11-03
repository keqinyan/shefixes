import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Plus, Trash2, Save } from 'lucide-react';
import { supabase } from '../supabaseClient';

/**
 * TechnicianAvailability Component
 * Allows technicians to manage their available time slots
 * Features:
 * - View calendar for current month
 * - Add/remove time slots for specific dates
 * - Bulk generation of availability for a date range
 */
const TechnicianAvailability = ({ technicianId, region = 'us' }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [availability, setAvailability] = useState({});
  const [timeSlots, setTimeSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showBulkAdd, setShowBulkAdd] = useState(false);

  // Bulk add form
  const [bulkForm, setBulkForm] = useState({
    startDate: '',
    endDate: '',
    startTime: '09:00',
    endTime: '17:00',
    slotDuration: 60,
    skipWeekends: true
  });

  const t = {
    us: {
      title: 'Manage My Availability',
      selectDate: 'Select a date to manage time slots',
      availableSlots: 'Available Time Slots',
      addSlot: 'Add Time Slot',
      saveSlots: 'Save Changes',
      bulkAdd: 'Bulk Add Availability',
      startDate: 'Start Date',
      endDate: 'End Date',
      startTime: 'Start Time',
      endTime: 'End Time',
      slotDuration: 'Slot Duration (minutes)',
      skipWeekends: 'Skip Weekends',
      generate: 'Generate Slots',
      cancel: 'Cancel',
      noSlots: 'No time slots for this date. Click "Add Time Slot" to create one.',
      success: 'Availability updated successfully!',
      error: 'Failed to update availability',
      booked: 'Booked',
      available: 'Available'
    },
    cn: {
      title: '管理我的可用时间',
      selectDate: '选择日期以管理时间段',
      availableSlots: '可用时间段',
      addSlot: '添加时间段',
      saveSlots: '保存更改',
      bulkAdd: '批量添加可用时间',
      startDate: '开始日期',
      endDate: '结束日期',
      startTime: '开始时间',
      endTime: '结束时间',
      slotDuration: '时间段时长（分钟）',
      skipWeekends: '跳过周末',
      generate: '生成时间段',
      cancel: '取消',
      noSlots: '此日期没有时间段。点击"添加时间段"创建一个。',
      success: '可用时间更新成功！',
      error: '更新可用时间失败',
      booked: '已预订',
      available: '可用'
    }
  };

  const c = t[region] || t.us;

  // Standard time slots (9 AM to 5 PM)
  const standardTimeSlots = [
    '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'
  ];

  // Fetch availability for current month
  useEffect(() => {
    if (technicianId) {
      fetchAvailability();
    }
  }, [technicianId, currentMonth]);

  const fetchAvailability = async () => {
    try {
      const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

      const { data, error } = await supabase
        .from('technician_availability')
        .select('*')
        .eq('technician_id', technicianId)
        .gte('date', startOfMonth.toISOString().split('T')[0])
        .lte('date', endOfMonth.toISOString().split('T')[0]);

      if (error) throw error;

      // Group by date
      const grouped = {};
      data.forEach(slot => {
        if (!grouped[slot.date]) {
          grouped[slot.date] = [];
        }
        grouped[slot.date].push(slot);
      });

      setAvailability(grouped);
    } catch (error) {
      console.error('Error fetching availability:', error);
    }
  };

  const handleDateClick = (date) => {
    setSelectedDate(date);
    const dateStr = date.toISOString().split('T')[0];
    setTimeSlots(availability[dateStr] || []);
  };

  const addTimeSlot = () => {
    const newSlot = {
      time_slot: '09:00',
      duration_minutes: 60,
      is_available: true,
      is_booked: false,
      isNew: true
    };
    setTimeSlots([...timeSlots, newSlot]);
  };

  const removeTimeSlot = (index) => {
    const slot = timeSlots[index];
    if (slot.is_booked) {
      alert(region === 'us' ? 'Cannot delete booked slots' : '无法删除已预订的时间段');
      return;
    }
    setTimeSlots(timeSlots.filter((_, i) => i !== index));
  };

  const updateTimeSlot = (index, field, value) => {
    const updated = [...timeSlots];
    updated[index][field] = value;
    setTimeSlots(updated);
  };

  const saveTimeSlots = async () => {
    if (!selectedDate) return;

    setLoading(true);
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];

      // Delete existing slots for this date (except booked ones)
      await supabase
        .from('technician_availability')
        .delete()
        .eq('technician_id', technicianId)
        .eq('date', dateStr)
        .eq('is_booked', false);

      // Insert new/updated slots
      const slotsToInsert = timeSlots
        .filter(slot => !slot.is_booked || slot.isNew)
        .map(slot => ({
          technician_id: technicianId,
          date: dateStr,
          time_slot: slot.time_slot,
          duration_minutes: slot.duration_minutes || 60,
          is_available: slot.is_available !== false,
          is_booked: slot.is_booked || false
        }));

      if (slotsToInsert.length > 0) {
        const { error } = await supabase
          .from('technician_availability')
          .insert(slotsToInsert);

        if (error) throw error;
      }

      alert(c.success);
      await fetchAvailability();
    } catch (error) {
      console.error('Error saving slots:', error);
      alert(c.error);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkAdd = async () => {
    setLoading(true);
    try {
      // Call the generate_availability_slots function
      const { data, error } = await supabase.rpc('generate_availability_slots', {
        p_technician_id: technicianId,
        p_start_date: bulkForm.startDate,
        p_end_date: bulkForm.endDate,
        p_start_time: bulkForm.startTime,
        p_end_time: bulkForm.endTime,
        p_slot_duration_minutes: parseInt(bulkForm.slotDuration)
      });

      if (error) throw error;

      alert(c.success);
      setShowBulkAdd(false);
      await fetchAvailability();
    } catch (error) {
      console.error('Error generating bulk availability:', error);
      alert(c.error);
    } finally {
      setLoading(false);
    }
  };

  // Calendar rendering
  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const changeMonth = (offset) => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1));
  };

  const getDayAvailability = (date) => {
    if (!date) return null;
    const dateStr = date.toISOString().split('T')[0];
    const slots = availability[dateStr] || [];
    const availableCount = slots.filter(s => s.is_available && !s.is_booked).length;
    const bookedCount = slots.filter(s => s.is_booked).length;
    return { availableCount, bookedCount, total: slots.length };
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">{c.title}</h2>
          <button
            onClick={() => setShowBulkAdd(true)}
            className="flex items-center gap-2 px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600"
          >
            <Plus size={20} />
            {c.bulkAdd}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Calendar */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <button
                onClick={() => changeMonth(-1)}
                className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
              >
                &lt;
              </button>
              <h3 className="text-lg font-semibold">
                {currentMonth.toLocaleDateString(region === 'cn' ? 'zh-CN' : 'en-US', {
                  year: 'numeric',
                  month: 'long'
                })}
              </h3>
              <button
                onClick={() => changeMonth(1)}
                className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
              >
                &gt;
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-xs font-semibold text-gray-600 p-2">
                  {day}
                </div>
              ))}
              {getDaysInMonth().map((date, index) => {
                if (!date) {
                  return <div key={`empty-${index}`} className="p-2" />;
                }

                const dayInfo = getDayAvailability(date);
                const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();
                const isToday = date.toDateString() === new Date().toDateString();

                return (
                  <button
                    key={index}
                    onClick={() => handleDateClick(date)}
                    className={`p-2 text-sm rounded border ${
                      isSelected
                        ? 'bg-pink-500 text-white border-pink-600'
                        : isToday
                        ? 'bg-blue-100 border-blue-300'
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="font-semibold">{date.getDate()}</div>
                    {dayInfo && dayInfo.total > 0 && (
                      <div className="text-xs mt-1">
                        {dayInfo.availableCount > 0 && (
                          <span className="text-green-600">{dayInfo.availableCount}</span>
                        )}
                        {dayInfo.bookedCount > 0 && (
                          <span className="text-gray-500"> / {dayInfo.bookedCount}</span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time Slots */}
          <div>
            <h3 className="text-lg font-semibold mb-4">
              {selectedDate
                ? selectedDate.toLocaleDateString(region === 'cn' ? 'zh-CN' : 'en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })
                : c.selectDate}
            </h3>

            {selectedDate && (
              <div className="space-y-4">
                <div className="max-h-96 overflow-y-auto space-y-2">
                  {timeSlots.length === 0 ? (
                    <p className="text-gray-500 text-sm">{c.noSlots}</p>
                  ) : (
                    timeSlots.map((slot, index) => (
                      <div
                        key={index}
                        className={`flex items-center gap-2 p-3 rounded-lg border ${
                          slot.is_booked
                            ? 'bg-gray-100 border-gray-300'
                            : slot.is_available
                            ? 'bg-green-50 border-green-200'
                            : 'bg-red-50 border-red-200'
                        }`}
                      >
                        <Clock size={18} />
                        <input
                          type="time"
                          value={slot.time_slot}
                          onChange={(e) => updateTimeSlot(index, 'time_slot', e.target.value)}
                          disabled={slot.is_booked}
                          className="px-2 py-1 border rounded"
                        />
                        <select
                          value={slot.duration_minutes || 60}
                          onChange={(e) => updateTimeSlot(index, 'duration_minutes', parseInt(e.target.value))}
                          disabled={slot.is_booked}
                          className="px-2 py-1 border rounded"
                        >
                          <option value="30">30 min</option>
                          <option value="60">60 min</option>
                          <option value="90">90 min</option>
                          <option value="120">120 min</option>
                        </select>
                        <label className="flex items-center gap-1">
                          <input
                            type="checkbox"
                            checked={slot.is_available}
                            onChange={(e) => updateTimeSlot(index, 'is_available', e.target.checked)}
                            disabled={slot.is_booked}
                          />
                          <span className="text-sm">{c.available}</span>
                        </label>
                        {slot.is_booked && (
                          <span className="text-xs text-gray-600 font-semibold">{c.booked}</span>
                        )}
                        {!slot.is_booked && (
                          <button
                            onClick={() => removeTimeSlot(index)}
                            className="ml-auto p-1 text-red-500 hover:text-red-700"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={addTimeSlot}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                  >
                    <Plus size={18} />
                    {c.addSlot}
                  </button>
                  <button
                    onClick={saveTimeSlots}
                    disabled={loading}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white ${
                      loading ? 'bg-gray-400' : 'bg-green-500 hover:bg-green-600'
                    }`}
                  >
                    <Save size={18} />
                    {c.saveSlots}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bulk Add Modal */}
      {showBulkAdd && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">{c.bulkAdd}</h3>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1">{c.startDate}</label>
                  <input
                    type="date"
                    value={bulkForm.startDate}
                    onChange={(e) => setBulkForm({ ...bulkForm, startDate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">{c.endDate}</label>
                  <input
                    type="date"
                    value={bulkForm.endDate}
                    onChange={(e) => setBulkForm({ ...bulkForm, endDate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1">{c.startTime}</label>
                  <input
                    type="time"
                    value={bulkForm.startTime}
                    onChange={(e) => setBulkForm({ ...bulkForm, startTime: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">{c.endTime}</label>
                  <input
                    type="time"
                    value={bulkForm.endTime}
                    onChange={(e) => setBulkForm({ ...bulkForm, endTime: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">{c.slotDuration}</label>
                <select
                  value={bulkForm.slotDuration}
                  onChange={(e) => setBulkForm({ ...bulkForm, slotDuration: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="30">30 {region === 'us' ? 'minutes' : '分钟'}</option>
                  <option value="60">60 {region === 'us' ? 'minutes' : '分钟'}</option>
                  <option value="90">90 {region === 'us' ? 'minutes' : '分钟'}</option>
                  <option value="120">120 {region === 'us' ? 'minutes' : '分钟'}</option>
                </select>
              </div>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={bulkForm.skipWeekends}
                  onChange={(e) => setBulkForm({ ...bulkForm, skipWeekends: e.target.checked })}
                />
                <span className="text-sm font-semibold">{c.skipWeekends}</span>
              </label>

              <div className="flex gap-2 pt-4">
                <button
                  onClick={handleBulkAdd}
                  disabled={loading}
                  className={`flex-1 px-4 py-2 rounded-lg text-white ${
                    loading ? 'bg-gray-400' : 'bg-green-500 hover:bg-green-600'
                  }`}
                >
                  {c.generate}
                </button>
                <button
                  onClick={() => setShowBulkAdd(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  {c.cancel}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TechnicianAvailability;
