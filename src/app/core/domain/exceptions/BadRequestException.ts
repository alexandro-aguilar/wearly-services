import Exception from './Exception';

export default class BadRequestException extends Exception {
  constructor(message: string = 'Bad Request') {
    super(message);
  }
}
