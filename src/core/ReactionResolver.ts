import type { CharacterId, EmotionValues } from '../data/characters';
import { reactionTable, type ReactionRule } from '../data/reactions';
import type { InteractionEvent } from '../data/interactions';

export class ReactionResolver {
  resolve(
    characterId: CharacterId,
    event: InteractionEvent,
    emotion: EmotionValues,
  ): ReactionRule {
    const rule = [...reactionTable[characterId]]
      .sort((left, right) => right.priority - left.priority)
      .find((candidate) => matchesRule(candidate, event, emotion));

    if (!rule) {
      throw new Error(`角色 ${characterId} 缺少可用的反馈规则。`);
    }

    return rule;
  }
}

function matchesRule(
  rule: ReactionRule,
  event: InteractionEvent,
  emotion: EmotionValues,
): boolean {
  if (rule.gestures && !rule.gestures.includes(event.gesture)) return false;
  if (rule.zones && !rule.zones.includes(event.zone)) return false;
  if (rule.minAffection !== undefined && emotion.affection < rule.minAffection) return false;
  if (rule.maxAffection !== undefined && emotion.affection > rule.maxAffection) return false;
  if (rule.minStimulation !== undefined && emotion.stimulation < rule.minStimulation) return false;
  return true;
}
