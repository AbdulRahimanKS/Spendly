import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions, Alert, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, useFocusEffect, Stack } from 'expo-router';
import { ArrowLeft, MoreHorizontal, BadgeCheck, CheckCircle, Trash, AlertCircle } from 'lucide-react-native';
import { theme } from '../../src/theme/theme';
import Animated, { FadeIn } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import axios from 'axios';
import { API_URL } from '../../src/config';
import { useAuthStore } from '../../src/store/authStore';

const { width } = Dimensions.get('window');
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export default function DebtDetails() {
  const { id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token } = useAuthStore();
  
  const [debt, setDebt] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [isUpcomingExpanded, setIsUpcomingExpanded] = useState(false);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);

  const fetchDebt = async () => {
    try {
      // Assuming a GET /debts/{id} endpoint or filtering from all debts if single endpoint isn't built yet
      const response = await axios.get(`${API_URL}/debts/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const currentDebt = response.data.find((d: any) => d.id === parseInt(id as string));
      setDebt(currentDebt);

      const txResponse = await axios.get(`${API_URL}/debts/${id}/transactions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTransactions(txResponse.data);
    } catch (error) {
      console.error('Failed to fetch debt:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchDebt();
    }, [id])
  );

  if (isLoading || !debt) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const handlePay = async () => {
    try {
      setIsLoading(true);
      await axios.post(`${API_URL}/debts/${id}/pay`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchDebt();
    } catch (error) {
      console.error('Failed to pay debt:', error);
      setIsLoading(false);
    }
  };

  const handleEdit = () => {
    router.push({ pathname: '/add-debt', params: { editId: id } });
  };

  const handleDelete = () => {
    setIsDeleteModalVisible(true);
  };

  const confirmDelete = async () => {
    try {
      setIsLoading(true);
      setIsDeleteModalVisible(false);
      await axios.delete(`${API_URL}/debts/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      router.back();
    } catch (error) {
      console.error('Failed to delete debt:', error);
      Alert.alert('Error', 'Failed to delete debt. Please try again.');
      setIsLoading(false);
    }
  };

  const progress = debt.total_principal > 0 ? ((debt.total_principal - debt.outstanding_amount) / debt.total_principal) : 0;
  const progressPercent = Math.round(progress * 100);

  // SVG Config
  const size = 180;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - progress * circumference;

  // Generate Upcoming Dates dynamically
  const upcomingPayments = [];
  if (debt.due_date && debt.outstanding_amount > 0) {
    let currentDate = new Date(debt.due_date);
    let remainingAmount = debt.outstanding_amount;
    const increment = debt.monthly_emi > 0 ? debt.monthly_emi : remainingAmount;
    
    // Project all upcoming payments (capped at 60 months to prevent infinite loop)
    for (let i = 0; i < 60 && remainingAmount > 0; i++) {
      upcomingPayments.push({
        date: new Date(currentDate),
        amount: Math.min(increment, remainingAmount)
      });
      remainingAmount -= increment;
      // Add 1 month to projection
      currentDate.setMonth(currentDate.getMonth() + 1);
    }
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      
      <Stack.Screen 
        options={{ 
          headerShown: true, 
          headerTransparent: true, 
          headerTitle: '',
          headerTintColor: theme.colors.primary,
          headerShadowVisible: false 
        }} 
      />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Title & Badge */}
        <Animated.View entering={FadeIn.delay(100)} style={styles.titleSection}>
          <Text style={styles.mainTitle}>{debt.name}</Text>
          <View style={styles.badge}>
            <BadgeCheck size={16} color={theme.colors.textSecondary} />
            <Text style={styles.badgeText}>{debt.category || 'Personal Debt'}</Text>
          </View>
          
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
            <TouchableOpacity 
              style={{ backgroundColor: theme.colors.surfaceDim, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20 }}
              onPress={handleEdit}
            >
              <Text style={{ fontFamily: 'DMSans-Medium', color: theme.colors.primary, fontSize: 13 }}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={{ backgroundColor: theme.colors.spending + '15', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20 }}
              onPress={handleDelete}
            >
              <Text style={{ fontFamily: 'DMSans-Medium', color: theme.colors.spending, fontSize: 13 }}>Delete</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Progress Card */}
        <Animated.View entering={FadeIn.delay(150)} style={styles.progressCard}>
          <View style={styles.progressRingContainer}>
            <Svg width={size} height={size} style={styles.svg}>
              {/* Background Circle */}
              <Circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={theme.colors.surfaceDim}
                strokeWidth={strokeWidth}
                fill="transparent"
              />
              {/* Foreground Circle */}
              <AnimatedCircle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={theme.colors.secondary}
                strokeWidth={strokeWidth}
                fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
              />
            </Svg>
            <View style={styles.progressTextContainer}>
              <Text style={styles.progressValue}>{progressPercent}%</Text>
              <Text style={styles.progressLabel}>Paid Off</Text>
            </View>
          </View>

          <View style={styles.statsContainer}>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Outstanding</Text>
              <Text style={styles.statValueOutstanding}><Text style={{ fontFamily: 'Manrope-Bold' }}>₹</Text>{debt.outstanding_amount.toLocaleString('en-IN')}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Total Principal</Text>
              <Text style={styles.statValue}><Text style={{ fontFamily: 'Manrope-Bold' }}>₹</Text>{debt.total_principal.toLocaleString('en-IN')}</Text>
            </View>
            <View style={[styles.statRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
              <Text style={styles.statLabel}>Monthly EMI</Text>
              <Text style={styles.statValueEmi}><Text style={{ fontFamily: 'Manrope-Bold' }}>₹</Text>{debt.monthly_emi.toLocaleString('en-IN')}</Text>
            </View>
          </View>
        </Animated.View>

        {/* Grid for Upcoming & History */}
        <View style={styles.gridContainer}>
          <Animated.View entering={FadeIn.delay(200)} style={styles.gridCard}>
            <View style={styles.gridHeader}>
              <Text style={styles.gridTitle}>Upcoming Payments</Text>
            </View>
            <View style={styles.historyList}>
              {upcomingPayments.length > 0 ? (
                <>
                  {(isUpcomingExpanded ? upcomingPayments : upcomingPayments.slice(0, 3)).map((payment, i) => {
                    const isOverdue = payment.date < new Date(new Date().setHours(0,0,0,0));
                    return (
                      <View key={i} style={styles.historyItem}>
                        <View style={[styles.iconCircle, isOverdue && { backgroundColor: theme.colors.spending + '20' }]}>
                          {isOverdue ? <AlertCircle size={20} color={theme.colors.spending} /> : <CheckCircle size={20} color={theme.colors.secondary} />}
                        </View>
                        <View style={styles.historyInfo}>
                          <Text style={[styles.historyDate, isOverdue && { color: theme.colors.spending }]}>{payment.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
                          <Text style={[styles.historyStatus, isOverdue && { color: theme.colors.spending }]}>{isOverdue ? 'Overdue' : 'Upcoming'}</Text>
                        </View>
                        <Text style={styles.historyAmount}><Text style={{ fontFamily: 'Manrope-Bold' }}>₹</Text>{payment.amount.toLocaleString('en-IN')}</Text>
                      </View>
                    );
                  })}
                  {upcomingPayments.length > 3 && (
                    <TouchableOpacity 
                      style={{ paddingVertical: 12, alignItems: 'center', borderTopWidth: 1, borderTopColor: theme.colors.surfaceDim, marginTop: 4 }}
                      onPress={() => setIsUpcomingExpanded(!isUpcomingExpanded)}
                    >
                      <Text style={{ fontFamily: 'DMSans-Medium', color: theme.colors.primary, fontSize: 13 }}>
                        {isUpcomingExpanded ? 'Show Less' : `Show ${upcomingPayments.length - 3} More`}
                      </Text>
                    </TouchableOpacity>
                  )}
                </>
              ) : (
                <Text style={{ fontFamily: 'DMSans-Medium', color: theme.colors.outline, fontSize: 13 }}>No upcoming payments.</Text>
              )}
            </View>
          </Animated.View>

          <Animated.View entering={FadeIn.delay(250)} style={styles.gridCard}>
            <View style={styles.gridHeader}>
              <Text style={styles.gridTitle}>Recent History</Text>
            </View>
            <View style={styles.historyList}>
              {transactions.length > 0 ? (
                <>
                  {(isHistoryExpanded ? transactions : transactions.slice(0, 3)).map((tx, i, arr) => (
                    <View key={tx.id || i} style={[styles.historyItem, i !== arr.length - 1 && styles.historyItemBorder]}>
                      <View style={styles.historyInfo}>
                        <Text style={styles.historyDate}>
                          {new Date(tx.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </Text>
                        <Text style={styles.historyStatus}>Paid</Text>
                      </View>
                      <Text style={styles.historyAmount}>-₹{tx.amount.toLocaleString('en-IN')}</Text>
                    </View>
                  ))}
                  {transactions.length > 3 && (
                    <TouchableOpacity 
                      style={{ paddingVertical: 12, alignItems: 'center', borderTopWidth: 1, borderTopColor: theme.colors.surfaceDim, marginTop: 4 }}
                      onPress={() => setIsHistoryExpanded(!isHistoryExpanded)}
                    >
                      <Text style={{ fontFamily: 'DMSans-Medium', color: theme.colors.primary, fontSize: 13 }}>
                        {isHistoryExpanded ? 'Show Less' : `Show ${transactions.length - 3} More`}
                      </Text>
                    </TouchableOpacity>
                  )}
                </>
              ) : (
                <Text style={{ fontFamily: 'DMSans-Medium', color: theme.colors.outline, fontSize: 13, marginTop: 4 }}>
                  No recent payment history found.
                </Text>
              )}
            </View>
          </Animated.View>
        </View>

        {/* Pay Button */}
        {debt.status !== 'paid' && (
          <TouchableOpacity 
            style={[styles.payButton, isLoading && { opacity: 0.7 }]}
            onPress={handlePay}
            disabled={isLoading}
          >
            <Text style={styles.payButtonText}>
              Mark Paid (₹{(debt.monthly_emi > 0 ? debt.monthly_emi : debt.outstanding_amount).toLocaleString('en-IN')})
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>

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
            <Text style={styles.errorModalTitle}>Delete Debt?</Text>
            <Text style={styles.errorModalMessage}>Are you sure you want to delete this debt? This action cannot be undone.</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.page,
    paddingVertical: 16,
  },
  iconButton: {
    padding: 8,
    marginHorizontal: -8,
  },
  headerTitle: {
    fontFamily: 'Manrope-Bold',
    fontSize: 22,
    color: theme.colors.primary,
    letterSpacing: -0.5,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.page,
    paddingBottom: 40,
  },
  titleSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  mainTitle: {
    fontFamily: 'Manrope-Bold',
    fontSize: 32,
    color: theme.colors.primary,
    marginBottom: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceDim + '50',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
  },
  badgeText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  progressCard: {
    backgroundColor: theme.colors.white,
    borderRadius: 24,
    padding: 24,
    flexDirection: 'column',
    alignItems: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 5,
    marginBottom: 24,
    position: 'relative',
    overflow: 'hidden',
  },
  progressGlow: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 200,
    height: 200,
    backgroundColor: theme.colors.secondary + '15',
    borderRadius: 100,
  },
  progressRingContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  svg: {
    transform: [{ rotate: '0deg' }],
  },
  progressTextContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressValue: {
    fontFamily: 'Manrope-Bold',
    fontSize: 36,
    color: theme.colors.primary,
    letterSpacing: -1,
  },
  progressLabel: {
    fontFamily: 'DMSans-Medium',
    fontSize: 12,
    color: theme.colors.textSecondary,
    letterSpacing: 1,
    marginTop: 4,
  },
  statsContainer: {
    width: '100%',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceDim,
    paddingBottom: 12,
    marginBottom: 12,
  },
  statLabel: {
    fontFamily: 'DMSans-Medium',
    fontSize: 12,
    color: theme.colors.textSecondary,
    letterSpacing: 1,
  },
  statValueOutstanding: {
    fontFamily: 'Manrope-Bold',
    fontSize: 24,
    color: theme.colors.primary,
  },
  statValue: {
    fontFamily: 'DMSans-Medium',
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  statValueEmi: {
    fontFamily: 'DMSans-Medium',
    fontSize: 18,
    color: theme.colors.primary,
  },
  gridContainer: {
    flexDirection: 'column',
    gap: 16,
  },
  gridCard: {
    backgroundColor: theme.colors.white,
    borderRadius: 20,
    padding: 20,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 3,
  },
  gridHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  gridTitle: {
    fontFamily: 'Manrope-Bold',
    fontSize: 16,
    color: theme.colors.primary,
  },
  seeAllText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  historyList: {
    gap: 12,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceDim + '30',
    padding: 12,
    borderRadius: 12,
  },
  historyItemBorder: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceDim,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.secondary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  historyInfo: {
    flex: 1,
  },
  historyDate: {
    fontFamily: 'DMSans-Medium',
    fontSize: 14,
    color: theme.colors.primary,
  },
  historyStatus: {
    fontFamily: 'DMSans-Medium',
    fontSize: 10,
    color: theme.colors.textSecondary,
    letterSpacing: 1,
    marginTop: 2,
  },
  historyAmount: {
    fontFamily: 'Manrope-Bold',
    fontSize: 16,
    color: theme.colors.primary,
  },
  historyAmountDark: {
    fontFamily: 'Manrope-Bold',
    fontSize: 16,
    color: theme.colors.primary,
  },
  payButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  payButtonText: {
    fontFamily: 'Manrope-Bold',
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
