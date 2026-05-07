import React from 'react';
import { View, Text, TouchableOpacity, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { ShieldAlert, ShieldCheck } from 'lucide-react-native';

export default function AttackReport() {
  // In a real app, fetch from attack_log table. Using mock for MVP.
  const report = {
    survived: true,
    damageTaken: 0,
    enemiesDefeated: 12,
    loot: '50 Gold, 1 Spell Dust'
  };

  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-forest-dark p-6 justify-center items-center">
      <View className="w-full bg-forest-deep p-8 rounded-3xl border-2 border-forest-mid items-center space-y-6">
        {report.survived ? (
          <ShieldCheck size={80} color="#ffbf00" />
        ) : (
          <ShieldAlert size={80} color="#ef4444" />
        )}
        
        <Text className={`text-3xl font-bold text-center ${report.survived ? 'text-amber-soft' : 'text-red-500'}`}>
          {report.survived ? 'Tower Survived!' : 'Bastion Breached!'}
        </Text>
        
        <View className="w-full space-y-4 py-6 border-y border-forest-mid">
          <View className="flex-row justify-between">
            <Text className="text-forest-light">Enemies Repelled</Text>
            <Text className="text-white font-bold">{report.enemiesDefeated}</Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-forest-light">Wall Damage</Text>
            <Text className="text-white font-bold">{report.damageTaken} HP</Text>
          </View>
          {report.survived && (
            <View className="flex-row justify-between">
              <Text className="text-forest-light">Loot Recovered</Text>
              <Text className="text-amber-soft font-bold">{report.loot}</Text>
            </View>
          )}
        </View>

        <TouchableOpacity 
          onPress={() => router.replace('/(tabs)')}
          className="w-full py-4 bg-amber-soft rounded-2xl items-center"
        >
          <Text className="text-forest-dark font-bold text-xl">Return to Tower</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
