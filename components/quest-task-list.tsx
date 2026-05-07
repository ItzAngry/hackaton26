import React from 'react';
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { IosUi } from '@/constants/iosUi';

import { AppText } from '@/components/ui/app-text';
import { PrimaryButton } from '@/components/ui/primary-button';

import { QUEST_GOLD_REWARD, type Quest } from '@/store/useGameStore';

type Props = {
  quests: Quest[];
  onCompleteQuest: (id: string) => void;
  questCardStyle?: StyleProp<ViewStyle>;
  scrollViewStyle?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  /** During defense, quests can stay visible but marking complete does nothing (server-gated separately). */
  canMarkComplete?: boolean;
  markCompletePausedHint?: string;
};

export function QuestTaskList({
  quests,
  onCompleteQuest,
  questCardStyle,
  scrollViewStyle,
  contentContainerStyle,
  canMarkComplete = true,
  markCompletePausedHint = 'Come back during preparation — tasks unlock bonus gold before you start tonight’s defense.',
}: Props) {
  return (
    <ScrollView
      style={scrollViewStyle}
      contentContainerStyle={[styles.list, contentContainerStyle]}
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled>
      {quests.map((q) => (
        <View key={q.id} style={[styles.questCard, questCardStyle]}>
          <AppText variant="headline" style={styles.questTitle}>
            {q.title}
          </AppText>
          {q.completed ? (
            <AppText variant="footnote" color="secondary">
              Completed · thanks for showing up for yourself
            </AppText>
          ) : !canMarkComplete ? (
            <AppText variant="footnote" color="secondary">
              {markCompletePausedHint}
            </AppText>
          ) : (
            <PrimaryButton title="Mark complete" onPress={() => onCompleteQuest(q.id)} />
          )}
        </View>
      ))}
    </ScrollView>
  );
}

type HeaderProps = { compact?: boolean };

export function QuestTaskListHeader({ compact }: HeaderProps) {
  return (
    <View style={[styles.drawerHeader, compact && styles.drawerHeaderCompact]}>
      <AppText variant={compact ? 'title3' : 'title2'}>Today&apos;s plan</AppText>
      <AppText variant="footnote" color="secondary">
        Small wins during preparation — optional tasks for bonus gold (+{QUEST_GOLD_REWARD} each).
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  drawerHeader: {
    gap: 6,
    marginBottom: 16,
  },
  drawerHeaderCompact: {
    gap: 4,
    marginBottom: 0,
  },
  list: {
    gap: 12,
    paddingBottom: 24,
  },
  questCard: {
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: IosUi.secondarySystemGroupedBackground,
  },
  questTitle: {
    flexShrink: 1,
  },
});
