import { boolean, integer, numeric, pgSchema, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

export const citadelAdmin = pgSchema('citadel_admin');
export const arcaneCodex = pgSchema('arcane_codex');
export const oniricPlane = pgSchema('oniric_plane');

export const users = citadelAdmin.table(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    email: text('email').notNull(),
    name: text('name').notNull(),
  },
  (table) => [uniqueIndex('users_email_idx').on(table.email)]
);

export const sessions = oniricPlane.table('sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  dmId: uuid('dm_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  status: text('status').notNull(), // planned|in_progress|complete
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const quests = oniricPlane.table('quests', {
  id: uuid('id').defaultRandom().primaryKey(),
  sessionId: uuid('session_id')
    .notNull()
    .references(() => sessions.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  summary: text('summary'),
  status: text('status').notNull(), // not_started|active|resolved|failed
  hook: text('hook'),
  reward: text('reward'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const races = arcaneCodex.table('races', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  baseSpeed: integer('base_speed').notNull(),
  size: text('size').notNull(),
});

export const subraces = arcaneCodex.table('subraces', {
  id: uuid('id').defaultRandom().primaryKey(),
  raceId: uuid('race_id')
    .notNull()
    .references(() => races.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
});

export const backgrounds = arcaneCodex.table('backgrounds', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  feature: text('feature').notNull(),
});

export const classes = arcaneCodex.table('classes', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  hitDie: text('hit_die').notNull(),
  primaryAbility: text('primary_ability').notNull(),
  spellcastingAbility: text('spellcasting_ability'),
});

export const subclasses = arcaneCodex.table('subclasses', {
  id: uuid('id').defaultRandom().primaryKey(),
  classId: uuid('class_id')
    .notNull()
    .references(() => classes.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description').notNull(),
});

export const abilities = arcaneCodex.table('abilities', {
  id: uuid('id').defaultRandom().primaryKey(),
  code: text('code').notNull(),
  name: text('name').notNull(),
});

export const skills = arcaneCodex.table('skills', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  abilityId: uuid('ability_id')
    .notNull()
    .references(() => abilities.id, { onDelete: 'cascade' }),
});

export const items = arcaneCodex.table('items', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  type: text('type').notNull(),
  weight: numeric('weight', { precision: 10, scale: 2 }),
  cost: numeric('cost', { precision: 10, scale: 2 }),
});

export const spells = arcaneCodex.table('spells', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  level: integer('level').notNull(),
  school: text('school').notNull(),
  castingTime: text('casting_time').notNull(),
  range: text('range').notNull(),
  components: text('components').notNull(),
  duration: text('duration').notNull(),
  concentration: boolean('concentration').notNull(),
  description: text('description').notNull(),
});

export const characters = oniricPlane.table('characters', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  level: integer('level').notNull(),
  raceId: uuid('race_id')
    .notNull()
    .references(() => races.id),
  subraceId: uuid('subrace_id')
    .references(() => subraces.id)
    .notNull(),
  backgroundId: uuid('background_id')
    .notNull()
    .references(() => backgrounds.id),
  alignment: text('alignment').notNull(),
  experiencePoints: integer('experience_points').notNull(),
  maxHitPoints: integer('max_hit_points').notNull(),
  currentHitPoints: integer('current_hit_points').notNull(),
  temporaryHitPoints: integer('temporary_hit_points').notNull(),
  armorClass: integer('armor_class').notNull(),
  speed: integer('speed').notNull(),
  inspiration: boolean('inspiration').notNull(),
  personalityTraits: text('personality_traits'),
  ideals: text('ideals'),
  bonds: text('bonds'),
  flaws: text('flaws'),
});

export const sessionPlayers = oniricPlane.table('session_players', {
  id: uuid('id').defaultRandom().primaryKey(),
  sessionId: uuid('session_id')
    .notNull()
    .references(() => sessions.id, { onDelete: 'cascade' }),
  characterId: uuid('character_id')
    .notNull()
    .references(() => characters.id, { onDelete: 'cascade' }),
  role: text('role').notNull(), // player|guest
  joinedAt: timestamp('joined_at', { withTimezone: true }).defaultNow().notNull(),
  leftAt: timestamp('left_at', { withTimezone: true }),
});

export const characterClasses = arcaneCodex.table('character_classes', {
  id: uuid('id').defaultRandom().primaryKey(),
  characterId: uuid('character_id')
    .notNull()
    .references(() => characters.id, { onDelete: 'cascade' }),
  subclassId: uuid('subclass_id')
    .notNull()
    .references(() => subclasses.id, { onDelete: 'cascade' }),
  classLevel: integer('class_level').notNull(),
});

export const characterAbilityScores = arcaneCodex.table('character_ability_scores', {
  id: uuid('id').defaultRandom().primaryKey(),
  characterId: uuid('character_id')
    .notNull()
    .references(() => characters.id, { onDelete: 'cascade' }),
  abilityId: uuid('ability_id')
    .notNull()
    .references(() => abilities.id, { onDelete: 'cascade' }),
  score: integer('score').notNull(),
});

export const characterSkills = arcaneCodex.table('character_skills', {
  id: uuid('id').defaultRandom().primaryKey(),
  characterId: uuid('character_id')
    .notNull()
    .references(() => characters.id, { onDelete: 'cascade' }),
  skillId: uuid('skill_id')
    .notNull()
    .references(() => skills.id, { onDelete: 'cascade' }),
  isProficient: boolean('is_proficient').notNull(),
  hasExpertise: boolean('has_expertise').notNull(),
});

export const characterItems = arcaneCodex.table('character_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  characterId: uuid('character_id')
    .notNull()
    .references(() => characters.id, { onDelete: 'cascade' }),
  itemId: uuid('item_id')
    .notNull()
    .references(() => items.id, { onDelete: 'cascade' }),
  quantity: integer('quantity').notNull(),
  isEquipped: boolean('is_equipped').notNull(),
  equippedSlot: text('equipped_slot'),
  customName: text('custom_name'),
  notes: text('notes'),
});

export const characterSpells = arcaneCodex.table('character_spells', {
  id: uuid('id').defaultRandom().primaryKey(),
  characterId: uuid('character_id')
    .notNull()
    .references(() => characters.id, { onDelete: 'cascade' }),
  spellId: uuid('spell_id')
    .notNull()
    .references(() => spells.id, { onDelete: 'cascade' }),
  known: boolean('known').notNull(),
  prepared: boolean('prepared').notNull(),
  sourceClassId: uuid('source_class_id')
    .notNull()
    .references(() => classes.id, { onDelete: 'cascade' }),
});
