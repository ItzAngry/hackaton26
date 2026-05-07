# Tower Defense Game — AI Design Prompt

## Overview
Build a **landscape-only** tower defense game (enforce landscape orientation; do not support portrait mode).

---

## Screen Layout

### Persistent HUD Elements
| Position | Element |
|---|---|
| Top center | Current **wave/round number** |
| Top right | **Gold** earned (from kills + wave completion bonuses) |
| Top right (left of gold) | **Key count** |
| Top left | **Quest tab toggle button** |
| Bottom center | **Shop button** (~¼ screen width, ~⅙ screen height) |

### Battlefield (left → right)
- **Far left** — Player's fortress/base, with its current HP displayed beneath it.
- **In front of fortress** — Zone where the player places their units. Each unit displays its current HP above/below it.
- **Far right** — Enemy spawn point. Enemies enter here and march left toward the fortress.

---

## Units

### Placement
- Units are placed in the zone directly in front of the fortress.
- Placing the **first unit ends the grace period** and starts Wave 1.

### Unit Types
- Ground
- Air
- Aquatic
- Hybrid
- *(expandable)*

### Attack Types
- Physical
- Magic

### Unit Behavior
- Automatically attack enemies that enter their **attack range**.
- Display current HP at all times.
- **Permadeath**: units that reach 0 HP are removed from the battlefield permanently.

### Unit Stats Pop-up
Tapping a unit opens a **centered modal** showing:
- Unit name & type (Ground / Air / Aquatic / Hybrid / etc.)
- Current HP / Max HP
- Attack damage
- Attack type (Physical / Magic)
- Attack speed / range
- Any **active status effects**

---

## Enemies

### Behavior
- Spawn from the far right and move left continuously.
- Display current HP at all times.
- Attack player units when within range.
- If all player units are dead, enemies advance to the fortress and deal damage directly.
- **Permadeath**: enemies that reach 0 HP are removed from the battlefield.

### On Enemy Death
- Player earns **gold** (amount can scale with enemy tier/wave).

---

## Waves / Rounds

- Wave number is always visible at the top of the screen.
- Each successive wave **scales in difficulty** (more enemies, higher stats, etc.).
- Completing a wave rewards a **gold bonus**.

### Fortress Destruction
- If fortress HP reaches 0, the run ends.
- Wave/round counter **resets to zero**.
- Player is given a **grace period** to rebuild/place units before the next run begins.

---

## Quest System (Left Side Tab)

### Toggle Button
- Small button in the **top-left corner**.
- Pressing it slides out a panel from the left edge, covering approximately **one-third of the screen width**.
- Panel can be dismissed by pressing the button again or tapping outside it.

### Quest Panel Contents
- A list of **daily real-life tasks** (e.g., "Brush your teeth", "Go to the gym").
- Each quest has a **"Mark as Completed"** button.
- Completing a quest rewards the player with **1 Key** (or more, depending on difficulty/design).

---

## Shop (Separate Screen)

Accessed via the **Shop button** at the bottom center of the main screen.  
The shop has two tabs along the top:

### Tab 1 — Units
- Displays a collection of **themed chests**, each corresponding to a unit type (Aquatic chest, Air chest, Ground chest, etc.).
- Chests are opened using **Keys**.
- Each chest open rewards **1 random unit** of the corresponding type.
- The new unit is added to the player's roster to be placed before/during the next grace period.

### Tab 2 — Boosts
- Displays purchasable **food items** that grant temporary buffs to units.
- Purchased with **Gold**.
- To apply a boost: select the food item, then select a unit — the buff is applied immediately.
- Example boosts:
  - 🍖 Meat — +Attack damage for 30 min
  - ⚡ Energy Drink — +Attack speed for 1 hour
  - 🛡️ Fortified Meal — +Defense for 45 min
  - *(expandable list)*

---

## Economy Summary

| Currency | Earned By | Spent On |
|---|---|---|
| **Gold** | Killing enemies, completing waves | Boosts (Tab 2 of Shop) |
| **Keys** | Completing daily quests | Opening unit chests (Tab 1 of Shop) |

---

## Implementation Notes
- Enforce **landscape orientation** at launch; show a rotation prompt if portrait is detected.
- All waves should have a defined **scaling formula** (e.g., enemy HP × 1.15 per wave, +1 enemy per 3 waves).
- Grace period should have a visible **countdown timer** or a "Ready" button to start early.
- Status effects on units should have **icons + duration timers** visible in the stats pop-up.
