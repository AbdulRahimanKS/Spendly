import React, { useState, useCallback, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TouchableWithoutFeedback
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Search, Filter, Wallet, ChevronLeft, ChevronRight, Calendar, X } from 'lucide-react-native';
import { theme } from '../../src/theme/theme';
import { CategoryIcon, getCategoryName } from '../../src/utils/icons';
import { useAuthStore } from '../../src/store/authStore';
import axios from 'axios';

import { API_URL } from '../../src/config';

export default function History() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token, logout } = useAuthStore();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [tempActiveFilter, setTempActiveFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [tempCategoryId, setTempCategoryId] = useState<number | null>(null);
  const [tempStartDate, setTempStartDate] = useState<Date | null>(null);
  const [tempEndDate, setTempEndDate] = useState<Date | null>(null);
  
  const [isDateModalVisible, setIsDateModalVisible] = useState(false);
  const [dateSelectionType, setDateSelectionType] = useState<'start' | 'end' | null>(null);
  const [viewDate, setViewDate] = useState(new Date());

  const categories = [
    { id: 1, name: 'Food & Drink', color: '#D99771' },
    { id: 2, name: 'Transport', color: '#545F73' },
    { id: 3, name: 'Shopping', color: '#A3968B' },
    { id: 4, name: 'Entertainment', color: '#8FA38D' },
    { id: 5, name: 'Housing', color: '#1E293B' },
    { id: 7, name: 'Other', color: '#75777B' },
  ];

  const handlePrevMonth = () => {
    const newDate = new Date(viewDate);
    newDate.setMonth(newDate.getMonth() - 1);
    setViewDate(newDate);
  };
  const handleNextMonth = () => {
    const newDate = new Date(viewDate);
    newDate.setMonth(newDate.getMonth() + 1);
    const today = new Date();
    if (newDate.getFullYear() > today.getFullYear() || (newDate.getFullYear() === today.getFullYear() && newDate.getMonth() > today.getMonth())) return;
    setViewDate(newDate);
  };
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();
  const generateCalendarDays = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const totalDays = getDaysInMonth(year, month);
    const startDayOffset = getFirstDayOfMonth(year, month);
    const days = [];
    for (let i = 0; i < startDayOffset; i++) days.push(null);
    for (let day = 1; day <= totalDays; day++) days.push(new Date(year, month, day));
    return days;
  };
  const handleSelectDate = (date: Date) => {
    if (dateSelectionType === 'start') setTempStartDate(date);
    else setTempEndDate(date);
    setIsDateModalVisible(false);
  };
  const applyFilters = () => {
    setActiveFilter(tempActiveFilter);
    setCategoryId(tempCategoryId);
    setStartDate(tempStartDate);
    setEndDate(tempEndDate);
    setIsFilterModalVisible(false);
  };
  const clearFilters = () => {
    setTempActiveFilter('all');
    setTempCategoryId(null);
    setTempStartDate(null);
    setTempEndDate(null);
  };

  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [initialMount, setInitialMount] = useState(true);
  const LIMIT = 20;

  const fetchTransactionsRef = useRef<any>(null);

  useEffect(() => {
    if (initialMount) {
      setInitialMount(false);
      return;
    }
    const delayDebounceFn = setTimeout(() => {
      fetchTransactions(0);
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, activeFilter, categoryId, startDate, endDate]);

  useFocusEffect(
    useCallback(() => {
      if (fetchTransactionsRef.current) {
        fetchTransactionsRef.current(0, true);
      }
    }, [])
  );

  const fetchTransactions = async (pageNum = 0, isRefresh = false) => {
    fetchTransactionsRef.current = fetchTransactions;
    if (pageNum === 0 && !isRefresh) setIsLoading(true);
    if (pageNum > 0) setIsLoadingMore(true);

    try {
      let url = `${API_URL}/transactions/?skip=${pageNum * LIMIT}&limit=${LIMIT}`;
      if (searchQuery) url += `&search=${searchQuery}`;
      if (activeFilter !== 'all') url += `&type=${activeFilter}`;
      if (categoryId) url += `&category_id=${categoryId}`;
      if (startDate) url += `&start_date=${startDate.toISOString()}`;
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        url += `&end_date=${end.toISOString()}`;
      }

      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const newTransactions = response.data;
      if (newTransactions.length < LIMIT) {
        setHasMore(false);
      } else {
        setHasMore(true);
      }

      if (pageNum === 0) {
        setTransactions(newTransactions);
      } else {
        setTransactions(prev => [...prev, ...newTransactions]);
      }
      setPage(pageNum);
    } catch (error: any) {
      console.error("Failed to fetch history", error);
      if (error.response?.status === 401) {
        logout();
      }
    } finally {
      setIsLoading(false);
      setRefreshing(false);
      setIsLoadingMore(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchTransactions(0);
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchTransactions(0, true);
  };

  // Group transactions by date
  const groupedTransactions = transactions
    .reduce((groups: any, transaction) => {
      const date = new Date(transaction.date).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(transaction);
      return groups;
    }, {});

  const dateKeys = Object.keys(groupedTransactions).sort((a, b) => 
    new Date(b).getTime() - new Date(a).getTime()
  );

  if (isLoading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>History</Text>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={20} color={theme.colors.outline} />
          <TextInput 
            style={styles.searchInput}
            placeholder="Search transactions..."
            placeholderTextColor={theme.colors.outline}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity 
          style={[styles.filterButton, (activeFilter !== 'all' || categoryId !== null || startDate !== null || endDate !== null) && { backgroundColor: theme.colors.primary }]}
          onPress={() => {
            setTempActiveFilter(activeFilter);
            setTempCategoryId(categoryId);
            setTempStartDate(startDate);
            setTempEndDate(endDate);
            setIsFilterModalVisible(true);
          }}
        >
          <Filter size={20} color={(activeFilter !== 'all' || categoryId !== null || startDate !== null || endDate !== null) ? theme.colors.white : theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onScroll={({ nativeEvent }) => {
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 200;
          if (isCloseToBottom && !isLoadingMore && hasMore && !isLoading && !refreshing) {
            fetchTransactions(page + 1);
          }
        }}
        scrollEventThrottle={400}
      >
        {dateKeys.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No transactions found.</Text>
          </View>
        ) : (
          dateKeys.map((date) => (
            <View key={date} style={styles.dateGroup}>
              <Text style={styles.dateLabel}>{date}</Text>
              <View style={styles.transactionList}>
                {groupedTransactions[date].map((item: any) => (
                  <TransactionItem 
                    key={item.id}
                    categoryId={item.category_id}
                    title={item.title} 
                    category={getCategoryName(item.category_id)} 
                    amount={item.type === 'income' ? `+₹${item.amount.toFixed(2)}` : `-₹${item.amount.toFixed(2)}`} 
                    time={new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} 
                    isIncome={item.type === 'income'}
                    onPress={() => {
                      router.push({
                        pathname: '/add-expense',
                        params: {
                          id: item.id.toString(),
                          title: item.title,
                          amount: item.amount.toString(),
                          type: item.type,
                          category_id: item.category_id.toString(),
                          date: item.date
                        }
                      });
                    }}
                  />
                ))}
              </View>
            </View>
          ))
        )}
        
        {isLoadingMore && (
          <View style={{ paddingVertical: 20, alignItems: 'center' }}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
          </View>
        )}
      </ScrollView>

      {/* Filter Bottom Sheet */}
      <Modal
        visible={isFilterModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsFilterModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setIsFilterModalVisible(false)}
        >
          <TouchableWithoutFeedback>
            <View style={[styles.modalContent, { paddingBottom: 30, maxHeight: '85%' }]}>
              <View style={styles.modalHeader}>
                <View style={styles.modalHandle} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <Text style={styles.modalTitle}>Filters</Text>
                  <TouchableOpacity onPress={clearFilters}>
                    <Text style={{ fontFamily: 'DMSans-Medium', color: theme.colors.primary }}>Clear All</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                {/* Type Filter */}
                <Text style={{ fontFamily: 'Manrope-SemiBold', fontSize: 16, color: theme.colors.primary, marginBottom: 12 }}>Transaction Type</Text>
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 24 }}>
                  {['all', 'expense', 'income'].map((type) => (
                    <TouchableOpacity 
                      key={type}
                      style={[
                        styles.filterChip,
                        tempActiveFilter === type && { backgroundColor: theme.colors.primary }
                      ]}
                      onPress={() => {
                        setTempActiveFilter(type as any);
                        if (type === 'income') {
                          setTempCategoryId(null);
                        }
                      }}
                    >
                      <Text style={[
                        styles.filterChipText,
                        tempActiveFilter === type && { color: theme.colors.white }
                      ]}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Category Filter */}
                {tempActiveFilter !== 'income' && (
                  <>
                    <Text style={{ fontFamily: 'Manrope-SemiBold', fontSize: 16, color: theme.colors.primary, marginBottom: 12 }}>Category</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 }}>
                      {categories.map((cat) => (
                        <TouchableOpacity 
                          key={cat.id}
                          style={[
                            styles.filterChip,
                            tempCategoryId === cat.id && { backgroundColor: cat.color, borderColor: cat.color }
                          ]}
                          onPress={() => setTempCategoryId(tempCategoryId === cat.id ? null : cat.id)}
                        >
                          <Text style={[
                            styles.filterChipText,
                            tempCategoryId === cat.id && { color: theme.colors.white }
                          ]}>
                            {cat.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                )}

                {/* Date Filter */}
                <Text style={{ fontFamily: 'Manrope-SemiBold', fontSize: 16, color: theme.colors.primary, marginBottom: 12 }}>Date Range</Text>
                <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
                  <TouchableOpacity 
                    style={[styles.datePickerButton, tempStartDate && { borderColor: theme.colors.primary }]}
                    onPress={() => {
                      setDateSelectionType('start');
                      setIsDateModalVisible(true);
                    }}
                  >
                    <Calendar size={18} color={tempStartDate ? theme.colors.primary : theme.colors.textSecondary} />
                    <Text style={[styles.datePickerButtonText, tempStartDate && { color: theme.colors.primary }]}>
                      {tempStartDate ? tempStartDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Start Date'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.datePickerButton, tempEndDate && { borderColor: theme.colors.primary }]}
                    onPress={() => {
                      setDateSelectionType('end');
                      setIsDateModalVisible(true);
                    }}
                  >
                    <Calendar size={18} color={tempEndDate ? theme.colors.primary : theme.colors.textSecondary} />
                    <Text style={[styles.datePickerButtonText, tempEndDate && { color: theme.colors.primary }]}>
                      {tempEndDate ? tempEndDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'End Date'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>

              <TouchableOpacity style={styles.applyButton} onPress={applyFilters}>
                <Text style={styles.applyButtonText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>

      {/* Date Picker Modal */}
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
                <Text style={styles.modalTitle}>Select {dateSelectionType === 'start' ? 'Start' : 'End'} Date</Text>
              </View>
              
              <View style={styles.calendarHeader}>
                <TouchableOpacity style={styles.calendarNavButton} onPress={handlePrevMonth}>
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
              
              <View style={styles.weekdayRow}>
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day, index) => (
                  <Text key={index} style={styles.weekdayText}>{day}</Text>
                ))}
              </View>
              
              <View style={styles.calendarGrid}>
                {generateCalendarDays().map((day, index) => {
                  if (!day) return <View key={`empty-${index}`} style={styles.calendarDayCellEmpty} />;
                  
                  const isToday = day.toDateString() === new Date().toDateString();
                  const isSelected = (dateSelectionType === 'start' && tempStartDate?.toDateString() === day.toDateString()) || 
                                     (dateSelectionType === 'end' && tempEndDate?.toDateString() === day.toDateString());
                  const isFuture = day > new Date(new Date().setHours(23, 59, 59, 999));
                  
                  return (
                    <TouchableOpacity 
                      key={`day-${index}`} 
                      style={[
                        styles.calendarDayCell,
                        isSelected && { backgroundColor: theme.colors.primary },
                        isFuture && { opacity: 0.3 }
                      ]}
                      onPress={() => handleSelectDate(day)}
                      disabled={isFuture}
                    >
                      <Text style={[
                        styles.calendarDayText,
                        isToday && { fontFamily: 'Manrope-Bold', color: theme.colors.primary },
                        isSelected && { color: theme.colors.white }
                      ]}>
                        {day.getDate()}
                      </Text>
                      {isToday && !isSelected && <View style={styles.todayIndicator} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>

    </View>
  );
}

function TransactionItem({ categoryId, title, category, amount, time, isIncome, onPress }: any) {
  return (
    <TouchableOpacity style={styles.transactionItem} onPress={onPress}>
      <View style={[styles.transactionIcon, { backgroundColor: isIncome ? theme.colors.income + '15' : theme.colors.spending + '15' }]}>
        <CategoryIcon categoryId={categoryId} color={isIncome ? theme.colors.income : theme.colors.spending} />
      </View>
      <View style={styles.transactionInfo}>
        <Text style={styles.transactionTitle}>{title}</Text>
        <Text style={styles.transactionCategory}>{category} • {time}</Text>
      </View>
      <Text style={[
        styles.transactionAmount, 
        isIncome && { color: theme.colors.income }
      ]}>
        {amount}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingHorizontal: theme.spacing.page,
    paddingTop: 12,
    paddingBottom: 10,
  },
  title: {
    fontFamily: 'Manrope-Bold',
    fontSize: 28,
    color: theme.colors.primary,
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.page,
    gap: 12,
    marginBottom: 20,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    paddingHorizontal: 16,
    height: 48,
    borderRadius: theme.borderRadius.md,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontFamily: 'DMSans-Regular',
    fontSize: 16,
    color: theme.colors.primary,
  },
  filterButton: {
    width: 48,
    height: 48,
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.page,
    paddingBottom: 40,
  },
  dateGroup: {
    marginBottom: 24,
  },
  dateLabel: {
    fontFamily: 'DMSans-Bold',
    fontSize: 12,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  transactionList: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: 16,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 2,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.background,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionTitle: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 16,
    color: theme.colors.primary,
    marginBottom: 4,
  },
  transactionCategory: {
    fontFamily: 'DMSans-Regular',
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  transactionAmount: {
    fontFamily: 'Manrope-Bold',
    fontSize: 16,
    color: theme.colors.spending,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyStateText: {
    fontFamily: 'DMSans-Regular',
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  filterChipsContainer: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.page,
    marginBottom: 20,
    gap: 8,
  },
  filterChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 100,
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.outline,
  },
  filterChipText: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 14,
    color: theme.colors.textSecondary,
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
    padding: theme.spacing.page,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: theme.colors.outline,
    borderRadius: 2,
    marginBottom: 16,
  },
  modalTitle: {
    fontFamily: 'Manrope-Bold',
    fontSize: 20,
    color: theme.colors.primary,
  },
  datePickerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.white,
  },
  datePickerButtonText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  applyButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 16,
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
    marginTop: 10,
  },
  applyButtonText: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 16,
    color: theme.colors.white,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  calendarNavButton: {
    padding: 8,
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
  },
  calendarMonthTitle: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 16,
    color: theme.colors.primary,
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  weekdayText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    color: theme.colors.textSecondary,
    width: 40,
    textAlign: 'center',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  calendarDayCellEmpty: {
    width: '14.28%',
    height: 40,
  },
  calendarDayCell: {
    width: '14.28%',
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    marginBottom: 8,
  },
  calendarDayText: {
    fontFamily: 'DMSans-Regular',
    fontSize: 15,
    color: theme.colors.text,
  },
  todayIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.primary,
    position: 'absolute',
    bottom: 4,
  },
});
