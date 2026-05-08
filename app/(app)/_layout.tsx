import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Redirect, Stack } from 'expo-router';

import { GameCloudBootstrap } from '@/components/game-cloud-bootstrap';

import { IosUi } from '@/constants/iosUi';

import { useAuth } from '@/lib/auth-context';

export default function AppGroupLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: IosUi.secondarySystemGroupedBackground,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/login" />;
  }

  return (
    <>
      <GameCloudBootstrap userId={user.id} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: IosUi.secondarySystemGroupedBackground } }} />
    </>
  );
}
