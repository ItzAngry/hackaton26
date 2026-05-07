import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { HERO_DEFINITIONS } from '@/constants/heroDefinitions';
import { IosUi } from '@/constants/iosUi';

import { DraggableHeroCard, HeroCardFace } from '@/components/draggable-hero-card';
import { AppText } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import { PrimaryButton } from '@/components/ui/primary-button';
import { SecondaryButton } from '@/components/ui/secondary-button';

import { BOOST_DEFINITIONS, useGameStore } from '@/store/useGameStore';

export function ShopHeroGrid({
  compact,
  heroDragPlacement,
  benchTapRecruit,
}: {
  compact?: boolean;
  /** Battlefield: long-press drag; recruit applies only when dropped on a legal green tile. */
  heroDragPlacement?: (absoluteX: number, absoluteY: number, heroId: string) => void;
  /** Shop screen: tap adds this hero to the bench (free). */
  benchTapRecruit?: (heroId: string) => void;
}) {
  const recruitHero = useGameStore((s) => s.recruitHero);

  const defaultBenchTap = (heroId: string) => {
    const ok = recruitHero(heroId);
    if (!ok) {
      Alert.alert('Could not recruit', 'Unknown hero.');
    }
  };

  const handleBenchTap = benchTapRecruit ?? defaultBenchTap;

  const rows = compact
    ? HERO_DEFINITIONS.map((h) => [h])
    : (() => {
        const out: (typeof HERO_DEFINITIONS)[] = [];
        for (let i = 0; i < HERO_DEFINITIONS.length; i += 2) {
          out.push(HERO_DEFINITIONS.slice(i, i + 2));
        }
        return out;
      })();

  return (
    <View style={styles.grid}>
      {rows.map((row, rowIdx) => (
        <View key={rowIdx} style={styles.gridRow}>
          {row.map((h) =>
            heroDragPlacement ? (
              <DraggableHeroCard
                key={h.id}
                heroId={h.id}
                compact={compact}
                onDragEndScreen={heroDragPlacement}
              />
            ) : (
              <Pressable
                key={h.id}
                accessibilityRole="button"
                accessibilityLabel={`${h.name}, tap to add to roster`}
                onPress={() => handleBenchTap(h.id)}
                style={({ pressed }) => [
                  styles.heroFace,
                  compact && styles.heroFaceCompact,
                  pressed && styles.heroFacePressed,
                ]}>
                <HeroCardFace def={h} compact={compact} />
              </Pressable>
            )
          )}
        </View>
      ))}
    </View>
  );
}

/** Boost catalog with Buy only — apply from defender rail on battlefield. */
export function ShopBoostBuyOnlyList() {
  const gold = useGameStore((s) => s.gold);
  const buyBoost = useGameStore((s) => s.buyBoost);

  const tryBuyBoost = (boostId: string) => {
    const ok = buyBoost(boostId);
    if (!ok) {
      Alert.alert('Not enough gold', 'Earn gold during evening defense or spend less in the shop.');
    }
  };

  return (
    <View style={styles.boostList}>
      <AppText variant="footnote" color="secondary">
        Gold {gold}. Meals stock into inventory — tap a placed defender to apply.
      </AppText>
      {BOOST_DEFINITIONS.map((b) => (
        <Card key={b.id} style={styles.boostCard}>
          <AppText variant="headline">{b.name}</AppText>
          <AppText variant="footnote" color="secondary">
            {b.durationLabel} · {b.goldCost} gold · {b.statHint}
          </AppText>
          <AppText variant="footnote" color="secondary">
            {b.description}
          </AppText>
          <SecondaryButton title={`Buy · ${b.goldCost} gold`} onPress={() => tryBuyBoost(b.id)} />
        </Card>
      ))}
    </View>
  );
}

/** Boost catalog with Buy + Apply — used by full Shop screen. */
export function ShopBoostBuyApplyList({
  onApplyPress,
}: {
  onApplyPress: (boostId: string) => void;
}) {
  const gold = useGameStore((s) => s.gold);
  const boostInventory = useGameStore((s) => s.boostInventory);
  const buyBoost = useGameStore((s) => s.buyBoost);

  const tryBuyBoost = (boostId: string) => {
    const ok = buyBoost(boostId);
    if (!ok) {
      Alert.alert('Not enough gold', 'Earn gold during defense sessions or spend less on boosts this trip.');
    }
  };

  return (
    <View style={styles.boostList}>
      {BOOST_DEFINITIONS.map((b) => {
        const owned = boostInventory[b.id] ?? 0;
        return (
          <Card key={b.id} style={styles.boostCard}>
            <View style={styles.boostHeader}>
              <AppText variant="headline">{b.name}</AppText>
              <AppText variant="subhead" color="secondary">
                {b.durationLabel} · {b.goldCost} gold · Gold {gold}
              </AppText>
            </View>
            <AppText variant="footnote" color="secondary">
              {b.description} ({b.statHint})
            </AppText>
            <View style={styles.boostActions}>
              <SecondaryButton title={`Buy · ${b.goldCost} gold`} onPress={() => tryBuyBoost(b.id)} />
              <PrimaryButton
                title={owned > 0 ? `Apply · ${owned} owned` : 'Apply'}
                disabled={owned < 1}
                onPress={() => onApplyPress(b.id)}
              />
            </View>
          </Card>
        );
      })}
    </View>
  );
}

export function ShopUnitsIntroScroll({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <AppText variant="footnote" color="secondary" style={styles.intro}>
        Tap a hero to add them to your roster (free). Each animal has its own stats and idle animation.
      </AppText>
      {children}
    </ScrollView>
  );
}

export function ShopBoostIntroScroll({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <AppText variant="footnote" color="secondary" style={styles.intro}>
        Buy a meal with gold, then apply it from the battlefield by tapping a placed defender.
      </AppText>
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 4,
    paddingBottom: 20,
    gap: 12,
  },
  intro: {
    marginBottom: 4,
  },
  grid: {
    gap: 12,
    width: '100%',
  },
  gridRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    alignItems: 'stretch',
  },
  heroFace: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: IosUi.separator,
  },
  heroFaceCompact: {
    paddingVertical: 10,
    paddingHorizontal: 6,
    gap: 4,
  },
  heroFacePressed: {
    opacity: 0.88,
  },
  boostList: {
    gap: 12,
  },
  boostCard: {
    padding: 14,
    gap: 10,
  },
  boostHeader: {
    gap: 2,
  },
  boostActions: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
    marginTop: 4,
  },
});
