import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, SafeAreaView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useGameStore } from '../../store/useGameStore';
import { supabase } from '../../lib/supabase/client';

export default function WhoAreYou() {
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('fox');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const setUsername = useGameStore((state) => state.setUsername);

  const avatars = [
    { id: 'fox', label: 'Fox', icon: '🦊' },
    { id: 'bear', label: 'Bear', icon: '🐻' },
    { id: 'owl', label: 'Owl', icon: '🦉' },
  ];

  async function handleNext() {
    if (!name) return;
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // 1. Save to Supabase profiles
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          username: name,
          avatar: avatar,
        });

      if (error) throw error;

      // 2. Initialize Bastion tower
      const { error: towerError } = await supabase
        .from('tower')
        .upsert({
          user_id: user.id,
          wall_durability: 100,
        });

      if (towerError) throw towerError;

      // Update local store
      setUsername(name);
      router.push('/onboarding/struggles');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-forest-dark p-6 justify-center">
      <View className="items-center space-y-8">
        <Text className="text-amber-soft text-4xl font-bold text-center mb-4">
          Who are you, Guardian?
        </Text>
        
        <View className="flex-row justify-center space-x-4 mb-8">
          {avatars.map((a) => (
            <TouchableOpacity 
              key={a.id}
              onPress={() => setAvatar(a.id)}
              className={`p-4 rounded-full border-4 ${avatar === a.id ? 'border-amber-soft bg-forest-deep' : 'border-transparent bg-forest-deep'}`}
            >
              <Text className="text-4xl">{a.icon}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View className="w-full bg-forest-deep p-4 rounded-2xl border border-forest-mid">
          <TextInput 
            className="text-white text-lg p-2"
            placeholder="Enter your name..."
            placeholderTextColor="#8fbc8f"
            value={name}
            onChangeText={setName}
          />
        </View>

        <TouchableOpacity 
          disabled={!name || loading}
          onPress={handleNext}
          className={`w-full py-4 rounded-2xl items-center ${name && !loading ? 'bg-amber-soft' : 'bg-forest-mid opacity-50'}`}
        >
          <Text className="text-forest-dark font-bold text-xl">
            {loading ? 'Saving...' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
