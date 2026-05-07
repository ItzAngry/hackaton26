import React, { useEffect } from 'react';
import { View, Text, SafeAreaView, Dimensions } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withRepeat, 
  withTiming, 
  interpolate,
  withSequence
} from 'react-native-reanimated';
import { useGameStore } from '../../store/useGameStore';
import TaskDrawer from '../components/TaskDrawer';
import { useTaskStore } from '../../store/useTaskStore';
import TaskItem from '../../components/TaskItem';

const { width } = Dimensions.get('window');

export default function HomeBase() {
  const { gold, username, wallDurability } = useGameStore();
  const { tasks } = useTaskStore();

  const towerY = useSharedValue(0);
  const towerScale = useSharedValue(1);

  useEffect(() => {
    towerY.value = withRepeat(
      withSequence(
        withTiming(10, { duration: 2000 }),
        withTiming(0, { duration: 2000 })
      ),
      -1,
      true
    );
  }, []);

  const towerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: towerY.value },
      { scale: towerScale.value }
    ],
  }));

  const getTowerState = () => {
    if (wallDurability > 70) return { emoji: '🏰', label: 'Pristine', color: 'text-amber-soft' };
    if (wallDurability > 30) return { emoji: '🏚️', label: 'Cracked', color: 'text-amber-warm' };
    return { emoji: '🧱', label: 'Ruined', color: 'text-red-500' };
  };

  const towerState = getTowerState();

  return (
    <SafeAreaView className="flex-1 bg-forest-dark">
      {/* Header */}
      <View className="px-6 py-4 flex-row justify-between items-center">
        <View>
          <Text className="text-forest-light text-sm">Guardian</Text>
          <Text className="text-white text-2xl font-bold">{username || 'Adventurer'}</Text>
        </View>
        <View className="bg-forest-deep px-4 py-2 rounded-full border border-forest-mid flex-row items-center gap-2">
          <Text className="text-amber-soft font-bold">💰 {gold}</Text>
        </View>
      </View>

      {/* Tower Viewport */}
      <View className="h-1/2 w-full bg-forest-deep/30 items-center justify-center relative overflow-hidden">
        <Animated.View style={towerAnimatedStyle} className="items-center">
          <Text className="text-9xl">{towerState.emoji}</Text>
          <Text className={`${towerState.color} font-bold text-xl mt-4 uppercase tracking-widest`}>
            {towerState.label}
          </Text>
        </Animated.View>

        {/* Health Bar Overlay */}
        <View className="absolute bottom-8 w-64 h-4 bg-forest-dark rounded-full border border-forest-mid overflow-hidden">
          <Animated.View 
            style={{ width: `${wallDurability}%` }} 
            className="h-full bg-amber-soft" 
          />
        </View>
        
        <Text className="absolute bottom-4 text-forest-light text-xs font-medium">
          WALL DURABILITY: {wallDurability}%
        </Text>
      </View>

      {/* Tasks Section */}
      <View className="flex-1 bg-forest-deep/50 rounded-t-3xl p-6 -mt-6">
        <Text className="text-amber-soft text-xl font-bold mb-4">Today's Duties</Text>
        <ScrollView showsVerticalScrollIndicator={false}>
          {tasks.length === 0 ? (
            <View className="items-center py-10">
              <Text className="text-forest-light text-center italic">
                No tasks assigned. The forest is too quiet...
              </Text>
            </View>
          ) : (
            tasks.map((task) => (
              <TaskItem key={task.id} task={task} />
            ))
          )}
        </ScrollView>
      </View>

      <TaskDrawer />
    </SafeAreaView>
  );
}
