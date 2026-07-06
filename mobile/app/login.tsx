import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  KeyboardAvoidingView,
  Platform,
  Modal,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Link } from 'expo-router';
import { Mail, Lock, ArrowRight, AlertCircle, Eye, EyeOff } from 'lucide-react-native';
import { theme } from '../src/theme/theme';
import { useAuthStore } from '../src/store/authStore';
import axios from 'axios';

// API Base URL - Update this with your machine's local IP if testing on a physical device
import { API_URL } from '../src/config';

export default function Login() {
  const router = useRouter();
  const setToken = useAuthStore((state) => state.setToken);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      setErrorMessage('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('username', email);
      formData.append('password', password);

      const response = await axios.post(`${API_URL}/token`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      await setToken(response.data.access_token);
      router.replace('/(tabs)');
    } catch (error: any) {
      let message = 'Something went wrong. Please check your credentials.';
      if (error.response?.data?.detail) {
        if (typeof error.response.data.detail === 'string') {
          message = error.response.data.detail;
        } else if (Array.isArray(error.response.data.detail)) {
          message = error.response.data.detail.map((e: any) => e.msg).join(', ');
        }
      }
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>Enter your details to access your Spendly dashboard.</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.labelCaps}>Email Address</Text>
              <View style={styles.inputWrapper}>
                <Mail size={20} color={theme.colors.outline} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="name@example.com"
                  placeholderTextColor={theme.colors.outline}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.labelCaps}>Password</Text>
              <View style={styles.inputWrapper}>
                <Lock size={20} color={theme.colors.outline} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your password"
                  placeholderTextColor={theme.colors.outline}
                  secureTextEntry={!isPasswordVisible}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity onPress={() => setIsPasswordVisible(!isPasswordVisible)} style={styles.eyeIcon}>
                  {isPasswordVisible ? (
                    <EyeOff size={20} color={theme.colors.outline} />
                  ) : (
                    <Eye size={20} color={theme.colors.outline} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity 
              style={[styles.loginButton, isLoading && { opacity: 0.7 }]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              <Text style={styles.loginButtonText}>{isLoading ? 'Signing in...' : 'Sign In'}</Text>
              {!isLoading && <ArrowRight size={20} color={theme.colors.white} />}
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <Link href="/signup" asChild>
              <TouchableOpacity>
                <Text style={styles.signupLink}>Sign Up</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </ScrollView>
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
    </SafeAreaView>
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
  scrollContent: {
    flexGrow: 1,
    padding: theme.spacing.page,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 48,
  },
  title: {
    fontFamily: 'Manrope-Bold',
    fontSize: 32,
    color: theme.colors.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'DMSans-Regular',
    fontSize: 16,
    color: theme.colors.textSecondary,
    lineHeight: 24,
  },
  form: {
    gap: 24,
  },
  inputGroup: {
    gap: 8,
  },
  labelCaps: {
    fontFamily: 'DMSans-Bold',
    fontSize: 12,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 16,
    height: 56,
    borderWidth: 1,
    borderColor: theme.colors.outline + '20',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontFamily: 'DMSans-Medium',
    fontSize: 16,
    color: theme.colors.primary,
  },
  loginButton: {
    flexDirection: 'row',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 12,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  loginButtonText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 16,
    color: theme.colors.white,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 32,
  },
  footerText: {
    fontFamily: 'DMSans-Regular',
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  signupLink: {
    fontFamily: 'DMSans-Bold',
    fontSize: 14,
    color: theme.colors.primary,
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
  },
  eyeIcon: {
    padding: 8,
  }
});
