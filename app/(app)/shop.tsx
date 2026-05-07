import React, { useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Redirect } from 'expo-router';

import { IosUi } from '@/constants/iosUi';

import { useAuth } from '@/lib/auth-context';
import { useOnboardingGate } from '@/lib/useOnboardingGate';

import { GameModal } from '@/components/game-modal';
import { ShopBoostBuyApplyList, ShopHeroGrid, ShopUnitsIntroScroll } from '@/components/shop-panels';
import { AppText } from '@/components/ui/app-text';
import { SecondaryButton } from '@/components/ui/secondary-button';
import { SegmentedTabs } from '@/components/ui/segmented-tabs';

import { useGameStore } from '@/store/useGameStore';

export default function ShopScreen() {
  const gate = useOnboardingGate();
  if (gate === 'loading') return null;
  if (gate === 'redirect') return <Redirect href="/onboarding/avatar" />;
  return <ShopScreenInner />;
}

function ShopScreenInner() {
  const router = useRouter();
  const { signOut } = useAuth();
  const { width, height } = useWindowDimensions();
  const landscapeUi = width > height;
  const [tab, setTab] = useState<'units' | 'boosts'>('units');
  const gold = useGameStore((s) => s.gold);
  const units = useGameStore((s) => s.units);
  const applyBoost = useGameStore((s) => s.applyBoost);

  const [applyBoostId, setApplyBoostId] = useState<string | null>(null);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" hitSlop={12} onPress={() => router.back()}>
          <AppText variant="headline" color="tint">
            Done
          </AppText>
        </Pressable>
        <AppText variant="title2">Shop</AppText>
        <View style={styles.headerMeta}>
          <AppText variant="footnote" color="secondary">
            Gold {gold}
          </AppText>
          <Pressable
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => {
              void (async () => {
                await signOut();
                router.replace('/login');
              })();
            }}>
            <AppText variant="caption1" color="secondary">
              Log out
            </AppText>
          </Pressable>
        </View>
      </View>

      <View style={styles.segmentWrap}>
        <SegmentedTabs
          tabs={[
            { key: 'units', label: 'Units' },
            { key: 'boosts', label: 'Boosts' },
          ]}
          value={tab}
          onChange={(k) => setTab(k as 'units' | 'boosts')}
        />
      </View>

      {tab === 'units' ? (
        <ShopUnitsIntroScroll>
          <ShopHeroGrid />
        </ShopUnitsIntroScroll>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <AppText variant="footnote" color="secondary" style={styles.intro}>
            Buy a meal with gold, then apply it to a defender on the field or roster.
          </AppText>
          <ShopBoostBuyApplyList onApplyPress={(id) => setApplyBoostId(id)} />
        </ScrollView>
      )}

      <GameModal visible={applyBoostId !== null} onRequestClose={() => setApplyBoostId(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setApplyBoostId(null)}>
          <Pressable
            style={[
              styles.modalInner,
              landscapeUi && styles.modalInnerLandscape,
              landscapeUi && { maxWidth: Math.min(width * 0.92, 720) },
            ]}
            onPress={(e) => e.stopPropagation()}>
            {landscapeUi ? (
              <>
                <View style={styles.modalAside}>
                  <AppText variant="title3">Choose a defender</AppText>
                  <AppText variant="footnote" color="secondary">
                    Buff applies right away. Scroll sideways.
                  </AppText>
                  <SecondaryButton title="Cancel" onPress={() => setApplyBoostId(null)} />
                </View>
                <FlatList
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  data={units}
                  keyExtractor={(item) => item.id}
                  style={styles.unitPickListHorizontal}
                  contentContainerStyle={styles.unitPickListHorizontalContent}
                  renderItem={({ item }) => (
                    <Pressable
                      style={styles.unitChip}
                      onPress={() => {
                        if (applyBoostId) {
                          const ok = applyBoost(item.id, applyBoostId);
                          if (!ok) {
                            Alert.alert('Unable to apply', 'Make sure you still have this boost.');
                          }
                          setApplyBoostId(null);
                        }
                      }}>
                      <AppText variant="headline">{item.name}</AppText>
                      <AppText variant="caption1" color="secondary">
                        {item.unitType} · HP {item.hp}/{item.maxHp}
                      </AppText>
                    </Pressable>
                  )}
                  ListEmptyComponent={
                    <AppText variant="footnote" color="secondary" style={styles.emptyPick}>
                      No defenders yet. Recruit heroes from the Units tab first.
                    </AppText>
                  }
                />
              </>
            ) : (
              <>
                <AppText variant="title3">Choose a defender</AppText>
                <AppText variant="footnote" color="secondary">
                  Buff applies right away.
                </AppText>
                <FlatList
                  data={units}
                  keyExtractor={(item) => item.id}
                  style={styles.unitPickList}
                  renderItem={({ item }) => (
                    <Pressable
                      style={styles.unitPickRow}
                      onPress={() => {
                        if (applyBoostId) {
                          const ok = applyBoost(item.id, applyBoostId);
                          if (!ok) {
                            Alert.alert('Unable to apply', 'Make sure you still have this boost.');
                          }
                          setApplyBoostId(null);
                        }
                      }}>
                      <AppText variant="headline">{item.name}</AppText>
                      <AppText variant="caption1" color="secondary">
                        {item.unitType} · HP {item.hp}/{item.maxHp}
                      </AppText>
                    </Pressable>
                  )}
                  ListEmptyComponent={
                    <AppText variant="footnote" color="secondary">
                      No defenders yet. Recruit heroes from the Units tab first.
                    </AppText>
                  }
                />
                <SecondaryButton title="Cancel" onPress={() => setApplyBoostId(null)} />
              </>
            )}
          </Pressable>
        </Pressable>
      </GameModal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: IosUi.secondarySystemGroupedBackground,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  headerMeta: {
    minWidth: 100,
    alignItems: 'flex-end',
  },
  segmentWrap: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 28,
    gap: 12,
  },
  intro: {
    marginBottom: 4,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.28)',
    justifyContent: 'center',
    padding: 24,
  },
  modalInner: {
    backgroundColor: IosUi.systemBackground,
    borderRadius: 16,
    padding: 16,
    maxHeight: '70%',
    gap: 10,
  },
  modalInnerLandscape: {
    flexDirection: 'row',
    alignItems: 'center',
    maxHeight: '88%',
    width: '92%',
    gap: 20,
  },
  modalAside: {
    width: 168,
    flexShrink: 0,
    gap: 10,
    justifyContent: 'center',
  },
  unitPickListHorizontal: {
    flex: 1,
    minHeight: 120,
    maxHeight: 160,
  },
  unitPickListHorizontalContent: {
    alignItems: 'stretch',
    paddingVertical: 4,
    gap: 12,
  },
  unitChip: {
    width: 156,
    padding: 14,
    marginRight: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: IosUi.separator,
    backgroundColor: IosUi.secondarySystemGroupedBackground,
    gap: 6,
    justifyContent: 'center',
  },
  emptyPick: {
    alignSelf: 'center',
    paddingVertical: 24,
    width: 200,
  },
  unitPickList: {
    maxHeight: 280,
  },
  unitPickRow: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: IosUi.separator,
    gap: 4,
  },
});
