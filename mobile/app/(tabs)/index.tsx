import React, { useEffect, useState, useCallback } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Wallet, Plus, ArrowUpRight, ArrowDownLeft, User } from 'lucide-react-native';
import Animated, { 
  FadeInDown, 
  FadeInRight,
  Layout,
  SlideInUp
} from 'react-native-reanimated';
import { theme } from '../../src/theme/theme';
import { CategoryIcon, getCategoryName } from '../../src/utils/icons';
import { useAuthStore } from '../../src/store/authStore';
import axios from 'axios';

import { API_URL } from '../../src/config';

const formatTransactionDate = (dateString: string) => {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  if (date.toDateString() === today.toDateString()) {
    return `Today, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return `Yesterday, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined });
};

export default function Dashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token, logout, user } = useAuthStore();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({ balance: 0, income: 0, spending: 0 });

  const fetchTransactions = async () => {
    try {
      const response = await axios.get(`${API_URL}/transactions/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setTransactions(response.data.recent);
      setStats(response.data.stats);
    } catch (error: any) {
      console.error("Failed to fetch transactions", error);
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
      fetchTransactions();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchTransactions();
  };

  if (isLoading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const getGreeting = () => {
    const hours = new Date().getHours();
    if (hours >= 5 && hours < 12) return 'Good morning';
    if (hours >= 12 && hours < 17) return 'Good afternoon';
    if (hours >= 17 && hours < 22) return 'Good evening';
    return 'Good night';
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header Section */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()},</Text>
            <Text style={styles.userName}>{user?.full_name || 'User'}</Text>
          </View>
          <TouchableOpacity style={styles.profileButton} onPress={() => router.push('/(tabs)/profile')}>
            {user?.profile_image ? (
              <Image source={{ uri: user.profile_image }} style={{ width: 48, height: 48, borderRadius: 24 }} />
            ) : (
              <User size={24} color={theme.colors.primary} />
            )}
          </TouchableOpacity>
        </Animated.View>

        {/* Balance Card */}
        <Animated.View entering={FadeInDown.delay(150)} style={styles.balanceCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <Text style={[styles.balanceLabel, { marginBottom: 0 }]}>Total Balance</Text>
            <Text style={styles.cardDate}>{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</Text>
          </View>
          <Text style={styles.balanceAmount}>₹{stats.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <View style={[styles.statIconContainer, { backgroundColor: theme.colors.income + '20' }]}>
                <ArrowDownLeft size={16} color={theme.colors.income} />
              </View>
              <View>
                <Text style={styles.statLabel}>Income</Text>
                <Text style={styles.statValue}>₹{stats.income.toLocaleString('en-IN')}</Text>
              </View>
            </View>
            <View style={styles.statItem}>
              <View style={[styles.statIconContainer, { backgroundColor: theme.colors.spending + '20' }]}>
                <ArrowUpRight size={16} color={theme.colors.spending} />
              </View>
              <View>
                <Text style={styles.statLabel}>Spending</Text>
                <Text style={styles.statValue}>₹{stats.spending.toLocaleString('en-IN')}</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Recent Activity Section */}
        <Animated.View entering={FadeInDown.delay(300)} style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/history')}>
            <Text style={styles.viewAll}>View All</Text>
          </TouchableOpacity>
        </Animated.View>

        <View style={styles.transactionList}>
          {transactions.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No transactions yet. Tap + to start.</Text>
            </View>
          ) : (
            transactions.slice(0, 5).map((item, index) => (
              <Animated.View 
                key={item.id} 
                entering={FadeInRight.delay(400 + (index * 100))}
                layout={Layout.springify()}
              >
                <TouchableOpacity 
                  style={styles.transactionItem}
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
                >
                  <View style={styles.transactionIcon}>
                    <CategoryIcon categoryId={item.category_id} color={theme.colors.secondary} />
                  </View>
                  <View style={styles.transactionInfo}>
                    <Text style={styles.transactionTitle}>{item.title}</Text>
                    <Text style={styles.transactionCategory}>{getCategoryName(item.category_id)}</Text>
                    <Text style={styles.transactionDate}>{formatTransactionDate(item.date)}</Text>
                  </View>
                  <Text style={[
                    styles.transactionAmount, 
                    item.type === 'income' && { color: theme.colors.income }
                  ]}>
                    {item.type === 'income' ? '+' : '-'}₹{item.amount.toFixed(2)}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      <Animated.View entering={FadeInDown.delay(400)}>
        <TouchableOpacity 
          style={styles.fab}
          onPress={() => router.push('/add-expense')}
        >
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.page,
    paddingTop: 12,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  greeting: {
    fontFamily: 'DMSans-Regular',
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  userName: {
    fontFamily: 'Manrope-Bold',
    fontSize: 24,
    color: theme.colors.primary,
  },

  profileButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    overflow: 'hidden',
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
  balanceLabel: {
    fontFamily: 'DMSans-Medium',
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 4,
  },
  cardDate: {
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
  },
  balanceAmount: {
    fontFamily: 'Manrope-Bold',
    fontSize: 36,
    color: theme.colors.white,
    marginBottom: 24,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: 20,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statLabel: {
    fontFamily: 'DMSans-Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },
  statValue: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 16,
    color: theme.colors.white,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontFamily: 'Manrope-Bold',
    fontSize: 18,
    color: theme.colors.primary,
  },
  viewAll: {
    fontFamily: 'DMSans-Medium',
    fontSize: 14,
    color: theme.colors.secondary,
  },
  transactionList: {
    gap: 12,
  },
  transactionItem: {
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
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionTitle: {
    fontFamily: 'DMSans-Medium',
    fontSize: 16,
    color: theme.colors.primary,
  },
  transactionCategory: {
    fontFamily: 'DMSans-Medium',
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  transactionDate: {
    fontFamily: 'DMSans-Regular',
    fontSize: 11,
    color: theme.colors.outline,
    marginTop: 2,
  },
  transactionAmount: {
    fontFamily: 'Manrope-Bold',
    fontSize: 16,
    color: theme.colors.spending,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontFamily: 'DMSans-Regular',
    fontSize: 14,
    color: theme.colors.outline,
  },
  fab: {
    position: 'absolute',
    bottom: 42,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
    borderWidth: 4,
    borderColor: theme.colors.background,
  }
});
