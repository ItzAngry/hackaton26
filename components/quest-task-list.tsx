import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import React from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { IosUi } from '@/constants/iosUi';

import { AppText } from '@/components/ui/app-text';
import { PrimaryButton } from '@/components/ui/primary-button';
import { SecondaryButton } from '@/components/ui/secondary-button';

import {
  MAX_QUEST_TITLE_LEN,
  MAX_USER_DEFINED_QUESTS,
  QUEST_GOLD_REWARD,
  type Quest,
  useGameStore,
} from '@/store/useGameStore';

type Props = {
  quests: Quest[];
  onCompleteQuest: (id: string, proofUri: string) => void;
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
  const [capturingId, setCapturingId] = React.useState<string | null>(null);
  const [draftTitle, setDraftTitle] = React.useState('');
  const addCustomQuest = useGameStore((s) => s.addCustomQuest);
  const removeCustomQuest = useGameStore((s) => s.removeCustomQuest);
  const userCustomCount = quests.filter((q) => q.userDefined === true).length;
  const atCustomCap = userCustomCount >= MAX_USER_DEFINED_QUESTS;

  const takeProofAndComplete = React.useCallback(
    async (questId: string) => {
      setCapturingId(questId);
      try {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          Alert.alert(
            'Camera needed',
            'Allow camera access to take a proof photo and complete this task.'
          );
          return;
        }
        const result = await ImagePicker.launchCameraAsync({
          allowsEditing: false,
          quality: 0.72,
        });
        if (result.canceled) return;
        const uri = result.assets[0]?.uri;
        if (!uri?.trim()) return;
        onCompleteQuest(questId, uri);
      } finally {
        setCapturingId(null);
      }
    },
    [onCompleteQuest]
  );

  return (
    <ScrollView
      style={scrollViewStyle}
      contentContainerStyle={[styles.list, contentContainerStyle]}
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled>
      {canMarkComplete ? (
        <View style={[styles.questCard, styles.composerCard, questCardStyle]}>
          <AppText variant="subhead" style={styles.composerLabel}>
            Add your own task
          </AppText>
          <View style={styles.addRow}>
            <View style={styles.addInputWrap}>
              <TextInput
                style={styles.addInput}
                placeholder="e.g. Stretch for 5 minutes"
                placeholderTextColor={IosUi.secondaryLabel}
                value={draftTitle}
                onChangeText={setDraftTitle}
                maxLength={MAX_QUEST_TITLE_LEN}
                editable={!atCustomCap}
                accessibilityLabel="Custom task title"
              />
            </View>
            <SecondaryButton
              title="Add"
              disabled={atCustomCap || !draftTitle.trim()}
              onPress={() => {
                addCustomQuest(draftTitle);
                setDraftTitle('');
              }}
              style={styles.addBtn}
            />
          </View>
          {atCustomCap ? (
            <AppText variant="caption1" color="secondary">
              Up to {MAX_USER_DEFINED_QUESTS} custom tasks this prep day.
            </AppText>
          ) : null}
        </View>
      ) : null}
      {quests.map((q) => (
        <View key={q.id} style={[styles.questCard, questCardStyle]}>
          <View style={styles.questTitleRow}>
            <AppText variant="headline" style={styles.questTitle}>
              {q.title}
            </AppText>
            {q.userDefined && canMarkComplete ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remove custom task: ${q.title}`}
                hitSlop={8}
                onPress={() => removeCustomQuest(q.id)}
                style={styles.removeHit}>
                <AppText variant="caption1" style={styles.removeLabel}>
                  Remove
                </AppText>
              </Pressable>
            ) : null}
          </View>
          {q.completed ? (
            <View style={styles.completedBlock}>
              <AppText variant="footnote" color="secondary">
                Completed · thanks for showing up for yourself
              </AppText>
              {q.proofUri ? (
                <Image
                  source={{ uri: q.proofUri }}
                  style={styles.proofThumb}
                  contentFit="cover"
                  accessibilityLabel="Proof photo for this task"
                />
              ) : null}
            </View>
          ) : !canMarkComplete ? (
            <AppText variant="footnote" color="secondary">
              {markCompletePausedHint}
            </AppText>
          ) : (
            <PrimaryButton
              title={capturingId === q.id ? 'Taking photo…' : 'Take proof photo'}
              disabled={capturingId !== null}
              onPress={() => void takeProofAndComplete(q.id)}
            />
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
        Small wins during preparation — take a quick proof photo for bonus gold (+{QUEST_GOLD_REWARD} each).
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
  composerCard: {
    gap: 8,
  },
  composerLabel: {
    color: IosUi.label,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addInputWrap: {
    flex: 1,
    minWidth: 0,
  },
  addInput: {
    width: '100%',
    minHeight: 44,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: IosUi.separator,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: IosUi.label,
    backgroundColor: IosUi.systemBackground,
  },
  addBtn: {
    flexShrink: 0,
    paddingVertical: 8,
    paddingHorizontal: 14,
    minHeight: 0,
  },
  questCard: {
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: IosUi.secondarySystemGroupedBackground,
  },
  questTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  questTitle: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  removeHit: {
    flexShrink: 0,
    paddingTop: 2,
  },
  removeLabel: {
    color: IosUi.destructive,
    fontWeight: '600',
  },
  completedBlock: {
    gap: 8,
  },
  proofThumb: {
    width: '100%',
    maxWidth: 200,
    aspectRatio: 4 / 3,
    borderRadius: 10,
    backgroundColor: IosUi.systemGray5,
  },
});
