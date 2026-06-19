import { z } from 'zod'

const playersSchema = z.object({
  min: z.number().int().min(2),
  max: z.number().int().min(2),
  default: z.number().int().min(2),
})

const deckSchema = z.object({
  suits: z.array(z.string().min(1)).min(1),
  ranks: z.array(z.number().int()).min(1),
  copies: z.number().int().min(1).optional().default(1),
})

const dealSchema = z.object({
  cardsPerPlayer: z.number().int().min(1),
})

const scoringSchema = z.object({
  mode: z.enum(['penalty', 'reward']),
  pointsPerRemainingCard: z.number().int().min(0),
  gameEndThreshold: z.number().int().min(1),
  winner: z.enum(['lowest', 'highest']),
})

const setupStepSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['playerCount', 'seatAssignment', 'firstPlayer']),
  hostSeat: z.number().int().min(0).optional(),
  allowRemoteHumans: z.boolean().optional(),
})

const sessionSchema = z.object({
  setupSteps: z.array(setupStepSchema).min(1),
})

const climbingRulesSchema = z.object({
  openingPlay: z.literal('single_card'),
  beatConstraint: z.object({
    sameCountOrPlusOne: z.boolean(),
    setMustBeSameSuitOrSameRank: z.boolean(),
    valueFromDigitsHighToLow: z.boolean(),
  }),
  onBeatPrevious: z.object({
    takeOneCardFromPreviousSet: z.boolean(),
    skipTakeWhenHandEmpty: z.boolean().optional(),
  }),
  pass: z.object({
    allowed: z.boolean(),
    canReenterSameRound: z.boolean(),
  }),
  roundEnd: z.object({
    onEmptyHand: z.boolean(),
    onAllPass: z.object({
      discardLastSet: z.boolean(),
      leaderPlaysSingleOrHandBomb: z.boolean(),
    }),
  }),
  handBomb: z.object({
    allCardsSameSuitOrRank: z.boolean(),
    onlyWhenOpeningRoundAfterAllPass: z.boolean().optional(),
  }),
})

export const gameProfileSchema = z
  .object({
    apiVersion: z.literal('trickforge/v1'),
    kind: z.literal('GameProfile'),
    metadata: z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      version: z.string().min(1),
      description: z.string().optional(),
      help: z.string().optional(),
      authors: z.array(z.string()).optional(),
      tags: z.array(z.string()).optional(),
    }),
    spec: z.object({
      family: z.enum(['climbing', 'trick-taking']),
      players: playersSchema,
      deck: deckSchema,
      deal: dealSchema,
      scoring: scoringSchema,
      session: sessionSchema.optional(),
      rules: z.object({
        climbing: climbingRulesSchema.optional(),
        trickTaking: z.record(z.string(), z.unknown()).optional(),
      }),
    }),
  })
  .superRefine((profile, ctx) => {
    const { players, family, rules } = profile.spec
    if (players.default < players.min || players.default > players.max) {
      ctx.addIssue({
        code: 'custom',
        message: 'players.default must be between min and max',
        path: ['spec', 'players', 'default'],
      })
    }
    if (family === 'climbing' && !rules.climbing) {
      ctx.addIssue({
        code: 'custom',
        message: 'climbing profiles require spec.rules.climbing',
        path: ['spec', 'rules', 'climbing'],
      })
    }
    if (family === 'trick-taking') {
      ctx.addIssue({
        code: 'custom',
        message: 'trick-taking family is not implemented yet',
        path: ['spec', 'family'],
      })
    }
  })

export type GameProfile = z.infer<typeof gameProfileSchema>

export type ProfileValidationResult =
  | { ok: true; profile: GameProfile }
  | { ok: false; errors: string[] }

export function validateProfile(data: unknown): ProfileValidationResult {
  const result = gameProfileSchema.safeParse(data)
  if (result.success) {
    return { ok: true, profile: result.data }
  }
  const errors = result.error.issues.map(
    (issue) => `${issue.path.join('.') || 'root'}: ${issue.message}`,
  )
  return { ok: false, errors }
}
