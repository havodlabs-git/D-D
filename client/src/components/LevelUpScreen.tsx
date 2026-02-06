import { useState } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { CHARACTER_CLASSES, SPELLS, Spell, SPELL_SLOTS_BY_LEVEL } from "../../../shared/gameConstants";
import { PixelFrame, PixelBtn, PixelText, PixelTitleBar, PixelTabs, PixelSeparator, PixelOverlay, PixelScrollArea, PixelStatRow, PIXEL_FONT, COLORS } from "./ui/pixelUI";

interface Character {
  id: number; name: string; characterClass: string; level: number; subclass?: string;
  strength: number; dexterity: number; constitution: number;
  intelligence: number; wisdom: number; charisma: number; knownSpells?: string[];
}

interface LevelUpScreenProps {
  character: Character; newLevel: number;
  onComplete: (choices: { attributeIncreases: { [key: string]: number }; newSpells: string[]; subclass?: string }) => void;
  onClose: () => void;
}

const ATTRIBUTE_NAMES: Record<string, string> = {
  strength: "FOR", dexterity: "DES", constitution: "CON",
  intelligence: "INT", wisdom: "SAB", charisma: "CAR",
};

const ATTRIBUTE_COLORS: Record<string, string> = {
  strength: "#ef4444", dexterity: "#22c55e", constitution: "#f59e0b",
  intelligence: "#3b82f6", wisdom: "#a855f7", charisma: "#ec4899",
};

const SPELL_SCHOOL_COLORS: Record<string, string> = {
  evocation: "#ef4444", abjuration: "#3b82f6", conjuration: "#eab308",
  divination: "#a855f7", enchantment: "#ec4899", illusion: "#6366f1",
  necromancy: "#6b7280", transmutation: "#22c55e",
};

export function LevelUpScreen({ character, newLevel, onComplete, onClose }: LevelUpScreenProps) {
  const classData = CHARACTER_CLASSES[character.characterClass as keyof typeof CHARACTER_CLASSES];
  const [attributePoints, setAttributePoints] = useState(2);
  const [attributeIncreases, setAttributeIncreases] = useState<{ [key: string]: number }>({});
  const [selectedSpells, setSelectedSpells] = useState<string[]>([]);
  const [selectedSubclass, setSelectedSubclass] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState("attributes");

  const needsSubclass = newLevel === 3 && !character.subclass;
  const canSelectSpells = Boolean(classData?.spellcasting);

  const availableSpells = Object.entries(SPELLS).filter(([id, spell]) => {
    if (!classData?.spellcasting) return false;
    const classMatch = (spell.classes || []).some(c => c.toLowerCase() === character.characterClass.toLowerCase());
    return classMatch && spell.level <= Math.ceil(newLevel / 2) && !character.knownSpells?.includes(id);
  });

  const spellsToLearn = newLevel % 2 === 1 ? 2 : 1;

  const handleAttributeIncrease = (attr: string) => {
    if (attributePoints <= 0) return;
    setAttributeIncreases(prev => ({ ...prev, [attr]: (prev[attr] || 0) + 1 }));
    setAttributePoints(prev => prev - 1);
  };

  const handleAttributeDecrease = (attr: string) => {
    if (!attributeIncreases[attr] || attributeIncreases[attr] <= 0) return;
    setAttributeIncreases(prev => ({ ...prev, [attr]: prev[attr] - 1 }));
    setAttributePoints(prev => prev + 1);
  };

  const handleSpellToggle = (spellId: string) => {
    if (selectedSpells.includes(spellId)) setSelectedSpells(prev => prev.filter(s => s !== spellId));
    else if (selectedSpells.length < spellsToLearn) setSelectedSpells(prev => [...prev, spellId]);
    else toast.error(`So podes aprender ${spellsToLearn} magia(s) neste nivel!`);
  };

  const handleComplete = () => {
    if (needsSubclass && !selectedSubclass) { toast.error("Precisas de escolher uma subclasse!"); setCurrentTab("subclass"); return; }
    if (attributePoints > 0) toast.warning("Ainda tens pontos de atributo para distribuir!");
    onComplete({ attributeIncreases, newSpells: selectedSpells, subclass: selectedSubclass || undefined });
  };

  const tabs = [
    { id: "attributes", label: "ATRIBUTOS" },
    ...(canSelectSpells ? [{ id: "spells", label: "MAGIAS" }] : []),
    ...(needsSubclass ? [{ id: "subclass", label: "SUBCLASSE" }] : []),
  ];

  return (
    <PixelOverlay>
      <PixelFrame borderColor={COLORS.textGold} ornate glow className="w-full max-w-md" bgColor={COLORS.panelDark}>
        <div className="p-3">
          {/* Header */}
          <div className="text-center mb-2">
            <PixelText size="xxl" color={COLORS.textGold} bold glow as="div">{newLevel}</PixelText>
            <PixelText size="lg" color={COLORS.textGold} bold as="div">SUBIU DE NIVEL!</PixelText>
            <PixelText size="xs" color={COLORS.textWhite} as="div">{character.name} alcancou o nivel {newLevel}!</PixelText>
          </div>

          <PixelSeparator />

          <PixelTabs tabs={tabs} activeTab={currentTab} onTabChange={setCurrentTab} />

          {/* Attributes Tab */}
          {currentTab === "attributes" && (
            <div>
              <div className="text-center mb-2">
                <PixelText size="xs" color={COLORS.textGold}>Pontos: <span style={{ color: attributePoints > 0 ? COLORS.textGreen : COLORS.textGray }}>{attributePoints}</span></PixelText>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {Object.entries(ATTRIBUTE_NAMES).map(([key, name]) => {
                  const baseValue = character[key as keyof Character] as number;
                  const increase = attributeIncreases[key] || 0;
                  const newValue = baseValue + increase;
                  const color = ATTRIBUTE_COLORS[key];
                  return (
                    <PixelFrame key={key} borderColor={increase > 0 ? color : '#333'} className="p-2" bgColor={increase > 0 ? `${color}08` : COLORS.panelMid}>
                      <div className="flex items-center justify-between mb-1">
                        <PixelText size="xs" color={color} bold>{name}</PixelText>
                        <div className="flex items-center gap-1">
                          <PixelText size="md" color={COLORS.textWhite} bold>{newValue}</PixelText>
                          {increase > 0 && <PixelText size="xxs" color={COLORS.textGreen}>+{increase}</PixelText>}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => handleAttributeDecrease(key)} disabled={!increase}
                          className="flex-1 py-0.5 flex items-center justify-center disabled:opacity-25"
                          style={{ background: COLORS.panelDark, border: '1px solid #444', fontFamily: PIXEL_FONT, fontSize: '10px', color: '#fff' }}>-</button>
                        <button onClick={() => handleAttributeIncrease(key)} disabled={attributePoints <= 0}
                          className="flex-1 py-0.5 flex items-center justify-center disabled:opacity-25"
                          style={{ background: '#1a3a1a', border: '1px solid #22c55e', fontFamily: PIXEL_FONT, fontSize: '10px', color: '#22c55e' }}>+</button>
                      </div>
                    </PixelFrame>
                  );
                })}
              </div>
            </div>
          )}

          {/* Spells Tab */}
          {currentTab === "spells" && canSelectSpells && (
            <div>
              <div className="text-center mb-2">
                <PixelText size="xs" color={COLORS.textPurple}>Escolhe {spellsToLearn}: {selectedSpells.length}/{spellsToLearn}</PixelText>
              </div>
              <PixelScrollArea maxHeight="220px">
                {availableSpells.length === 0 ? (
                  <div className="text-center py-4"><PixelText size="xs" color={COLORS.textGray}>Nenhuma magia disponivel</PixelText></div>
                ) : (
                  <div className="space-y-1">
                    {availableSpells.map(([id, spell]) => {
                      const isSelected = selectedSpells.includes(id);
                      const schoolColor = SPELL_SCHOOL_COLORS[spell.school.toLowerCase()] || COLORS.textGray;
                      return (
                        <button key={id} onClick={() => handleSpellToggle(id)}
                          className="w-full text-left p-2 transition-all hover:brightness-125"
                          style={{
                            background: isSelected ? `${schoolColor}15` : COLORS.panelMid,
                            border: `2px solid ${isSelected ? schoolColor : '#333'}`,
                            boxShadow: isSelected ? `0 0 6px ${schoolColor}30` : '2px 2px 0 rgba(0,0,0,0.3)',
                          }}>
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1">
                                <PixelText size="xs" color={schoolColor} bold>{spell.name}</PixelText>
                                <PixelText size="xxs" color={COLORS.textGray}>{spell.level === 0 ? "Cantrip" : `Nv.${spell.level}`}</PixelText>
                              </div>
                              <PixelText size="xxs" color={COLORS.textGray} className="block truncate">{spell.description}</PixelText>
                            </div>
                            {isSelected && <PixelText size="sm" color={COLORS.textGreen}>✓</PixelText>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </PixelScrollArea>
            </div>
          )}

          {/* Subclass Tab */}
          {currentTab === "subclass" && needsSubclass && (
            <div>
              <div className="text-center mb-2">
                <PixelText size="xs" color={COLORS.textGold}>No nivel 3, escolhe a tua especializacao!</PixelText>
              </div>
              <div className="space-y-1.5">
                {classData?.subclasses && Object.entries(classData.subclasses).map(([subclassId, subclass]) => {
                  const isSelected = selectedSubclass === subclassId;
                  return (
                    <button key={subclassId} onClick={() => setSelectedSubclass(subclassId)}
                      className="w-full text-left p-2.5 transition-all hover:brightness-125"
                      style={{
                        background: isSelected ? `${COLORS.textGold}10` : COLORS.panelMid,
                        border: `2px solid ${isSelected ? COLORS.textGold : '#333'}`,
                        boxShadow: isSelected ? `0 0 8px ${COLORS.textGold}30` : '2px 2px 0 rgba(0,0,0,0.3)',
                      }}>
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <PixelText size="sm" color={isSelected ? COLORS.textGold : COLORS.textWhite} bold>{subclass.name}</PixelText>
                          <PixelText size="xxs" color={COLORS.textGray} className="block mt-0.5">{subclass.description}</PixelText>
                        </div>
                        {isSelected && <PixelText size="sm" color={COLORS.textGold}>✓</PixelText>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Summary */}
          <PixelSeparator />
          <PixelFrame borderColor="#444" className="p-2 mb-2" bgColor={COLORS.panelMid}>
            <PixelText size="xxs" color={COLORS.textGold} bold className="block mb-1">Resumo:</PixelText>
            {Object.entries(attributeIncreases).filter(([_, v]) => v > 0).map(([attr, val]) => (
              <PixelText key={attr} size="xxs" color={COLORS.textGreen} className="block">+{val} {ATTRIBUTE_NAMES[attr]}</PixelText>
            ))}
            {selectedSpells.length > 0 && (
              <PixelText size="xxs" color={COLORS.textPurple} className="block">Magias: {selectedSpells.map(s => SPELLS[s]?.name).join(", ")}</PixelText>
            )}
            {selectedSubclass && classData?.subclasses && (
              <PixelText size="xxs" color={COLORS.textGold} className="block">Subclasse: {(classData.subclasses as Record<string, { name: string }>)[selectedSubclass]?.name}</PixelText>
            )}
            {Object.values(attributeIncreases).every(v => v === 0) && selectedSpells.length === 0 && !selectedSubclass && (
              <PixelText size="xxs" color={COLORS.textGray} className="block">Nenhuma escolha feita</PixelText>
            )}
          </PixelFrame>

          {/* Actions */}
          <div className="flex gap-2">
            <PixelBtn variant="close" size="sm" fullWidth onClick={onClose}>CANCELAR</PixelBtn>
            <PixelBtn variant="gold" size="sm" fullWidth onClick={handleComplete}>CONFIRMAR</PixelBtn>
          </div>
        </div>
      </PixelFrame>
    </PixelOverlay>
  );
}
