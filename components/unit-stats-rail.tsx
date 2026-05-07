import React from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { IosUi } from '@/constants/iosUi';

import { HERO_BY_ID, getHeroIdForUnit } from '@/constants/heroDefinitions';

import { AppText } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import { SecondaryButton } from '@/components/ui/secondary-button';
import { HeroSprite } from '@/components/hero-sprite';

import {
  BOOST_DEFINITIONS,
  effectiveUnitAttackIntervalSec,
  effectiveUnitDamage,
  type GameUnit,
  useGameStore,
} from '@/store/useGameStore';

type Props = {
  unit: GameUnit;
  onClose: () => void;
  /** Full-height defender sheet on the battlefield (non-scrolling). */
  floatingOverlay?: boolean;
};

export function UnitStatsRail({ unit, onClose, floatingOverlay }: Props) {
  const gold = useGameStore((s) => s.gold);
  const boostInventory = useGameStore((s) => s.boostInventory);
  const buyBoost = useGameStore((s) => s.buyBoost);
  const applyBoost = useGameStore((s) => s.applyBoost);
  const clearUnitPlacement = useGameStore((s) => s.clearUnitPlacement);

  const now = Date.now();
  const effDamage = effectiveUnitDamage(unit, now);
  const effAtkSec = effectiveUnitAttackIntervalSec(unit, now);
  const fortifiedActive =
    unit.placedPathCover !== null &&
    unit.buffs.some((b) => b.boostId === 'fortified' && b.expiresAt > now);

  const tryBuyAndApply = (boostId: string) => {
    const bought = buyBoost(boostId);
    if (!bought) {
      Alert.alert('Cannot buy', 'Not enough gold for this meal.');
      return;
    }
    const applied = applyBoost(unit.id, boostId);
    if (!applied) {
      Alert.alert('Error', 'Purchase succeeded but buff could not be applied.');
    }
  };

  const tryUseStock = (boostId: string) => {
    const ok = applyBoost(unit.id, boostId);
    if (!ok) {
      Alert.alert('Cannot use', 'No stocked meal of this type.');
    }
  };

  return (
    <Card style={[styles.card, floatingOverlay && styles.cardFloating]}>
      <View style={styles.head}>
        <View style={styles.headTitle}>
          {(() => {
            const def = HERO_BY_ID[getHeroIdForUnit(unit)];
            return def ? (
              <HeroSprite
                sheet={def.sheet}
                sheetW={def.sheetW}
                sheetH={def.sheetH}
                frames={def.frames}
                size={44}
              />
            ) : null;
          })()}
          <AppText variant="title3" style={styles.nameText}>
            {unit.name}
          </AppText>
        </View>
        <SecondaryButton title="✕" onPress={onClose} style={styles.miniBtn} />
      </View>
      <AppText variant="footnote" color="secondary">
        {unit.unitType} · {unit.attackType}
      </AppText>

      <View style={styles.statBlock}>
        <StatRow label="HP" value={`${Math.ceil(unit.hp)} / ${unit.maxHp}`} />
        <StatRow
          label="Damage"
          value={
            effDamage !== unit.damage ? `${effDamage} (base ${unit.damage})` : `${unit.damage}`
          }
        />
        <StatRow
          label="Attack speed"
          value={
            Math.abs(effAtkSec - unit.attackSpeed) > 1e-4
              ? `${effAtkSec.toFixed(2)} s (base ${unit.attackSpeed.toFixed(2)} s)`
              : `${unit.attackSpeed.toFixed(2)} s`
          }
        />
        <StatRow label="Range" value={`${unit.attackRange}`} />
      </View>
      {fortifiedActive ? (
        <AppText variant="caption1" color="secondary" style={styles.statHintFoot}>
          Fortified meal: reduces fortress damage when enemies slip through — stronger with more fortified
          defenders (capped globally).
        </AppText>
      ) : null}

      {unit.placedTile ? (
        <SecondaryButton
          title="Recall to roster"
          onPress={() => {
            clearUnitPlacement(unit.id);
            onClose();
          }}
        />
      ) : null}

      <AppText variant="footnote" color="secondary">
        Buffs
      </AppText>
      {unit.buffs.length === 0 ? (
        <AppText variant="footnote" color="secondary">
          None active
        </AppText>
      ) : (
        unit.buffs.map((b) => (
          <AppText key={b.id} variant="footnote">
            {b.label} · {b.statHint}
          </AppText>
        ))
      )}

      <View style={[styles.upgradeBlock, floatingOverlay && styles.upgradeBlockFlex]}>
        <AppText variant="subhead" style={styles.upgradeTitle}>
          Upgrades
        </AppText>
        <AppText variant="caption1" color="secondary">
          Gold {gold} · Buying equips this defender immediately. Stocked meals equip without paying again.
        </AppText>

        <View style={[styles.boostList, floatingOverlay && styles.boostListFlex]}>
          {BOOST_DEFINITIONS.map((b) => {
            const owned = boostInventory[b.id] ?? 0;
            return (
              <View key={b.id} style={styles.boostRow}>
                <AppText variant="headline">{b.name}</AppText>
                <AppText variant="caption1" color="secondary">
                  {b.durationLabel} · {b.goldCost}g · {b.statHint}
                  {owned > 0 ? ` · Stocked ×${owned}` : ''}
                </AppText>
                <SecondaryButton
                  title={owned > 0 ? `Equip stocked (${owned})` : `Buy & equip · ${b.goldCost}g`}
                  onPress={() => {
                    if (owned > 0) tryUseStock(b.id);
                    else tryBuyAndApply(b.id);
                  }}
                />
              </View>
            );
          })}
        </View>
      </View>
    </Card>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statRow}>
      <AppText variant="footnote" color="secondary">
        {label}
      </AppText>
      <AppText variant="headline">{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    marginVertical: 8,
    marginRight: 8,
    padding: 12,
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.94)',
    maxWidth: 280,
    minWidth: 220,
  },
  cardFloating: {
    flex: 1,
    marginVertical: 0,
    marginHorizontal: 0,
    maxWidth: '100%',
    minWidth: 0,
    alignSelf: 'stretch',
    borderRadius: 0,
    paddingTop: 10,
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  headTitle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
  },
  nameText: {
    flex: 1,
  },
  miniBtn: {
    minHeight: 36,
    paddingHorizontal: 10,
  },
  statBlock: {
    gap: 6,
    marginVertical: 4,
  },
  statHintFoot: {
    opacity: 0.88,
    lineHeight: 16,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  upgradeTitle: {
    marginTop: 8,
  },
  upgradeBlock: {
    gap: 6,
  },
  upgradeBlockFlex: {
    flex: 1,
    minHeight: 0,
    marginTop: 4,
  },
  boostList: {
    gap: 0,
    marginTop: 4,
  },
  boostListFlex: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  boostRow: {
    gap: 6,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: IosUi.separator,
  },
});
