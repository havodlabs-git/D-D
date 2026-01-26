# D&D GO - Project TODO

## Core Systems
- [x] Database schema for characters, inventory, locations, NPCs, monsters
- [x] User authentication with persistent player profile
- [x] Character creation system with D&D classes and attributes

## Map & Exploration
- [x] Google Maps integration with interactive map
- [x] Geolocation system to get user's current position
- [x] Click-to-explore mechanics (no physical movement required)
- [x] Points of interest generation based on real coordinates

## Procedural Generation
- [x] NPC generation based on location type
- [x] Monster spawning system with difficulty scaling
- [x] Shop generation with location-based inventory
- [ ] Dungeon/encounter area generation (placeholder UI added)

## Combat System
- [x] Turn-based combat mechanics
- [x] Virtual dice system (d4, d6, d8, d10, d12, d20)
- [x] Attribute-based damage calculation
- [x] Combat UI with action buttons

## Inventory & Equipment
- [x] Inventory management system
- [x] Equipment slots (weapon, armor, accessories)
- [x] Item rarity system (common, uncommon, rare, epic, legendary)
- [x] Item stats and bonuses

## Shops & Economy
- [x] Dynamic shop system
- [x] NPC merchants with location-based stock
- [x] Gold/currency system
- [x] Buy/sell mechanics

## Character Progression
- [x] Level system with XP
- [x] D&D attributes (STR, DEX, CON, INT, WIS, CHA)
- [x] Class-based abilities and bonuses
- [x] Stat point allocation on level up

## Quests & Missions
- [ ] Dynamic quest generation (placeholder added)
- [ ] Quest objectives based on surroundings
- [ ] Quest rewards system
- [ ] Quest log UI

## UI/UX
- [x] Responsive design for mobile and desktop
- [x] Touch controls for mobile
- [x] Mouse controls for desktop
- [x] Game HUD with player stats
- [x] Map overlay with POI markers

## Technical
- [x] tRPC routers for all features
- [x] Game constants and utilities
- [x] Unit tests for game mechanics
- [x] Fantasy theme with custom CSS

## Pixel Art Graphics
- [x] Sprites pixel art para as 8 classes de personagem
- [x] Sprites pixel art para monstros (goblin, orc, dragão, etc)
- [x] Sprites pixel art para NPCs (mercador, ferreiro, etc)
- [x] Ícones pixel art para itens e equipamentos
- [x] Elementos de UI em pixel art (coração, mana, dados, marcadores)
- [x] Integração dos gráficos na interface do jogo

## D&D 5e 2024 Update
- [x] 12 classes principais do D&D 5e 2024 (Barbarian, Bard, Cleric, Druid, Fighter, Monk, Paladin, Ranger, Rogue, Sorcerer, Warlock, Wizard)
- [x] Subclasses para cada classe
- [x] Sistema completo de spells por nível (cantrips até 3º nível implementado)
- [x] Spell slots e recuperação de magia
- [x] Cantrips que escalam com nível
- [x] Componentes de magia (verbal, somático, material)
- [x] Escolas de magia (Abjuration, Conjuration, Divination, Enchantment, Evocation, Illusion, Necromancy, Transmutation)
- [x] Class features e abilities por nível
- [x] Proficiências de armas e armaduras por classe
- [x] Dados de vida (Hit Dice) por classe
- [x] Atributos primários por classe
- [x] Integração de spells no combate
- [x] UI de seleção e uso de magias
- [x] Sprites pixel art para novas classes (usando sprites existentes)

## Pixel Art Tile Map System
- [x] Sprites de tiles para terrenos (grama, água, lava, montanha, floresta, areia, neve, pântano, estrada, dungeon)
- [x] Sistema de mapa baseado em grid quadriculado
- [x] Movimento do jogador por tiles (quadradinhos)
- [x] Animações de tiles (água e lava com efeitos visuais)
- [x] Geração procedural de terrenos baseada em coordenadas
- [x] Colisão com terrenos intransponíveis (água, lava, montanhas)
- [x] Sprite do jogador no mapa
- [x] Indicadores de POIs nos tiles
- [x] Controles WASD/Setas para movimento

## Mapa Mundial Pixel Art (Google Maps)
- [x] Overlay de grid quadriculado sobre o Google Maps real
- [x] Filtro/estilo pixel art aplicado ao mapa do Google (cores de fantasia RPG)
- [x] Movimento do jogador por quadradinhos sobre o mapa real (WASD/Setas)
- [x] Manter geolocalização real do usuário
- [x] POIs posicionados nas coordenadas reais com visual pixel art
- [x] Efeito scanline para visual retrô

## Sistema de Eventos e Combate Avançado
- [x] POIs desaparecem após interação (monstros derrotados, tesouros coletados)
- [ ] Persistência de POIs visitados no banco de dados
- [ ] Sistema de respawn de POIs após tempo determinado
- [x] Combate com skills e magias do livro D&D 5e
- [x] Seleção de spells durante combate baseado na classe
- [x] Consumo de spell slots ao usar magias
- [ ] Habilidades especiais de classe (Rage, Sneak Attack, etc.)

## Guildas, Castelos e Locais de Interesse
- [x] Novo tipo de POI: Guilda de Aventureiros
- [x] Novo tipo de POI: Castelo/Fortaleza
- [ ] Novo tipo de POI: Taverna/Estalagem
- [ ] Novo tipo de POI: Torre de Mago
- [ ] Novo tipo de POI: Templo/Santuário
- [ ] Novo tipo de POI: Acampamento de Bandidos
- [x] Sprites pixel art para novos POIs (guilda, castelo, taverna, templo, torre)
- [x] Interações específicas para cada tipo de local (guilda e castelo)
