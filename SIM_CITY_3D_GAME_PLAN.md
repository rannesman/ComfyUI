# 3D Sim-City–Style Game Plan

This blueprint is for building a **3D, interactive city-building simulation** with polished visuals and satisfying gameplay loops.

## 1) Core Vision

Build a game where players:
- Zone land and lay roads/utilities.
- Watch citizens and traffic simulate in real time.
- Balance budgets, taxes, services, growth, and disasters.
- Progress from a small town to a dense modern metropolis.

Design pillars:
1. **Readability**: easy to understand city state at a glance.
2. **Agency**: every player action has visible effects.
3. **Beauty at scale**: cities look alive from street-level and aerial views.
4. **Performance**: stable simulation speed in late game.

## 2) Recommended Tech Stack

- **Engine**: Unreal Engine 5 (Nanite + Lumen for visual quality).
- **Language**: C++ for simulation systems, Blueprints for tooling/UI iteration.
- **Data**: Data Tables / JSON-driven balancing configs.
- **Build/CI**: GitHub Actions + automated build/test map loads.
- **Profiling**: Unreal Insights, stat unit, stat GPU.

Alternative: Unity + DOTS/ECS if simulation throughput is the top priority.

## 3) High-Level Architecture

### Simulation Layer (authoritative)
- Grid + graph representation:
  - Tile grid for zoning/terrain/utilities.
  - Road graph for pathfinding and traffic.
- Tick system:
  - Slow economic tick (e.g., every 1 sec).
  - Medium citizen/service tick.
  - Fast vehicle movement tick.
- Systems:
  - Population migration.
  - Employment and commerce demand.
  - Tax and city budget.
  - Service coverage (power, water, police, health, fire, education).
  - Pollution/noise/happiness.

### Presentation Layer
- Building states (construction, occupied, abandoned, upgraded).
- Procedural variation for lots/building skins.
- Day/night + weather + VFX for city mood.
- Crowd/traffic visualization decoupled from full agent cost where possible.

### UI/UX Layer
- Top bar: money, income, population, happiness.
- Overlays: traffic, pollution, land value, utilities, crime.
- Build tools: zone paint, roads, bulldozer, policy panels.
- Event feed for emergencies and milestones.

## 4) Gameplay Loops

### Moment-to-moment loop
1. Place roads/utilities/zones.
2. Observe growth indicators.
3. Resolve bottlenecks (traffic/power/budget).
4. Upgrade infrastructure.

### Mid-term loop
- Unlock services and policies.
- Specialize districts (industrial, residential, tourism, tech).
- Optimize transport network.

### Long-term loop
- Hit population/economy milestones.
- Handle major events (disasters, recession, heatwave).
- Build iconic megaprojects.

## 5) Simulation Design Essentials

### Citizens (lightweight model)
- Household-based simulation instead of fully detailed per-person AI at all times.
- Sampled agents for visual richness while macro outcomes remain deterministic.

### Economy
- Demand curves for residential/commercial/industrial.
- Simple but expressive production chains (raw -> goods -> retail).
- Inflation/tax sensitivity as late-game balancing knobs.

### Traffic
- Hierarchical pathfinding:
  - District-level routing first.
  - Local route refinement near destination.
- Lane and intersection logic should be conservative initially; complexity can be added iteratively.

## 6) Graphics and Art Direction

- Realistic stylization: physically based materials with clean silhouettes.
- Dynamic decals (road wear, dirt, puddles).
- Lighting quality targets:
  - Golden hour city glow.
  - Night emissive windows + moving headlights.
- Camera polish:
  - Smooth pan/zoom/tilt with inertia and snapping options.

## 7) Performance Targets

Set explicit budgets early (example for desktop):
- Simulation: <= 6 ms
- Render thread: <= 5 ms
- GPU: <= 11 ms (for ~60 FPS)

Tactics:
- HLOD/instancing for buildings.
- Impostors for far-distance geometry.
- Async simulation tasks where safe.
- Aggressive culling and LOD transitions.

## 8) Vertical Slice (10–12 weeks)

Deliverable:
- One 2km x 2km map.
- Roads, zones, power/water, tax controls.
- 3 service types (police, fire, health).
- Traffic + basic economy + day/night.
- 3 overlays + milestone progression.

Definition of done:
- New player can build functioning city in <20 minutes.
- No major simulation stalls at 30k population.
- Visual quality baseline approved by art direction.

## 9) Content Roadmap

### Phase 1 (MVP)
- Core building + simulation + overlays + save/load.

### Phase 2
- District policies, public transit, disasters.

### Phase 3
- Advanced economy, landmarks, mod support, scenario mode.

## 10) Team Composition (lean)

- 1 technical game director / lead engineer
- 2 gameplay/simulation engineers
- 1 rendering/optimization engineer
- 2 environment artists
- 1 UI/UX designer
- 1 technical artist
- 1 game designer/economy balancer
- 1 QA (ramping up later)

## 11) Risks and Mitigation

- **Risk**: Traffic simulation becomes too expensive.
  - Mitigation: abstract long-distance travel + update frequency tiers.
- **Risk**: Beautiful visuals hurt frame rate.
  - Mitigation: lock performance budgets and enforce art LOD rules.
- **Risk**: Systems feel opaque.
  - Mitigation: strong overlays, clear alerts, and tutorialized feedback.

## 12) Immediate Next Steps (first 2 weeks)

1. Write one-page game design pillar doc.
2. Implement tile grid + road graph prototype.
3. Build zoning and placement UX prototype.
4. Add a minimal simulation tick with budget + population growth.
5. Hook basic debug overlays (traffic and utilities).
6. Establish performance telemetry from day one.

---

If you want, this can be converted next into:
- a **feature-complete production backlog**,
- a **technical design document (TDD)** for simulation systems,
- and a **milestone-by-milestone staffing/budget plan**.
