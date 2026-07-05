import React, { useState, useCallback } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TouchableWithoutFeedback,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  Pressable
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import Animated, { 
  FadeInDown, 
  FadeInLeft,
  useAnimatedStyle, 
  withTiming, 
  withSpring,
  Layout
} from 'react-native-reanimated';
import { theme } from '../../src/theme/theme';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react-native';
import { useAuthStore } from '../../src/store/authStore';
import axios from 'axios';

const { width } = Dimensions.get('window');
import { API_URL } from '../../src/config';

export default function Analytics() {
  const { token, logout, user } = useAuthStore();
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Budget Editor States
  const [isBudgetModalVisible, setIsBudgetModalVisible] = useState(false);
  const [budgetInput, setBudgetInput] = useState('');

  // Month Picker States
  const [isMonthPickerVisible, setIsMonthPickerVisible] = useState(false);
  const [pickerYear, setPickerYear] = useState(currentDate.getFullYear());

  const [stats, setStats] = useState({
    totalSpending: 0,
    budget: 5000,
    breakdown: [] as any[],
    weeklyData: [0, 0, 0, 0, 0, 0, 0],
    trend: 0
  });

  const getBudgetKey = () => {
    return `budget_${user?.id || 'default'}_${currentDate.getFullYear()}_${currentDate.getMonth()}`;
  };

  const fetchData = async () => {
    try {
      // 1. Get Stored Budget limit for THIS specific month & user
      let budgetVal = 5000;
      try {
        const storedBudget = await SecureStore.getItemAsync(getBudgetKey());
        if (storedBudget) {
          budgetVal = parseFloat(storedBudget);
        }
      } catch (e) {
        console.log("No stored budget found", e);
      }

      // 2. Fetch Analytics from backend using exact local boundaries
      const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59, 999);
      const tzOffset = new Date().getTimezoneOffset(); // -330 for IST
      
      const response = await axios.get(
        `${API_URL}/transactions/analytics/?start_date=${firstDay.toISOString()}&end_date=${lastDay.toISOString()}&timezone_offset=${tzOffset}`, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const { totalSpending, breakdown: rawBreakdown, weeklyData: rawWeeklyData } = response.data;
      
      const breakdown = rawBreakdown.map((item: any) => ({
        ...item,
        percentage: totalSpending > 0 ? (item.amount / totalSpending) * 100 : 0,
        color: item.name === 'Food & Drink' ? theme.colors.spending : 
               item.name === 'Transport' ? theme.colors.secondary : 
               item.name === 'Shopping' ? '#A3968B' : 
               item.name === 'Entertainment' ? theme.colors.income :
               item.name === 'Housing' ? '#1E293B' : '#75777B'
      }));

      // Calculate bar heights
      const maxSpending = Math.max(...rawWeeklyData);
      const weeklyData = rawWeeklyData.map((val: number) => 
        maxSpending > 0 ? Math.round((val / maxSpending) * 80) + 10 : 15
      );
      
      // Calculate a dynamic trend compared to the budget limits
      const trend = budgetVal > 0 ? Math.round((totalSpending / budgetVal) * 100) : 0;
      
      setStats({
        totalSpending,
        budget: budgetVal,
        breakdown,
        weeklyData,
        trend
      });
    } catch (error: any) {
      console.error("Failed to fetch analytics", error);
      if (error.response?.status === 401) {
        logout();
      }
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [currentDate])
  );

  const handlePrevMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() - 1);
    setCurrentDate(newDate);
  };

  const handleNextMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + 1);
    setCurrentDate(newDate);
  };

  const handleSaveBudget = async () => {
    const val = parseFloat(budgetInput);
    if (isNaN(val) || val <= 0) {
      setErrorMessage('Please provide a valid monthly budget limit.');
      return;
    }
    try {
      await SecureStore.setItemAsync(getBudgetKey(), val.toString());
      setStats(prev => ({ 
        ...prev, 
        budget: val,
        trend: Math.round((prev.totalSpending / val) * 100)
      }));
      setIsBudgetModalVisible(false);
    } catch (e) {
      console.error("Failed to save budget", e);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (isLoading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const isCurrentMonth = () => {
    const today = new Date();
    return currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Analytics</Text>
      </View>

      <Animated.View entering={FadeInDown.delay(100)} style={styles.dateSelector}>
        <TouchableOpacity style={styles.selectorButton} onPress={handlePrevMonth}>
          <ChevronLeft size={24} color={theme.colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => {
            setPickerYear(currentDate.getFullYear());
            setIsMonthPickerVisible(true);
          }}
          style={{ alignItems: 'center' }}
        >
          <Text style={styles.currentMonth}>
            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.selectorButton, isCurrentMonth() && { opacity: 0.3 }]} 
          onPress={handleNextMonth}
          disabled={isCurrentMonth()}
        >
          <ChevronRight size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      </Animated.View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Animated.View entering={FadeInDown.delay(200)} style={styles.chartCard}>
          <TouchableOpacity 
            style={styles.chartHeader}
            onPress={() => {
              setBudgetInput(stats.budget.toString());
              setIsBudgetModalVisible(true);
            }}
          >
            <View>
              <Text style={styles.chartLabel}>Spending vs Budget (Tap to Set)</Text>
              <Text style={styles.chartValue}>
                ₹{stats.totalSpending.toFixed(2)} <Text style={styles.budgetLimit}>/ ₹{stats.budget}</Text>
              </Text>
            </View>
            <View style={[styles.trendBadge, stats.totalSpending > stats.budget ? styles.trendUp : styles.trendDown]}>
              <TrendingUp size={14} color={stats.totalSpending > stats.budget ? theme.colors.spending : theme.colors.income} />
              <Text style={[styles.trendText, { color: stats.totalSpending > stats.budget ? theme.colors.spending : theme.colors.income }]}>
                {stats.trend}%
              </Text>
            </View>
          </TouchableOpacity>
          
          <View style={styles.barChartContainer}>
            {stats.weeklyData.map((height, i) => (
              <BarItem key={i} height={height} day={['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]} delay={300 + (i * 100)} />
            ))}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(400)} style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Breakdown</Text>
        </Animated.View>

        <View style={styles.categoryList}>
          {stats.breakdown.length === 0 ? (
            <Text style={styles.emptyText}>No data to show breakdown yet.</Text>
          ) : (
            stats.breakdown.map((item, index) => (
              <CategoryItem 
                key={index}
                name={item.name} 
                amount={`₹${item.amount.toFixed(2)}`} 
                percentage={item.percentage} 
                color={item.color} 
                delay={500 + (index * 100)}
              />
            ))
          )}
        </View>

        <Animated.View entering={FadeInDown.delay(1000)} style={styles.insightCard}>
          <Text style={styles.insightTitle}>Mindfulness Insight</Text>
          <Text style={styles.insightText}>
            {stats.totalSpending > 0 
              ? `You've allocated ${stats.breakdown[0]?.percentage.toFixed(0)}% of your spending to "${stats.breakdown[0]?.name}". Is this bringing you value?`
              : "Start adding expenses to receive personalized financial mindfulness insights."}
          </Text>
        </Animated.View>
      </ScrollView>

      {/* Month Picker Modal */}
      <Modal
        visible={isMonthPickerVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsMonthPickerVisible(false)}
      >
        <View style={styles.monthPickerOverlay}>
          <Pressable 
            style={StyleSheet.absoluteFill} 
            onPress={() => setIsMonthPickerVisible(false)} 
          />
          <View style={styles.monthPickerContainer}>
            <View style={styles.pickerYearHeader}>
              <TouchableOpacity onPress={() => setPickerYear(prev => prev - 1)}>
                <ChevronLeft size={24} color={theme.colors.primary} />
              </TouchableOpacity>
              <Text style={styles.pickerYearText}>{pickerYear}</Text>
              <TouchableOpacity 
                onPress={() => setPickerYear(prev => prev + 1)}
                disabled={pickerYear >= new Date().getFullYear()}
                style={pickerYear >= new Date().getFullYear() && { opacity: 0.3 }}
              >
                <ChevronRight size={24} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.monthGrid}>
              {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month, index) => {
                const isFuture = pickerYear === new Date().getFullYear() && index > new Date().getMonth();
                const isSelected = currentDate.getFullYear() === pickerYear && currentDate.getMonth() === index;
                
                return (
                  <TouchableOpacity
                    key={month}
                    disabled={isFuture}
                    style={[
                      styles.monthCell,
                      isSelected && styles.monthCellSelected,
                      isFuture && { opacity: 0.2 }
                    ]}
                    onPress={() => {
                      const newDate = new Date();
                      newDate.setFullYear(pickerYear);
                      newDate.setMonth(index);
                      setCurrentDate(newDate);
                      setIsMonthPickerVisible(false);
                    }}
                  >
                    <Text style={[
                      styles.monthCellText,
                      isSelected && styles.monthCellTextSelected
                    ]}>
                      {month}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>

      {/* Budget Selector Modal */}
      <Modal
        visible={isBudgetModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsBudgetModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setIsBudgetModalVisible(false)}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ width: '100%' }}
              >
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <View style={styles.modalHandle} />
                    <Text style={styles.modalTitle}>Set Monthly Budget Plan</Text>
                  </View>
                  
                  <View style={styles.budgetInputContainer}>
                    <Text style={styles.budgetInputSymbol}>₹</Text>
                    <TextInput
                      style={styles.budgetInput}
                      placeholder="5000"
                      keyboardType="numeric"
                      autoFocus
                      placeholderTextColor={theme.colors.outline}
                      value={budgetInput}
                      onChangeText={setBudgetInput}
                    />
                  </View>

                  <TouchableOpacity 
                    style={styles.saveBudgetButton}
                    onPress={handleSaveBudget}
                  >
                    <Text style={styles.saveBudgetButtonText}>Save Budget Plan</Text>
                  </TouchableOpacity>
                </View>
              </KeyboardAvoidingView>
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>

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

    </View>
  );
}

function BarItem({ height, day, delay }: any) {
  const animatedStyle = useAnimatedStyle(() => ({
    height: withSpring(`${height}%`, { damping: 10, stiffness: 80 }),
  }));

  return (
    <View style={styles.barGroup}>
      <Animated.View style={[styles.bar, animatedStyle]} />
      <Text style={styles.barDay}>{day}</Text>
    </View>
  );
}

function CategoryItem({ name, amount, percentage, color, delay }: any) {
  const fillStyle = useAnimatedStyle(() => ({
    width: withTiming(`${percentage}%`, { duration: 1000 }),
  }));

  return (
    <Animated.View entering={FadeInLeft.delay(delay)} layout={Layout.springify()} style={styles.categoryItem}>
      <View style={styles.categoryInfo}>
        <View style={[styles.categoryColor, { backgroundColor: color }]} />
        <Text style={styles.categoryName}>{name}</Text>
        <Text style={styles.categoryAmount}>{amount}</Text>
      </View>
      <View style={styles.progressBarBackground}>
        <Animated.View style={[styles.progressBarFill, { backgroundColor: color }, fillStyle]} />
      </View>
    </Animated.View>
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
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    marginBottom: 20,
  },
  selectorButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  currentMonth: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 16,
    color: theme.colors.primary,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.page,
    paddingBottom: 40,
  },
  chartCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: 24,
    marginBottom: 24,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 2,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 32,
  },
  chartLabel: {
    fontFamily: 'DMSans-Medium',
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  chartValue: {
    fontFamily: 'Manrope-Bold',
    fontSize: 24,
    color: theme.colors.primary,
  },
  budgetLimit: {
    fontFamily: 'Manrope-Regular',
    fontSize: 16,
    color: theme.colors.outline,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  trendUp: {
    backgroundColor: theme.colors.spending + '15',
  },
  trendDown: {
    backgroundColor: theme.colors.income + '15',
  },
  trendText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 12,
  },
  barChartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 150,
  },
  barGroup: {
    alignItems: 'center',
    gap: 12,
  },
  bar: {
    width: 12,
    backgroundColor: theme.colors.primary,
    borderRadius: 6,
  },
  barDay: {
    fontFamily: 'DMSans-Medium',
    fontSize: 12,
    color: theme.colors.outline,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: 'Manrope-Bold',
    fontSize: 18,
    color: theme.colors.primary,
  },
  categoryList: {
    gap: 20,
    marginBottom: 32,
  },
  categoryItem: {
    gap: 8,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  categoryName: {
    fontFamily: 'DMSans-Medium',
    fontSize: 14,
    color: theme.colors.primary,
    flex: 1,
  },
  categoryAmount: {
    fontFamily: 'Manrope-Bold',
    fontSize: 14,
    color: theme.colors.primary,
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: theme.colors.surface,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  insightCard: {
    backgroundColor: theme.colors.income + '10',
    padding: 20,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.income + '20',
  },
  insightTitle: {
    fontFamily: 'Manrope-Bold',
    fontSize: 16,
    color: theme.colors.income,
    marginBottom: 8,
  },
  insightText: {
    fontFamily: 'DMSans-Regular',
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  emptyText: {
    fontFamily: 'DMSans-Regular',
    fontSize: 14,
    color: theme.colors.outline,
    textAlign: 'center',
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
  budgetInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outline + '40',
    paddingVertical: 12,
    marginBottom: 24,
  },
  budgetInputSymbol: {
    fontFamily: 'Manrope-Bold',
    fontSize: 28,
    color: theme.colors.primary,
    marginRight: 8,
  },
  budgetInput: {
    fontFamily: 'Manrope-Bold',
    fontSize: 36,
    color: theme.colors.primary,
    minWidth: 150,
    textAlign: 'left',
  },
  saveBudgetButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 18,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBudgetButtonText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 16,
    color: theme.colors.white,
  },
  monthPickerOverlay: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.page,
  },
  monthPickerContainer: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: 24,
    width: '90%',
    maxWidth: 350,
    alignSelf: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  pickerYearHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  pickerYearText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 20,
    color: theme.colors.primary,
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  monthCell: {
    width: '30%',
    paddingVertical: 10,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthCellSelected: {
    backgroundColor: theme.colors.primary,
  },
  monthCellText: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  monthCellTextSelected: {
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
