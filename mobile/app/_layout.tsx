import { Stack, useRouter, useSegments } from 'expo-router';
import { useFonts, Manrope_400Regular, Manrope_600SemiBold, Manrope_700Bold } from '@expo-google-fonts/manrope';
import { DMSans_400Regular, DMSans_500Medium, DMSans_700Bold } from '@expo-google-fonts/dm-sans';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useAuthStore } from '../src/store/authStore';
import axios from 'axios';
import { API_URL } from '../src/config';
import { theme } from '../src/theme/theme';
import * as SecureStore from 'expo-secure-store';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { isAuthenticated, setToken, setUser, logout } = useAuthStore();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const [loaded, error] = useFonts({
    'Manrope-Regular': Manrope_400Regular,
    'Manrope-SemiBold': Manrope_600SemiBold,
    'Manrope-Bold': Manrope_700Bold,
    'DMSans-Regular': DMSans_400Regular,
    'DMSans-Medium': DMSans_500Medium,
    'DMSans-Bold': DMSans_700Bold,
  });

  useEffect(() => {
    async function initAuth() {
      try {
        const storedToken = await SecureStore.getItemAsync('userToken');
        if (storedToken) {
          await setToken(storedToken);
          const res = await axios.get(`${API_URL}/users/me/`, {
            headers: { Authorization: `Bearer ${storedToken}` }
          });
          setUser(res.data);
        }
      } catch (err) {
        console.error("Auth initialization failed:", err);
      } finally {
        setIsCheckingAuth(false);
      }
    }
    initAuth();
  }, []);

  useEffect(() => {
    if (loaded && !isCheckingAuth) {
      SplashScreen.hideAsync();
    }
  }, [loaded, isCheckingAuth]);

  useEffect(() => {
    if (!loaded || isCheckingAuth) return;

    const inAuthGroup = segments[0] === '(tabs)' || segments[0] === 'add-expense';

    if (!isAuthenticated && inAuthGroup) {
      router.replace('/login');
    } else if (isAuthenticated && (segments[0] === 'login' || segments[0] === 'signup')) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, segments, loaded, isCheckingAuth]);

  if (!loaded || isCheckingAuth) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fafcf9' }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <Stack>
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="signup" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen 
        name="add-expense" 
        options={{ 
          presentation: 'modal',
          headerTitle: 'Add Expense',
          headerTitleStyle: {
            fontFamily: 'Manrope-Bold',
            fontSize: 18,
          }
        }} 
      />
    </Stack>
  );
}
