import React from 'react';
import { View, Text, TouchableOpacity, FlatList, SafeAreaView } from 'react-native';
import { useHeroStore, Hero } from '../../store/useHeroStore';

export default function HeroGallery() {
  const { heroes, activeHeroId, setActiveHero } = useHeroStore();

  const renderHero = ({ item }: { item: Hero }) => (
    <TouchableOpacity 
      onPress={() => setActiveHero(item.id)}
      className={`mb-4 p-4 rounded-2xl border-2 flex-row items-center gap-4 ${activeHeroId === item.id ? 'bg-amber-soft border-amber-soft' : 'bg-forest-deep border-forest-mid'}`}
    >
      <View className="w-16 h-16 bg-forest-dark rounded-full items-center justify-center text-3xl">
        <Text className="text-3xl">
          {item.species === 'fox' && '🦊'}
          {item.species === 'bear' && '🐻'}
          {item.species === 'owl' && '🦉'}
          {item.species === 'rabbit' && '🐰'}
          {item.species === 'wolf' && '🐺'}
        </Text>
      </View>
      
      <View className="flex-1">
        <Text className={`text-lg font-bold ${activeHeroId === item.id ? 'text-forest-dark' : 'text-white'}`}>
          {item.name} ({item.rarity})
        </Text>
        <Text className={`text-sm ${activeHeroId === item.id ? 'text-forest-deep' : 'text-forest-light'}`}>
          Bond: {item.bondXp}%
        </Text>
        <View className="w-full h-2 bg-forest-dark rounded-full mt-2 overflow-hidden">
          <View style={{ width: `${item.bondXp}%` }} className="h-full bg-amber-soft" />
        </View>
      </View>
      
      {activeHeroId === item.id && (
        <Text className="text-forest-dark font-bold">EQUIPPED</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-forest-dark p-6">
      <Text className="text-amber-soft text-3xl font-bold mb-6">Animal Heroes</Text>
      <FlatList 
        data={heroes}
        renderItem={renderHero}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}
