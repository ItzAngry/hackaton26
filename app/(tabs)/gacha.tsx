import React, { useState } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView } from 'react-native';
import Animated, { FadeIn, FadeOut, useAnimatedStyle, useSharedValue, withTiming, withSequence, withRepeat } from 'react-native-reanimated';
import { useGameStore } from '../../store/useGameStore';
import { useHeroStore } from '../../store/useHeroStore';

const HERO_POOL = [
  { species: 'fox', name: 'Sly', rarity: 'Common' },
  { species: 'bear', name: 'Koda', rarity: 'Common' },
  { species: 'owl', name: 'Hoot', rarity: 'Rare' },
  { species: 'rabbit', name: 'Bun', rarity: 'Common' },
  { species: 'wolf', name: 'Fenrir', rarity: 'Legendary' },
];

export default function GachaScreen() {
  const { spellDust } = useGameStore();
  const addHero = useHeroStore((state) => state.addHero);
  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState<any>(null);

  const spinValue = useSharedValue(0);

  const handleSpin = () => {
    if (spellDust < 10) return;
    
    setIsSpinning(true);
    setResult(null);
    
    spinValue.value = withRepeat(
      withTiming(1, { duration: 100 }),
      10,
      false,
      () => {
        const randomHero = HERO_POOL[Math.floor(Math.random() * HERO_POOL.length)];
        const newHero = {
          id: Math.random().toString(36).substr(2, 9),
          ...randomHero,
          bondXp: 0,
          abilities: ['Basic Attack'],
          dialogue: { level1: "Hello!", level2: "Nice!", level3: "Cool!", level4: "Amazing!" }
        };
        
        addHero(newHero);
        setResult(newHero);
        setIsSpinning(false);
      }
    );
  };

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spinValue.value * 360}deg` }],
  }));

  return (
    <SafeAreaView className="flex-1 bg-forest-dark p-6 items-center justify-center">
      <Text className="text-amber-soft text-3xl font-bold mb-2">Forest Offering</Text>
      <Text className="text-forest-light text-center mb-12">Offer 10 spell dust to summon a guardian</Text>

      <View className="relative w-64 h-64 items-center justify-center">
        <Animated.View style={spinStyle} className="absolute w-full h-full items-center justify-center">
          <Text className="text-6xl absolute -top-10">🍃</Text>
          <Text className="text-6xl absolute -bottom-10">🍃</Text>
          <Text className="text-6xl absolute -left-10">🍃</Text>
          <Text className="text-6xl absolute -right-10">🍃</Text>
        </Animated.View>

        <View className="w-32 h-32 bg-forest-deep rounded-full items-center justify-center border-4 border-amber-soft shadow-2xl">
          {result ? (
            <Animated.View entering={FadeIn} className="items-center">
              <Text className="text-5xl">
                {result.species === 'fox' && '🦊'}
                {result.species === 'bear' && '🐻'}
                {result.species === 'owl' && '🦉'}
                {result.species === 'rabbit' && '🐰'}
                {result.species === 'wolf' && '🐺'}
              </Text>
              <Text className="text-white font-bold mt-2">{result.name}</Text>
            </Animated.View>
          ) : (
            <Text className="text-amber-soft text-4xl">✨</Text>
          )}
        </View>
      </View>

      <TouchableOpacity 
        onPress={handleSpin}
        disabled={isSpinning || spellDust < 10}
        className={`mt-16 px-12 py-4 rounded-2xl items-center ${isSpinning || spellDust < 10 ? 'bg-forest-mid opacity-50' : 'bg-amber-soft'}`}
      >
        <Text className={`font-bold text-xl ${isSpinning || spellDust < 10 ? 'text-forest-dark' : 'text-forest-dark'}`}>
          {isSpinning ? 'Summoning...' : 'Spin (10 Dust)'}
        </Text>
      </TouchableOpacity>
      
      <Text className="text-forest-light mt-4">Your Dust: {spellDust}</Text>
    </SafeAreaView>
  );
}
