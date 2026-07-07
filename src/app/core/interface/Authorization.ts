export type Role = 'ADMIN' | 'MANAGER' | 'CASHIER';

export default class Authorization {
  private readonly _subjectId: string;
  private readonly _storeId: string;
  private readonly _roles: readonly Role[];

  constructor(jwt: string) {
    const decodedJWT = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64').toString());
    this._subjectId = decodedJWT['sub'] || '';
    this._storeId = decodedJWT['store_id'] || '';
    this._roles = (decodedJWT['roles'] || '').split(',') as Role[];
  }

  get subjectId(): string {
    return this._subjectId;
  }

  get storeId(): string {
    return this._storeId;
  }

  get roles(): readonly Role[] {
    return this._roles;
  }
}
