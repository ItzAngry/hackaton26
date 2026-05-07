import React, { useState } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';

export default function Struggles() {
  const [selected, setSelected] = useState<string[]>([]);
  const router = useRouter();

  const options = [
    'Starting tasks', 'Procrastination', 'Sleep', 
    'Exercise', 'Focus', 'Hydration'
  ];

  const toggleOption = (option: string) => {
    setSelected(prev => 
      prev.includes(option) ? prev.filter(o => o !== option) : [...prev, option]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-forest-dark p-6 justify-center">
      <View className="items-center space-y-6">
        <Text className="text-amber-soft text-3xl font-bold text-center mb-6">
          What do you struggle with?
        </Text>
        
        <View className="flex-wrap flex-row justify-center gap-3 mb-8">
          {options.map((option) => (
            <TouchableOpacity 
              key={option}
              onPress={() => toggleOption(option)}
              className={`px-4 py-2 rounded-full border-2 ${selected.includes(option) ? 'bg-amber-soft border-amber-soft' : 'bg-forest-deep border-forest-mid'}`}
            >
              <Text className={`font-medium ${selected.includes(option) ? 'text-forest-dark' : 'text-forest-light'}`}>
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity 
          onPress={() => router.push('/onboarding/intro')}
          className="w-full py-4 rounded-2xl bg-amber-soft items-center"
        >
          <Text className="text-forest-dark font-bold text-xl">Continue</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
