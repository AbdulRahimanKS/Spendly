import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PlusCircle, Calendar as CalendarIcon, Edit2, CheckCircle, ChevronLeft, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react-native';
import { theme } from '../src/theme/theme';
import Animated, { FadeInDown, FadeInRight, Layout } from 'react-native-reanimated';
import { useFocusEffect, useRouter, Stack } from 'expo-router';
import axios from 'axios';
import { API_URL } from '../src/config';
import { useAuthStore } from '../src/store/authStore';

export default function AllDebts() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token } = useAuthStore();
  const [debts, setDebts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const LIMIT = 20;

  const fetchDebts = async (pageNum = 0, isRefresh = false) => {
    if (pageNum === 0 && !isRefresh) setIsLoading(true);
    if (pageNum > 0) setIsLoadingMore(true);

    try {
      const response = await axios.get(`${API_URL}/debts/?skip=${pageNum * LIMIT}&limit=${LIMIT}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const newDebts = response.data;
      if (newDebts.length < LIMIT) {
        setHasMore(false);
      } else {
        setHasMore(true);
      }

      if (pageNum === 0) {
        setDebts(newDebts);
      } else {
        setDebts(prev => [...prev, ...newDebts]);
      }
      setPage(pageNum);
    } catch (error) {
      console.error('Failed to fetch debts:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
      setIsLoadingMore(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchDebts(0);
    }, [token])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchDebts(0, true);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
        }
        onScroll={({ nativeEvent }) => {
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 200;
          if (isCloseToBottom && !isLoadingMore && hasMore && !isLoading && !refreshing) {
            fetchDebts(page + 1);
          }
        }}
        scrollEventThrottle={400}
      >
        
        {/* Title Section */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.header}>
          <Text style={styles.headerTitle}>All Debts</Text>
          <Text style={styles.headerSubtitle}>View all your active debts and EMIs.</Text>
        </Animated.View>

        {isLoading ? (
          <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 20 }} />
        ) : (
          debts.map((debt, index) => {
            const isEmi = debt.monthly_emi > 0;
            const typeLabel = isEmi ? 'Monthly EMI' : 'One-time Debt';
            const isOverdue = debt.due_date && new Date(debt.due_date) < new Date(new Date().setHours(0,0,0,0)) && debt.status !== 'paid';
            
            return (
              <Animated.View 
                key={debt.id}
                layout={Layout.springify()}
              >
                <TouchableOpacity 
                  style={styles.paymentItem}
                  onPress={() => router.push(`/debt/${debt.id}`)}
                >
                  <View style={[styles.paymentIcon, { backgroundColor: debt.status === 'paid' ? theme.colors.income + '20' : theme.colors.spending + '15' }]}>
                    {debt.status === 'paid' ? (
                      <CheckCircle2 size={20} color={theme.colors.income} />
                    ) : (
                      <AlertCircle size={20} color={theme.colors.spending} />
                    )}
                  </View>
                  <View style={styles.paymentInfo}>
                    <Text style={styles.paymentTitle}>{debt.name}</Text>
                    <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 13, color: isEmi ? theme.colors.primary : theme.colors.textSecondary, marginBottom: 2 }}>{typeLabel}</Text> 
                    <Text style={[styles.paymentDate, isOverdue && { color: theme.colors.spending, fontFamily: 'DMSans-Medium' }]}>
                      {debt.due_date ? `Due ${new Date(debt.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : 'No due date'}
                      {isOverdue ? ' (Overdue)' : ''}
                    </Text>
                  </View>
                  <View style={styles.paymentRight}>
                    <Text style={styles.paymentAmount}>₹{debt.outstanding_amount.toLocaleString('en-IN')}</Text>
                    <ArrowRight size={16} color={theme.colors.outline} />
                  </View>
                </TouchableOpacity>
              </Animated.View>
            );
        })
      )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.page,
    paddingVertical: 16,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  topHeaderTitle: {
    fontFamily: 'Manrope-Bold',
    fontSize: 20,
    color: theme.colors.primary,
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
    letterSpacing: -1,
  },
  headerSubtitle: {
    fontFamily: 'DMSans-Regular',
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  cardContainer: {
    marginBottom: 20,
    position: 'relative',
  },
  cardGlow: {
    position: 'absolute',
    top: -10,
    right: -10,
    width: 100,
    height: 100,
    backgroundColor: theme.colors.income + '10',
    borderRadius: 50,
  },
  card: {
    backgroundColor: theme.colors.white,
    borderRadius: 20,
    padding: 20,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 4,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  debtTitle: {
    fontFamily: 'Manrope-Bold',
    fontSize: 18,
    color: theme.colors.primary,
    marginBottom: 4,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontFamily: 'DMSans-Regular',
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  emiAmount: {
    fontFamily: 'Manrope-Bold',
    fontSize: 24,
    color: theme.colors.primary,
    letterSpacing: -0.5,
  },
  monthlyLabel: {
    fontFamily: 'DMSans-Medium',
    fontSize: 10,
    color: theme.colors.textSecondary,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  balanceSection: {
    backgroundColor: theme.colors.surfaceDim + '30',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: -12,
    marginBottom: 16,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  balanceLabel: {
    fontFamily: 'DMSans-Medium',
    fontSize: 10,
    color: theme.colors.textSecondary,
    letterSpacing: 1,
  },
  balanceAmount: {
    fontFamily: 'Manrope-Bold',
    fontSize: 14,
    color: theme.colors.primary,
  },
  progressBarBg: {
    height: 4,
    backgroundColor: theme.colors.surfaceDim,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 2,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    marginLeft: -8,
  },
  actionText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.secondary + 'CC',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  payButtonText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 14,
    color: theme.colors.white,
  },
  addEmiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: theme.colors.outline + '80',
    marginTop: 16,
  },
  addEmiText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 16,
    color: theme.colors.textSecondary,
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
  }
});
