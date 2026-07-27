import { and, asc, desc, eq, gte, isNull, lte, or } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { db } from '@src/app/core/infrastructure/database/postgres-drizzle.config';
import { promotionActions, promotionConditions, promotions } from '@src/app/core/infrastructure/database/schema';
import { PromotionRepository } from '@src/app/modules/promotions/application/ports/PromotionRepositories';
import { PromotionAction, PromotionCondition, PromotionSnapshot } from '@src/app/modules/promotions/domain/Promotion';

export class DrizzlePromotionRepository implements PromotionRepository {
  constructor(private readonly database: typeof db = db) {}

  async save(promotion: PromotionSnapshot): Promise<void> {
    await this.database.transaction(async (transaction) => {
      await transaction
        .insert(promotions)
        .values({
          id: promotion.id,
          storeId: promotion.storeId,
          name: promotion.name,
          description: promotion.description,
          type: promotion.type,
          startsAt: promotion.startsAt,
          endsAt: promotion.endsAt,
          priority: promotion.priority,
          active: promotion.active,
        })
        .onConflictDoUpdate({
          target: promotions.id,
          set: {
            storeId: promotion.storeId,
            name: promotion.name,
            description: promotion.description,
            type: promotion.type,
            startsAt: promotion.startsAt,
            endsAt: promotion.endsAt,
            priority: promotion.priority,
            active: promotion.active,
          },
        });
      await transaction.delete(promotionActions).where(eq(promotionActions.promotionId, promotion.id));
      await transaction.delete(promotionConditions).where(eq(promotionConditions.promotionId, promotion.id));
      await transaction.insert(promotionConditions).values(
        promotion.conditions.map((condition, position) => ({
          id: randomUUID(),
          promotionId: promotion.id,
          field: condition.field,
          operator: condition.operator,
          value: condition.value,
          position,
        }))
      );
      await transaction.insert(promotionActions).values(
        promotion.actions.map((action) => ({
          id: randomUUID(),
          promotionId: promotion.id,
          type: action.type,
          value: action.value.toFixed(2),
        }))
      );
    });
  }

  async findById(storeId: string, id: string): Promise<PromotionSnapshot | undefined> {
    const [promotion] = await this.database
      .select()
      .from(promotions)
      .where(and(eq(promotions.storeId, storeId), eq(promotions.id, id)))
      .limit(1);
    return promotion ? this.toSnapshot(promotion) : undefined;
  }

  async list(storeId: string): Promise<PromotionSnapshot[]> {
    const rows = await this.database
      .select()
      .from(promotions)
      .where(eq(promotions.storeId, storeId))
      .orderBy(desc(promotions.priority), asc(promotions.id));
    return Promise.all(rows.map((promotion) => this.toSnapshot(promotion)));
  }

  async listActive(storeId: string, at: Date): Promise<PromotionSnapshot[]> {
    const rows = await this.database
      .select()
      .from(promotions)
      .where(
        and(
          eq(promotions.storeId, storeId),
          eq(promotions.active, true),
          or(isNull(promotions.startsAt), lte(promotions.startsAt, at)),
          or(isNull(promotions.endsAt), gte(promotions.endsAt, at))
        )
      )
      .orderBy(desc(promotions.priority), asc(promotions.id));
    return Promise.all(rows.map((promotion) => this.toSnapshot(promotion)));
  }

  private async toSnapshot(promotion: typeof promotions.$inferSelect): Promise<PromotionSnapshot> {
    const [conditions, actions] = await Promise.all([
      this.database
        .select()
        .from(promotionConditions)
        .where(eq(promotionConditions.promotionId, promotion.id))
        .orderBy(asc(promotionConditions.position)),
      this.database.select().from(promotionActions).where(eq(promotionActions.promotionId, promotion.id)),
    ]);
    return {
      id: promotion.id,
      storeId: promotion.storeId,
      name: promotion.name,
      description: promotion.description ?? undefined,
      type: promotion.type as PromotionSnapshot['type'],
      conditions: conditions.map((condition) => ({
        field: condition.field,
        operator: condition.operator,
        value: condition.value,
      })) as PromotionCondition[],
      actions: actions.map((action) => ({
        type: action.type,
        value: Number(action.value),
      })) as PromotionAction[],
      startsAt: promotion.startsAt ?? undefined,
      endsAt: promotion.endsAt ?? undefined,
      priority: promotion.priority,
      active: promotion.active,
    };
  }
}
