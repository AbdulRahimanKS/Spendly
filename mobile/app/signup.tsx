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
import { Mail, Lock, User, ArrowRight, AlertCircle, CheckCircle } from 'lucide-react-native';
import { theme } from '../src/theme/theme';
import axios from 'axios';

import { API_URL } from '../src/config';

export default function Signup() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [modalState, setModalState] = useState<{visible: boolean, type: 'error' | 'success', message: string}>({
    visible: false,
    type: 'error',
    message: ''
  });

  const handleSignup = async () => {
    if (!fullName || !email || !password) {
      setModalState({ visible: true, type: 'error', message: 'Please fill in all fields' });
      return;
    }

    setIsLoading(true);
    try {
      await axios.post(`${API_URL}/users/`, {
        email,
        password,
        full_name: fullName
      });

      setModalState({ 
        visible: true, 
        type: 'success', 
        message: 'Your account has been created! Please log in.' 
      });
    } catch (error: any) {
      let message = 'Registration failed. Please try again.';
      if (error.response?.data?.detail) {
        if (typeof error.response.data.detail === 'string') {
          message = error.response.data.detail;
        } else if (Array.isArray(error.response.data.detail)) {
          message = error.response.data.detail.map((e: any) => e.msg).join(', ');
        }
      }
      setModalState({ visible: true, type: 'error', message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleModalClose = () => {
    if (modalState.type === 'success') {
      setModalState({ ...modalState, visible: false });
      router.push('/login');
    } else {
      setModalState({ ...modalState, visible: false });
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
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Create an account to track your expenses and manage your debts.</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.labelCaps}>Full Name</Text>
              <View style={styles.inputWrapper}>
                <User size={20} color={theme.colors.outline} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="John Doe"
                  placeholderTextColor={theme.colors.outline}
                  value={fullName}
                  onChangeText={setFullName}
                />
              </View>
            </View>

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
                  placeholder="Create a password"
                  placeholderTextColor={theme.colors.outline}
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                />
              </View>
            </View>

            <TouchableOpacity 
              style={[styles.signupButton, isLoading && { opacity: 0.7 }]}
              onPress={handleSignup}
              disabled={isLoading}
            >
              <Text style={styles.signupButtonText}>{isLoading ? 'Creating account...' : 'Create Account'}</Text>
              {!isLoading && <ArrowRight size={20} color={theme.colors.white} />}
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Link href="/login" asChild>
              <TouchableOpacity>
                <Text style={styles.loginLink}>Sign In</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Custom Popup Modal */}
      <Modal
        visible={modalState.visible}
        animationType="fade"
        transparent={true}
        onRequestClose={handleModalClose}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[
              styles.modalIconContainer, 
              { backgroundColor: modalState.type === 'error' ? theme.colors.spending + '15' : theme.colors.income + '15' }
            ]}>
              {modalState.type === 'error' ? (
                <AlertCircle size={28} color={theme.colors.spending} />
              ) : (
                <CheckCircle size={28} color={theme.colors.income} />
              )}
            </View>
            <Text style={styles.modalTitle}>
              {modalState.type === 'error' ? 'Oops!' : 'Success!'}
            </Text>
            <Text style={styles.modalMessage}>{modalState.message}</Text>
            <TouchableOpacity 
              style={[
                styles.modalButton,
                { backgroundColor: modalState.type === 'error' ? theme.colors.spending : theme.colors.income }
              ]}
              onPress={handleModalClose}
            >
              <Text style={styles.modalButtonText}>
                {modalState.type === 'error' ? 'Okay' : 'Continue to Login'}
              </Text>
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
  signupButton: {
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
  signupButtonText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 16,
    color: theme.colors.white,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 32,
    marginBottom: 20,
  },
  footerText: {
    fontFamily: 'DMSans-Regular',
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  loginLink: {
    fontFamily: 'DMSans-Bold',
    fontSize: 14,
    color: theme.colors.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
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
  modalIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontFamily: 'Manrope-Bold',
    fontSize: 20,
    color: theme.colors.primary,
    marginBottom: 8,
  },
  modalMessage: {
    fontFamily: 'DMSans-Regular',
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 100,
    width: '100%',
    alignItems: 'center',
  },
  modalButtonText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 14,
    color: theme.colors.white,
  }
});
