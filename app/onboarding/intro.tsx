import React from 'react';
import { View, Text, TouchableOpacity, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

export default function Intro() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-forest-dark p-6 justify-center items-center">
      <Animated.View entering={FadeInDown.delay(500).duration(1000)} className="items-center space-y-6">
        <View className="w-32 h-32 bg-forest-deep rounded-full items-center justify-center mb-4 border-4 border-amber-soft shadow-lg">
          <Text className="text-6xl">🏰</Text>
        </View>
        
        <Text className="text-amber-soft text-3xl font-bold text-center">
          Your forest needs you
        </Text>
        
        <Text className="text-forest-light text-center text-lg px-4 leading-6">
          Every real-life habit you complete strengthens the walls of your bastion. 
          Neglect your duties, and the shadows will break through.
        </Text>

        <TouchableOpacity 
          onPress={() => router.replace('/(tabs)')}
          className="mt-8 px-12 py-4 rounded-2xl bg-amber-soft items-center shadow-xl"
        >
          <Text className="text-forest-dark font-bold text-xl">Begin Defending</Text>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}
