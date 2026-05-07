import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { ShieldAlert, ShieldCheck } from 'lucide-react-native';
import { supabase } from '../lib/supabase/client';

export default function AttackReport() {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function fetchLatestAttack() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('attack_log')
          .select('*')
          .eq('user_id', user.id)
          .order('date', { ascending: false })
          .limit(1)
          .single();

        if (error) throw error;
        if (data) {
          setReport({
            survived: data.survived,
            damageTaken: data.damage_dealt,
            enemiesDefeated: data.enemies_sent,
            loot: data.survived ? '50 Gold, 1 Spell Dust' : 'None', // Loot logic can be added to DB later
          });
        }
      } catch (error) {
        console.error('Error fetching attack report:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchLatestAttack();
  }, []);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-forest-dark justify-center items-center">
        <ActivityIndicator size="large" color="#ffbf00" />
      </SafeAreaView>
    );
  }

  if (!report) {
    return (
      <SafeAreaView className="flex-1 bg-forest-dark p-6 justify-center items-center">
        <Text className="text-white text-center">No attack records found.</Text>
        <TouchableOpacity 
          onPress={() => router.replace('/(tabs)')}
          className="mt-4 px-8 py-3 bg-amber-soft rounded-2xl"
        >
          <Text className="text-forest-dark font-bold">Go Home</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

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
