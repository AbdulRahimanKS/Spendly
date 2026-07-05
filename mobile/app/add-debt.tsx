import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView, TouchableWithoutFeedback, Keyboard, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Check, User, Car, Home, GraduationCap, CreditCard, Users, AlertCircle } from 'lucide-react-native';
import { theme } from '../src/theme/theme';
import { useAuthStore } from '../src/store/authStore';
import axios from 'axios';
import { API_URL } from '../src/config';

const CATEGORIES = [
  { id: 'Personal', icon: User, label: 'Personal' },
  { id: 'Vehicle', icon: Car, label: 'Vehicle' },
  { id: 'Home', icon: Home, label: 'Home' },
  { id: 'Education', icon: GraduationCap, label: 'Education' },
  { id: 'Card', icon: CreditCard, label: 'Card' },
  { id: 'Friend', icon: Users, label: 'Friend' },
];

export default function AddDebt() {
  const router = useRouter();
  const { token } = useAuthStore();
  const { editId } = useLocalSearchParams();
  
  const [debtType, setDebtType] = useState<'onetime' | 'emi'>('onetime');
  const [category, setCategory] = useState('Personal');
  const [name, setName] = useState('');
  const [totalPrincipal, setTotalPrincipal] = useState('');
  const [outstandingAmount, setOutstandingAmount] = useState('');
  const [monthlyEmi, setMonthlyEmi] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(!!editId);

  useEffect(() => {
    if (editId) {
      fetchDebtDetails();
    }
  }, [editId]);

  const fetchDebtDetails = async () => {
    try {
      const response = await axios.get(`${API_URL}/debts/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const currentDebt = response.data.find((d: any) => d.id === parseInt(editId as string));
      if (currentDebt) {
        setName(currentDebt.name);
        setCategory(currentDebt.category || 'Personal');
        setTotalPrincipal(currentDebt.total_principal.toString());
        setOutstandingAmount(currentDebt.outstanding_amount.toString());
        if (currentDebt.monthly_emi > 0) {
          setDebtType('emi');
          setMonthlyEmi(currentDebt.monthly_emi.toString());
        }
        if (currentDebt.due_date) {
          const dDate = new Date(currentDebt.due_date);
          setSelectedDate(dDate);
          setViewDate(dDate);
          setSelectedDateLabel(dDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }));
        }
      }
      setIsLoading(false);
    } catch (err) {
      console.error('Failed to fetch debt:', err);
      setIsLoading(false);
    }
  };

  // Date Picker States
  const [isDateModalVisible, setIsDateModalVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewDate, setViewDate] = useState<Date>(new Date());
  const [selectedDateLabel, setSelectedDateLabel] = useState('Today');
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === 'android' ? 'keyboardDidShow' : 'keyboardWillShow',
      () => setKeyboardVisible(true)
    );
    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === 'android' ? 'keyboardDidHide' : 'keyboardWillHide',
      () => setKeyboardVisible(false)
    );

    return () => {
      keyboardDidHideListener.remove();
      keyboardDidShowListener.remove();
    };
  }, []);

  const handlePrevMonth = () => {
    const newDate = new Date(viewDate);
    newDate.setMonth(newDate.getMonth() - 1);
    setViewDate(newDate);
  };

  const handleNextMonth = () => {
    const newDate = new Date(viewDate);
    newDate.setMonth(newDate.getMonth() + 1);
    setViewDate(newDate);
  };

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const generateCalendarDays = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    
    const totalDays = getDaysInMonth(year, month);
    const startDayOffset = getFirstDayOfMonth(year, month);
    
    const days = [];
    for (let i = 0; i < startDayOffset; i++) {
      days.push(null);
    }
    for (let day = 1; day <= totalDays; day++) {
      days.push(new Date(year, month, day));
    }
    return days;
  };

  const handleSelectDate = (date: Date) => {
    setSelectedDate(date);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    
    let label = '';
    if (date.toDateString() === today.toDateString()) {
      label = 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      label = 'Yesterday';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      label = 'Tomorrow';
    } else {
      label = date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    }
    setSelectedDateLabel(label);
    setIsDateModalVisible(false);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Please enter a name for this debt.');
      setTimeout(() => setError(''), 3000);
      return;
    }

    const parsedPrincipal = parseFloat(totalPrincipal);
    const parsedOutstanding = parseFloat(outstandingAmount);
    const parsedEmi = parseFloat(monthlyEmi);

    if (isNaN(parsedPrincipal) || parsedPrincipal <= 0) {
      setError('Please enter a valid Total Amount greater than 0.');
      setTimeout(() => setError(''), 3000);
      return;
    }

    if (isNaN(parsedOutstanding)) {
      setError('Please enter your Outstanding Amount.');
      setTimeout(() => setError(''), 3000);
      return;
    }

    if (parsedOutstanding < 0) {
      setError('Outstanding Amount cannot be negative.');
      setTimeout(() => setError(''), 3000);
      return;
    }

    if (parsedOutstanding > parsedPrincipal) {
      setError('Outstanding Amount cannot exceed the Total Amount.');
      setTimeout(() => setError(''), 3000);
      return;
    }
    
    if (debtType === 'emi' && (isNaN(parsedEmi) || parsedEmi <= 0)) {
      setError('Please enter a valid Monthly EMI amount greater than 0.');
      setTimeout(() => setError(''), 3000);
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const payload = {
        name,
        category,
        total_principal: parsedPrincipal,
        outstanding_amount: parsedOutstanding,
        monthly_emi: debtType === 'emi' ? parsedEmi : 0,
        due_date: `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`,
        status: parsedOutstanding <= 0 ? 'paid' : 'active'
      };

      if (editId) {
        await axios.put(`${API_URL}/debts/${editId}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.post(`${API_URL}/debts/`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      router.back();
    } catch (err) {
      console.error('Failed to add debt:', err);
      setError('Failed to save debt. Please try again.');
      setTimeout(() => setError(''), 3000);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <Stack.Screen 
          options={{
            headerTitle: editId ? 'Edit Debt' : 'Add Debt',
          }}
        />
        <KeyboardAvoidingView 
          style={{ flex: 1 }} 
          behavior="padding"
          keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 80}
        >
          {isLoading ? (
          <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
          <ScrollView 
            style={{ flex: 1 }}
            contentContainerStyle={styles.content} 
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >

          {/* Debt Type Toggle */}
          {!editId && (
            <View style={styles.toggleContainer}>
              <TouchableOpacity 
                style={[styles.toggleButton, debtType === 'onetime' && styles.toggleButtonActive]} 
                onPress={() => setDebtType('onetime')}
              >
                <Text style={[styles.toggleText, debtType === 'onetime' && styles.toggleTextActive]}>One-time Debt</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.toggleButton, debtType === 'emi' && styles.toggleButtonActive]} 
                onPress={() => setDebtType('emi')}
              >
                <Text style={[styles.toggleText, debtType === 'emi' && styles.toggleTextActive]}>Monthly EMI</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Category Selector */}
          <View style={styles.categorySection}>
            <Text style={styles.sectionTitle}>Category</Text>
            <View style={styles.categoryGrid}>
              {CATEGORIES.map((cat) => {
                const isSelected = category === cat.id;
                const Icon = cat.icon;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryBox,
                      isSelected && styles.categoryBoxSelected
                    ]}
                    onPress={() => setCategory(cat.id)}
                  >
                    <Icon size={24} color={isSelected ? theme.colors.primary : theme.colors.secondary} style={{ marginBottom: 4 }} />
                    <Text style={[styles.categoryLabel, isSelected && styles.categoryLabelSelected]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.formCard}>
            {/* Name Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{debtType === 'emi' ? 'Loan Name' : 'Debt Name'}</Text>
              <TextInput
                style={styles.input}
                placeholder={debtType === 'emi' ? "e.g. Car Loan, Student Loan" : "e.g. Borrowed from John"}
                placeholderTextColor={theme.colors.outline}
                value={name}
                onChangeText={setName}
              />
            </View>

            {/* Total Amount Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Total Amount (Principal)</Text>
              <View style={styles.amountInputWrapper}>
                <Text style={styles.amountCurrency}>₹</Text>
                <TextInput
                  style={styles.amountInput}
                  placeholder="0.00"
                  placeholderTextColor={theme.colors.outline}
                  keyboardType="decimal-pad"
                  value={totalPrincipal}
                  onChangeText={setTotalPrincipal}
                />
              </View>
            </View>

            {/* Outstanding Amount Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Outstanding Amount</Text>
              <View style={styles.amountInputWrapper}>
                <Text style={styles.amountCurrency}>₹</Text>
                <TextInput
                  style={styles.amountInput}
                  placeholder="0.00"
                  placeholderTextColor={theme.colors.outline}
                  keyboardType="decimal-pad"
                  value={outstandingAmount}
                  onChangeText={setOutstandingAmount}
                />
              </View>
            </View>

            {/* Monthly EMI Input (Only visible if EMI is selected) */}
            {debtType === 'emi' && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Monthly EMI Amount</Text>
                <View style={styles.amountInputWrapper}>
                  <Text style={styles.amountCurrency}>₹</Text>
                  <TextInput
                    style={styles.amountInput}
                    placeholder="0.00"
                    placeholderTextColor={theme.colors.outline}
                    keyboardType="decimal-pad"
                    value={monthlyEmi}
                    onChangeText={setMonthlyEmi}
                  />
                </View>
              </View>
            )}

            {/* Due Date Picker */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>First Payment Due Date</Text>
              <TouchableOpacity 
                style={styles.datePickerButton}
                onPress={() => {
                  setViewDate(new Date(selectedDate));
                  setIsDateModalVisible(true);
                }}
              >
                <CalendarIcon size={20} color={theme.colors.textSecondary} style={{ marginRight: 12 }} />
                <Text style={styles.datePickerText}>{selectedDateLabel}</Text>
              </TouchableOpacity>
            </View>
          </View>
          </ScrollView>

          {/* Save Button */}
          {!isKeyboardVisible && (
            <View style={styles.footer}>
              <TouchableOpacity 
                style={[styles.saveButton, isSubmitting && { opacity: 0.7 }]} 
                onPress={handleSave}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color={theme.colors.white} />
                ) : (
                  <Text style={styles.saveButtonText}>{editId ? 'Save Changes' : 'Add Debt'}</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
          </>
        )}
        </KeyboardAvoidingView>

        {/* Custom Error Popup Modal */}
        <Modal
          visible={!!error}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setError('')}
        >
          <View style={styles.errorModalOverlay}>
            <View style={styles.errorModalContent}>
              <View style={styles.errorModalIconContainer}>
                <AlertCircle size={28} color={theme.colors.spending} />
              </View>
              <Text style={styles.errorModalTitle}>Oops!</Text>
              <Text style={styles.errorModalMessage}>{error}</Text>
              <TouchableOpacity 
                style={styles.errorModalButton}
                onPress={() => setError('')}
              >
                <Text style={styles.errorModalButtonText}>Okay</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Date Selector Modal */}
        <Modal
          visible={isDateModalVisible}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setIsDateModalVisible(false)}
        >
          <TouchableOpacity 
            style={styles.modalOverlay} 
            activeOpacity={1} 
            onPress={() => setIsDateModalVisible(false)}
          >
            <TouchableWithoutFeedback>
              <View style={[styles.modalContent, { paddingBottom: 24 }]}>
                <View style={styles.modalHeader}>
                  <View style={styles.modalHandle} />
                  <Text style={styles.modalTitle}>Select Due Date</Text>
                </View>
                
                {/* Calendar Month Navigation */}
                <View style={styles.calendarHeader}>
                  <TouchableOpacity 
                    style={styles.calendarNavButton} 
                    onPress={handlePrevMonth}
                  >
                    <ChevronLeft size={20} color={theme.colors.primary} />
                  </TouchableOpacity>
                  
                  <Text style={styles.calendarMonthTitle}>
                    {viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </Text>
                  
                  <TouchableOpacity 
                    style={styles.calendarNavButton} 
                    onPress={handleNextMonth}
                  >
                    <ChevronRight size={20} color={theme.colors.primary} />
                  </TouchableOpacity>
                </View>
                
                {/* Weekday Labels */}
                <View style={styles.weekdayRow}>
                  {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day, index) => (
                    <Text key={index} style={styles.weekdayText}>{day}</Text>
                  ))}
                </View>
                
                {/* Calendar Days Grid */}
                <View style={styles.calendarGrid}>
                  {generateCalendarDays().map((day, index) => {
                    if (!day) {
                      return <View key={`empty-${index}`} style={styles.calendarDayCellEmpty} />;
                    }
                    
                    const isSelected = selectedDate.toDateString() === day.toDateString();
                    const isToday = new Date().toDateString() === day.toDateString();
                    const activeColor = theme.colors.primary;
                    
                    return (
                      <TouchableOpacity
                        key={day.toISOString()}
                        style={[
                          styles.calendarDayCell,
                          isSelected && { backgroundColor: activeColor },
                          isToday && !isSelected && { borderWidth: 1, borderColor: activeColor }
                        ]}
                        onPress={() => handleSelectDate(day)}
                      >
                        <Text style={[
                          styles.calendarDayText,
                          isSelected && { color: theme.colors.white, fontFamily: 'Manrope-Bold' },
                          isToday && !isSelected && { color: activeColor, fontFamily: 'Manrope-Bold' }
                        ]}>
                          {day.getDate()}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Today Button shortcut */}
                <TouchableOpacity 
                  style={[
                    styles.todayShortcutButton,
                    { borderColor: theme.colors.primary }
                  ]}
                  onPress={() => handleSelectDate(new Date())}
                >
                  <Text style={[
                    styles.todayShortcutText,
                    { color: theme.colors.primary }
                  ]}>
                    Reset to Today
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </TouchableOpacity>
        </Modal>

      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    paddingHorizontal: theme.spacing.page,
    paddingTop: 16,
    paddingBottom: 120, // Huge padding to ensure scrolling past the floating save button
    flexGrow: 1,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceDim + '50',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  toggleButtonActive: {
    backgroundColor: theme.colors.white,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  toggleTextActive: {
    color: theme.colors.primary,
  },
  categorySection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontFamily: 'DMSans-Medium',
    fontSize: 14,
    color: theme.colors.primary,
    marginBottom: 12,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  categoryBox: {
    width: '31%',
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.surfaceDim,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryBoxSelected: {
    backgroundColor: theme.colors.income + '15',
    borderColor: theme.colors.income,
  },
  categoryLabel: {
    fontFamily: 'DMSans-Medium',
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  categoryLabelSelected: {
    color: theme.colors.primary,
  },
  formCard: {
    backgroundColor: theme.colors.white,
    padding: 20,
    borderRadius: 16,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontFamily: 'DMSans-Medium',
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  input: {
    fontFamily: 'DMSans-Regular',
    fontSize: 16,
    color: theme.colors.primary,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceDim,
    paddingVertical: 8,
  },
  amountInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceDim,
  },
  amountCurrency: {
    fontFamily: 'Manrope-Bold',
    fontSize: 24,
    color: theme.colors.textSecondary,
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontFamily: 'Manrope-Bold',
    fontSize: 24,
    color: theme.colors.primary,
    paddingVertical: 8,
  },
  footer: {
    padding: theme.spacing.page,
    paddingBottom: Platform.OS === 'ios' ? 0 : theme.spacing.page,
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 16,
    color: theme.colors.white,
  },
  errorModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorModalContent: {
    backgroundColor: theme.colors.white,
    borderRadius: 24,
    padding: 24,
    width: '80%',
    alignItems: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  errorModalIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.spending + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  errorModalTitle: {
    fontFamily: 'Manrope-Bold',
    fontSize: 20,
    color: theme.colors.primary,
    marginBottom: 8,
  },
  errorModalMessage: {
    fontFamily: 'DMSans-Regular',
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  errorModalButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  errorModalButtonText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 16,
    color: theme.colors.white,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.surfaceDim,
    padding: 16,
    borderRadius: 12,
  },
  datePickerText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 16,
    color: theme.colors.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 12,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.surfaceDim,
    marginBottom: 16,
  },
  modalTitle: {
    fontFamily: 'Manrope-Bold',
    fontSize: 18,
    color: theme.colors.primary,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  calendarNavButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarMonthTitle: {
    fontFamily: 'Manrope-Bold',
    fontSize: 16,
    color: theme.colors.primary,
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  weekdayText: {
    width: 38,
    textAlign: 'center',
    fontFamily: 'DMSans-Bold',
    fontSize: 12,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 8,
    paddingHorizontal: 4,
    marginBottom: 16,
  },
  calendarDayCell: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarDayCellEmpty: {
    width: 38,
    height: 38,
  },
  calendarDayText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 14,
    color: theme.colors.primary,
  },
  todayShortcutButton: {
    borderWidth: 1,
    borderRadius: theme.borderRadius.md,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  todayShortcutText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 14,
  },
});
