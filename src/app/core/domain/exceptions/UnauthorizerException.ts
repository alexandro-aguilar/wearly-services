import Exception from './Exception';

export default class UnauthorizedException extends Exception {
  constructor(message: string = 'Unauthorized') {
    super(message);
  }
}
