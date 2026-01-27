// D&D 5e Monster Seed Script
// Based on official D&D 5e Basic Rules and Monster Manual

import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;

// Official D&D 5e Monsters with CR and stats
const DND_MONSTERS = [
  // CR 0 - Very Weak
  { name: "Rato", description: "Um pequeno roedor comum encontrado em esgotos e masmorras.", monsterType: "beast", tier: "common", baseLevel: 1, challengeRating: "0", health: 1, damage: 1, armor: 10, experienceReward: 10, goldReward: 1, biomeType: "urban", iconUrl: "/sprites/monsters/rat.png" },
  { name: "Morcego", description: "Um pequeno morcego que habita cavernas escuras.", monsterType: "beast", tier: "common", baseLevel: 1, challengeRating: "0", health: 1, damage: 1, armor: 12, experienceReward: 10, goldReward: 1, biomeType: "mountain", iconUrl: "/sprites/monsters/bat_giant.png" },
  
  // CR 1/8 - Weak
  { name: "Kobold", description: "Um pequeno humanoide reptiliano covarde mas astuto.", monsterType: "humanoid", tier: "common", baseLevel: 1, challengeRating: "1/8", health: 5, damage: 4, armor: 12, experienceReward: 25, goldReward: 5, biomeType: "mountain", iconUrl: "/sprites/monsters/kobold.png" },
  { name: "Bandido", description: "Um fora-da-lei que vive de assaltos e roubos.", monsterType: "humanoid", tier: "common", baseLevel: 1, challengeRating: "1/8", health: 11, damage: 4, armor: 12, experienceReward: 25, goldReward: 10, biomeType: "forest", iconUrl: "/sprites/monsters/bandit.png" },
  { name: "Rato Gigante", description: "Um rato do tamanho de um cão, agressivo e portador de doenças.", monsterType: "beast", tier: "common", baseLevel: 1, challengeRating: "1/8", health: 7, damage: 4, armor: 12, experienceReward: 25, goldReward: 3, biomeType: "urban", iconUrl: "/sprites/monsters/rat_giant.png" },
  
  // CR 1/4 - Low
  { name: "Goblin", description: "Um pequeno humanoide verde, cruel e traiçoeiro.", monsterType: "humanoid", tier: "common", baseLevel: 1, challengeRating: "1/4", health: 7, damage: 5, armor: 15, experienceReward: 50, goldReward: 8, biomeType: "forest", iconUrl: "/sprites/monsters/goblin.png" },
  { name: "Esqueleto", description: "Os ossos animados de um morto, servindo a forças sombrias.", monsterType: "undead", tier: "common", baseLevel: 1, challengeRating: "1/4", health: 13, damage: 5, armor: 13, experienceReward: 50, goldReward: 5, biomeType: "urban", iconUrl: "/sprites/monsters/skeleton_warrior.png" },
  { name: "Zumbi", description: "Um cadáver reanimado por magia negra, lento mas persistente.", monsterType: "undead", tier: "common", baseLevel: 1, challengeRating: "1/4", health: 22, damage: 4, armor: 8, experienceReward: 50, goldReward: 3, biomeType: "urban", iconUrl: "/sprites/monsters/zombie.png" },
  { name: "Lobo", description: "Um predador selvagem que caça em matilhas.", monsterType: "beast", tier: "common", baseLevel: 1, challengeRating: "1/4", health: 11, damage: 7, armor: 13, experienceReward: 50, goldReward: 5, biomeType: "forest", iconUrl: "/sprites/monsters/wolf_dire.png" },
  { name: "Aranha Gigante", description: "Uma aranha do tamanho de um cavalo, com veneno mortal.", monsterType: "beast", tier: "common", baseLevel: 2, challengeRating: "1/4", health: 26, damage: 7, armor: 14, experienceReward: 50, goldReward: 10, biomeType: "forest", iconUrl: "/sprites/monsters/spider_giant.png" },
  
  // CR 1/2 - Medium-Low
  { name: "Orc", description: "Um guerreiro brutal das tribos selvagens.", monsterType: "humanoid", tier: "common", baseLevel: 2, challengeRating: "1/2", health: 15, damage: 9, armor: 13, experienceReward: 100, goldReward: 15, biomeType: "mountain", iconUrl: "/sprites/monsters/ogre.png" },
  { name: "Hobgoblin", description: "Um goblin maior e mais disciplinado, treinado para guerra.", monsterType: "humanoid", tier: "common", baseLevel: 2, challengeRating: "1/2", health: 11, damage: 8, armor: 18, experienceReward: 100, goldReward: 20, biomeType: "mountain", iconUrl: "/sprites/monsters/goblin_boss.png" },
  { name: "Gnoll", description: "Um humanoide hiena, selvagem e sedento de sangue.", monsterType: "humanoid", tier: "common", baseLevel: 2, challengeRating: "1/2", health: 22, damage: 8, armor: 15, experienceReward: 100, goldReward: 12, biomeType: "plains", iconUrl: "/sprites/monsters/ghoul.png" },
  { name: "Lobo Terrível", description: "Um lobo gigante e feroz, montaria de goblins.", monsterType: "beast", tier: "common", baseLevel: 2, challengeRating: "1/2", health: 37, damage: 10, armor: 14, experienceReward: 100, goldReward: 15, biomeType: "forest", iconUrl: "/sprites/monsters/wolf_dire.png" },
  
  // CR 1 - Medium
  { name: "Ghoul", description: "Um morto-vivo que se alimenta de carne de cadáveres.", monsterType: "undead", tier: "common", baseLevel: 3, challengeRating: "1", health: 22, damage: 9, armor: 12, experienceReward: 200, goldReward: 20, biomeType: "urban", iconUrl: "/sprites/monsters/ghoul.png" },
  { name: "Bugbear", description: "Um goblinoide grande e furtivo, especialista em emboscadas.", monsterType: "humanoid", tier: "elite", baseLevel: 3, challengeRating: "1", health: 27, damage: 11, armor: 16, experienceReward: 200, goldReward: 25, biomeType: "forest", iconUrl: "/sprites/monsters/troll.png" },
  { name: "Harpia", description: "Uma criatura alada com corpo de pássaro e rosto de mulher.", monsterType: "beast", tier: "common", baseLevel: 3, challengeRating: "1", health: 38, damage: 6, armor: 11, experienceReward: 200, goldReward: 30, biomeType: "mountain", iconUrl: "/sprites/monsters/harpy.png" },
  { name: "Imp", description: "Um pequeno demônio alado, servo de forças malignas.", monsterType: "demon", tier: "common", baseLevel: 3, challengeRating: "1", health: 10, damage: 5, armor: 13, experienceReward: 200, goldReward: 50, biomeType: "urban", iconUrl: "/sprites/monsters/imp.png" },
  
  // CR 2 - Medium-High
  { name: "Ogro", description: "Um gigante estúpido mas incrivelmente forte.", monsterType: "humanoid", tier: "elite", baseLevel: 4, challengeRating: "2", health: 59, damage: 13, armor: 11, experienceReward: 450, goldReward: 40, biomeType: "mountain", iconUrl: "/sprites/monsters/ogre.png" },
  { name: "Gelatinous Cube", description: "Um cubo de gelatina transparente que dissolve tudo que toca.", monsterType: "aberration", tier: "common", baseLevel: 4, challengeRating: "2", health: 84, damage: 10, armor: 6, experienceReward: 450, goldReward: 100, biomeType: "urban", iconUrl: "/sprites/monsters/gelatinous_cube.png" },
  { name: "Mimic", description: "Uma criatura que se disfarça de baú ou objeto.", monsterType: "aberration", tier: "common", baseLevel: 4, challengeRating: "2", health: 58, damage: 7, armor: 12, experienceReward: 450, goldReward: 150, biomeType: "urban", iconUrl: "/sprites/monsters/mimic.png" },
  { name: "Gargoyle", description: "Uma estátua de pedra animada por magia.", monsterType: "construct", tier: "common", baseLevel: 4, challengeRating: "2", health: 52, damage: 10, armor: 15, experienceReward: 450, goldReward: 60, biomeType: "urban", iconUrl: "/sprites/monsters/skeleton_warrior.png" },
  
  // CR 3 - Challenging
  { name: "Lobisomem", description: "Um humano amaldiçoado que se transforma em lobo.", monsterType: "humanoid", tier: "elite", baseLevel: 5, challengeRating: "3", health: 58, damage: 11, armor: 12, experienceReward: 700, goldReward: 80, biomeType: "forest", iconUrl: "/sprites/monsters/wolf_dire.png" },
  { name: "Owlbear", description: "Uma fera híbrida de urso e coruja, extremamente territorial.", monsterType: "beast", tier: "elite", baseLevel: 5, challengeRating: "3", health: 59, damage: 14, armor: 13, experienceReward: 700, goldReward: 50, biomeType: "forest", iconUrl: "/sprites/monsters/troll.png" },
  { name: "Manticore", description: "Uma besta com corpo de leão, asas de dragão e cauda de espinhos.", monsterType: "beast", tier: "elite", baseLevel: 5, challengeRating: "3", health: 68, damage: 13, armor: 14, experienceReward: 700, goldReward: 100, biomeType: "mountain", iconUrl: "/sprites/monsters/harpy.png" },
  { name: "Múmia", description: "Um morto-vivo preservado por rituais antigos.", monsterType: "undead", tier: "elite", baseLevel: 5, challengeRating: "3", health: 58, damage: 10, armor: 11, experienceReward: 700, goldReward: 200, biomeType: "desert", iconUrl: "/sprites/monsters/zombie.png" },
  
  // CR 4 - Hard
  { name: "Troll", description: "Um gigante verde com regeneração sobrenatural.", monsterType: "humanoid", tier: "elite", baseLevel: 6, challengeRating: "4", health: 84, damage: 14, armor: 15, experienceReward: 1100, goldReward: 100, biomeType: "forest", iconUrl: "/sprites/monsters/troll.png" },
  { name: "Ettin", description: "Um gigante de duas cabeças, cada uma com personalidade própria.", monsterType: "humanoid", tier: "elite", baseLevel: 6, challengeRating: "4", health: 85, damage: 14, armor: 12, experienceReward: 1100, goldReward: 80, biomeType: "mountain", iconUrl: "/sprites/monsters/ogre.png" },
  { name: "Succubus", description: "Um demônio sedutor que drena a força vital de suas vítimas.", monsterType: "demon", tier: "elite", baseLevel: 6, challengeRating: "4", health: 66, damage: 8, armor: 15, experienceReward: 1100, goldReward: 200, biomeType: "urban", iconUrl: "/sprites/monsters/harpy.png" },
  
  // CR 5 - Very Hard
  { name: "Elemental da Terra", description: "Um espírito da terra encarnado em pedra e solo.", monsterType: "elemental", tier: "elite", baseLevel: 7, challengeRating: "5", health: 126, damage: 14, armor: 17, experienceReward: 1800, goldReward: 150, biomeType: "mountain", iconUrl: "/sprites/monsters/gelatinous_cube.png" },
  { name: "Elemental do Fogo", description: "Um espírito de chamas vivas e destruição.", monsterType: "elemental", tier: "elite", baseLevel: 7, challengeRating: "5", health: 102, damage: 14, armor: 13, experienceReward: 1800, goldReward: 150, biomeType: "desert", iconUrl: "/sprites/monsters/imp.png" },
  { name: "Elemental da Água", description: "Um espírito das águas profundas.", monsterType: "elemental", tier: "elite", baseLevel: 7, challengeRating: "5", health: 114, damage: 13, armor: 14, experienceReward: 1800, goldReward: 150, biomeType: "water", iconUrl: "/sprites/monsters/gelatinous_cube.png" },
  { name: "Elemental do Ar", description: "Um espírito dos ventos e tempestades.", monsterType: "elemental", tier: "elite", baseLevel: 7, challengeRating: "5", health: 90, damage: 14, armor: 15, experienceReward: 1800, goldReward: 150, biomeType: "plains", iconUrl: "/sprites/monsters/harpy.png" },
  { name: "Vampiro Spawn", description: "Um servo vampírico, criado por um vampiro verdadeiro.", monsterType: "undead", tier: "elite", baseLevel: 7, challengeRating: "5", health: 82, damage: 12, armor: 15, experienceReward: 1800, goldReward: 250, biomeType: "urban", iconUrl: "/sprites/monsters/ghoul.png" },
  
  // CR 6 - Deadly
  { name: "Medusa", description: "Uma criatura com serpentes no lugar de cabelos, cujo olhar petrifica.", monsterType: "aberration", tier: "boss", baseLevel: 8, challengeRating: "6", health: 127, damage: 11, armor: 15, experienceReward: 2300, goldReward: 500, biomeType: "mountain", iconUrl: "/sprites/monsters/harpy.png" },
  { name: "Wyvern", description: "Um dragão menor com cauda venenosa.", monsterType: "dragon", tier: "boss", baseLevel: 8, challengeRating: "6", health: 110, damage: 13, armor: 13, experienceReward: 2300, goldReward: 300, biomeType: "mountain", iconUrl: "/sprites/monsters/harpy.png" },
  
  // CR 7 - Very Deadly
  { name: "Gigante das Colinas", description: "O menor dos verdadeiros gigantes, mas ainda assim formidável.", monsterType: "humanoid", tier: "boss", baseLevel: 9, challengeRating: "7", health: 105, damage: 18, armor: 13, experienceReward: 2900, goldReward: 400, biomeType: "mountain", iconUrl: "/sprites/monsters/ogre.png" },
  { name: "Mind Flayer", description: "Uma aberração psíquica que se alimenta de cérebros.", monsterType: "aberration", tier: "boss", baseLevel: 9, challengeRating: "7", health: 71, damage: 15, armor: 15, experienceReward: 2900, goldReward: 600, biomeType: "urban", iconUrl: "/sprites/monsters/ghoul.png" },
  
  // CR 8 - Extreme
  { name: "Gigante de Pedra", description: "Um gigante que vive nas montanhas e molda a rocha.", monsterType: "humanoid", tier: "boss", baseLevel: 10, challengeRating: "8", health: 126, damage: 19, armor: 17, experienceReward: 3900, goldReward: 500, biomeType: "mountain", iconUrl: "/sprites/monsters/ogre.png" },
  { name: "Hydra", description: "Uma serpente de múltiplas cabeças que regeneram quando cortadas.", monsterType: "beast", tier: "boss", baseLevel: 10, challengeRating: "8", health: 172, damage: 10, armor: 15, experienceReward: 3900, goldReward: 700, biomeType: "water", iconUrl: "/sprites/monsters/troll.png" },
  
  // CR 9 - Legendary Threat
  { name: "Gigante do Fogo", description: "Um gigante que habita vulcões e forjas ardentes.", monsterType: "humanoid", tier: "boss", baseLevel: 11, challengeRating: "9", health: 162, damage: 28, armor: 18, experienceReward: 5000, goldReward: 800, biomeType: "mountain", iconUrl: "/sprites/monsters/ogre.png" },
  { name: "Treant", description: "Uma árvore anciã animada, guardiã da floresta.", monsterType: "elemental", tier: "boss", baseLevel: 11, challengeRating: "9", health: 138, damage: 16, armor: 16, experienceReward: 5000, goldReward: 300, biomeType: "forest", iconUrl: "/sprites/monsters/troll.png" },
  
  // CR 10+ - Legendary
  { name: "Dragão Jovem Vermelho", description: "Um dragão vermelho em sua juventude, já mortalmente perigoso.", monsterType: "dragon", tier: "legendary", baseLevel: 12, challengeRating: "10", health: 178, damage: 22, armor: 18, experienceReward: 5900, goldReward: 2000, biomeType: "mountain", iconUrl: "/sprites/monsters/harpy.png" },
  { name: "Beholder", description: "Uma aberração esférica com múltiplos olhos mágicos.", monsterType: "aberration", tier: "legendary", baseLevel: 13, challengeRating: "13", health: 180, damage: 14, armor: 18, experienceReward: 10000, goldReward: 5000, biomeType: "urban", iconUrl: "/sprites/monsters/gelatinous_cube.png" },
  { name: "Vampiro", description: "Um morto-vivo poderoso que se alimenta de sangue.", monsterType: "undead", tier: "legendary", baseLevel: 13, challengeRating: "13", health: 144, damage: 17, armor: 16, experienceReward: 10000, goldReward: 3000, biomeType: "urban", iconUrl: "/sprites/monsters/ghoul.png" },
  { name: "Lich", description: "Um mago que alcançou a imortalidade através de magia negra.", monsterType: "undead", tier: "legendary", baseLevel: 15, challengeRating: "21", health: 135, damage: 20, armor: 17, experienceReward: 33000, goldReward: 10000, biomeType: "urban", iconUrl: "/sprites/monsters/skeleton_warrior.png" },
  { name: "Dragão Adulto Vermelho", description: "Um dragão vermelho em seu auge, terror dos céus.", monsterType: "dragon", tier: "legendary", baseLevel: 17, challengeRating: "17", health: 256, damage: 26, armor: 19, experienceReward: 18000, goldReward: 8000, biomeType: "mountain", iconUrl: "/sprites/monsters/harpy.png" },
  { name: "Dragão Ancião Vermelho", description: "Um dragão vermelho ancião, uma das criaturas mais poderosas.", monsterType: "dragon", tier: "legendary", baseLevel: 20, challengeRating: "24", health: 546, damage: 32, armor: 22, experienceReward: 62000, goldReward: 25000, biomeType: "mountain", iconUrl: "/sprites/monsters/harpy.png" },
  
  // Goblin Variants
  { name: "Goblin Arqueiro", description: "Um goblin especializado em ataques à distância.", monsterType: "humanoid", tier: "common", baseLevel: 1, challengeRating: "1/4", health: 7, damage: 6, armor: 13, experienceReward: 50, goldReward: 10, biomeType: "forest", iconUrl: "/sprites/monsters/goblin_archer.png" },
  { name: "Goblin Xamã", description: "Um goblin que pratica magia primitiva.", monsterType: "humanoid", tier: "elite", baseLevel: 2, challengeRating: "1/2", health: 12, damage: 8, armor: 12, experienceReward: 100, goldReward: 25, biomeType: "forest", iconUrl: "/sprites/monsters/goblin_shaman.png" },
  { name: "Chefe Goblin", description: "O líder de uma tribo goblin, maior e mais forte.", monsterType: "humanoid", tier: "boss", baseLevel: 3, challengeRating: "1", health: 21, damage: 10, armor: 17, experienceReward: 200, goldReward: 50, biomeType: "forest", iconUrl: "/sprites/monsters/goblin_boss.png" },
  
  // Rat Variants
  { name: "Rato de Esgoto", description: "Um rato comum dos esgotos das cidades.", monsterType: "beast", tier: "common", baseLevel: 1, challengeRating: "0", health: 3, damage: 2, armor: 10, experienceReward: 10, goldReward: 1, biomeType: "urban", iconUrl: "/sprites/monsters/rat_sewer.png" },
  { name: "Rei dos Ratos", description: "Uma massa grotesca de ratos fundidos em uma criatura.", monsterType: "aberration", tier: "boss", baseLevel: 4, challengeRating: "2", health: 45, damage: 12, armor: 12, experienceReward: 450, goldReward: 100, biomeType: "urban", iconUrl: "/sprites/monsters/rat_king.png" },
];

async function seedMonsters() {
  if (!DATABASE_URL) {
    console.error('DATABASE_URL not set');
    process.exit(1);
  }

  const connection = await mysql.createConnection(DATABASE_URL);
  
  try {
    console.log('Starting monster seed...');
    
    // Clear existing monsters
    await connection.execute('DELETE FROM monsters');
    console.log('Cleared existing monsters');
    
    // Insert all monsters
    for (const monster of DND_MONSTERS) {
      await connection.execute(
        `INSERT INTO monsters (name, description, monsterType, tier, baseLevel, challengeRating, health, damage, armor, experienceReward, goldReward, biomeType, iconUrl, createdAt) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          monster.name,
          monster.description,
          monster.monsterType,
          monster.tier,
          monster.baseLevel,
          monster.challengeRating,
          monster.health,
          monster.damage,
          monster.armor,
          monster.experienceReward,
          monster.goldReward,
          monster.biomeType,
          monster.iconUrl
        ]
      );
      console.log(`Added: ${monster.name} (CR ${monster.challengeRating})`);
    }
    
    console.log(`\nSuccessfully seeded ${DND_MONSTERS.length} monsters!`);
    
  } catch (error) {
    console.error('Error seeding monsters:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

seedMonsters();
