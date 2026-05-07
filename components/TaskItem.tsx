import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { useTaskStore } from '../store/useTaskStore';
import { useGameStore } from '../store/useGameStore';
import AnimatedView, { useAnimatedStyle, useSharedValue, withTiming, runOnJS } from 'react-native-reanimated';

export default function TaskItem({ task }: { task: any }) {
  const [isHolding, setIsHolding] = useState(false);
  const progress = useSharedValue(0);
  const completeTask = useTaskStore((state) => state.completeTask);
  const addGold = useGameStore((state) => state.addGold);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  const handlePressIn = () => {
    setIsHolding(true);
    progress.value = 0;
    progress.value = withTiming(1, { duration: 1500 }, (finished) => {
      if (finished) {
        runOnJS(onComplete)();
      }
    });
  };

  const handlePressOut = () => {
    setIsHolding(false);
    if (progress.value < 1) {
      progress.value = withTiming(0);
    }
  };

  const onComplete = () => {
    completeTask(task.id);
    // Reward based on difficulty
    const rewards = { Easy: 5, Medium: 12, Hard: 25 };
    addGold(rewards[task.difficulty as keyof typeof rewards] || 5);
    setIsHolding(false);
  };

  return (
    <TouchableOpacity 
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={task.completed}
      className={`mb-4 p-4 rounded-2xl border-2 flex-row items-center justify-between ${task.completed ? 'bg-forest-deep/50 border-forest-mid opacity-60' : 'bg-forest-deep border-forest-mid'}`}
    >
      <View className="flex-1 mr-4">
        <Text className={`text-white text-lg ${task.completed ? 'line-through text-forest-mid' : ''}`}>
          {task.title}
        </Text>
        <Text className="text-forest-light text-sm">{task.category} • {task.difficulty}</Text>
      </View>

      {task.completed ? (
        <Text className="text-amber-soft font-bold">✓ Done</Text>
      ) : (
        <View className="w-12 h-12 rounded-full bg-forest-dark overflow-hidden border border-forest-mid">
          <AnimatedView style={[{ height: '100%', backgroundColor: '#ffbf00', position: 'absolute', left: 0 }, animatedStyle]} />
          <View className="absolute inset-0 items-center justify-center">
            <Text className="text-white text-xs font-bold">{isHolding ? '...' : 'HOLD'}</Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}
