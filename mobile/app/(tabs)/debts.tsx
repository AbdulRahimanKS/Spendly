import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus, CreditCard, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react-native';
import { theme } from '../../src/theme/theme';
import Animated, { FadeInDown, FadeInRight, SlideInUp, Layout } from 'react-native-reanimated';
import { useFocusEffect, useRouter } from 'expo-router';
import axios from 'axios';
import { API_URL } from '../../src/config';
import { useAuthStore } from '../../src/store/authStore';

export default function Debts() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token } = useAuthStore();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = async () => {
    try {
      const response = await axios.get(`${API_URL}/debts/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDashboardData(response.data);
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchDashboard();
    }, [token])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDashboard();
    setRefreshing(false);
  }, [token]);

  const totalDebt = dashboardData?.summary?.total_principal || 0;
  const totalOutstanding = dashboardData?.summary?.total_outstanding || 0;
  const totalPaid = totalDebt > 0 ? totalDebt - totalOutstanding : 0;
  const progressPercent = totalDebt > 0 ? (totalPaid / totalDebt) * 100 : 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
        }
      >
        
        {/* Header Section */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.header}>
          <Text style={styles.headerTitle}>Debts</Text>
        </Animated.View>

        {/* Total Outstanding Debt Card */}
        <Animated.View entering={FadeInDown.delay(150)} style={styles.balanceCard}>
          <View style={styles.balanceCardHeader}>
            <Text style={styles.balanceLabel}>Total Outstanding Debt</Text>
            <CreditCard size={20} color="rgba(255,255,255,0.7)" />
          </View>
          <Text style={styles.balanceAmount}>₹{(totalDebt - totalPaid).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
          
          <View style={styles.monthlyProgress}>
            <Text style={styles.progressLabel}>Overall Progress</Text>
            <View style={styles.progressBarBackground}>
              <View style={[styles.progressBarFill, { width: `${Math.min(progressPercent, 100)}%` }]} />
            </View>
            <View style={styles.progressTextRow}>
              <Text style={styles.progressText}>₹{totalPaid.toLocaleString('en-IN')} paid</Text>
              <Text style={styles.progressText}>₹{totalDebt.toLocaleString('en-IN')} total</Text>
            </View>
          </View>
        </Animated.View>

        {/* Upcoming Payments */}
        <Animated.View entering={FadeInDown.delay(200)} style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Upcoming Payments</Text>
          <TouchableOpacity onPress={() => router.push('/all-debts')}>
            <Text style={styles.seeAllText}>View All</Text>
          </TouchableOpacity>
        </Animated.View>

        {isLoading ? (
          <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 20 }} />
        ) : !dashboardData?.upcoming || dashboardData.upcoming.length === 0 ? (
          <Text style={{ textAlign: 'center', marginTop: 20, color: theme.colors.outline, fontFamily: 'DMSans-Regular' }}>No debts found. Add one below!</Text>
        ) : dashboardData.upcoming.map((payment: any, index: number) => {
          const isEmi = payment.monthly_emi > 0;
          const displayAmount = isEmi ? payment.monthly_emi : payment.outstanding_amount;
          const typeLabel = isEmi ? 'Monthly EMI' : 'One-time Debt';
          const isOverdue = payment.due_date && new Date(payment.due_date) < new Date(new Date().setHours(0,0,0,0)) && payment.status !== 'paid';

          return (
            <View key={payment.id}>
              <TouchableOpacity 
                style={styles.paymentItem}
                onPress={() => router.push(`/debt/${payment.id}`)}
              >
                <View style={[styles.paymentIcon, { backgroundColor: payment.status === 'paid' ? theme.colors.income + '20' : theme.colors.spending + '15' }]}>
                  {payment.status === 'paid' ? (
                    <CheckCircle2 size={20} color={theme.colors.income} />
                  ) : (
                    <AlertCircle size={20} color={theme.colors.spending} />
                  )}
                </View>
                <View style={styles.paymentInfo}>
                  <Text style={styles.paymentTitle}>{payment.name}</Text>
                  <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 13, color: isEmi ? theme.colors.primary : theme.colors.textSecondary, marginBottom: 2 }}>{typeLabel}</Text> 
                  <Text style={[styles.paymentDate, isOverdue && { color: theme.colors.spending, fontFamily: 'DMSans-Medium' }]}>
                    {payment.due_date ? `Due ${new Date(payment.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : 'No due date'}
                    {isOverdue ? ' (Overdue)' : ''}
                  </Text>
                </View>
                <View style={styles.paymentRight}>
                  <Text style={styles.paymentAmount}>₹{displayAmount.toLocaleString('en-IN')}</Text>
                  <ArrowRight size={16} color={theme.colors.outline} />
                </View>
              </TouchableOpacity>
            </View>
          );
        })}

      </ScrollView>

      {/* FAB for Adding New Debt */}
      <Animated.View entering={FadeInDown.delay(400)} style={styles.fabContainer}>
        <TouchableOpacity style={styles.fab} onPress={() => router.push('/add-debt')}>
          <Plus size={24} color={theme.colors.background} />
        </TouchableOpacity>
      </Animated.View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.page,
    paddingTop: 12,
    paddingBottom: 100,
  },
  header: {
    marginBottom: theme.spacing.xl,
  },
  headerTitle: {
    fontFamily: 'Manrope-Bold',
    fontSize: 28,
    color: theme.colors.primary,
  },
  balanceCard: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  balanceCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  balanceLabel: {
    fontFamily: 'DMSans-Medium',
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  balanceAmount: {
    fontFamily: 'Manrope-Bold',
    fontSize: 36,
    color: theme.colors.white,
    letterSpacing: -1,
    marginBottom: 24,
  },
  monthlyProgress: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 16,
  },
  progressLabel: {
    fontFamily: 'DMSans-Medium',
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 8,
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 3,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: theme.colors.income,
    borderRadius: 3,
  },
  progressTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: 'Manrope-Bold',
    fontSize: 18,
    color: theme.colors.primary,
  },
  seeAllText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 14,
    color: theme.colors.secondary,
  },
  paymentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  paymentIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentTitle: {
    fontFamily: 'DMSans-Medium',
    fontSize: 16,
    color: theme.colors.primary,
    marginBottom: 2,
  },
  paymentDate: {
    fontFamily: 'DMSans-Regular',
    fontSize: 13,
    color: theme.colors.outline,
  },
  paymentRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  paymentAmount: {
    fontFamily: 'Manrope-Bold',
    fontSize: 16,
    color: theme.colors.primary,
  },
  fabContainer: {
    position: 'absolute',
    bottom: 42,
    right: 24,
    zIndex: 10,
  },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
    borderWidth: 4,
    borderColor: theme.colors.background,
  }
});
