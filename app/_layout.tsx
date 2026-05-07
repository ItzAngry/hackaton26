import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';
import '../global.css';

import { useColorScheme } from '@/components/useColorScheme';
import { supabase } from '@/lib/supabase/client';

export {
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const segments = useSegments();
  const [session, setSession] = useState<any>(null);
  const [profileComplete, setProfileComplete] = useState(null);

  useEffect(() => {
    // Set initial session
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) {
      // Redirect to auth if not signed in
      const inAuthGroup = segments[0] === 'auth';
      if (!inAuthGroup) {
        router.replace('/auth');
      }
    } else {
      // User is signed in, check if profile is complete
      checkProfile();
    }
  }, [session, segments]);

  async function checkProfile() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', session?.user.id)
        .single();

      if (error || !data?.username) {
        setProfileComplete(false);
        const inOnboarding = segments[0] === 'onboarding';
        if (!inOnboarding) {
          router.replace('/onboarding');
        }
      } else {
        setProfileComplete(true);
        const inAuth = segments[0] === 'auth';
        const inOnboarding = segments[0] === 'onboarding';
        if (inAuth || inOnboarding) {
          router.replace('/(tabs)');
        }
      }
    } catch (e) {
      console.error('Profile check error:', e);
    }
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="auth/index" options={{ headerShown: false, title: 'Authentication' }} />
        <Stack.Screen name="onboarding/index" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding/intro" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding/struggles" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        <Stack.Screen name="attack-report" options={{ headerShown: false }} />
      </Stack>
    </ThemeProvider>
  );
}
