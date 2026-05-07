import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, TextInput, ScrollView } from 'react-native';
import { Plus, X, Sword, Book, Moon, Droplets, Broom, Scroll as ScrollIcon, Footprints, Settings } from 'lucide-react-native';
import { useTaskStore, Task } from '../store/useTaskStore';
import { useGameStore } from '../store/useGameStore';

const CATEGORIES = [
  { id: 'Workout', icon: Sword, color: 'text-red-400' },
  { id: 'Study', icon: Book, color: 'text-blue-400' },
  { id: 'Sleep', icon: Moon, color: 'text-indigo-400' },
  { id: 'Hydration', icon: Droplets, color: 'text-cyan-400' },
  { id: 'Clean', icon: Broom, color: 'text-yellow-400' },
  { id: 'Read', icon: ScrollIcon, color: 'text-amber-400' },
  { id: 'Walk', icon: Footprints, color: 'text-green-400' },
  { id: 'Custom', icon: Settings, color: 'text-gray-400' },
];

const DIFFICULTIES = [
  { id: 'Easy', reward: { gold: 5, xp: 10 }, label: 'Easy' },
  { id: 'Medium', reward: { gold: 12, xp: 25 }, label: 'Medium' },
  { id: 'Hard', reward: { gold: 25, xp: 50 }, label: 'Hard' },
];

export default function TaskDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Workout');
  const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Easy');
  
  const { tasks, addTask } = useTaskStore();
  const { addGold } = useGameStore();

  const handleSave = () => {
    if (!title) return;
    addTask({ title, category, difficulty });
    setTitle('');
    setIsOpen(false);
  };

  return (
    <>
      <TouchableOpacity 
        onPress={() => setIsOpen(true)}
        className="absolute bottom-8 right-8 w-16 h-16 bg-amber-soft rounded-full items-center justify-center shadow-2xl"
      >
        <Plus color="#1a2f1a" size={32} strokeWidth={3} />
      </TouchableOpacity>

      <Modal visible={isOpen} animationType="slide" transparent={true}>
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-forest-dark rounded-t-3xl p-6 h-3/4 border-t border-forest-mid">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-amber-soft text-2xl font-bold">Add New Habit</Text>
              <TouchableOpacity onPress={() => setIsOpen(false)}>
                <X color="#8fbc8f" size={24} />
              </TouchableOpacity>
            </View>

            <View className="space-y-6">
              <View>
                <Text className="text-forest-light mb-2">Task Name</Text>
                <TextInput 
                  className="bg-forest-deep p-4 rounded-xl text-white border border-forest-mid"
                  placeholder="e.g. Morning Yoga"
                  placeholderTextColor="#4a7c4a"
                  value={title}
                  onChangeText={setTitle}
                />
              </View>

              <View>
                <Text className="text-forest-light mb-2">Category</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-3">
                  {CATEGORIES.map((cat) => (
                    <TouchableOpacity 
                      key={cat.id}
                      onPress={() => setCategory(cat.id)}
                      className={`p-3 rounded-xl border-2 flex-row items-center gap-2 ${category === cat.id ? 'bg-amber-soft border-amber-soft' : 'bg-forest-deep border-forest-mid'}`}
                    >
                      <cat.icon size={20} color={category === cat.id ? '#1a2f1a' : '#8fbc8f'} />
                      <Text className={category === cat.id ? 'text-forest-dark font-bold' : 'text-forest-light'}>{cat.id}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View>
                <Text className="text-forest-light mb-2">Difficulty</Text>
                <View className="flex-row gap-3">
                  {DIFFICULTIES.map((diff) => (
                    <TouchableOpacity 
                      key={diff.id}
                      onPress={() => setDifficulty(diff.id as any)}
                      className={`flex-1 py-3 rounded-xl border-2 items-center ${difficulty === diff.id ? 'bg-amber-soft border-amber-soft' : 'bg-forest-deep border-forest-mid'}`}
                    >
                      <Text className={difficulty === diff.id ? 'text-forest-dark font-bold' : 'text-forest-light'}>{diff.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity 
                onPress={handleSave}
                className="w-full py-4 bg-amber-soft rounded-2xl items-center mt-4"
              >
                <Text className="text-forest-dark font-bold text-xl">Add to Bastion</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
