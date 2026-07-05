import React from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity,
  Switch,
  Modal,
  TextInput,
  Image,
  ActivityIndicator
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  User, 
  Settings, 
  Bell, 
  ShieldCheck, 
  CircleHelp, 
  LogOut, 
  ChevronRight,
  CreditCard,
  Leaf,
  Trash2
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { theme } from '../../src/theme/theme';
import { useAuthStore } from '../../src/store/authStore';
import axios from 'axios';
import { API_URL } from '../../src/config';

export default function Profile() {
  const [isMindfulnessMode, setIsMindfulnessMode] = React.useState(true);
  const { logout, user, token, setUser } = useAuthStore();
  
  const [isEditModalVisible, setIsEditModalVisible] = React.useState(false);
  const [editName, setEditName] = React.useState('');
  const [editImage, setEditImage] = React.useState('');
  const [isSaving, setIsSaving] = React.useState(false);

  const handleOpenEdit = () => {
    setEditName(user?.full_name || '');
    setEditImage(user?.profile_image || '');
    setIsEditModalVisible(true);
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets[0].base64) {
      setEditImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setIsSaving(true);
      const response = await axios.put(`${API_URL}/users/me/`, {
        full_name: editName,
        profile_image: editImage || null
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(response.data);
      setIsEditModalVisible(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* User Info Card */}
        <View style={styles.userCard}>
          <View style={styles.avatarContainer}>
            {user?.profile_image ? (
              <Image source={{ uri: user.profile_image }} style={{ width: 64, height: 64, borderRadius: 32 }} />
            ) : (
              <User size={32} color={theme.colors.primary} />
            )}
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName} numberOfLines={1}>{user?.full_name || 'User'}</Text>
            <Text style={styles.userEmail} numberOfLines={1}>{user?.email || 'user@example.com'}</Text>
          </View>
          <TouchableOpacity style={styles.editButton} onPress={handleOpenEdit}>
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        </View>

        {/* Account Section */}
        <Text style={styles.sectionLabel}>Account</Text>
        <View style={styles.menuGroup}>
          <MenuItem icon={<Settings size={20} color={theme.colors.secondary} />} label="Personal Information" />
          <MenuItem icon={<CreditCard size={20} color={theme.colors.secondary} />} label="Linked Accounts" />
          <MenuItem icon={<ShieldCheck size={20} color={theme.colors.secondary} />} label="Security" />
        </View>

        {/* Preferences Section */}
        <Text style={styles.sectionLabel}>Preferences</Text>
        <View style={styles.menuGroup}>
          <View style={styles.menuItem}>
            <View style={styles.menuIconContainer}>
              <Leaf size={20} color={theme.colors.income} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuLabel}>Mindfulness Mode</Text>
              <Text style={styles.menuSublabel}>Calmer UI and gentle alerts</Text>
            </View>
            <Switch 
              value={isMindfulnessMode} 
              onValueChange={setIsMindfulnessMode}
              trackColor={{ false: theme.colors.surface, true: theme.colors.income + '40' }}
              thumbColor={isMindfulnessMode ? theme.colors.income : theme.colors.outline}
            />
          </View>
          <MenuItem icon={<Bell size={20} color={theme.colors.secondary} />} label="Notifications" />
        </View>

        {/* Support Section */}
        <Text style={styles.sectionLabel}>Support</Text>
        <View style={styles.menuGroup}>
          <MenuItem icon={<CircleHelp size={20} color={theme.colors.secondary} />} label="Help Center" />
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <LogOut size={20} color={theme.colors.error} />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>Spendly v1.0.0</Text>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal visible={isEditModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Profile</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput
                style={styles.input}
                value={editName}
                onChangeText={setEditName}
                placeholder="Enter your name"
                placeholderTextColor={theme.colors.outline}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email (Cannot be changed)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.colors.surface, color: theme.colors.textSecondary }]}
                value={user?.email || ''}
                editable={false}
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Profile Image</Text>
              <View style={styles.imagePickerRow}>
                <View style={styles.imagePreview}>
                  {editImage ? (
                    <Image source={{ uri: editImage }} style={{ width: 64, height: 64 }} />
                  ) : (
                    <User size={32} color={theme.colors.outline} />
                  )}
                </View>
                <View style={[styles.imageActions, { flexDirection: 'column', gap: 4, justifyContent: 'center' }]}>
                  <TouchableOpacity 
                    onPress={pickImage} 
                    style={{ paddingHorizontal: 14, paddingVertical: 8, backgroundColor: theme.colors.surface, borderRadius: 8, alignSelf: 'flex-start' }}
                  >
                    <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 13, color: theme.colors.primary }}>Change Photo</Text>
                  </TouchableOpacity>
                  
                  {!!editImage && (
                    <TouchableOpacity 
                      onPress={() => setEditImage('')} 
                      style={{ paddingHorizontal: 14, paddingVertical: 8, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6 }}
                    >
                      <Trash2 size={14} color={theme.colors.error} />
                      <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 13, color: theme.colors.error }}>Remove Photo</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={() => setIsEditModalVisible(false)}
                disabled={isSaving}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.saveButton, isSaving && { opacity: 0.7 }]} 
                onPress={handleSaveProfile}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color={theme.colors.white} size="small" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function MenuItem({ icon, label }: any) {
  return (
    <TouchableOpacity style={styles.menuItem}>
      <View style={styles.menuIconContainer}>
        {icon}
      </View>
      <Text style={styles.menuLabel}>{label}</Text>
      <ChevronRight size={18} color={theme.colors.outline} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  scrollContent: {
    paddingHorizontal: theme.spacing.page,
    paddingBottom: 40,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    padding: 20,
    borderRadius: theme.borderRadius.lg,
    marginBottom: 32,
    marginTop: 10,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontFamily: 'Manrope-Bold',
    fontSize: 18,
    color: theme.colors.primary,
  },
  userEmail: {
    fontFamily: 'DMSans-Regular',
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  editButton: {
    backgroundColor: theme.colors.background,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  editButtonText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 12,
    color: theme.colors.primary,
  },
  sectionLabel: {
    fontFamily: 'DMSans-Bold',
    fontSize: 12,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
    marginLeft: 4,
  },
  menuGroup: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 16,
    marginBottom: 24,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.background,
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuLabel: {
    fontFamily: 'DMSans-Medium',
    fontSize: 16,
    color: theme.colors.primary,
    flex: 1,
  },
  menuSublabel: {
    fontFamily: 'DMSans-Regular',
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginTop: 8,
    gap: 8,
  },
  logoutText: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 16,
    color: theme.colors.error,
  },
  versionText: {
    textAlign: 'center',
    fontFamily: 'DMSans-Regular',
    fontSize: 12,
    color: theme.colors.outline,
    marginTop: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    fontFamily: 'Manrope-Bold',
    fontSize: 20,
    color: theme.colors.primary,
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontFamily: 'DMSans-Medium',
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.surfaceDim,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: 'DMSans-Medium',
    fontSize: 16,
    color: theme.colors.primary,
  },
  imagePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  imagePreview: {
    width: 64, 
    height: 64, 
    borderRadius: 32, 
    backgroundColor: theme.colors.surface, 
    overflow: 'hidden', 
    justifyContent: 'center', 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.surfaceDim,
  },
  imageActions: {
    flex: 1,
  },
  imageButton: {
    backgroundColor: theme.colors.surface,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  imageButtonText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 14,
    color: theme.colors.primary,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: theme.colors.surface,
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
  },
  cancelButtonText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 16,
    color: theme.colors.primary,
  },
  saveButtonText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 16,
    color: theme.colors.white,
  }
});
