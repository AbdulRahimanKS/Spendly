import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
  ActivityIndicator,
  ScrollView,
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { ChevronDown, Calendar as CalendarIcon, Tag, Check, Trash, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react-native';
import { theme } from '../src/theme/theme';
import { CategoryIcon } from '../src/utils/icons';
import { useAuthStore } from '../src/store/authStore';
import axios from 'axios';

import { API_URL } from '../src/config';

export default function AddExpense() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id?: string;
    title?: string;
    amount?: string;
    type?: 'expense' | 'income';
    category_id?: string;
    date?: string;
  }>();
  const isEditMode = !!params.id;

  const { token, logout } = useAuthStore();
  const [type, setType] = useState<'expense' | 'income'>(params.type || 'expense');
  const [amount, setAmount] = useState(params.amount || '');
  const [title, setTitle] = useState(params.title || '');
  const [selectedCategory, setSelectedCategory] = useState<{id: number, name: string, icon: string, color: string} | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  
  const initialCategory = () => {
    if (params.category_id) {
      const catId = parseInt(params.category_id);
      if (catId === 6) return { id: 6, name: 'Income', color: '#8FA38D' };
      const cats = [
        { id: 1, name: 'Food & Drink', color: '#D99771' },
        { id: 2, name: 'Transport', color: '#545F73' },
        { id: 3, name: 'Shopping', color: '#A3968B' },
        { id: 4, name: 'Entertainment', color: '#8FA38D' },
        { id: 5, name: 'Housing', color: '#1E293B' },
        { id: 7, name: 'Other', color: '#75777B' },
      ];
      return cats.find(c => c.id === catId) || cats[0];
    }
    return { id: 1, name: 'Food & Drink', color: '#D99771' };
  };

  const [category, setCategory] = useState(initialCategory());
  const [isLoading, setIsLoading] = useState(false);

  // Pickers States
  const [isCategoryModalVisible, setIsCategoryModalVisible] = useState(false);
  const [isDateModalVisible, setIsDateModalVisible] = useState(false);
  
  const initialDate = params.date ? new Date(params.date) : new Date();
  const [selectedDate, setSelectedDate] = useState<Date>(initialDate);
  const [viewDate, setViewDate] = useState<Date>(new Date(initialDate));

  const getInitialDateLabel = () => {
    if (!params.date) return 'Today';
    const d = new Date(params.date);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    
    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  };
  const [selectedDateLabel, setSelectedDateLabel] = useState(getInitialDateLabel());

  const expenseCategories = [
    { id: 1, name: 'Food & Drink', color: '#D99771' },
    { id: 2, name: 'Transport', color: '#545F73' },
    { id: 3, name: 'Shopping', color: '#A3968B' },
    { id: 4, name: 'Entertainment', color: '#8FA38D' },
    { id: 5, name: 'Housing', color: '#1E293B' },
    { id: 7, name: 'Other', color: '#75777B' },
  ];

  const generateRecentDays = () => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      let label = '';
      if (i === 0) label = 'Today';
      else if (i === 1) label = 'Yesterday';
      else {
        label = d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
      }
      days.push({ date: d, label });
    }
    return days;
  };

  const handlePrevMonth = () => {
    const newDate = new Date(viewDate);
    newDate.setMonth(newDate.getMonth() - 1);
    setViewDate(newDate);
  };

  const handleNextMonth = () => {
    const newDate = new Date(viewDate);
    newDate.setMonth(newDate.getMonth() + 1);
    
    const today = new Date();
    if (newDate.getFullYear() > today.getFullYear() || 
        (newDate.getFullYear() === today.getFullYear() && newDate.getMonth() > today.getMonth())) {
      return;
    }
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
    
    let label = '';
    if (date.toDateString() === today.toDateString()) {
      label = 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      label = 'Yesterday';
    } else {
      label = date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    }
    setSelectedDateLabel(label);
    setIsDateModalVisible(false);
  };

  const handleSave = async () => {
    if (!amount || !title) {
      setErrorMessage('Please provide an amount and title.');
      setTimeout(() => setErrorMessage(null), 3000);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    try {
      if (isEditMode) {
        await axios.put(
          `${API_URL}/transactions/${params.id}`,
          {
            title,
            amount: parseFloat(amount),
            type,
            category_id: category.id,
            date: selectedDate.toISOString(),
            description: ''
          },
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
      } else {
        await axios.post(
          `${API_URL}/transactions/`,
          {
            title,
            amount: parseFloat(amount),
            type,
            category_id: category.id,
            date: selectedDate.toISOString(),
            description: ''
          },
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
      }

      router.back();
    } catch (error: any) {
      console.error(error);
      if (error.response?.status === 401) {
        logout();
      } else {
        setErrorMessage('Failed to save transaction. Please try again.');
        setTimeout(() => setErrorMessage(null), 3000);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = () => {
    setIsDeleteModalVisible(true);
  };

  const confirmDelete = async () => {
    setIsDeleteModalVisible(false);
    setIsLoading(true);
    try {
      await axios.delete(`${API_URL}/transactions/${params.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      router.back();
    } catch (error: any) {
      console.error(error);
      if (error.response?.status === 401) {
        logout();
      } else {
        setErrorMessage('Failed to delete transaction. Please try again.');
        setTimeout(() => setErrorMessage(null), 3000);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <Stack.Screen 
          options={{
            headerTitle: isEditMode ? 'Edit Transaction' : (type === 'expense' ? 'Add Expense' : 'Add Income'),
            headerRight: () => isEditMode ? (
              <TouchableOpacity 
                style={{ 
                  marginRight: 8, 
                  padding: 8, 
                  backgroundColor: theme.colors.error + '12', 
                  borderRadius: 20, 
                  borderWidth: 1, 
                  borderColor: theme.colors.error + '25',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onPress={handleDelete}
                disabled={isLoading}
              >
                <Trash size={20} color={theme.colors.error} />
              </TouchableOpacity>
            ) : null,
          }}
        />
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardView}
        >
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Type Selector */}
            <View style={styles.typeSelectorContainer}>
              <TouchableOpacity 
                style={[
                  styles.typeButton, 
                  type === 'expense' ? { backgroundColor: theme.colors.spending } : styles.typeButtonInactive
                ]}
                onPress={() => {
                  setType('expense');
                  setCategory({ id: 1, name: 'Food & Drink', color: '#D99771' });
                }}
              >
                <Text style={[
                  styles.typeButtonText, 
                  type === 'expense' ? { color: theme.colors.white } : { color: theme.colors.textSecondary }
                ]}>Expense</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.typeButton, 
                  type === 'income' ? { backgroundColor: theme.colors.income } : styles.typeButtonInactive
                ]}
                onPress={() => {
                  setType('income');
                  setCategory({ id: 6, name: 'Income', color: '#8FA38D' });
                }}
              >
                <Text style={[
                  styles.typeButtonText, 
                  type === 'income' ? { color: theme.colors.white } : { color: theme.colors.textSecondary }
                ]}>Income</Text>
              </TouchableOpacity>
            </View>

            {/* Amount Input Section */}
            <View style={styles.amountContainer}>
              <Text style={styles.labelCaps}>Amount</Text>
              <View style={styles.amountInputRow}>
                <Text style={[styles.currencySymbol, { color: type === 'expense' ? theme.colors.spending : theme.colors.income }]}>₹</Text>
                <TextInput
                  style={[styles.amountInput, { color: type === 'expense' ? theme.colors.spending : theme.colors.income }]}
                  placeholder="0.00"
                  placeholderTextColor={theme.colors.outline}
                  keyboardType="decimal-pad"
                  autoFocus
                  value={amount}
                  onChangeText={setAmount}
                />
              </View>
            </View>

            {/* Title Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.labelCaps}>What for?</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Weekly groceries"
                placeholderTextColor={theme.colors.outline}
                value={title}
                onChangeText={setTitle}
              />
            </View>

            {/* Selection Options */}
            <View style={styles.optionsRow}>
              <TouchableOpacity 
                style={[
                  styles.optionItem, 
                  type === 'income' && { opacity: 0.6 }
                ]}
                onPress={() => {
                  if (type === 'expense') {
                    setIsCategoryModalVisible(true);
                  } else {
                    setErrorMessage('Category is automatically locked to "Income".');
                    setTimeout(() => setErrorMessage(null), 3000);
                  }
                }}
              >
                <View style={styles.optionIcon}>
                  <CategoryIcon categoryId={category.id} color={type === 'expense' ? category.color || theme.colors.secondary : theme.colors.income} size={18} />
                </View>
                <View>
                  <Text style={styles.optionLabel}>Category</Text>
                  <Text style={styles.optionValue}>{category.name}</Text>
                </View>
                <ChevronDown size={16} color={theme.colors.outline} style={{ marginLeft: 'auto' }} />
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.optionItem}
                onPress={() => {
                  setViewDate(new Date(selectedDate));
                  setIsDateModalVisible(true);
                }}
              >
                <View style={styles.optionIcon}>
                  <CalendarIcon size={18} color={type === 'expense' ? theme.colors.spending : theme.colors.income} />
                </View>
                <View>
                  <Text style={styles.optionLabel}>Date</Text>
                  <Text style={styles.optionValue}>{selectedDateLabel}</Text>
                </View>
                <ChevronDown size={16} color={theme.colors.outline} style={{ marginLeft: 'auto' }} />
              </TouchableOpacity>
            </View>

            {/* Category Selector Modal */}
            <Modal
              visible={isCategoryModalVisible}
              animationType="fade"
              transparent={true}
              onRequestClose={() => setIsCategoryModalVisible(false)}
            >
              <TouchableOpacity 
                style={styles.modalOverlay} 
                activeOpacity={1} 
                onPress={() => setIsCategoryModalVisible(false)}
              >
                <TouchableWithoutFeedback>
                  <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                      <View style={styles.modalHandle} />
                      <Text style={styles.modalTitle}>Select Category</Text>
                    </View>
                    <View style={styles.categoriesList}>
                      {expenseCategories.map((item) => (
                        <TouchableOpacity 
                          key={item.id} 
                          style={[
                            styles.categoryListItem,
                            category.id === item.id && { backgroundColor: item.color + '15' }
                          ]}
                          onPress={() => {
                            setCategory(item);
                            setIsCategoryModalVisible(false);
                          }}
                        >
                          <View style={{ marginRight: 16 }}>
                            <CategoryIcon categoryId={item.id} color={item.color} size={16} />
                          </View>
                          <Text style={[
                            styles.categoryListText,
                            category.id === item.id && { fontFamily: 'Manrope-Bold', color: theme.colors.primary }
                          ]}>{item.name}</Text>
                          {category.id === item.id && (
                            <View style={[styles.activeIndicatorCheck, { backgroundColor: item.color }]} />
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </TouchableWithoutFeedback>
              </TouchableOpacity>
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
                      <Text style={styles.modalTitle}>Select Date</Text>
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
                        style={[
                          styles.calendarNavButton,
                          (viewDate.getFullYear() === new Date().getFullYear() && viewDate.getMonth() === new Date().getMonth()) && { opacity: 0.3 }
                        ]} 
                        onPress={handleNextMonth}
                        disabled={viewDate.getFullYear() === new Date().getFullYear() && viewDate.getMonth() === new Date().getMonth()}
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
                        const activeColor = type === 'expense' ? theme.colors.spending : theme.colors.income;
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const isFuture = day > today;
                        
                        return (
                          <TouchableOpacity
                            key={day.toISOString()}
                            style={[
                              styles.calendarDayCell,
                              isSelected && { backgroundColor: activeColor },
                              isToday && !isSelected && { borderWidth: 1, borderColor: activeColor },
                              isFuture && { opacity: 0.3 }
                            ]}
                            onPress={() => handleSelectDate(day)}
                            disabled={isFuture}
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
                        { borderColor: type === 'expense' ? theme.colors.spending : theme.colors.income }
                      ]}
                      onPress={() => handleSelectDate(new Date())}
                    >
                      <Text style={[
                        styles.todayShortcutText,
                        { color: type === 'expense' ? theme.colors.spending : theme.colors.income }
                      ]}>
                        Reset to Today
                      </Text>
                    </TouchableOpacity>
                  </View>
                </TouchableWithoutFeedback>
              </TouchableOpacity>
            </Modal>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.footerContainer}>
            <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
              <TouchableOpacity 
                style={[styles.secondaryButton, { flex: 1 }]}
                onPress={() => router.back()}
              >
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.primaryButton, 
                  { flex: 2, backgroundColor: type === 'expense' ? theme.colors.spending : theme.colors.income },
                  isLoading && { opacity: 0.7 }
                ]}
                onPress={handleSave}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color={theme.colors.white} />
                ) : (
                  <Text style={styles.primaryButtonText}>
                    {isEditMode ? 'Update' : (type === 'expense' ? 'Save Expense' : 'Save Income')}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>

        {/* Custom Error Popup Modal */}
        <Modal
          visible={!!errorMessage}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setErrorMessage(null)}
        >
          <View style={styles.errorModalOverlay}>
            <View style={styles.errorModalContent}>
              <View style={styles.errorModalIconContainer}>
                <AlertCircle size={28} color={theme.colors.spending} />
              </View>
              <Text style={styles.errorModalTitle}>Oops!</Text>
              <Text style={styles.errorModalMessage}>{errorMessage}</Text>
              <TouchableOpacity 
                style={styles.errorModalButton}
                onPress={() => setErrorMessage(null)}
              >
                <Text style={styles.errorModalButtonText}>Okay</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Custom Delete Confirmation Modal */}
        <Modal
          visible={isDeleteModalVisible}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setIsDeleteModalVisible(false)}
        >
          <View style={styles.errorModalOverlay}>
            <View style={styles.errorModalContent}>
              <View style={[styles.errorModalIconContainer, { backgroundColor: theme.colors.error + '15' }]}>
                <Trash size={28} color={theme.colors.error} />
              </View>
              <Text style={styles.errorModalTitle}>Delete Entry?</Text>
              <Text style={styles.errorModalMessage}>Are you sure you want to delete this transaction? This action cannot be undone.</Text>
              <View style={{ flexDirection: 'row', width: '100%', gap: 12 }}>
                <TouchableOpacity 
                  style={[styles.errorModalButton, { flex: 1, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.outline }]}
                  onPress={() => setIsDeleteModalVisible(false)}
                >
                  <Text style={[styles.errorModalButtonText, { color: theme.colors.text }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.errorModalButton, { flex: 1, backgroundColor: theme.colors.error }]}
                  onPress={confirmDelete}
                >
                  <Text style={styles.errorModalButtonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.page,
    paddingTop: 16,
    paddingBottom: theme.spacing.page,
    flexGrow: 1,
  },
  typeSelectorContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: 4,
    marginBottom: theme.spacing.sm,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeButtonInactive: {
    backgroundColor: 'transparent',
  },
  typeButtonText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 14,
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
  categoriesList: {
    gap: 8,
  },
  categoryListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.background,
  },
  categoryColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 16,
  },
  categoryListText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 16,
    color: theme.colors.textSecondary,
    flex: 1,
  },
  activeIndicatorCheck: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  amountContainer: {
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.md,
    alignItems: 'center',
  },
  labelCaps: {
    fontFamily: 'DMSans-Bold',
    fontSize: 12,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencySymbol: {
    fontFamily: 'Manrope-Bold',
    fontSize: 32,
    color: theme.colors.primary,
    marginRight: 4,
  },
  amountInput: {
    fontFamily: 'Manrope-Bold',
    fontSize: 56,
    color: theme.colors.primary,
    minWidth: 100,
  },
  inputGroup: {
    marginBottom: theme.spacing.md,
  },
  textInput: {
    fontFamily: 'DMSans-Medium',
    fontSize: 18,
    color: theme.colors.primary,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outline + '40',
    paddingVertical: 12,
  },
  optionsRow: {
    flexDirection: 'column',
    gap: 12,
    marginBottom: theme.spacing.lg,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    padding: 16,
    borderRadius: theme.borderRadius.md,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  optionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionLabel: {
    fontFamily: 'DMSans-Regular',
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  optionValue: {
    fontFamily: 'DMSans-Medium',
    fontSize: 14,
    color: theme.colors.primary,
  },
  footerContainer: {
    paddingHorizontal: theme.spacing.page,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 20 : 24,
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.surfaceDim + '50',
    width: '100%',
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 18,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 16,
    color: theme.colors.white,
  },
  secondaryButton: {
    backgroundColor: theme.colors.surface,
    paddingVertical: 18,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  deleteButton: {
    backgroundColor: theme.colors.error + '15',
    paddingVertical: 18,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.error + '30',
    width: '100%',
  },
  deleteButtonText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 16,
    color: theme.colors.error,
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
    lineHeight: 20,
  },
  errorModalButton: {
    backgroundColor: theme.colors.spending,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 100,
    width: '100%',
    alignItems: 'center',
  },
  errorModalButtonText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 14,
    color: theme.colors.white,
  }
});
