import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, useRouter } from 'expo-router';

import { IosRadius, IosUi } from '@/constants/iosUi';

import { AppText } from '@/components/ui/app-text';
import { PrimaryButton } from '@/components/ui/primary-button';

import { useAuth } from '@/lib/auth-context';

export default function LoginScreen() {
  const router = useRouter();
  const { user, loading, signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) {
      router.replace('/');
    }
  }, [loading, user, router]);

  const onSubmit = async () => {
    setError(null);
    setSubmitting(true);
    const { error: err } = await signIn(email, password);
    setSubmitting(false);
    if (err) {
      setError(err.message);
      return;
    }
    router.replace('/');
  };

  if (!loading && user) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.inner}>
        <AppText variant="largeTitle" style={styles.title}>
          Welcome back
        </AppText>
        <AppText variant="body" color="secondary" style={styles.subtitle}>
          Sign in to sync your fortress across devices.
        </AppText>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={IosUi.secondaryLabel}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={IosUi.secondaryLabel}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {error ? (
          <AppText variant="footnote" style={styles.error}>
            {error}
          </AppText>
        ) : null}

        <PrimaryButton
          title={submitting ? 'Signing in…' : 'Sign in'}
          disabled={submitting || !email.trim() || password.length < 6}
          onPress={() => void onSubmit()}
        />

        <View style={styles.footer}>
          <AppText variant="body" color="secondary">
            No account?{' '}
          </AppText>
          <Link href="/signup" asChild>
            <Pressable hitSlop={10}>
              <AppText variant="body" color="tint">
                Sign up
              </AppText>
            </Pressable>
          </Link>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: IosUi.secondarySystemGroupedBackground,
  },
  inner: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 24,
    gap: 14,
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 22,
  },
  input: {
    backgroundColor: IosUi.systemBackground,
    borderRadius: IosRadius.card,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 17,
    color: IosUi.label,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: IosUi.separator,
  },
  error: {
    color: IosUi.destructive,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
});
