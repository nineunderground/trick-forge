export interface RulesBlock {
  type: 'heading' | 'paragraph' | 'list' | 'example' | 'note'
  text?: string
  items?: string[]
  ordered?: boolean
}

export interface RulesChapter {
  id: string
  title: string
  blocks: RulesBlock[]
}

export interface RulesDocument {
  chapters: RulesChapter[]
}

export const ODIN_RULES: RulesDocument = {
  chapters: [
    {
      id: 'chapter-1',
      title: 'Chapter 1',
      blocks: [
        { type: 'heading', text: 'Components' },
        {
          type: 'paragraph',
          text: '54 cards numbered 1 to 9 in 6 colours',
        },
        { type: 'heading', text: 'Object of the game' },
        {
          type: 'paragraph',
          text: 'Be the first to discard all the cards from your hand and have the fewest points at the end of the game.',
        },
        { type: 'heading', text: 'Setup' },
        {
          type: 'list',
          ordered: true,
          items: [
            'Shuffle all the cards.',
            'Deal 9 cards face down to each player. This is your hand. Feel free to look at your hand, but don’t let anyone else see!',
          ],
        },
        {
          type: 'paragraph',
          text: 'Choose a first player at random. You will then take turns in clockwise order.',
        },
      ],
    },
    {
      id: 'chapter-2',
      title: 'Chapter 2',
      blocks: [
        { type: 'heading', text: 'How to play' },
        {
          type: 'paragraph',
          text: 'The game is played over several hands. Each hand is divided into rounds.',
        },
        {
          type: 'paragraph',
          text: 'At the start of a round, if you are the first player, play 1 of your cards face up in the middle of the table.',
        },
        {
          type: 'paragraph',
          text: 'Each player then takes turns to either:',
        },
        {
          type: 'list',
          ordered: true,
          items: ['Play 1 or more cards', 'Pass'],
        },
        { type: 'heading', text: '1. Play 1 or more cards' },
        {
          type: 'paragraph',
          text: 'The value of the cards you play must be greater than the value of those already in the middle of the table.',
        },
        {
          type: 'example',
          text: 'Example: if the value in the middle of the table is 3, you must play a value of 4 or higher.',
        },
        {
          type: 'paragraph',
          text: 'You can play either the same number of cards as already in the middle of the table, or 1 card more.',
        },
        {
          type: 'example',
          text: 'Example: if there is already a set of 2 cards, you can play a set of 2 cards or a set of 3 cards. However, you cannot play a set of 4 cards. You also cannot play 1 card on its own.',
        },
        {
          type: 'paragraph',
          text: 'If you want to play multiple cards, they must be of the same number or the same colour. When you play multiple cards, calculate their value by using each card number as a digit to create the highest number possible.',
        },
        {
          type: 'example',
          text: 'Example: if you play 2 and 8 of the same colour, the value of the set is 82 (not 28). If you play 2, 4, and 9 – also of the same colour – the value of the set is 942.',
        },
      ],
    },
    {
      id: 'chapter-3',
      title: 'Chapter 3',
      blocks: [
        {
          type: 'paragraph',
          text: 'Once you have played 1 or more cards, you must pick up 1 card from the middle of the table. You cannot pick up a card you have just played. Therefore:',
        },
        {
          type: 'list',
          items: [
            'If there is only 1 card, you must pick it up.',
            'If there is a set of cards, choose 1 card and discard the rest of the set.',
          ],
        },
        { type: 'heading', text: '2. Pass' },
        {
          type: 'paragraph',
          text: 'If you pass, do not play any cards. The player on your left now takes their turn.',
        },
        {
          type: 'note',
          text: 'Note: if you pass this turn, you can play as normal on your next turn.',
        },
        {
          type: 'paragraph',
          text: 'If all but 1 player pass, the round ends. Keep the cards you have in your hand. If there are any cards in the middle of the table, discard them. If you were the last player to play a card, you start the new round.',
        },
        { type: 'heading', text: 'End of a hand' },
        {
          type: 'paragraph',
          text: 'A hand can end in 2 ways:',
        },
        {
          type: 'list',
          ordered: true,
          items: [
            'If you start a new round and all the cards in your hand are of the same number or same colour, you are allowed to play them all. The hand is now over. If you cannot do this, play 1 card as normal.',
            'If, at any point in the game, you play 1 or more cards and your hand is now empty, do not take a card from the middle of the table. The hand is now over.',
          ],
        },
        {
          type: 'paragraph',
          text: 'At the end of a hand, you receive 1 point for each card left in your hand. Keep note of your points.',
        },
        {
          type: 'paragraph',
          text: 'To start a new hand, collect all the cards and shuffle them. Deal 9 cards to each player. If you were the first player for the previous hand, the player to your left starts the new hand by playing 1 card.',
        },
      ],
    },
    {
      id: 'chapter-4',
      title: 'Chapter 4',
      blocks: [
        { type: 'heading', text: 'End of the game' },
        {
          type: 'paragraph',
          text: 'If you are playing the game for the first time, we recommend playing to 15 points. Therefore, once a player has 15 points or more, the game ends. The player with the fewest points wins! In case of a tie, those players share the victory.',
        },
        {
          type: 'paragraph',
          text: 'After your first game, you can choose the number of points you want to play to. For long games, you could play to 20. For short games, to 10. For super short games, just play 1 hand!',
        },
        { type: 'heading', text: 'Why the Viking theme?' },
        {
          type: 'paragraph',
          text: 'We wanted our rather abstract game to have a theme! Our original prototype also had a Viking theme and we named it Valhalla.',
        },
        {
          type: 'paragraph',
          text: 'Imagine, if you can, Vikings at war. Those that fall in battle (when their card is discarded) go to Viking heaven, Valhalla. We felt this theme suited the mechanics of our game pretty well, and it was an opportunity to shine a spotlight on a culture different to our own in Switzerland. We hope our own heritage has not biased our outlook too much. Our cards are inspired by the following Viking archetypes, in order from 1 to 9: healer, skald (bard), spy, seidmadr (wise man), völva (seeress), hirdmen (guardsman), beserker, styrimader (ship’s captain), and jarl.',
        },
      ],
    },
  ],
}

const RULES_BY_PROFILE: Record<string, RulesDocument> = {
  odin: ODIN_RULES,
}

export function getProfileRules(profileId: string): RulesDocument | null {
  return RULES_BY_PROFILE[profileId] ?? null
}
