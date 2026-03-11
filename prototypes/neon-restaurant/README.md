# Neon Bistro Rush Prototype (Vertical Slice)

A premium-styled, waitress-controlled restaurant management prototype with real-time spatial gameplay.

## Run

```bash
cd prototypes/neon-restaurant
python3 -m http.server 4173
# open http://localhost:4173
```

## Implemented Loop

1. Customers spawn and occupy empty tables.
2. Walk to table and press `E` to take order.
3. Walk order ticket to POS and press `E`.
4. Dish cooks automatically at mapped kitchen station.
5. Pick up completed dishes from pass counter (`E`, tray cap 2).
6. Deliver to matching table (`E`).
7. After eating, table turns dirty.
8. Clean table (`E`) so new guests can spawn.

## Included Systems

- Player movement: WASD/arrow keys with collision bounds.
- Table state machine: `empty -> waiting_order -> order_taken -> cooking -> food_ready -> served -> eating -> dirty -> empty`.
- Patience pressure: tables lose patience while waiting; timeout causes unhappy leave.
- Kitchen queue: cook timers and pass-ready queue.
- Tray limit: carry up to 2 dishes.
- Scoring: revenue, tips, served/missed counts, combo, rating.
- UX feedback: neon beacons for table state, objective text, toast events.

## Visual Direction Notes

- Stylized premium neon interior with warm/cool contrast lights.
- Glossy floor and metallic furniture materials.
- Color-coded station glows and signs.
- Camera orbit support for presentation-friendly cinematic feel.
